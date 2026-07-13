// AI Workflow — Auto Import Controller
// Coding Phase 3／7 建立，Phase 3 Correction 大幅擴充（實際取回 Runtime 端
// 已產生的 Processed PNG 內容並寫回真正的素材資料夾）。
// Phase 6（本輪）：Error / Recovery Hardening — 情境 F（Result Fetch
//   Failure）／G（File System Permission／Write Failure）／H（Auto
//   Import／Matching Failure）：
//     1. fetchAndWriteAllResults() 現在接受 resumeFromIndex，只重新處理
//        「尚未成功取回＋寫入」的項目，不重複處理已完成的 item（同名 PNG
//        本來就可安全覆蓋，但已成功的項目沒有必要再打一次
//        GET .../results/{assetId}）。任何一步失敗都會把「目前已成功的
//        數量」（deliveredCount）夾帶在錯誤物件上，讓呼叫方能夠原封不動地
//        用同一個 executionId、只從失敗點繼續，不必重建 Execution、不會
//        重跑 Photoshop。
//     2. 明確區分三種失敗來源，夾帶在錯誤物件上，不靠字串比對猜測：
//        - err.gone = true：Runtime 回 410（該筆結果已被清理，不可能再取
//          回）——呼叫方必須誠實顯示「無法繼續」，不得靜默重跑。
//        - err.permissionDenied = true：requestPermission({mode:'readwrite'})
//          被拒絕——呼叫方應提供「重新授權」而不是泛用重試文案。
//        - err.stage = 'fetch_write' | 'matching'：區分「取回／寫入」失敗
//          與「Processed 已全部寫入，但最後 Matching 呼叫本身失敗」——後者
//          不需要、也不應該重新 GET 任何內容，只需要重新呼叫既有 Matching
//          函式一次。
//     3. runAutoImport() 新增第五個參數 options.resumeFromIndex，供 Retry
//        使用；不傳時預設為 0（維持原本「從頭開始」行為，向後相容）。
// Stage 2 Root Cause Fix（本輪，macOS Development E2E Validation）— Review
//   破圖：先前寫入 Processed/ 之後，從未把實際寫入的
//   FileSystemFileHandle 回傳給呼叫方，導致 src/app.js 的
//   processedAssetIndex（Review Workspace 讀取圖片內容用的既有快取，手動
//   pickProcessedFolder() 流程原本就有填入）在 AI Workflow 這條路徑上從未
//   被填入，圖片因此永遠讀不到內容。現在 writeResultToRealFolder() 回傳寫
//   入後的 FileSystemFileHandle，fetchAndWriteAllResults()／runAutoImport()
//   把「本次呼叫實際寫入的項目」以 writtenEntries（{filename, fileHandle}
//   陣列）附在成功與失敗（部分成功）的回傳／錯誤物件上，交給呼叫方
//   （Orchestrator → src/app.js）填入既有快取——不新增第二套圖片來源機
//   制、不修改 Matching 函式本身的回傳欄位，只是額外夾帶。
//
// 依據（Locked，不重新設計）：
//   docs/proposals/AI-Workflow-Proposal.md（Product Proposal, Frozen）
//   AI Workflow Implementation Proposal（Revision 01, Frozen）第 10 節
//
// 本檔案不得：
//   - 重寫 Matching 邏輯本身（呼叫既有／既有新增的既有函式，不自行比對）。
//   - 開啟 Review Workspace（Phase 4 範圍）。
//   - 自動重試：任一步驟失敗就整個 Promise reject，呼叫方（Workflow State
//     Machine）決定何時、如何重試，本檔案不建立重試迴圈。
//   - 要求使用者第二次選擇素材資料夾。
//   - 把 Handle 寫入 Project State——Handle 完全由呼叫方（src/app.js）以
//     Runtime-only 記憶體變數保留，本檔案只透過呼叫方注入的
//     getAssetFolderHandle() 讀取，不自行儲存跨呼叫的參照。

