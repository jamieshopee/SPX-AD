// AI Workflow — Recovery Presentation（Coding Phase 6／7：Error / Recovery
// Hardening，本檔案為本輪新增）
//
// 依據（Locked，不重新設計）：
//   AI Workflow Implementation Proposal（Revision 01, Frozen）
//   本次 Phase 6 指示的「使用者文案原則」（僅允許的字彙清單）
//
// 本檔案是「統一 Recovery State Model」的唯一呈現層：一個 phase 字串
// （＋最小必要的 context：failureReason／permissionDenied）對應到唯一一組
// {message, actionLabel, actionKind}。本檔案完全不知道、也不實作任何一種
// Retry 的實際機制——那些全部集中在 js/ai-workflow-orchestrator.js 的
// retry(kind)，本檔案只負責「決定要顯示什麼、按下按鈕要送出哪個 kind」，
// 避免 Error／Recovery 邏輯散落成多套重複流程。
//
// 使用者文案只使用本次指示明確允許的字彙組合（不得出現 Manifest／
// assetKey／Runtime Job Folder／Workspace path／HTTP 狀態碼／Python
// traceback／COM／AppleScript／JSX 等技術細節）：
//   訊息：請先開啟 Photoshop／Photoshop 已關閉／素材處理失敗／
//         部分素材處理失敗／無法寫入處理結果／無法開啟素材審閱
//   按鈕：重試／重新檢查／重新授權／重新開啟素材審閱
//
// 本檔案不得：
//   - 直接操作任何 DOM——顯示交給 js/ai-workflow-processing-mode.js 的
//     showRecovery()／hideRecovery()，本檔案只回傳資料。
//   - 直接呼叫 fetch／Execution／Auto Import／Status Polling 等任何一個
//     Runtime 溝通函式——一律透過
//     window.BNAIWorkflowOrchestrator.retry(actionKind)。
//   - 修改 Review Workspace、Canvas、Thumbnail、Batch、layoutStates、
//     Project State schema、Approved Asset Resolver。

(function (global) {
  'use strict';

  if (global.BNAIWorkflowRecovery) return;

  var MSG_READY_CHECK = 'Photoshop 已關閉。請重新開啟 Photoshop。開啟後按「重新檢查」即可繼續。';
  var MSG_GENERIC_FAILED = '素材處理失敗。';
  var MSG_PARTIAL_FAILED = '部分素材處理失敗。';
  var MSG_WRITE_FAILED = '無法寫入處理結果。';
  var MSG_REVIEW_OPEN_FAILED = '無法開啟素材審閱。';

  var LABEL_RETRY = '重試';
  var LABEL_RECHECK = '重新檢查';
  var LABEL_REAUTH = '重新授權';
  var LABEL_REOPEN_REVIEW = '重新開啟素材審閱';

  // phase 字串 -> presentation。First Run／Rerun 只差在 phase 字串前綴
  // （'Rerun...'），文案與動作完全相同，因此用去除前綴後的「base」比對，
  // 不需要維護兩份對照表。
  function baseKeyOf(phaseName) {
    return phaseName.indexOf('Rerun') === 0 ? phaseName.slice(5) : phaseName;
  }

  function presentationFor(phaseName, context) {
    context = context || {};
    var base = baseKeyOf(phaseName);

    switch (base) {
      case 'ReadyCheckFailed':
        return { message: MSG_READY_CHECK, actionLabel: LABEL_RECHECK, actionKind: 'fullBatch' };

      case 'ExecuteRejected':
      case 'ManifestConflict':
        return { message: MSG_GENERIC_FAILED, actionLabel: LABEL_RETRY, actionKind: 'fullBatch' };

      case 'AssetUploadFailed':
        return { message: MSG_GENERIC_FAILED, actionLabel: LABEL_RETRY, actionKind: 'upload' };

      case 'PartialFailureDetected':
        return { message: MSG_PARTIAL_FAILED, actionLabel: LABEL_RETRY, actionKind: 'fullBatch' };

      case 'Failed':
        if (context.failureReason === 'photoshop_closed') {
          return { message: MSG_READY_CHECK, actionLabel: LABEL_RECHECK, actionKind: 'fullBatch' };
        }
        return { message: MSG_GENERIC_FAILED, actionLabel: LABEL_RETRY, actionKind: 'fullBatch' };

      case 'PollingUnavailable':
        return { message: MSG_GENERIC_FAILED, actionLabel: LABEL_RETRY, actionKind: 'polling' };

      case 'ExecutionLost':
        return { message: MSG_GENERIC_FAILED, actionLabel: LABEL_RETRY, actionKind: 'fullBatch' };

      case 'ResultFetchFailed':
        return {
          message: MSG_WRITE_FAILED,
          actionLabel: context.permissionDenied ? LABEL_REAUTH : LABEL_RETRY,
          actionKind: 'resultFetch',
        };

      case 'ResultUnavailable':
        // Runtime 端該筆結果已被清理，不可能再取回——唯一還能往前走的路是
        // 整批重新開始，誠實顯示，不假裝可以「補」。
        return { message: MSG_WRITE_FAILED, actionLabel: LABEL_RETRY, actionKind: 'fullBatch' };

      case 'MatchingFailed':
        return { message: MSG_GENERIC_FAILED, actionLabel: LABEL_RETRY, actionKind: 'matching' };

      case 'ReviewOpenFailed':
        return { message: MSG_REVIEW_OPEN_FAILED, actionLabel: LABEL_REOPEN_REVIEW, actionKind: 'reviewOpen' };

      default:
        return null; // 不是可復原的失敗狀態，不顯示 Recovery UI
    }
  }

  function getPresentation() {
    if (!global.BNAIWorkflowOrchestrator || typeof global.BNAIWorkflowOrchestrator.getRecoveryContext !== 'function') {
      return null;
    }
    var ctx = global.BNAIWorkflowOrchestrator.getRecoveryContext();
    if (!ctx || !ctx.phase) return null;
    return presentationFor(ctx.phase, ctx);
  }

  // 按下 Recovery Banner 的動作按鈕時呼叫——不重新實作 Retry，只是把目前
  // presentation 決定的 actionKind 轉送給唯一的實際執行者。
  function retry() {
    var presentation = getPresentation();
    if (!presentation) return false;
    if (!global.BNAIWorkflowOrchestrator || typeof global.BNAIWorkflowOrchestrator.retry !== 'function') return false;
    return global.BNAIWorkflowOrchestrator.retry(presentation.actionKind);
  }

  global.BNAIWorkflowRecovery = {
    getPresentation: getPresentation,
    retry: retry,
  };
})(window);
