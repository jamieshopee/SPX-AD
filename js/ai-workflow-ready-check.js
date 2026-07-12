// AI Workflow — Ready Check Controller
// Coding Phase 1／7：Ready Check Integration
//
// 依據（Locked，不重新設計）：
//   docs/proposals/AI-Workflow-Proposal.md（Product Proposal, Frozen）
//   AI Workflow Implementation Proposal（Revision 01, Frozen — 本次對話）
//
// 本檔案範圍（Phase 1／7）：
//   - 串接 SPX AD Runtime 的 Ready Contract（GET /ready）
//   - 持有 Ready Check 自己的 Runtime-only Workflow State（純記憶體，
//     不寫入 Project State、localStorage 或任何 Schema）
//   - 顯示／隱藏「請先開啟 Photoshop」/「重新檢查」提示
//   - 使用者按下「重新檢查」後重新呼叫一次 Ready
//
// 本檔案不得（Locked Boundary，本 Phase 不可跨越）：
//   - 建立或送出 Manifest、呼叫 Execute Contract
//   - 實作 Processing Mode 或 Global Interaction Lock
//   - 實作 Status Polling、Auto Import、Auto Open Review Workspace、
//     Rerun Workflow，或完整 Error / Recovery 流程、Partial Failure
//   - 知道或引用 AppleScript、JSX、macOS Adapter、Windows Adapter，或任何
//     SPX AD Runtime 內部／平台實作細節——本檔案只知道 Ready Contract
//     這一個 HTTP 端點的形狀：GET http://127.0.0.1:8901/ready
//     -> { ready: boolean, reason?: string }
//   - 讀寫 jobs / assetFolderName / assetIndex 等既有 Control Center 狀態
//     （是否觸發 Ready Check 的判斷留在 src/app.js，由呼叫方決定何時呼叫
//     runReadyCheck()，本模組本身完全不知道 CSV / 素材資料夾的存在）
//
// 因此：Ready Check 失敗時，CSV、素材資料夾與目前設定自然被保留——本模組
// 從未持有、也從未修改那些狀態。

(function (global) {
  'use strict';

  if (global.BNAIWorkflowReadyCheck) return;

  var READY_ENDPOINT = 'http://127.0.0.1:8901/ready';

  // Runtime-only Workflow State（僅供 Ready Check 自身使用；純記憶體，
  // 重新整理頁面即消失，不代表需要恢復機制——本 Phase 未涵蓋 Resume/
  // Rehydrate，那屬於後續 Phase 的 Error/Recovery 範圍）。
  var state = {
    status: 'idle', // 'idle' | 'checking' | 'ready' | 'not_ready'
    reason: null,
  };

  var dom = null; // lazily resolved banner DOM refs

  function resolveDom() {
    if (dom) return dom;
    var container = document.getElementById('ai-workflow-ready-check-banner');
    if (!container) return null;
    var retryBtn = document.getElementById('ai-workflow-ready-check-retry-btn');
    dom = { container: container, retryBtn: retryBtn };
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        runReadyCheck();
      });
    }
    return dom;
  }

  function render() {
    var refs = resolveDom();
    if (!refs) return;
    var showBanner = state.status === 'not_ready';
    refs.container.hidden = !showBanner;
    if (refs.retryBtn) {
      refs.retryBtn.disabled = state.status === 'checking';
    }
  }

  function queryRuntimeReady() {
    return fetch(READY_ENDPOINT, { method: 'GET' })
      .then(function (res) {
        if (!res.ok) return { ready: false, reason: 'unreachable' };
        return res.json().then(function (data) {
          return data && typeof data === 'object' ? data : { ready: false, reason: 'unreachable' };
        });
      })
      .catch(function () {
        // SPX AD Runtime 無法連線（例如尚未啟動）。本 Phase 將此情況與
        // 「Photoshop 未開啟」一視同仁，顯示同一組提示——是否需要區分兩者
        // 是 Product Proposal 中已標記為待處理的 Architecture Question，
        // 本 Phase 不展開討論或實作區分邏輯。
        return { ready: false, reason: 'unreachable' };
      });
  }

  function runReadyCheck() {
    state.status = 'checking';
    render();
    return queryRuntimeReady().then(function (result) {
      if (result.ready) {
        state.status = 'ready';
        state.reason = null;
      } else {
        state.status = 'not_ready';
        state.reason = result.reason || 'unknown';
      }
      render();
      return state.status === 'ready';
    });
  }

  function getState() {
    return { status: state.status, reason: state.reason };
  }

  global.BNAIWorkflowReadyCheck = {
    runReadyCheck: runReadyCheck,
    getState: getState,
  };
})(window);
