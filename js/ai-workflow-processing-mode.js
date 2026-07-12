// AI Workflow — Processing Mode Controller ／ Global Interaction Lock
// Coding Phase 2／7 建立：Manifest Send + Processing Mode
// Coding Phase 3／7 擴充：Status Polling + Auto Import（新增 updateProgress()）
// Coding Phase 4 擴充：Auto Open Review Workspace（新增 showCompleted()）
// Phase 6 擴充：Error / Recovery Hardening（新增 showRecovery()／
//   hideRecovery()）——可復原的失敗狀態下，Global Interaction Lock 依然
//   維持（overlay／disabled 元件都不變），但額外顯示一個獨立、固定定位、
//   z-index 高於 Lock Overlay 的 Recovery Banner（訊息 + 單一動作按鈕），
//   讓使用者可以點擊該按鈕觸發 Retry，而不需要、也不能操作被鎖定的其他既
//   有 UI（不開放修改文字、切換工單、下載、匯入 CSV、選素材資料夾或開始新
//   Workflow）。Recovery Banner 本身與 Lock 的 enter()／exit() 生命週期是
//   分開的：即使 Lock 尚未進入（例如 Ready Check／Execute 失敗都發生在
//   enter() 之前），Recovery Banner 一樣可以獨立顯示——它純粹是「有沒有可
//   復原的失敗要顯示」的呈現層，不代表 Lock 狀態本身。exit() 時一併呼叫
//   hideRecovery()，確保成功解鎖後不會留下殘留的 Recovery 提示。
//
// 依據（Locked，不重新設計）：
//   docs/proposals/AI-Workflow-Proposal.md 第 3.1 節（Processing Mode 是
//   Global Interaction Lock 與 Workflow State，不是單純狀態顯示）
//   AI Workflow Implementation Proposal（Revision 01, Frozen）第 4／5 節
//
// 本檔案範圍（Phase 2／7 + Phase 3／7）：
//   - Execute Accepted 後，立即鎖定整個 Control Center（Global Interaction
//     Lock），並顯示「素材處理中」。
//   - updateProgress(current, total)：依 Status Polling 直接回傳的
//     current／total 更新為「素材處理中（N / M）」，不從 assetPipelineState
//     推算（見 Phase 3 Coding 邊界）。
//   - 提供 exit()，供後續 Phase（Auto Open Review Workspace，Phase 4）呼叫
//     以解除鎖定——Phase 3 本身仍不會呼叫 exit()：Completed 之後進入
//     AutoImporting／AutoImportSucceeded 期間，Global Interaction Lock
//     必須持續維持，直到「已可交給 Phase 4 開啟 Review Workspace」為止。
//
// Global Interaction Lock 實作方式（至少涵蓋題目列出的每一項）：
//   1. 一個覆蓋全畫面的透明 Overlay（position:fixed; inset:0），擋下所有
//      滑鼠／觸控對其下所有既有 UI（含 topbar、工單列表、預覽區、控制
//      面板、動態注入的 Logo／商品圖／1人+1品 UI）的互動——不需要逐一去
//      認識 bn-editor-plugin.js 等外掛動態注入的元素，Overlay 本身就已經
//      擋住整個畫面。
//   2. 針對已知、靜態存在於 index.html 的可互動元件，額外明確設定
//      disabled=true（雙重保障，也讓鍵盤 Tab 到的元件呈現正確的
//      disabled 狀態，而不只是視覺上被蓋住）。
//   3. 進入 Processing Mode 時主動 blur() 目前的 focus 元素，避免使用者
//      在鎖定當下仍停留在某個輸入框繼續打字。
//
// 本檔案不得：
//   - 修改 Review Workspace、Control Center UI Upgrade 既有 header/entry
//     結構本身（本檔案只新增獨立的 banner／overlay，不改動既有元素）。
//   - 實作 Status Polling、Progress N/M、Auto Import、Auto Open Review
//     Workspace、Rerun Workflow。
//   - 新增任何持久化 Workflow State 或 Project State schema——本模組的鎖定
//     狀態純粹是記憶體變數，重新整理頁面即消失。