(function (global) {
  'use strict';

  if (global.BNAIWorkflowAutoImport) return;

  function expectedProcessedFilesFromManifest(manifest) {
    if (!manifest || !Array.isArray(manifest.items)) return [];
    return manifest.items
      .map(function (item) { return item && item.output && item.output.filename; })
      .filter(Boolean)
      .map(function (filename) { return { name: filename }; });
  }

  // 對已保留的 FileSystemDirectoryHandle 寫入單一 Processed 檔案。同名 PNG
  // 可安全覆蓋（createWritable() 預設即為覆蓋寫入），Retry 因此不會破壞已經
  // 正確寫入的檔案內容。
  //
  // Stage 2 Root Cause Fix（Review 破圖）：現在會把實際寫入的
  // FileSystemFileHandle 回傳給呼叫方——先前這裡完全沒有回傳任何東西，
  // 呼叫方（runAutoImport／Orchestrator）因此無從得知「剛剛寫進
  // Processed/ 的這個檔案，實際上是哪一個 Handle」，導致 Review Workspace
  // 用來取得圖片內容的 processedAssetIndex（src/app.js 持有，既有手動匯入
  // 流程既有機制）從未被 AI Workflow 這條路徑填入過，圖片因此永遠讀不到
  // 內容——這裡只是把已經寫好的 Handle 傳出去，不改變寫入邏輯本身。
  function writeResultToRealFolder(directoryHandle, outputFilename, arrayBuffer) {
    var writtenFileHandle = null;
    return directoryHandle
      .requestPermission({ mode: 'readwrite' })
      .then(function (permission) {
        if (permission !== 'granted') {
          var permError = new Error('readwrite_permission_denied');
          permError.permissionDenied = true;
          throw permError;
        }
        return directoryHandle.getDirectoryHandle('Processed', { create: true });
      })
      .then(function (processedDirHandle) {
        return processedDirHandle.getFileHandle(outputFilename, { create: true });
      })
      .then(function (fileHandle) {
        writtenFileHandle = fileHandle;
        return fileHandle.createWritable();
      })
      .then(function (writable) {
        return writable.write(arrayBuffer).then(function () {
          return writable.close();
        });
      })
      .then(function () {
        return writtenFileHandle;
      });
  }

  // 依序（非平行）逐一取回並寫入，從 resumeFromIndex 開始（預設 0）——
  // resumeFromIndex 之前的項目視為前一次嘗試已經成功取回＋寫入，不重複
  // 處理。任一 item 失敗就整個流程 reject，並在錯誤物件上夾帶
  // deliveredCount（本次＋先前已成功的總數，供下一次 Retry 使用）、
  // gone（Runtime 回 410）、permissionDenied（寫入權限被拒絕）。
  //
  // 去背失敗獨立分類（Bug Fix，本輪新增）：skipIndexSet（純加法、可選參
  // 數，預設 null／不跳過任何項目，既有呼叫方完全不受影響）——true 代表
  // Runtime 那邊 Photoshop 本身就確定沒有產生這張的結果（不是下載/寫入失
  // 敗），完全不呼叫 fetchResult，也不計入這次「失敗就中斷」的既有重試邏
  // 輯，只是單純跳過那個 index。這是唯一新增的分支，其餘既有的下載/重試/
  // resumeFromIndex 行為完全不變。
  function fetchAndWriteAllResults(executionId, manifestItems, getAssetFolderHandle, resumeFromIndex, skipIndexSet) {
    var startIndex = resumeFromIndex > 0 ? resumeFromIndex : 0;
    var directoryHandle = typeof getAssetFolderHandle === 'function' ? getAssetFolderHandle() : null;
    if (!directoryHandle) {
      var noHandleError = new Error('asset_folder_handle_unavailable');
      noHandleError.deliveredCount = startIndex;
      return Promise.reject(noHandleError);
    }
    if (!global.BNAIWorkflowExecution || typeof global.BNAIWorkflowExecution.fetchResult !== 'function') {
      var noFetchError = new Error('fetchResult not available');
      noFetchError.deliveredCount = startIndex;
      return Promise.reject(noFetchError);
    }

    var chain = Promise.resolve();
    var deliveredCount = startIndex;
    var writtenEntries = []; // Stage 2 Root Cause Fix：{filename, fileHandle} for every item actually written this attempt

    manifestItems.forEach(function (item, index) {
      if (index < startIndex) return; // 前一次嘗試已成功取回＋寫入，不重做
      if (skipIndexSet && skipIndexSet[index]) return; // 去背失敗獨立分類：Photoshop 本身就沒有這張的結果，不嘗試下載
      chain = chain.then(function () {
        return global.BNAIWorkflowExecution.fetchResult(executionId, String(index)).then(function (result) {
          if (!result || !result.ok) {
            var fetchError = new Error('fetch_result_failed:' + (result && (result.reason || result.status)));
            fetchError.stage = 'fetch_write';
            fetchError.deliveredCount = deliveredCount;
            fetchError.gone = !!(result && result.status === 410);
            // Stage 2 Root Cause Fix：即使這次整體失敗，先前（本次呼叫內）
            // 已經成功寫入的項目仍夾帶在錯誤物件上，讓呼叫方不會遺漏那些
            // 已經真的寫進磁碟的檔案的 Handle。
            fetchError.writtenEntries = writtenEntries;
            throw fetchError;
          }
          return writeResultToRealFolder(directoryHandle, item.output.filename, result.buffer)
            .then(function (fileHandle) {
              deliveredCount = index + 1;
              writtenEntries.push({ filename: item.output.filename, fileHandle: fileHandle });
            })
            .catch(function (writeErr) {
              var wrapped = new Error('write_failed:' + (writeErr && writeErr.message));
              wrapped.stage = 'fetch_write';
              wrapped.deliveredCount = deliveredCount;
              wrapped.permissionDenied = !!(writeErr && writeErr.permissionDenied);
              wrapped.writtenEntries = writtenEntries;
              throw wrapped;
            });
        });
      });
    });

    return chain.then(function () {
      return { deliveredCount: manifestItems.length, writtenEntries: writtenEntries };
    });
  }

  // 全部結果取回並寫回真正的 Processed/ 之後，依 Manifest item 的
  // assetKeys[] 呼叫既有 Matching 函式一次回填多筆 state record。
  // options.resumeFromIndex：供 Retry 使用，跳過已成功取回＋寫入的項目
  // （傳入 manifestItems.length 等於「全部都已取回，只重跑 Matching」）。
  // Matching 呼叫本身若拋出例外，會被獨立標記為 stage:'matching'（與
  // fetch_write 失敗區分），因為 Processed 檔案這時已經全部正確寫入磁碟，
  // 不需要、也不應該重新取回任何內容。
  // 去背失敗獨立分類（Bug Fix）：從 Manifest item 取出 assetKeys[]（同一原
  // 始檔案可能對應多個 assetKey，寫法與既有 Matching 函式的一對多回填規則
  // 一致，見 js/asset-pipeline-state.js）。
  function assetKeysOfManifestItem(item) {
    if (item && Array.isArray(item.assetKeys) && item.assetKeys.length) return item.assetKeys;
    if (item && item.assetKey) return [item.assetKey];
    return [];
  }

  function runAutoImport(pipelineState, manifest, executionId, getAssetFolderHandle, options) {
    options = options || {};
    var resumeFromIndex = options.resumeFromIndex > 0 ? options.resumeFromIndex : 0;

    if (!manifest || !Array.isArray(manifest.items) || !manifest.items.length) {
      return Promise.reject(new Error('empty_manifest'));
    }
    if (!global.BNAssetPipelineState || typeof global.BNAssetPipelineState.importProcessedAssetsByManifestItems !== 'function') {
      return Promise.reject(new Error('importProcessedAssetsByManifestItems not available'));
    }

    // 去背失敗獨立分類（Bug Fix）：options.itemResults 是 Orchestrator 從
    // Status Contract 的 lastResult.itemResults 轉交下來的逐張成功/失敗
    // （見 spx_ad_runtime.py 與 ai-workflow-orchestrator.js）。status
    // === 'error' 的 index，代表 Photoshop 本身就沒有產生這張的結果，完全
    // 不嘗試下載，也不會被當成「下載/寫入失敗」處理。不傳這個選項時（例如
    // 舊呼叫方、或整批 Completed 沒有任何失敗），行為與修改前完全相同。
    var itemResults = Array.isArray(options.itemResults) ? options.itemResults : null;
    var failedIndexSet = null;
    if (itemResults && itemResults.length) {
      failedIndexSet = {};
      itemResults.forEach(function (entry) {
        if (!entry || entry.status !== 'error') return;
        var idx = parseInt(entry.assetId, 10);
        if (!isNaN(idx)) failedIndexSet[idx] = true;
      });
      if (!Object.keys(failedIndexSet).length) failedIndexSet = null;
    }

    // 只有真的成功取回＋寫入的項目，才能交給 Matching 函式（它會直接假設
    // manifest item 對應的檔案已經寫好，見 importProcessedAssetsByManifestItems()），
    // 否則會誤把「Photoshop 確定失敗、根本沒有下載」的項目也標成已處理。
    var succeededManifestItems = failedIndexSet
      ? manifest.items.filter(function (_item, index) { return !failedIndexSet[index]; })
      : manifest.items;

    return fetchAndWriteAllResults(executionId, manifest.items, getAssetFolderHandle, resumeFromIndex, failedIndexSet).then(
      function (writeResult) {
        var matchResult;
        try {
          matchResult = global.BNAssetPipelineState.importProcessedAssetsByManifestItems(
            pipelineState,
            succeededManifestItems,
            { sourceFolderName: manifest.sourceFolderName || '' }
          );
        } catch (matchErr) {
          var wrapped = new Error('matching_failed');
          wrapped.stage = 'matching';
          // Matching 失敗時，Processed 檔案本身已經全部正確寫入磁碟——把這次
          // 呼叫寫入的 Handle 一併夾帶出去，不因為 Matching 這一步失敗就遺漏
          // 已經成功的寫入結果。
          wrapped.writtenEntries = writeResult && writeResult.writtenEntries;
          throw wrapped;
        }

        // 去背失敗獨立分類（Bug Fix）：把 Photoshop 確定失敗的素材標成
        // background_removal_failed；markBackgroundRemovalFailed() 內部會
        // 檢查每筆 record 是否已經有 processedAsset——已經成功過、這次
        // Rerun 又失敗的，不會被動到，維持既有處理結果（見 Proposal 第 5
        // 節第 5 點）。用 matchResult.state（而不是原本可能是 null 的
        // pipelineState 參數）確保標記寫進同一個物件參照。
        if (failedIndexSet && global.BNAssetPipelineState.markBackgroundRemovalFailed) {
          var failedAssetKeys = [];
          manifest.items.forEach(function (item, index) {
            if (!failedIndexSet[index]) return;
            failedAssetKeys = failedAssetKeys.concat(assetKeysOfManifestItem(item));
          });
          if (failedAssetKeys.length) {
            var markResult = global.BNAssetPipelineState.markBackgroundRemovalFailed(
              matchResult.state || pipelineState,
              failedAssetKeys
            );
            if (markResult && markResult.state) matchResult.state = markResult.state;
          }
        }

        // Stage 2 Root Cause Fix：把本次呼叫實際寫入的 FileSystemFileHandle
        // 清單附在成功回傳值上，供 Orchestrator 轉交給 src/app.js 填入
        // processedAssetIndex（Review Workspace 實際讀取圖片內容的既有快
        // 取），不修改 Matching 函式本身、不修改其回傳值原本的欄位。
        matchResult.writtenEntries = writeResult && writeResult.writtenEntries;
        return matchResult;
      }
    );
  }

  global.BNAIWorkflowAutoImport = {
    expectedProcessedFilesFromManifest: expectedProcessedFilesFromManifest,
    runAutoImport: runAutoImport,
  };
})(window);
