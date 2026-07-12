// AI Workflow — Workflow State Machine ／ Control Center Orchestration
// Coding Phase 2／7 建立：Manifest Send + Processing Mode
// Coding Phase 3／7（前一輪）：Status Polling + Auto Import
// Phase 2 Correction：修正 Execute Contract 為兩段式。
// Phase 3 Correction：接上 Status Polling／Auto Import 的實際取回＋寫回。
// Phase 4：AutoImportSucceeded -> 素材處理完成 -> 800ms 轉場 -> 自動開啟
//   Review Workspace -> 解除 Lock。
// Phase 5：Rerun Workflow，First Run／Rerun 共用同一套資料流，用 runMode
//   區分 phase 命名。
// Phase 6（本輪）：Error / Recovery Hardening。整份檔案改用一個持續存在的
//   lastAttempt 物件保存「目前這次嘗試」的完整、可重播的呼叫context
//   （runMode／getPipelineState／getAssetFolderName／lookupAssetFn／
//   getAssetFolderHandle／openReviewFn／pipelineState／manifest／
//   executionId／assetPayloads／uploadedCount／deliveredCount／
//   failureReason／permissionDenied），取代先前把這些一路當參數往下傳的寫
//   法——這樣每一種 Retry 都能直接讀取「上一次嘗試留下的狀態」，從正確的
//   安全節點繼續，而不必重新建立 Execution、不必重新觸發 Photoshop、也不
//   必重新取回已經成功的部分。
//
// 依據（Locked，不重新設計）：
//   AI Workflow Implementation Proposal（Revision 01, Frozen）第 2／3 節
//
// 本檔案是唯一的協調中樞（Control Center Orchestration），也是唯一實際知
// 道「Retry 該怎麼做」的地方——js/ai-workflow-recovery.js 只負責「這個
// phase 該顯示什麼文案／按鈕」，實際動作一律呼叫本檔案的 retry(kind)，不
// 重新實作任何一種 Retry 邏輯，避免 Error／Recovery 邏輯散落成多套。
//
// 統一 Recovery State Model（Phase 6 新增的 phase，一律沿用既有
// First／Rerun 命名規則，透過 PHASE_NAMES 查表加上對應前綴）：
//   pollingUnavailable  — Status Polling 連續失敗超過上限（Runtime 暫時無
//                          回應），Retry = 用同一個 executionId 恢復輪詢。
//   executionLost       — Status Polling 收到明確 404（executionId 已不存
//                          在，通常是 Runtime 重啟），Retry = 整批重新開始
//                          （resuming 輪詢不可能成功）。
//   resultFetchFailed   — 任一筆 Processed 結果取回／寫入失敗，但 Runtime
//                          端該筆結果仍然存在，Retry = 用同一個
//                          executionId、只從尚未成功的項目繼續，不重新取回
//                          已成功的部分、不重跑 Photoshop。
//   resultUnavailable   — 上述取回失敗的原因是 Runtime 回 410（該筆結果已
//                          被清理，不可能再取回），誠實顯示「無法繼續」，
//                          Retry = 整批重新開始（唯一還能往前走的路）。
//   matchingFailed      — Processed 檔案已經全部正確取回並寫入磁碟，只有
//                          最後一步既有 Matching 呼叫本身失敗，Retry = 只
//                          重新呼叫一次既有 Matching 函式，不重新取回、更
//                          不重跑 Photoshop。
// 其餘沿用既有：readyCheckFailed／executeRejected／manifestConflict／
// assetUploadFailed／partialFailureDetected／failed／reviewOpenFailed。
//
// Global Interaction Lock 規則（Phase 6 落實）：
//   - Lock 只在 Execute Accepted 之後（phase 進入 processing）才 enter()，
//     在 phase 進入共用的 'Review' 之後才 exit()——中間任何 Phase 6 新增的
//     失敗分支都不會提前解除。
//   - Ready Check／Execute 相關的失敗分支（readyCheckFailed／
//     executeRejected／manifestConflict）都發生在 enter() 之前，Lock 從未
//     進入，使用者本來就能自由操作既有 UI（不需要特別放寬）。
//   - 所有「Lock 已進入」之後才會出現的失敗分支，都只透過
//     ai-workflow-processing-mode.js 新增的 showRecovery()（獨立、高
//     z-index 的 Recovery Banner）讓使用者觸發 Retry，Lock 本身（overlay／
//     disabled 元件）完全不放寬，不開放修改文字、切換工單、下載、匯入
//     CSV、選素材資料夾或開始新 Workflow。
//   - 本輪不提供使用者可見的「放棄」按鈕（使用者核可的文案清單沒有這個詞
//     彙，且要保證「不會留下 active execution」在 pending-upload 情境下無
//     法立即確認——改由 Runtime 端新增的 Pending Execution Timeout 保證
//     Lock 不會永久卡住：見 spx_ad_runtime.py Phase 6 段落）。
//
// 本檔案不得：
//   - 建立第二套 Review Workspace 顯示邏輯或直接操作其內部 DOM。
//   - 為每種失敗各寫一套平行、彼此獨立的狀態機／函式鏈——所有 Retry 都是
//     同一份 proceedToManifestAndExecute／beginStatusPolling／
//     handleStatusUpdate／runAutoImportStage／proceedToCompleteAndReview／
//     runOpenReview 函式鏈的延續或局部重入，只是進入點不同。
//   - 修改 Ready／Execute／Status／Result Contract 的形狀。
//   - 新增持久化 State 或 Project State schema——lastAttempt 純粹是
//     Runtime-only 記憶體變數，重新整理頁面即消失（見 src/app.js 的
//     beforeunload 提示，Known Limitation）。
//   - 從 assetPipelineState 推算 Progress。