(function (global) {
  'use strict';

  if (global.BNAIWorkflowProcessingMode) return;

  // Global Interaction Lock 期間，至少必須擋下的既有元件（見 index.html）。
  var LOCK_ELEMENT_IDS = [
    'import-btn', 'import-file',               // 匯入 CSV
    'import-state-btn', 'import-state-file',   // 匯入暫存
    'folder-btn',                              // 選擇或更換素材資料夾
    'add-job-btn',                             // 新增／變更工單列表
    'asset-review-menu-btn',                   // 開啟素材審核選單
    'processed-folder-btn', 'rerun-manifest-btn', 'review-assets-btn', // 開啟素材審閱／相關動作
    'placement-select', 'template-select', 'style-select', // 切換 Style／版位／模板
    'field-headline', 'field-subheadline', 'field-disclaimer', 'apply-record', // 修改文字
    'download-btn', 'single-state-btn', 'batch-btn', // 下載
    'reset-workspace-btn',                     // 開始新的 Workflow（重設工作區）
  ];

  var active = false;
  var dom = null;
  var recoveryDom = null;
  var previousDisabled = null; // 記錄鎖定前各元件原本的 disabled 狀態，解除時還原

  var DEFAULT_BANNER_TEXT = '素材處理中';
  var COMPLETE_TEXT = '素材處理完成';

  function resolveDom() {
    if (dom) return dom;
    var banner = document.getElementById('ai-workflow-processing-banner');
    var overlay = document.getElementById('ai-workflow-processing-lock-overlay');
    var progressText = document.getElementById('ai-workflow-processing-banner-text');
    if (!banner || !overlay) return null;
    dom = { banner: banner, overlay: overlay, progressText: progressText };
    return dom;
  }

  function resolveRecoveryDom() {
    if (recoveryDom) return recoveryDom;
    var banner = document.getElementById('ai-workflow-recovery-banner');
    var messageEl = document.getElementById('ai-workflow-recovery-message');
    var actionBtn = document.getElementById('ai-workflow-recovery-action-btn');
    if (!banner || !messageEl || !actionBtn) return null;
    recoveryDom = { banner: banner, messageEl: messageEl, actionBtn: actionBtn };
    return recoveryDom;
  }

  function setLockedState(locked) {
    previousDisabled = previousDisabled || {};
    LOCK_ELEMENT_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (locked) {
        previousDisabled[id] = el.disabled;
        el.disabled = true;
      } else if (Object.prototype.hasOwnProperty.call(previousDisabled, id)) {
        el.disabled = previousDisabled[id];
      }
    });
    if (!locked) previousDisabled = null;
  }

  function enter() {
    if (active) return;
    active = true;
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    setLockedState(true);
    var refs = resolveDom();
    if (refs) {
      if (refs.progressText) refs.progressText.textContent = DEFAULT_BANNER_TEXT; // 重置，避免顯示上一輪殘留的 N/M
      refs.banner.hidden = false;
      refs.overlay.hidden = false;
    }
  }

  // Progress 必須直接使用 Status Contract 回傳的 current／total（Phase 3
  // Coding 邊界），本函式不讀取、也不推算 assetPipelineState。
  function updateProgress(current, total) {
    var refs = resolveDom();
    if (!refs || !refs.progressText) return;
    if (current == null || total == null) return;
    refs.progressText.textContent = DEFAULT_BANNER_TEXT + '（' + current + ' / ' + total + '）';
  }

  // Phase 4：AutoImportSucceeded 之後顯示「素材處理完成」，僅為 UI 轉場
  // 文字，不是完成判定依據（判定本身已經由 Orchestrator 的 Workflow State
  // 完成，這裡只是把已經確定的結果顯示出來）。不解除 Lock、不開啟 Review
  // Workspace——那些是呼叫方（Orchestrator）的職責。
  function showCompleted() {
    var refs = resolveDom();
    if (!refs || !refs.progressText) return;
    refs.progressText.textContent = COMPLETE_TEXT;
  }

  function exit() {
    if (!active) return;
    active = false;
    setLockedState(false);
    var refs = resolveDom();
    if (refs) {
      if (refs.progressText) refs.progressText.textContent = DEFAULT_BANNER_TEXT;
      refs.banner.hidden = true;
      refs.overlay.hidden = true;
    }
    hideRecovery();
  }

  function isActive() {
    return active;
  }

  // Phase 6：顯示 Recovery Banner（訊息 + 單一動作按鈕）。與 Lock 的
  // enter()／exit() 無關——可能在 Lock 尚未進入時就顯示（例如 Ready
  // Check／Execute 失敗），也可能在 Lock 仍持續維持時顯示（例如
  // Processing 期間發生的各種失敗）。onAction 用 el.onclick 賦值（而不是
  // addEventListener），每次呼叫都會乾淨地取代前一次的 handler，不會疊加
  // 出多個重複綁定。
  function showRecovery(message, actionLabel, onAction) {
    var refs = resolveRecoveryDom();
    if (!refs) return;
    refs.messageEl.textContent = message || '';
    refs.actionBtn.textContent = actionLabel || '重試';
    refs.actionBtn.onclick = typeof onAction === 'function' ? onAction : null;
    refs.banner.hidden = false;
  }

  function hideRecovery() {
    var refs = resolveRecoveryDom();
    if (!refs) return;
    refs.banner.hidden = true;
    refs.actionBtn.onclick = null;
  }

  global.BNAIWorkflowProcessingMode = {
    enter: enter,
    exit: exit,
    updateProgress: updateProgress,
    showCompleted: showCompleted,
    showRecovery: showRecovery,
    hideRecovery: hideRecovery,
    isActive: isActive,
    LOCK_ELEMENT_IDS: LOCK_ELEMENT_IDS.slice(),
  };
})(window);