(function (global) {
  'use strict';

  if (global.BNAIWorkflowOrchestrator) return;

  // AutoImportSucceeded 之後的「素材處理完成」UI 轉場時間，僅為視覺停留，
  // 不是完成判定依據。First Run／Rerun 共用同一個時間常數。
  var COMPLETE_TRANSITION_MS = 800;

  var PHASE_NAMES = {
    first: {
      awaitingReadyCheck: 'AwaitingReadyCheck',
      readyCheckFailed: 'ReadyCheckFailed',
      buildingManifest: 'BuildingManifest',
      manifestConflict: 'ManifestConflict',
      executeRejected: 'ExecuteRejected',
      processing: 'Processing',
      assetUploadFailed: 'AssetUploadFailed',
      awaitingExecution: 'AwaitingExecution',
      pollingUnavailable: 'PollingUnavailable',
      executionLost: 'ExecutionLost',
      autoImporting: 'AutoImporting',
      resultFetchFailed: 'ResultFetchFailed',
      resultUnavailable: 'ResultUnavailable',
      matchingFailed: 'MatchingFailed',
      autoImportSucceeded: 'AutoImportSucceeded',
      partialFailureDetected: 'PartialFailureDetected',
      failed: 'Failed',
      openingReview: 'OpeningReview',
      reviewOpenFailed: 'ReviewOpenFailed',
    },
    rerun: {
      awaitingReadyCheck: 'RerunReadyCheck',
      readyCheckFailed: 'RerunReadyCheckFailed',
      buildingManifest: 'RerunBuildingManifest',
      manifestConflict: 'RerunManifestConflict',
      executeRejected: 'RerunExecuteRejected',
      processing: 'RerunProcessing',
      assetUploadFailed: 'RerunAssetUploadFailed',
      awaitingExecution: 'RerunAwaitingExecution',
      pollingUnavailable: 'RerunPollingUnavailable',
      executionLost: 'RerunExecutionLost',
      autoImporting: 'RerunAutoImport',
      resultFetchFailed: 'RerunResultFetchFailed',
      resultUnavailable: 'RerunResultUnavailable',
      matchingFailed: 'RerunMatchingFailed',
      autoImportSucceeded: 'RerunAutoImportSucceeded',
      partialFailureDetected: 'RerunPartialFailureDetected',
      failed: 'RerunFailed',
      openingReview: 'OpeningRerunReview',
      reviewOpenFailed: 'RerunReviewOpenFailed',
    },
  };

  function phaseFor(key, runMode) {
    var table = PHASE_NAMES[runMode === 'rerun' ? 'rerun' : 'first'];
    return table[key];
  }

  // 「正在進行中」的狀態——start()／startRerun() 都不允許在這些狀態下重
  // 入。除此之外的任何狀態（Idle／Review／任何一種失敗分支）都允許重新開
  // 始一輪 First Run（start()）；startRerun() 額外要求必須是從 'Review'
  // 或某個 Rerun 前綴的狀態觸發（見 startRerun()），避免從 Idle 或 First
  // Run 的失敗分支誤觸發 Rerun。
  var MID_FLIGHT_KEYS = ['awaitingReadyCheck', 'buildingManifest', 'processing', 'awaitingExecution', 'autoImporting', 'openingReview'];
  var MID_FLIGHT_PHASES = {};
  MID_FLIGHT_KEYS.forEach(function (key) {
    MID_FLIGHT_PHASES[PHASE_NAMES.first[key]] = true;
    MID_FLIGHT_PHASES[PHASE_NAMES.rerun[key]] = true;
  });

  // Runtime-only Workflow State（純記憶體，見 Implementation Proposal 第 4
  // 節／第 16 節第 1 點）。
  var phase = 'Idle';
  var lastManifestConflict = null;
  var phaseListener = null;

  // 目前（或最近一次）嘗試的完整、可重播 context——Phase 6 新增，是本檔案
  // 所有 Retry 機制的唯一資料來源。
  var lastAttempt = null;

  function setPhase(next) {
    phase = next;
    if (typeof phaseListener === 'function') {
      try {
        phaseListener(next);
      } catch (e) {
        // 呼叫方（UI 呈現層）的例外不應該讓狀態機本身掛掉。
      }
    }
  }

  function onPhaseChange(fn) {
    phaseListener = typeof fn === 'function' ? fn : null;
  }

  function getPhase() {
    return phase;
  }

  function getLastManifestConflict() {
    return lastManifestConflict;
  }

  // Phase 6：供 js/ai-workflow-recovery.js 讀取的最小上下文——只回傳呈現層
  // 需要的欄位（phase／failureReason／permissionDenied），不外流
  // lastAttempt 內部持有的函式參照／buffer 等實作細節。
  function getRecoveryContext() {
    var a = lastAttempt;
    return {
      phase: phase,
      failureReason: a ? a.failureReason || null : null,
      permissionDenied: a ? !!a.permissionDenied : false,
    };
  }

  function start(getPipelineState, getAssetFolderName, lookupAssetFn, getAssetFolderHandle, openReviewFn, onProcessedAssetsWritten) {
    if (MID_FLIGHT_PHASES[phase]) return false; // 重入保護
    if (!global.BNAIWorkflowReadyCheck) return false;

    lastAttempt = {
      runMode: 'first',
      getPipelineState: getPipelineState,
      getAssetFolderName: getAssetFolderName,
      lookupAssetFn: lookupAssetFn,
      getAssetFolderHandle: getAssetFolderHandle,
      openReviewFn: openReviewFn,
      onProcessedAssetsWritten: onProcessedAssetsWritten,
      uploadedCount: 0,
      deliveredCount: 0,
      failureReason: null,
      permissionDenied: false,
    };

    setPhase(phaseFor('awaitingReadyCheck', 'first'));
    global.BNAIWorkflowReadyCheck.runReadyCheck().then(function (ready) {
      if (!ready) {
        setPhase(phaseFor('readyCheckFailed', 'first'));
        return;
      }
      proceedToManifestAndExecute();
    });
    return true;
  }

  // Rerun 入口：只能從 Review 或某個 Rerun 前綴的狀態（前一次 Rerun 的失敗
  // 分支，供 Retry 用）觸發。
  function startRerun(getPipelineState, lookupAssetFn, getAssetFolderHandle, openReviewFn, onProcessedAssetsWritten) {
    if (MID_FLIGHT_PHASES[phase]) return false;
    if (phase !== 'Review' && phase.indexOf('Rerun') !== 0) return false;
    if (!global.BNAIWorkflowReadyCheck) return false;

    lastAttempt = {
      runMode: 'rerun',
      getPipelineState: getPipelineState,
      lookupAssetFn: lookupAssetFn,
      getAssetFolderHandle: getAssetFolderHandle,
      openReviewFn: openReviewFn,
      onProcessedAssetsWritten: onProcessedAssetsWritten,
      uploadedCount: 0,
      deliveredCount: 0,
      failureReason: null,
      permissionDenied: false,
    };

    setPhase(phaseFor('awaitingReadyCheck', 'rerun'));
    // Product Rule 2（Phase 5，仍然適用）：Rerun 每次都必須重新執行 Ready
    // Check，沒有任何跳過的捷徑。
    global.BNAIWorkflowReadyCheck.runReadyCheck().then(function (ready) {
      if (!ready) {
        setPhase(phaseFor('readyCheckFailed', 'rerun'));
        return;
      }
      proceedToManifestAndExecute();
    });
    return true;
  }

  function proceedToManifestAndExecute() {
    var a = lastAttempt;
    setPhase(phaseFor('buildingManifest', a.runMode));

    a.pipelineState = typeof a.getPipelineState === 'function' ? a.getPipelineState() : null;
    var manifest = null;
    if (global.BNAIWorkflowManifestBuild) {
      manifest = a.runMode === 'rerun'
        ? global.BNAIWorkflowManifestBuild.buildRerunManifest(a.pipelineState)
        : global.BNAIWorkflowManifestBuild.buildFirstRunManifest(a.pipelineState);
    }

    if (manifest && manifest.error) {
      lastManifestConflict = manifest.error;
      setPhase(phaseFor('manifestConflict', a.runMode));
      return;
    }

    if (!manifest || !manifest.itemCount) {
      // 沒有素材可送出：First Run 回到 Idle；Rerun 回到 Review（使用者仍在
      // 檢視既有審核結果）。兩種情況都不進入 Processing Mode。
      setPhase(a.runMode === 'rerun' ? 'Review' : 'Idle');
      return;
    }
    a.manifest = manifest;

    global.BNAIWorkflowManifestBuild
      .collectAssetPayloads(manifest, a.lookupAssetFn)
      .then(function (assetPayloads) {
        a.assetPayloads = assetPayloads;
        return global.BNAIWorkflowExecution.createExecution(manifest).then(function (result) {
          var accepted = !!(result && result.data && result.data.accepted === true);
          if (!accepted) {
            setPhase(phaseFor('executeRejected', a.runMode));
            return;
          }

          a.executionId = result.data.executionId;
          a.uploadedCount = 0;

          setPhase(phaseFor('processing', a.runMode));
          global.BNAIWorkflowProcessingMode.enter();

          return global.BNAIWorkflowExecution
            .uploadAssetsSequentially(a.executionId, assetPayloads)
            .then(function (uploadResult) {
              if (!uploadResult.ok) {
                // 安全分支：上傳未全部成功，Runtime 不會觸發 Photoshop。
                // 不假裝已成功、不重試、不解除鎖定。已成功的數量記在
                // uploadedCount，供 retryUpload() 只補傳剩餘部分。
                a.uploadedCount = uploadResult.results.length;
                setPhase(phaseFor('assetUploadFailed', a.runMode));
                return;
              }
              a.uploadedCount = assetPayloads.length;
              setPhase(phaseFor('awaitingExecution', a.runMode));
              beginStatusPolling();
            });
        });
      });
  }

  function beginStatusPolling() {
    if (!global.BNAIWorkflowStatusPolling) return;
    global.BNAIWorkflowStatusPolling.start(lastAttempt.executionId, handleStatusUpdate, handlePollingFailure);
  }

  function handleStatusUpdate(status) {
    var a = lastAttempt;
    // 只有仍處於本次 runMode 對應的 awaitingExecution 狀態時才處理——任何
    // 延遲抵達的輪詢回應，若此時 phase 已經離開該狀態，一律忽略。
    if (!a || phase !== phaseFor('awaitingExecution', a.runMode) || !status) return;

    if (status.progress && global.BNAIWorkflowProcessingMode && global.BNAIWorkflowProcessingMode.updateProgress) {
      global.BNAIWorkflowProcessingMode.updateProgress(status.progress.current, status.progress.total);
    }

    if (!status.lastResult) return; // 仍在 Running，尚無終態結果

    if (global.BNAIWorkflowStatusPolling) global.BNAIWorkflowStatusPolling.stop();

    if (status.lastResult.state === 'Completed') {
      setPhase(phaseFor('autoImporting', a.runMode));
      runAutoImportStage(0);
    } else if (status.lastResult.state === 'PartialFailure') {
      a.failureReason = status.lastResult.reason || null;
      setPhase(phaseFor('partialFailureDetected', a.runMode));
    } else {
      // Failure（含 Photoshop 執行途中關閉——reason 會是
      // 'photoshop_closed'，交給 js/ai-workflow-recovery.js 對應到既有
      // 「Photoshop 已關閉」文案，本檔案不重複判斷／不重複顯示文字）。
      a.failureReason = status.lastResult.reason || null;
      setPhase(phaseFor('failed', a.runMode));
    }
  }

  // Phase 6：Status Polling 本身連續失敗（非「Runtime 回報的處理結果」失
  // 敗）。not_found（executionId 已不存在）與 unavailable（連續逾越重試上
  // 限）分別對應到 executionLost／pollingUnavailable 兩個不同、Retry 策略
  // 也不同的狀態。
  function handlePollingFailure(kind) {
    var a = lastAttempt;
    if (!a || phase !== phaseFor('awaitingExecution', a.runMode)) return;
    if (kind === 'not_found') {
      setPhase(phaseFor('executionLost', a.runMode));
    } else {
      setPhase(phaseFor('pollingUnavailable', a.runMode));
    }
  }

  // 依 resumeFromIndex 呼叫既有 Auto Import Controller——0 代表從頭開始
  // （首次嘗試），非 0 代表 Retry（只取回／寫入尚未成功的項目，或
  // manifest.items.length 代表「全部都已取回，只重跑 Matching」）。
  function runAutoImportStage(resumeFromIndex) {
    var a = lastAttempt;
    if (!global.BNAIWorkflowAutoImport) {
      setPhase(phaseFor('resultFetchFailed', a.runMode));
      return;
    }
    global.BNAIWorkflowAutoImport
      .runAutoImport(a.pipelineState, a.manifest, a.executionId, a.getAssetFolderHandle, { resumeFromIndex: resumeFromIndex || 0 })
      .then(function (matchResult) {
        a.deliveredCount = a.manifest.items.length;
        // Stage 2 Root Cause Fix（Review 破圖）：把本次呼叫實際寫入的
        // FileSystemFileHandle 轉交給呼叫方（src/app.js），讓 Review
        // Workspace 實際讀取圖片內容用的既有快取（processedAssetIndex）能
        // 被 AI Workflow 這條路徑填入——本檔案不知道、也不操作這個快取本
        // 身，只負責轉交。
        notifyProcessedAssetsWritten(matchResult && matchResult.writtenEntries);
        setPhase(phaseFor('autoImportSucceeded', a.runMode));
        proceedToCompleteAndReview();
      })
      .catch(function (err) {
        handleAutoImportError(err);
      });
  }

  // Stage 2 Root Cause Fix：集中呼叫 onProcessedAssetsWritten，不論成功或
  // 部分失敗都呼叫——確保「本次呼叫內已經真的寫入磁碟」的項目，不會因為
  // 後面某個項目失敗、整體 Promise reject，就遺漏其 Handle。
  function notifyProcessedAssetsWritten(entries) {
    var a = lastAttempt;
    if (!a || typeof a.onProcessedAssetsWritten !== 'function' || !entries || !entries.length) return;
    try {
      a.onProcessedAssetsWritten(entries);
    } catch (e) {
      // 呼叫方例外不應該影響 Auto Import 狀態機本身。
    }
  }

  // Phase 6：把 js/ai-workflow-auto-import.js 回報的錯誤（stage／gone／
  // permissionDenied／deliveredCount）轉成對應的、可各自獨立 Retry 的狀
  // 態，不靠猜測。
  function handleAutoImportError(err) {
    var a = lastAttempt;
    notifyProcessedAssetsWritten(err && err.writtenEntries);
    if (err && err.stage === 'matching') {
      // Processed 檔案已經全部正確寫入，只有 Matching 這一步失敗——不需要
      // 也不應該回頭重新取回任何內容。
      setPhase(phaseFor('matchingFailed', a.runMode));
      return;
    }
    a.deliveredCount = err && typeof err.deliveredCount === 'number' ? err.deliveredCount : a.deliveredCount || 0;
    a.permissionDenied = !!(err && err.permissionDenied);
    if (err && err.gone) {
      // Runtime 端該筆結果已被清理（410）：不可能再取回，必須誠實顯示
      // 「無法繼續」，不得靜默重跑；Retry 只能是整批重新開始。
      setPhase(phaseFor('resultUnavailable', a.runMode));
    } else {
      setPhase(phaseFor('resultFetchFailed', a.runMode));
    }
  }

  // AutoImportSucceeded/RerunAutoImportSucceeded -> 顯示「素材處理完成」->
  // 停留 0.5～1 秒（純 UI 轉場）-> 嘗試開啟既有 Review Workspace。
  function proceedToCompleteAndReview() {
    if (global.BNAIWorkflowProcessingMode && global.BNAIWorkflowProcessingMode.showCompleted) {
      global.BNAIWorkflowProcessingMode.showCompleted();
    }
    setTimeout(function () {
      runOpenReview();
    }, COMPLETE_TRANSITION_MS);
  }

  function runOpenReview() {
    var a = lastAttempt;
    if (!a || phase !== phaseFor('autoImportSucceeded', a.runMode)) return;

    setPhase(phaseFor('openingReview', a.runMode));

    var reviewMode = a.runMode === 'rerun' ? 'needs_rerun' : 'all';
    var opened = false;
    try {
      opened = typeof a.openReviewFn === 'function' ? !!a.openReviewFn(reviewMode) : false;
    } catch (e) {
      opened = false;
    }

    if (!opened) {
      setPhase(phaseFor('reviewOpenFailed', a.runMode));
      return;
    }

    setPhase('Review');
    if (global.BNAIWorkflowProcessingMode) global.BNAIWorkflowProcessingMode.exit();
  }

  // ---- Phase 6：Retry 機制（唯一、集中的實作，見檔頭 Recovery State Model）----

  // 情境 A／B（Ready Check／Execute Failure）、ManifestConflict、
  // PartialFailure、Failed（含 Photoshop 執行途中關閉）、ExecutionLost、
  // ResultUnavailable 共用同一個「整批重新開始」機制：重播上一次呼叫的
  // start()／startRerun()（依 lastAttempt.runMode 決定），本身就會重新做
  // 一次 Ready Check，不會、也不需要另外設計「先重新檢查、再繼續」的分支。
  function replayFromScratch() {
    var a = lastAttempt;
    if (!a) return false;
    // Stage 4 Root Cause Fix（Recovery 後 Review Workspace 破圖）：先前這裡
    // 少傳了既有的 onProcessedAssetsWritten，導致「整批重新開始」類 Retry
    // 建立的全新 lastAttempt 遺失這個 callback，即使寫入真的成功，
    // processedAssetIndex 也永遠不會被填入。這裡補傳，不新增參數、不改變
    // 其他既有參數順序。
    if (a.runMode === 'rerun') {
      return startRerun(a.getPipelineState, a.lookupAssetFn, a.getAssetFolderHandle, a.openReviewFn, a.onProcessedAssetsWritten);
    }
    return start(a.getPipelineState, a.getAssetFolderName, a.lookupAssetFn, a.getAssetFolderHandle, a.openReviewFn, a.onProcessedAssetsWritten);
  }

  // 情境 C（Asset Upload Failure）：沿用同一個 executionId，只補傳尚未成功
  // 的素材，不建立新 Execution、不重複處理已完成的 execution。
  function retryUpload() {
    var a = lastAttempt;
    if (!a || !a.executionId || phase !== phaseFor('assetUploadFailed', a.runMode)) return false;
    var remaining = (a.assetPayloads || []).slice(a.uploadedCount || 0);
    if (!remaining.length) {
      setPhase(phaseFor('awaitingExecution', a.runMode));
      beginStatusPolling();
      return true;
    }
    setPhase(phaseFor('processing', a.runMode));
    global.BNAIWorkflowExecution.uploadAssetsSequentially(a.executionId, remaining).then(function (uploadResult) {
      if (!uploadResult.ok) {
        a.uploadedCount = (a.uploadedCount || 0) + uploadResult.results.length;
        setPhase(phaseFor('assetUploadFailed', a.runMode));
        return;
      }
      a.uploadedCount = a.assetPayloads.length;
      setPhase(phaseFor('awaitingExecution', a.runMode));
      beginStatusPolling();
    });
    return true;
  }

  // 情境 D（Status Polling Failure，僅 pollingUnavailable——暫時性）：用同
  // 一個 executionId 恢復輪詢，不重新 Execute。
  function retryPolling() {
    var a = lastAttempt;
    if (!a || !a.executionId || phase !== phaseFor('pollingUnavailable', a.runMode)) return false;
    setPhase(phaseFor('awaitingExecution', a.runMode));
    beginStatusPolling();
    return true;
  }

  // 情境 F／G（Result Fetch／Write／Permission Failure）：用同一個
  // executionId，只從尚未成功取回＋寫入的項目繼續，不重新執行 Photoshop、
  // 不要求重新選擇素材資料夾（重新授權只是重新呼叫
  // requestPermission，既有的 FileSystemDirectoryHandle 不變）。
  function retryResultFetch() {
    var a = lastAttempt;
    if (!a || !a.executionId || phase !== phaseFor('resultFetchFailed', a.runMode)) return false;
    setPhase(phaseFor('autoImporting', a.runMode));
    runAutoImportStage(a.deliveredCount || 0);
    return true;
  }

  // 情境 H（Auto Import／Matching Failure）：Processed 已寫入，只重新呼叫
  // 一次既有 Matching 函式，不重新取回、不重跑 Photoshop。
  function retryMatchingOnly() {
    var a = lastAttempt;
    if (!a || !a.manifest || phase !== phaseFor('matchingFailed', a.runMode)) return false;
    setPhase(phaseFor('autoImporting', a.runMode));
    runAutoImportStage(a.manifest.items.length);
    return true;
  }

  // 情境 I（Review Open Failure）：只重新呼叫既有的開啟入口，不重跑
  // Photoshop、不重新 Auto Import。
  function retryReviewOpen() {
    var a = lastAttempt;
    if (!a || phase !== phaseFor('reviewOpenFailed', a.runMode)) return false;
    setPhase(phaseFor('autoImportSucceeded', a.runMode));
    runOpenReview();
    return true;
  }

  // 單一、集中的 Retry 分派入口——js/ai-workflow-recovery.js／src/app.js 都
  // 只透過這個函式觸發 Retry，不直接呼叫下面任何一個內部函式，確保 Retry
  // 邏輯只有一套。
  function retry(kind) {
    switch (kind) {
      case 'fullBatch':
        return replayFromScratch();
      case 'upload':
        return retryUpload();
      case 'polling':
        return retryPolling();
      case 'resultFetch':
        return retryResultFetch();
      case 'matching':
        return retryMatchingOnly();
      case 'reviewOpen':
        return retryReviewOpen();
      default:
        return false;
    }
  }

  global.BNAIWorkflowOrchestrator = {
    start: start,
    startRerun: startRerun,
    getPhase: getPhase,
    getLastManifestConflict: getLastManifestConflict,
    onPhaseChange: onPhaseChange,
    getRecoveryContext: getRecoveryContext,
    retry: retry,
  };
})(window);
