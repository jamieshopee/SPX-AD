/**
 * AD 電子版位管理器 — 控制中心
 * 直接對 canvas.html iframe 通訊（兩層架構）
 * BUILD: 20260701t
 */
console.log('[CC] app.js BUILD 20260701t loaded');

// ══════════════════════════════════════════════════════
//  1. DOM 參照
// ══════════════════════════════════════════════════════
const el = {
  placement:        document.querySelector('#placement-select'),
  template:         document.querySelector('#template-select'),
  style:            document.querySelector('#style-select'),
  frame:            document.querySelector('#canvas-frame'),
  previewLoader:    document.querySelector('#preview-loader'),
  statusText:       document.querySelector('#system-status .status-text'),
  statusPill:       document.querySelector('#system-status'),
  jobList:          document.querySelector('#job-list'),
  addJobBtn:        document.querySelector('#add-job-btn'),
  importBtn:        document.querySelector('#import-btn'),
  importFile:       document.querySelector('#import-file'),
  importStateBtn:    document.querySelector('#import-state-btn'),
  importStateFile:   document.querySelector('#import-state-file'),
  assetReviewMenuBtn: document.querySelector('#asset-review-menu-btn'),
  assetReviewMenu:    document.querySelector('#asset-review-menu'),
  assetReviewEntryText: document.querySelector('#asset-review-entry-text'),
  manifestBtn:       document.querySelector('#manifest-btn'),
  rerunManifestBtn:  document.querySelector('#rerun-manifest-btn'),
  processedFolderBtn: document.querySelector('#processed-folder-btn'),
  reviewAssetsBtn:   document.querySelector('#review-assets-btn'),
  folderBtn:        document.querySelector('#folder-btn'),
  folderStatus:     document.querySelector('#folder-status'),
  folderStatusText: document.querySelector('#folder-status-text'),
  csvStatus:        document.querySelector('#csv-status'),
  csvStatusText:    document.querySelector('#csv-status-text'),
  applyRecord:      document.querySelector('#apply-record'),
  captureBtn:       document.querySelector('#capture-btn'),
  downloadBtn:      document.querySelector('#download-btn'),
  singleStateBtn:    document.querySelector('#single-state-btn'),
  projectZipBtn:    document.querySelector('#project-zip-btn'),
  batchBtn:         document.querySelector('#batch-btn'),
  resetWorkspaceBtn: document.querySelector('#reset-workspace-btn'),
  jobPanel:         document.querySelector('#job-panel'),
  validationPanel:  document.querySelector('#validation-panel'),
  validationErrors: document.querySelector('#validation-errors'),
  // logo-file-list / product-file-list 由 plugin 接管，不再需要 DOM ref
  batchModal:       document.querySelector('#batch-modal'),
  batchCancelBtn:   document.querySelector('#batch-cancel-btn'),
  batchProgressBar: document.querySelector('#batch-progress-bar'),
  batchProgressText:document.querySelector('#batch-progress-text'),
  batchJobLog:      document.querySelector('#batch-job-log'),
  resetModal:       document.querySelector('#reset-modal'),
  resetCloseBtn:    document.querySelector('#reset-close-btn'),
  resetCancelBtn:   document.querySelector('#reset-cancel-btn'),
  resetConfirmBtn:  document.querySelector('#reset-confirm-btn'),
  fields: {
    headline:    document.querySelector('#field-headline'),
    subheadline: document.querySelector('#field-subheadline'),
    disclaimer:  document.querySelector('#field-disclaimer'),
  },
  counters: {
    headline:    document.querySelector('#count-headline'),
    subheadline: document.querySelector('#count-subheadline'),
    disclaimer:  document.querySelector('#count-disclaimer'),
  },
  qrCodeUrlInput:  document.querySelector('#field-qrcode-url'),
  qrCodeCheckLink: document.querySelector('#qrcode-check-link'),
  qrCodeStatus:    document.querySelector('#qrcode-status'),
};

// ══════════════════════════════════════════════════════
//  2. 狀態變數
// ══════════════════════════════════════════════════════
let registry        = null;
let activePlacement = null;
let activeTemplate  = null;
let frameReady      = false;
let pendingRecord   = null;
let layoutStateTarget = null;
let pendingLayoutStateRequest = null;
let canvasLoadSeq = 0;
let suppressLayoutStateWrites = false;

// 單品拖曳 overlay（仿 template-controls.js）
let previewScale          = 1;
let singleProductGeometry = null;
let singleProductDrag     = null;
let pendingManualSingleRenderCapture = null;
let dragOverlay           = null;

let jobs        = [];
let activeJobId = null;
let jobIdSeq    = 1;

let assetIndex      = {};
let assetFolderName = '';
let assetSourceMode = '';
// AI Workflow Phase 3 Correction：保留使用者第一次選擇的素材資料夾
// FileSystemDirectoryHandle（先前版本用完即棄），供 Auto Import 之後對它
// 呼叫 requestPermission({mode:'readwrite'}) 寫回真正的 Processed/——不要求
// 使用者第二次選擇資料夾，也不寫入 Project State（純 Runtime-only 記憶體
// 變數，重新整理頁面即消失）。
let assetFolderHandle = null;
let assetPipelineState = null;
let processedAssetIndex = {};
let reviewWorkspaceRerunAssetKeys = [];
const productMasterLayoutsByJobId = new Map();

let batchCancelled = false;
let _readyTimeout  = null;

let thumbnailTimer    = null;
let thumbnailInFlight = false;
let thumbnailDirty    = false;
let thumbnailPaused   = false;
let thumbnailTargetId = null;
let thumbnailQueueRunning = false;
let thumbnailQueueTimer   = null;
const thumbnailQueue      = [];
const JOB_LIST_THUMBNAILS_ENABLED = false;
const HIDDEN_FRAME_READY_TIMEOUT = 5000;
const HIDDEN_CAPTURE_TIMEOUT     = 30000;
const PLACEMENT_DISPLAY_ORDER = [
  'tvbn-smart-store',
  'tvbn-standard-store',
  'payment-phone-banner',
  'smart-payment-banner',
];
const PLACEMENT_DISPLAY_NAME_ORDER = [
  'TVBN-智取店_1080x1920',
  'TVBN-一般門市_1599x1080',
  '繳費機手機號碼輸入畫面下BN_984x309',
  '智取店繳費機 BN_3189x3992',
];

window.addEventListener('resize', () => { if (frameReady) fitPreview(); });

// ══════════════════════════════════════════════════════
//  3. 狀態提示
// ══════════════════════════════════════════════════════
function setStatus(msg, type = '') {
  el.statusPill.style.display = msg ? 'inline-flex' : 'none';
  el.statusText.textContent = msg;
  el.statusPill.className   = `status-badge ${type}`.trim();
}

function clearStatus() {
  setStatus('');
}

function setTopbarBadge(badge, textEl, text) {
  if (!badge || !textEl) return;
  if (!text) {
    badge.style.display = 'none';
    textEl.textContent = '—';
    return;
  }
  textEl.textContent = text;
  badge.className = 'status-badge success topbar-badge';
  badge.style.display = 'inline-flex';
}

function orderedPlacementsForDisplay(placements = []) {
  const orderById = new Map(PLACEMENT_DISPLAY_ORDER.map((id, index) => [id, index]));
  const orderByName = new Map(PLACEMENT_DISPLAY_NAME_ORDER.map((name, index) => [name, index]));
  return placements.slice().sort((a, b) => {
    const aOrder = orderById.has(a?.id) ? orderById.get(a.id) : orderByName.get(a?.name);
    const bOrder = orderById.has(b?.id) ? orderById.get(b.id) : orderByName.get(b?.name);
    const aRank = Number.isFinite(aOrder) ? aOrder : 1000 + placements.indexOf(a);
    const bRank = Number.isFinite(bOrder) ? bOrder : 1000 + placements.indexOf(b);
    return aRank - bRank;
  });
}

function getAssetReviewStats() {
  const summary = window.BNAssetPipelineState?.getReviewSummary?.(assetPipelineState) || null;
  const needsRerunCount = window.BNAssetPipelineState?.getNeedsRerunAssets?.(assetPipelineState)?.length || 0;
  const total = Number(summary?.total || 0);
  const reviewable = Number(summary?.reviewable || 0);
  const pendingReview = Number(summary?.processed || 0);
  const completed = Number(summary?.approved || 0) + Number(summary?.needs_rerun || 0);
  return { summary, total, reviewable, pendingReview, completed, needsRerunCount };
}

function formatAssetReviewEntryText(stats = getAssetReviewStats()) {
  if (stats.total && stats.reviewable < stats.total) {
    return `處理中（${stats.reviewable} / ${stats.total}）`;
  }
  if (stats.pendingReview > 0) {
    return `素材審核（已完成：${stats.completed}｜待審核：${stats.pendingReview}）`;
  }
  if (stats.reviewable > 0) {
    return `素材審核（${stats.reviewable}）`;
  }
  return '素材審核';
}

function setAssetReviewMenuOpen(open) {
  if (!el.assetReviewMenu || !el.assetReviewMenuBtn) return;
  el.assetReviewMenu.hidden = !open;
  el.assetReviewMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function updateAssetReviewControls() {
  const stats = getAssetReviewStats();
  if (el.assetReviewEntryText) {
    el.assetReviewEntryText.textContent = formatAssetReviewEntryText(stats);
  }
  if (el.manifestBtn) {
    el.manifestBtn.disabled = !jobs.length || !assetFolderName || !Object.keys(assetIndex || {}).length;
  }
  if (el.processedFolderBtn) {
    el.processedFolderBtn.disabled = !jobs.length;
  }
  if (el.rerunManifestBtn) {
    el.rerunManifestBtn.textContent = `重新去背素材（${stats.needsRerunCount}）`;
    el.rerunManifestBtn.disabled = stats.needsRerunCount <= 0;
    el.rerunManifestBtn.classList.toggle('is-disabled', stats.needsRerunCount <= 0);
  }
  if (el.reviewAssetsBtn) {
    el.reviewAssetsBtn.disabled = stats.reviewable <= 0;
  }
  return stats;
}

function scheduleActiveJobThumbnailUpdate(delay = 650) {
  if (!JOB_LIST_THUMBNAILS_ENABLED) return;
  if (thumbnailPaused || !frameReady || !activeJobId) return;
  thumbnailTargetId = activeJobId;
  clearTimeout(thumbnailTimer);
  thumbnailTimer = setTimeout(() => updateActiveJobThumbnail(thumbnailTargetId), delay);
}

function cloneLayoutState(state) {
  return state ? JSON.parse(JSON.stringify(state)) : null;
}

function summarizeProductsForTrace(products) {
  return (products || []).map((product, index) => ({
    index,
    id: product.id || '',
    filename: product.filename || '',
    position: product.position,
    left: product.left || '',
    top: product.top || '',
    width: product.width || '',
    height: product.height || '',
    rotation: product.rotation || 0,
    zIndex: product.zIndex || '',
    userAdjusted: !!product.userAdjusted,
  }));
}

function summarizeLayoutStateForTrace(state) {
  return {
    productsCount: state?.products?.length || 0,
    products: summarizeProductsForTrace(state?.products || []),
    hasPerson: !!state?.person && Object.keys(state.person || {}).length > 0,
    singleProduct: state?.singleProduct ? {
      left: state.singleProduct.left || '',
      top: state.singleProduct.top || '',
      width: state.singleProduct.width || '',
      height: state.singleProduct.height || '',
      rotation: state.singleProduct.rotation || 0,
      zIndex: state.singleProduct.zIndex || '',
      userAdjusted: !!state.singleProduct.userAdjusted,
    } : null,
  };
}

function traceLayoutState(label, job, key, state) {
  const meta = {
    job: job?.jobId || job?.id || '',
    key,
    placementId: job?.placementId || '',
    template: job?.template || job?.templateId || '',
    styleId: job?.styleId || '',
    hasLayoutStates: !!job?.layoutStates,
    layoutStateKeys: Object.keys(job?.layoutStates || {}),
    productsCount: state?.products?.length || 0,
  };
  const products = summarizeProductsForTrace(state?.products || []);
  console.log('[CC][trace][layout]', label, {
    ...meta,
    products,
    singleProduct: summarizeLayoutStateForTrace(state).singleProduct,
  });
  console.log('[CC][trace][layout:json]', label, JSON.stringify({ ...meta, products }));
  if (products.length) console.table(products);
}

function traceFrameLayout(label, frameWindow, job, key) {
  const state = readLayoutStateFromFrame(frameWindow);
  traceLayoutState(label, job, key, state);
  return state;
}

function traceFrameProductDom(label, frameWindow, job, key) {
  try {
    const doc = frameWindow?.document;
    const products = Array.from(doc?.querySelectorAll('.bn-prod-box') || []).map((box, index) => {
      const img = box.querySelector('img');
      const rect = box.getBoundingClientRect();
      const imgRect = img ? img.getBoundingClientRect() : null;
      const computed = frameWindow.getComputedStyle(box);
      return {
        index,
        id: box.dataset.id || '',
        filename: box.dataset.filename || '',
        position: Number(box.dataset.position) || 0,
        left: box.style.left || '',
        top: box.style.top || '',
        width: box.style.width || '',
        height: box.style.height || '',
        computedWidth: computed.width || '',
        computedHeight: computed.height || '',
        rectLeft: Math.round(rect.left * 100) / 100,
        rectTop: Math.round(rect.top * 100) / 100,
        rectWidth: Math.round(rect.width * 100) / 100,
        rectHeight: Math.round(rect.height * 100) / 100,
        imgRectWidth: imgRect ? Math.round(imgRect.width * 100) / 100 : '',
        imgRectHeight: imgRect ? Math.round(imgRect.height * 100) / 100 : '',
        imgNaturalWidth: img?.naturalWidth || 0,
        imgNaturalHeight: img?.naturalHeight || 0,
        objectFit: img ? frameWindow.getComputedStyle(img).objectFit : '',
        zIndex: box.style.zIndex || '',
        rotation: Number(box.dataset.rotation) || 0,
        userAdjusted: box.dataset.userAdjusted === '1',
      };
    });
    console.log('[CC][trace][layout-dom]', label, {
      job: job?.jobId || job?.id || '',
      key,
      productsCount: products.length,
      products,
    });
    console.log('[CC][trace][layout-dom:json]', label, JSON.stringify({ job: job?.jobId || job?.id || '', key, products }));
    if (products.length) console.table(products);
  } catch (error) {
    console.warn('[CC][trace][layout-dom] failed', label, error);
  }
}

function batchTrace(label, payload = {}) {
  console.log(label, payload);
  if (Array.isArray(payload.products)) {
    console.log(label + '_PRODUCTS_JSON stage=' + (payload.stage || ''), JSON.stringify(payload.products, null, 2));
    if (payload.products.length) console.table(payload.products);
  }
}

function batchTraceState(label, stage, job, key, state) {
  const products = summarizeProductsForTrace(state?.products || []);
  batchTrace(label, {
    stage,
    job: job?.jobId || job?.id || '',
    key,
    placementId: job?.placementId || '',
    template: job?.template || job?.templateId || '',
    productsCount: products.length,
    products,
  });
}

function batchTraceDom(label, stage, frameWindow, job, key) {
  try {
    const doc = frameWindow?.document;
    const products = Array.from(doc?.querySelectorAll('.bn-prod-box') || []).map((box, index) => {
      const img = box.querySelector('img');
      const rect = box.getBoundingClientRect();
      const imgRect = img ? img.getBoundingClientRect() : null;
      const computed = frameWindow.getComputedStyle(box);
      return {
        index,
        id: box.dataset.id || '',
        filename: box.dataset.filename || '',
        position: Number(box.dataset.position) || 0,
        left: box.style.left || '',
        top: box.style.top || '',
        width: box.style.width || '',
        height: box.style.height || '',
        computedWidth: computed.width || '',
        computedHeight: computed.height || '',
        rectWidth: Math.round(rect.width * 100) / 100,
        rectHeight: Math.round(rect.height * 100) / 100,
        imgRectWidth: imgRect ? Math.round(imgRect.width * 100) / 100 : '',
        imgRectHeight: imgRect ? Math.round(imgRect.height * 100) / 100 : '',
        imgNaturalWidth: img?.naturalWidth || 0,
        imgNaturalHeight: img?.naturalHeight || 0,
        objectFit: img ? frameWindow.getComputedStyle(img).objectFit : '',
        zIndex: box.style.zIndex || '',
        rotation: Number(box.dataset.rotation) || 0,
        userAdjusted: box.dataset.userAdjusted === '1',
      };
    });
    batchTrace(label, {
      stage,
      job: job?.jobId || job?.id || '',
      key,
      productsCount: products.length,
      products,
    });
  } catch (error) {
    console.warn(label, { stage, error });
  }
}

function layoutStateKeyForJob(job, placementId = job?.placementId || activePlacement?.id || '', templateId = job?.template || job?.templateId || activeTemplate?.id || 'template') {
  return `${placementId || ''}|${templateId || 'template'}`;
}

function getPlacementById(id) {
  return registry?.placements?.find(p => p.id === id) || null;
}

function getTemplateById(placement, templateId) {
  if (!placement?.templates?.length) return null;
  return placement.templates.find(t => t.id === templateId) || placement.templates[0] || null;
}

function normalizeRenderContext(renderContext = {}, styleId = '01') {
  const placement = getPlacementById(renderContext.placementId) || activePlacement || registry?.placements?.[0] || null;
  const template = getTemplateById(placement, renderContext.templateId || activeTemplate?.id || 'template');
  return {
    placementId: placement?.id || '',
    templateId: template?.id || 'template',
    styleId: normalizeStyleId(renderContext.styleId || styleId || '01'),
  };
}

function getActiveRenderContext(styleId = activeJob()?.styleId || '01') {
  return normalizeRenderContext({
    placementId: activePlacement?.id || el.placement?.value || '',
    templateId: activeTemplate?.id || el.template?.value || 'template',
    styleId,
  }, styleId);
}

function getTemplateForRenderContext(job, renderContext = getActiveRenderContext(job?.styleId || '01')) {
  const context = normalizeRenderContext(renderContext, job?.styleId || '01');
  const placement = getPlacementById(context.placementId) || activePlacement || defaultPlacementForJob();
  return getTemplateById(placement, context.templateId) || getTemplateForJob(job);
}

function layoutStateKeyForRenderContext(job, renderContext = getActiveRenderContext(job?.styleId || '01')) {
  const context = normalizeRenderContext(renderContext, job?.styleId || '01');
  return layoutStateKeyForJob(job, context.placementId, context.templateId);
}

function thumbnailContextKeyForRenderContext(job, renderContext = getActiveRenderContext(job?.styleId || '01')) {
  const context = normalizeRenderContext(renderContext, job?.styleId || '01');
  return [context.placementId, context.templateId, context.styleId].join('|');
}

function defaultPlacementForJob() {
  return activePlacement || registry?.placements?.find(p => p.id === el.placement?.value) || registry?.placements?.[0] || null;
}

function ensureJobPlacementTemplate(job) {
  if (!job) return job;
  const placement = registry?.placements?.find(p => p.id === job.placementId) || defaultPlacementForJob();
  if (placement && !job.placementId) job.placementId = placement.id;
  const templateId = job.template || job.templateId || '';
  const template = placement?.templates?.find(t => t.id === templateId) || placement?.templates?.[0] || null;
  if (template && (!job.template || !job.templateId)) {
    job.template = template.id;
    job.templateId = template.id;
  }
  const stableKey = layoutStateKeyForJob(job, job.placementId || '', job.template || job.templateId || 'template');
  if (stableKey !== '|template' && job.layoutStates?.['|template'] && !job.layoutStates[stableKey]) {
    job.layoutStates[stableKey] = cloneLayoutState(job.layoutStates['|template']) || {};
    console.log('[CC][trace][layout] migrated legacy layoutState key', {
      job: job.jobId || job.id,
      from: '|template',
      to: stableKey,
    });
  }
  return job;
}

function stableLayoutStateKeyForJob(job) {
  if (!job) return layoutStateKeyForJob(job);
  ensureJobPlacementTemplate(job);
  return layoutStateKeyForJob(job, job.placementId || '', job.template || job.templateId || 'template');
}

function getJobLayoutState(job, key = stableLayoutStateKeyForJob(job)) {
  if (!job) return null;
  const states = job.layoutStates || null;
  if (states && Object.keys(states).length) {
    return cloneLayoutState(states[key] || null);
  }
  return cloneLayoutState(job.layoutState || null);
}

function getJobLayoutStateStrict(job, key) {
  if (!job || !key) return null;
  if (job.layoutStates && Object.prototype.hasOwnProperty.call(job.layoutStates, key)) {
    return cloneLayoutState(job.layoutStates[key] || null);
  }
  const stableKey = stableLayoutStateKeyForJob(job);
  if (!job.layoutStates && key === stableKey) {
    return cloneLayoutState(job.layoutState || null);
  }
  return null;
}

function setJobLayoutState(job, state, key = stableLayoutStateKeyForJob(job)) {
  if (!job || !state) return;
  const copy = cloneLayoutState(state) || {};
  if (Array.isArray(copy.products) && Array.isArray(window._bnProducts)) {
    copy.products = copy.products.map(product => {
      const runtime = window._bnProducts.find(item => item.id === product.id)
        || window._bnProducts.find(item => Number(item.position) === Number(product.position));
      return runtime?.filename && !product.filename
        ? { ...product, filename: runtime.filename }
        : product;
    });
  }
  job.layoutState = copy;
  job.layoutStates = job.layoutStates || {};
  job.layoutStates[key] = cloneLayoutState(copy) || {};
  console.log('[CC][layoutState] saved', job.jobId || job.id, key, {
    products: copy.products?.length || 0,
    singleProductAdjusted: !!copy.singleProduct?.userAdjusted,
    keys: Object.keys(job.layoutStates),
  });
  traceLayoutState('setJobLayoutState:saved', job, key, copy);
}

function setMainFrameLayoutTarget(job, key = stableLayoutStateKeyForJob(job)) {
  layoutStateTarget = job ? { jobId: job.id, key } : null;
}

function exportableLayoutStatesForJob(job) {
  if (!job) return null;
  if (job.layoutStates && Object.keys(job.layoutStates).length) {
    return JSON.parse(JSON.stringify(job.layoutStates));
  }
  if (job.layoutState) {
    return { [stableLayoutStateKeyForJob(job)]: cloneLayoutState(job.layoutState) || {} };
  }
  return null;
}

function readLayoutStateFromFrame(frameWindow) {
  try {
    const doc = frameWindow?.document;
    if (!doc) return null;
    const products = Array.from(doc.querySelectorAll('.bn-prod-box')).map(box => ({
      id: box.dataset.id || '',
      filename: box.dataset.filename || '',
      position: Number(box.dataset.position) || 0,
      left: box.style.left || '',
      top: box.style.top || '',
      width: box.style.width || '',
      height: box.style.height || '',
      rotation: Number(box.dataset.rotation) || 0,
      zIndex: box.style.zIndex || '',
      userAdjusted: box.dataset.userAdjusted === '1',
    }));
    const personZone = doc.getElementById('bn-zone-person');
    const single = doc.querySelector('#bn-zone-singleprod .bn-single-product-box');
    const singleProduct = single ? {
      left: single.style.left || '',
      top: single.style.top || '',
      width: single.style.width || '',
      height: single.style.height || '',
      rotation: Number(single.dataset.rotation) || 0,
      zIndex: single.style.zIndex || '',
      userAdjusted: single.dataset.userAdjusted === '1',
      offsetX: Number(single.dataset.offsetX) || 0,
      offsetY: Number(single.dataset.offsetY) || 0,
    } : {};
    return {
      products,
      person: personZone ? {
        left: personZone.style.left || '',
        top: personZone.style.top || '',
      } : {},
      singleProduct,
    };
  } catch (error) {
    console.warn('[CC][layoutState] direct frame read failed:', error);
    return null;
  }
}

function forceSaveActiveLayoutStateFromFrame(reason = '') {
  const job = activeJob();
  const frameWindow = el.frame?.contentWindow;
  const key = job ? layoutStateKeyForRenderContext(job, getActiveRenderContext(job.styleId || '01')) : '';
  console.log('[CC][layoutState] force-read start', {
    reason,
    hasJob: !!job,
    job: job?.jobId || job?.id || '',
    frameReady,
    hasFrameWindow: !!frameWindow,
  });
  if (!job || !frameWindow) return false;
  const state = readLayoutStateFromFrame(frameWindow);
  console.log('[CC][layoutState] force-read result', {
    reason,
    products: state?.products?.length || 0,
    singleProduct: !!state?.singleProduct && Object.keys(state.singleProduct).length > 0,
  });
  if (!state) return false;
  setJobLayoutState(job, state, key);
  return true;
}

function applyLayoutStateToFrameDom(frameWindow, state, reason = '') {
  try {
    const doc = frameWindow?.document;
    if (!doc || !state) return false;
    let appliedProducts = 0;
    if (Array.isArray(state.products)) {
      const zoneBoxes = Array.from(doc.querySelectorAll('.bn-prod-box'));
      state.products.forEach(saved => {
        let box = saved.id ? zoneBoxes.find(item => item.dataset.id === saved.id) : null;
        if (!box && saved.filename) box = zoneBoxes.find(item => item.dataset.filename === saved.filename);
        if (!box) box = zoneBoxes.find(item => Number(item.dataset.position) === Number(saved.position));
        if (!box) return;
        if (saved.position !== undefined && saved.position !== null) box.dataset.position = String(saved.position);
        if (saved.left) box.style.left = saved.left;
        if (saved.top) box.style.top = saved.top;
        if (saved.width) box.style.width = saved.width;
        if (saved.height) box.style.height = saved.height;
        if (saved.zIndex) box.style.zIndex = saved.zIndex;
        box.dataset.rotation = String(Number(saved.rotation) || 0);
        box.style.transform = Number(saved.rotation) ? `rotate(${Number(saved.rotation)}deg)` : '';
        if (saved.userAdjusted) box.dataset.userAdjusted = '1';
        appliedProducts++;
      });
    }
    console.log('[CC][layoutState] restore-dom', {
      reason,
      products: state.products?.length || 0,
      appliedProducts,
    });
    return appliedProducts > 0;
  } catch (error) {
    console.warn('[CC][layoutState] restore-dom failed', reason, error);
    return false;
  }
}

async function updateActiveJobThumbnail(jobId = activeJobId) {
  if (thumbnailPaused || !frameReady || !jobId || jobId !== activeJobId) return;
  if (thumbnailInFlight) {
    thumbnailDirty = true;
    return;
  }
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;
  const contextKey = thumbnailContextKeyForJob(job);
  thumbnailInFlight = true;
  thumbnailDirty = false;
  try {
    await waitForFrameImages(el.frame.contentWindow, 4000);
    const dataUrl = await captureFromCanvasFrame(12000);
    if (dataUrl && jobs.some(j => j.id === job.id) && contextKey === thumbnailContextKeyForJob(job)) {
      job.thumbnail = await captureThumb(dataUrl);
      job.thumbnailContextKey = contextKey;
      job.thumbnailStatus = 'ready';
      renderJobList();
    }
  } catch (error) {
    console.warn('[CC] 縮圖更新失敗:', error);
  } finally {
    thumbnailInFlight = false;
    if (thumbnailDirty) scheduleActiveJobThumbnailUpdate(300);
  }
}

function idleDelay(ms = 80) {
  return new Promise(resolve => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: ms + 500 });
    } else {
      setTimeout(resolve, ms);
    }
  });
}

function enqueueThumbnail(jobId, priority = false, renderContext = null) {
  if (!JOB_LIST_THUMBNAILS_ENABLED) return;
  const job = jobs.find(j => j.id === jobId);
  const context = normalizeRenderContext(renderContext || getActiveRenderContext(job?.styleId || '01'), job?.styleId || '01');
  const template = getTemplateForRenderContext(job, context);
  const templatePath = ensureTemplatePath(template);
  if (!job || !templatePath) {
    console.warn('[CC][thumb] enqueue skipped', job?.jobId || jobId, 'missing templatePath');
    return;
  }
  thumbnailQueue.splice(0, thumbnailQueue.length, ...thumbnailQueue.filter(item => item.jobId !== jobId));
  job.thumbnailStatus = job.quickThumbnail ? 'quick' : 'pending';
  const queueItem = { jobId, renderContext: context };
  if (priority) thumbnailQueue.unshift(queueItem);
  else thumbnailQueue.push(queueItem);
  console.log('[CC][thumb] enqueue', job.jobId || job.id, 'priority=' + !!priority, 'queue=' + thumbnailQueue.map(item => {
    const queued = jobs.find(j => j.id === item.jobId);
    return queued?.jobId || item.jobId;
  }).join(','));
  renderJobList();
  startThumbnailQueue();
}

function enqueueAllThumbnails(priorityJobId = null) {
  if (!JOB_LIST_THUMBNAILS_ENABLED) return;
  if (!jobs.length) return;
  console.log('[CC][thumb] enqueue all jobs', jobs.map(job => job.jobId || job.id).join(','), 'priority=', jobs.find(j => j.id === priorityJobId)?.jobId || priorityJobId || 'none');
  const visibleIds = getVisibleJobIds();
  const ordered = jobs.slice().sort((a, b) => {
    if (a.id === priorityJobId) return -1;
    if (b.id === priorityJobId) return 1;
    const av = visibleIds.indexOf(a.id);
    const bv = visibleIds.indexOf(b.id);
    if (av !== -1 || bv !== -1) return (av === -1 ? 9999 : av) - (bv === -1 ? 9999 : bv);
    return jobs.indexOf(a) - jobs.indexOf(b);
  });
  ordered.forEach(job => enqueueThumbnail(job.id, job.id === priorityJobId, getActiveRenderContext(job.styleId || '01')));
}

function getVisibleJobIds() {
  const listRect = el.jobList.getBoundingClientRect();
  return Array.from(el.jobList.querySelectorAll('.job-card'))
    .filter(card => {
      const rect = card.getBoundingClientRect();
      return rect.bottom >= listRect.top && rect.top <= listRect.bottom;
    })
    .map(card => Number(card.dataset.jobId))
    .filter(Boolean);
}

function startThumbnailQueue() {
  if (thumbnailQueueRunning || thumbnailPaused) return;
  clearTimeout(thumbnailQueueTimer);
  thumbnailQueueTimer = setTimeout(processThumbnailQueue, 80);
}

async function processThumbnailQueue() {
  if (thumbnailQueueRunning || thumbnailPaused) return;
  thumbnailQueueRunning = true;
  try {
    while (thumbnailQueue.length && !thumbnailPaused) {
      const { jobId, renderContext } = thumbnailQueue.shift();
      const job = jobs.find(j => j.id === jobId);
      if (!job) continue;
      const context = normalizeRenderContext(renderContext || getActiveRenderContext(job.styleId || '01'), job.styleId || '01');
      const contextKey = thumbnailContextKeyForRenderContext(job, context);
      await idleDelay();
      try {
        console.log('[CC][thumb] thumbnail start', job.jobId || job.id, 'remaining=' + thumbnailQueue.length);
        const dataUrl = await generateJobThumbnail(job, context);
        if (dataUrl && jobs.some(j => j.id === job.id) && contextKey === thumbnailContextKeyForRenderContext(job, context)) {
          job.thumbnail = await captureThumb(dataUrl);
          job.thumbnailContextKey = contextKey;
          job.thumbnailStatus = 'ready';
          console.log('[CC][thumb] job.thumbnail set', job.jobId || job.id, 'len=' + job.thumbnail.length);
          updateJobListThumbnail(job.id, job.thumbnail);
          console.log('[CC][thumb] thumbnail finish', job.jobId || job.id);
        } else {
          job.thumbnailStatus = job.thumbnail ? 'ready' : 'idle';
          console.warn('[CC][thumb] thumbnail failed', job.jobId || job.id, 'empty snapshot');
        }
      } catch (error) {
        console.warn('[CC][thumb] thumbnail failed', job.jobId || job.id, error);
        job.thumbnailStatus = job.thumbnail ? 'ready' : 'idle';
      }
      renderJobList();
      await sleep(120);
    }
  } finally {
    thumbnailQueueRunning = false;
    if (thumbnailQueue.length && !thumbnailPaused) startThumbnailQueue();
  }
}

// ══════════════════════════════════════════════════════
//  4. 字數計算
// ══════════════════════════════════════════════════════
function countTextUnits(value) {
  return [...value].reduce((sum, ch) =>
    sum + (/^[\x00-\xff]$/.test(ch) ? 0.5 : 1), 0);
}
function updateCounters() {
  if (!activeTemplate) return;
  Object.entries(el.fields).forEach(([key, input]) => {
    const limit   = activeTemplate.fields[key]?.limit;
    const used    = countTextUnits(input.value);
    const counter = el.counters[key];
    counter.textContent = limit ? `${used}/${limit}` : `${used}`;
    counter.classList.toggle('over', Boolean(limit && used > limit));
  });
}

// ══════════════════════════════════════════════════════
//  5. 欄位別名正規化
// ══════════════════════════════════════════════════════
const FIELD_ALIASES = {
  headline:    ['主標', 'headline', 'title'],
  subheadline: ['副標', 'subheadline', 'subtitle'],
  disclaimer:  ['小字', 'disclaimer', '日期', '警語'],
};
function normalizeRecord(raw) {
  return Object.fromEntries(
    Object.entries(FIELD_ALIASES).map(([target, names]) => {
      const key = names.find(n => Object.hasOwn(raw, n));
      return [target, key ? String(raw[key] ?? '').trim() : ''];
    })
  );
}

// ══════════════════════════════════════════════════════
//  6. 文字欄位操作
// ══════════════════════════════════════════════════════
function fillFields(data) {
  Object.entries(el.fields).forEach(([key, input]) => {
    input.value = data[key] ?? '';
  });
  updateCounters();
  refreshQrCodeUiForJob(data);
}
function currentRecord() {
  return Object.fromEntries(
    Object.entries(el.fields).map(([key, input]) => [key, input.value.trim()])
  );
}

function recordHasText(record) {
  return Boolean(record && (record.headline || record.subheadline || record.disclaimer));
}

// ══════════════════════════════════════════════════════
//  6.5 QRCode 欄位操作（docs/proposals/QR-Code-Product-Proposal.md）
//  獨立於「套用文字到模板」按鈕之外，更新時機只有：貼上／Enter／失焦。
// ══════════════════════════════════════════════════════
function qrCodeStatusText(kind) {
  switch (kind) {
    case 'updated':   return '✓ QR Code 已更新';
    case 'unchanged': return '目前網址未變更';
    case 'removed':   return '✓ QR Code 已移除';
    case 'invalid':   return '⚠ 請輸入有效的網址（例如：https://example.com）';
    default:          return '';
  }
}

function setQrCodeStatus(kind) {
  if (el.qrCodeStatus) el.qrCodeStatus.textContent = qrCodeStatusText(kind);
}

function updateQrCodeCheckLink(normalizedUrl) {
  if (!el.qrCodeCheckLink) return;
  if (normalizedUrl) {
    el.qrCodeCheckLink.href = normalizedUrl;
    el.qrCodeCheckLink.removeAttribute('aria-disabled');
    el.qrCodeCheckLink.style.pointerEvents = '';
  } else {
    el.qrCodeCheckLink.href = '#';
    el.qrCodeCheckLink.setAttribute('aria-disabled', 'true');
    el.qrCodeCheckLink.style.pointerEvents = 'none';
  }
}

// 切換工單／CSV 匯入完成時的「靜默」刷新：合法網址不顯示狀態文字，
// 空值或非法網址顯示提示，但這不算使用者操作，不會出現「已更新」文案。
function refreshQrCodeUiForJob(data) {
  const raw = data?.qrCodeUrl ?? '';
  if (el.qrCodeUrlInput) el.qrCodeUrlInput.value = raw;
  const normalized = window.BNQrCodeUrl?.normalize(raw);
  updateQrCodeCheckLink(normalized || null);
  setQrCodeStatus(normalized ? 'silent' : 'invalid');
}

// 使用者主動編輯後提交（貼上／Enter／失焦皆呼叫此函式）。
function commitQrCodeUrl(rawValue) {
  const job = activeJob();
  if (!job) return;
  const previousNormalized = window.BNQrCodeUrl?.normalize(job.qrCodeUrl || '');
  const isEmpty = window.BNQrCodeUrl?.isEmpty(rawValue) ?? true;

  if (isEmpty) {
    if (previousNormalized) {
      job.qrCodeUrl = '';
      if (el.qrCodeUrlInput) el.qrCodeUrlInput.value = '';
      updateQrCodeCheckLink(null);
      applyQrCodeToCanvas(job);
      setQrCodeStatus('removed');
      scheduleActiveJobThumbnailUpdate();
    } else {
      updateQrCodeCheckLink(null);
      setQrCodeStatus('invalid');
    }
    return;
  }

  const normalized = window.BNQrCodeUrl?.normalize(rawValue);
  if (!normalized) {
    updateQrCodeCheckLink(null);
    setQrCodeStatus('invalid');
    return;
  }

  if (normalized === previousNormalized) {
    if (el.qrCodeUrlInput) el.qrCodeUrlInput.value = normalized;
    updateQrCodeCheckLink(normalized);
    setQrCodeStatus('unchanged');
    return;
  }

  job.qrCodeUrl = normalized;
  if (el.qrCodeUrlInput) el.qrCodeUrlInput.value = normalized;
  updateQrCodeCheckLink(normalized);
  applyQrCodeToCanvas(job);
  setQrCodeStatus('updated');
  scheduleActiveJobThumbnailUpdate();
}

function validateRecord(record) {
  if (!activeTemplate) return [];
  return Object.entries(activeTemplate.fields).reduce((errors, [key, cfg]) => {
    const used = countTextUnits(record[key] || '');
    if (cfg.limit && used > cfg.limit)
      errors.push(`${cfg.label}超過 ${cfg.limit} 字（${used} 字）`);
    return errors;
  }, []);
}

// ══════════════════════════════════════════════════════
//  7. postMessage 套用文字 → bn-text
// ══════════════════════════════════════════════════════
function sendRecord(record) {
  if (!activeJobId) { clearStatus(); return false; }
  if (!recordHasText(record)) { clearStatus(); return false; }
  const errors = validateRecord(record);
  if (errors.length) { setStatus(errors.join('；'), 'error'); return false; }
  if (!frameReady) { pendingRecord = record; setStatus('模板載入中，資料將自動套用。'); return true; }
  el.frame.contentWindow.postMessage({
    type: 'bn-text',
    data: {
      '主標可08個字以內':              record.headline    || '',
      '副標07個字以內':                record.subheadline || '',
      '不放案型日期或警語可在14個字':  record.disclaimer  || '',
    },
  }, '*');
  setStatus('已套用文字', 'success');
  scheduleActiveJobThumbnailUpdate();
  return true;
}

// ══════════════════════════════════════════════════════
//  9. 工具函式
// ══════════════════════════════════════════════════════
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleToDataUrl(handle) {
  const file = await handle.getFile();
  return fileToDataUrl(file);
}

function waitForFrameReady(timeout = 15000) {
  return new Promise((resolve, reject) => {
    if (frameReady) { resolve(); return; }
    const deadline = Date.now() + timeout;
    const t = setInterval(() => {
      if (frameReady) { clearInterval(t); resolve(); }
      else if (Date.now() > deadline) { clearInterval(t); reject(new Error('frame ready timeout')); }
    }, 120);
  });
}

function showInitialWorkspaceState() {
  activePlacement = null;
  activeTemplate = null;
  frameReady = false;
  pendingRecord = null;
  el.placement.replaceChildren(new Option('請先匯入 CSV', ''));
  el.placement.disabled = true;
  el.template.replaceChildren(new Option('—', ''));
  el.template.disabled = true;
  el.style?.replaceChildren(new Option('—', ''));
  if (el.style) el.style.disabled = true;
  el.frame.removeAttribute('src');
  el.frame.style.display = 'none';
  el.previewLoader.style.display = 'none';
  updateAssetReviewControls();
  clearStatus();
}

function clearBrowserStorage() {
  const tasks = [];
  try { localStorage.clear(); } catch (err) { console.warn('[CC][reset] localStorage clear failed:', err); }
  try { sessionStorage.clear(); } catch (err) { console.warn('[CC][reset] sessionStorage clear failed:', err); }
  try {
    if (window.indexedDB && typeof indexedDB.databases === 'function') {
      tasks.push(indexedDB.databases().then(dbs => Promise.all((dbs || [])
        .filter(db => db && db.name)
        .map(db => new Promise(resolve => {
          const req = indexedDB.deleteDatabase(db.name);
          req.onsuccess = req.onerror = req.onblocked = () => resolve();
        })))));
    }
  } catch (err) {
    console.warn('[CC][reset] IndexedDB clear failed:', err);
  }
  return Promise.allSettled(tasks);
}

async function resetWorkspaceState(options = {}) {
  const keepAssetsFolder = !!options.keepAssetsFolder;
  const canKeepAssets = keepAssetsFolder && assetSourceMode === 'folder';
  const preservedAssetIndex = canKeepAssets ? assetIndex : {};
  const preservedAssetFolderName = canKeepAssets ? assetFolderName : '';
  const preservedAssetSourceMode = canKeepAssets ? assetSourceMode : '';

  batchCancelled = true;
  clearThumbnailWork();

  jobs = [];
  productMasterLayoutsByJobId.clear();
  activeJobId = null;
  jobIdSeq = 1;
  activePlacement = null;
  activeTemplate = null;
  frameReady = false;
  pendingRecord = null;
  singleProductGeometry = null;
  singleProductDrag = null;

  assetIndex = preservedAssetIndex;
  assetFolderName = preservedAssetFolderName;
  assetSourceMode = preservedAssetSourceMode;
  assetPipelineState = null;
  processedAssetIndex = {};
  reviewWorkspaceRerunAssetKeys = [];
  updateNeedsRerunButton();
  updateAssetReviewControls();

  resetPluginRuntimeState();
  fillFields({});
  updateCounters();
  renderJobList();
  renderValidationPanel();
  renderAssetFileLists();
  setTopbarBadge(el.csvStatus, el.csvStatusText, '');
  setTopbarBadge(
    el.folderStatus,
    el.folderStatusText,
    assetSourceMode === 'folder' && assetFolderName
      ? `${assetFolderName}（${Object.keys(assetIndex).length}）`
      : ''
  );
  if (el.batchProgressBar) el.batchProgressBar.style.width = '0%';
  if (el.batchProgressText) el.batchProgressText.textContent = '準備中…';
  if (el.batchJobLog) el.batchJobLog.innerHTML = '';

  showInitialWorkspaceState();
  await clearBrowserStorage();
  thumbnailPaused = false;
  batchCancelled = false;
  console.log('[CC][reset] workspace state reset', {
    keepAssetsFolder,
    assetSourceMode,
    assetCount: Object.keys(assetIndex).length,
  });
}

function resetPluginRuntimeState() {
  window._bnProducts = [];
  window._bnLogos = [];
  window._bnLogoDataUrl = null;
  window._bnPerson = null;
  window._bnSingleProd = null;
  singleProductGeometry = null;
  singleProductDrag = null;
  if (dragOverlay) {
    dragOverlay.remove();
    dragOverlay = null;
  }
  if (typeof window._bnResetProdSlots === 'function') window._bnResetProdSlots();
  if (typeof window._bnRenderProdList === 'function') window._bnRenderProdList();
  if (typeof window._bnRenderLogoList === 'function') window._bnRenderLogoList();
  if (typeof window._bnUpdateMutualExclusion === 'function') window._bnUpdateMutualExclusion();
  if (typeof window._bnApplyMaterialAccordions === 'function') window._bnApplyMaterialAccordions(null, true);
}

function clearThumbnailWork() {
  clearTimeout(thumbnailTimer);
  clearTimeout(thumbnailQueueTimer);
  thumbnailQueue.length = 0;
  thumbnailInFlight = false;
  thumbnailDirty = false;
  thumbnailPaused = true;
  thumbnailTargetId = null;
  thumbnailQueueRunning = false;
}

async function resetWorkspace() {
  closeResetModal();
  closeBatchModal();
  await resetWorkspaceState({ keepAssetsFolder: false });
  if (el.importFile) el.importFile.value = '';
  if (el.importStateFile) el.importStateFile.value = '';
  console.log('[CC][reset] workspace reset complete');
}

function ensureWorkspaceReadyForJob() {
  if (!registry || activePlacement) return;
  el.placement.replaceChildren();
  const displayPlacements = orderedPlacementsForDisplay(registry.placements || []);
  displayPlacements.forEach(p => el.placement.add(new Option(p.name, p.id)));
  const first = displayPlacements.find(p => p.templates.length) || displayPlacements[0];
  if (!first) return;
  el.placement.disabled = false;
  el.placement.value = first.id;
  activePlacement = first;
  renderTemplateOptions(false);
}

// ══════════════════════════════════════════════════════
//  AI Workflow — 觸發判斷（Coding Phase 1／7 建立，Phase 2／7 擴充）
//  （Ready Check Controller／Manifest Build Orchestrator／Execution
//    Orchestrator／Processing Mode Controller 的實作都在各自的
//    js/ai-workflow-*.js；本函式只判斷既有的「CSV 已匯入 + 素材資料夾
//    已選擇」條件是否成立，實際協調流程交給 Workflow State Machine
//    （js/ai-workflow-orchestrator.js）處理，不在 src/app.js 內展開）
//
//  第三個參數傳入既有、未修改的 lookupAsset()（見下方，本檔案第 10 節）
//  ——它已經依 filename.trim().toLowerCase() 從既有 assetIndex 取得
//  FileSystemFileHandle，與 Manifest items[].source.filename ／
//  originalAsset.lookupKey（js/asset-pipeline-state.js 的
//  String(filename||'').trim().toLowerCase()）用的是同一套正規化規則。
//  這裡沒有新增素材索引、沒有複製既有查詢邏輯，只是把既有函式的參照多傳
//  一份給 Manifest Build Orchestrator 的 collectAssetPayloads() 使用。
// ══════════════════════════════════════════════════════
function maybeRunAiWorkflowReadyCheck() {
  const hasJobs = jobs.length > 0;
  const hasAssetFolder = !!assetFolderName && Object.keys(assetIndex).length > 0;
  if (hasJobs && hasAssetFolder) {
    window.BNAIWorkflowOrchestrator?.start?.(
      () => assetPipelineState || refreshAssetPipelineState(),
      () => assetFolderName,
      lookupAsset,
      getAssetFolderHandle,
      autoOpenReviewWorkspaceForAiWorkflow,
      onAiWorkflowProcessedAssetsWritten
    );
  }
}

// ══════════════════════════════════════════════════════
//  10. 素材資料夾
// ══════════════════════════════════════════════════════
async function pickAssetFolder() {
  if (!window.showDirectoryPicker) {
    setStatus('此瀏覽器不支援資料夾選取（請用 Chrome 86+）', 'error');
    return;
  }
  try {
    // Stage 2 Root Cause Fix（Write Failure）：改為在使用者這次點擊選資料夾
    // 的當下（真實 user gesture 內）就直接要求 readwrite 權限，而不是只要
    // 'read'。原因：Chrome 的 File System Access API 對「把既有權限從 read
    // 升級成 readwrite」的 requestPermission() 呼叫，要求必須在使用者手勢
    // 內觸發，否則會直接被拒絕／丟出例外——但 Auto Import 是由 Status
    // Polling 自動觸發，執行到
    // js/ai-workflow-auto-import.js 呼叫 requestPermission({mode:'readwrite'})
    // 的當下完全沒有使用者手勢，導致每次都失敗，才顯示「無法寫入處理結
    // 果」。這裡在選資料夾當下（確定有手勢）就直接要 readwrite，之後 Auto
    // Import 內同一個 requestPermission() 呼叫只是確認既有授權（通常立即
    // resolve 'granted'，不需要新的手勢），不影響既有唯讀操作。
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    assetIndex = {};
    assetFolderName = handle.name;
    assetFolderHandle = handle;
    assetSourceMode = 'folder';
    for await (const [name, fh] of handle.entries()) {
      if (fh.kind === 'file' && /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(name)) {
        assetIndex[name.toLowerCase()] = fh;
      }
    }
    const count = Object.keys(assetIndex).length;
    if (!count) {
      assetFolderName = '';
      assetFolderHandle = null;
      assetSourceMode = '';
    }
    setTopbarBadge(
      el.folderStatus,
      el.folderStatusText,
      count ? `${handle.name}（${count}）` : ''
    );
    setStatus(`素材已就緒：${count} 個圖檔。`, 'success');
    validateAllJobs();
    refreshAssetPipelineState();
    updateAssetReviewControls();
    renderJobList();
    renderAssetFileLists();
    // 素材資料夾選好後，若模板已就緒則立即套圖
    if (frameReady && activeJobId) {
      const job = jobs.find(j => j.id === activeJobId);
      if (job) {
        const productLoadSeq = canvasLoadSeq;
        const productFrameWindow = el.frame.contentWindow;
        await applyLogosToCanvas(job.logoFilenames || []);
        await applyProductsToCanvas(job.productFilenames || [], isThreeProductJob(job) ? {
          job,
          loadSeq: productLoadSeq,
          frameWindow: productFrameWindow,
        } : {});
        await applyQrCodeToCanvas(job);
      }
    }
    enqueueAllThumbnails(activeJobId);
    maybeRunAiWorkflowReadyCheck();
  } catch (e) {
    if (e.name === 'AbortError') {
      assetIndex = {};
      assetFolderName = '';
      assetFolderHandle = null;
      assetSourceMode = '';
      assetPipelineState = null;
      processedAssetIndex = {};
      reviewWorkspaceRerunAssetKeys = [];
      updateNeedsRerunButton();
      updateAssetReviewControls();
      setTopbarBadge(el.folderStatus, el.folderStatusText, '');
      renderAssetFileLists();
    } else {
      setStatus('開啟資料夾失敗：' + e.message, 'error');
    }
  }
}

function lookupAsset(filename) {
  if (!filename) return null;
  return assetIndex[filename.trim().toLowerCase()] || null;
}

// AI Workflow Phase 3 Correction：最小 getter，供 Auto Import 取得使用者
// 第一次選擇的素材資料夾 Handle，用來寫回真正的 Processed/。不新增
// setter——assetFolderHandle 只由 pickAssetFolder() 自己設定／清除。
function getAssetFolderHandle() {
  return assetFolderHandle;
}

// Stage 2 Root Cause Fix（macOS Development E2E Validation，Review 破圖）：
// AI Workflow 的 Auto Import 成功把 Processed PNG 寫進真正的資料夾之後，
// Orchestrator 會把「這次呼叫實際寫入的 FileSystemFileHandle」透過這個
// callback 轉交回來——這裡把它們填入既有的 processedAssetIndex（手動
// pickProcessedFolder() 流程本來就會填的同一個 Runtime-only 變數，
// resolveReviewProcessedImage() 讀取圖片內容用的既有快取），使用完全相同
// 的 key 慣例（檔名小寫），因此不需要、也沒有修改 resolveReviewProcessedImage
// ／processedAssetEntryToDataUrl／handleToDataUrl 這幾個既有函式本身。
function onAiWorkflowProcessedAssetsWritten(entries) {
  (entries || []).forEach(entry => {
    if (!entry || !entry.filename || !entry.fileHandle) return;
    const lookupKey = String(entry.filename).trim().toLowerCase();
    processedAssetIndex[lookupKey] = entry.fileHandle;
  });
}

function updateNeedsRerunButton() {
  const count = window.BNAssetPipelineState?.getNeedsRerunAssets?.(assetPipelineState)?.length || 0;
  if (el.rerunManifestBtn) {
    el.rerunManifestBtn.textContent = `重新去背素材（${count}）`;
    el.rerunManifestBtn.disabled = count <= 0;
    el.rerunManifestBtn.classList.toggle('is-disabled', count <= 0);
  }
  updateAssetReviewControls();
  return count;
}

function refreshAssetPipelineState() {
  if (!window.BNAssetPipelineState?.buildAssetPipelineState) return null;
  reviewWorkspaceRerunAssetKeys = [];
  assetPipelineState = window.BNAssetPipelineState.buildAssetPipelineState({
    jobs,
    sourceFolderName: assetFolderName,
    hasAsset: filename => !!lookupAsset(filename),
  });
  const count = Object.keys(assetPipelineState.assets || {}).length;
  updateNeedsRerunButton();
  updateAssetReviewControls();
  console.log('[CC][assetPipeline] state refreshed', { count, sourceFolderName: assetFolderName });
  return assetPipelineState;
}

function exportPhotoshopManifest() {
  if (!jobs.length) {
    setStatus('尚未匯入工單，無法建立素材處理檔。', 'error');
    return;
  }
  if (!assetFolderName || !Object.keys(assetIndex).length) {
    setStatus('請先選擇素材資料夾，再建立素材處理檔。', 'error');
    return;
  }
  const state = refreshAssetPipelineState();
  const manifest = window.BNAssetPipelineManifest.buildPhotoshopJobManifest(state);
  downloadJson(manifest, 'photoshop-job-manifest.json');
  setStatus(`素材處理檔已建立（${manifest.itemCount} 個素材）。`, 'success');
}

function exportPhotoshopRerunManifest() {
  if (!assetPipelineState) {
    setStatus('尚無需要重新處理的素材，請先完成素材審核。', 'error');
    return;
  }
  const count = updateNeedsRerunButton();
  if (!count) {
    setStatus('目前沒有需要重新處理的素材。', 'error');
    return;
  }
  const manifest = window.BNAssetPipelineManifest.buildPhotoshopRerunManifest(assetPipelineState);
  downloadJson(manifest, 'photoshop-rerun-manifest.json');
  setStatus(`重新處理檔已建立（${manifest.itemCount} 個素材）。請沿用既有素材處理流程。`, 'success');
}

async function pickProcessedFolder() {
  if (!window.showDirectoryPicker) {
    setStatus('此瀏覽器不支援資料夾選取（請用 Chrome 86+）', 'error');
    return;
  }
  if (!jobs.length) {
    setStatus('尚未匯入工單，無法匯入處理結果。', 'error');
    return;
  }
  if (!assetPipelineState) refreshAssetPipelineState();
  if (!assetPipelineState) {
    setStatus('素材處理流程尚未就緒。', 'error');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    const rerunAssetKeysBeforeImport = window.BNAssetPipelineState?.getNeedsRerunAssets?.(assetPipelineState)
      ?.map(asset => asset.assetKey)
      ?.filter(Boolean) || [];
    const files = [];
    const runtimeIndex = {};
    for await (const [name, fh] of handle.entries()) {
      if (fh.kind === 'file' && /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(name)) {
        files.push({ name, handle: fh });
        runtimeIndex[name.trim().toLowerCase()] = fh;
      }
    }
    const result = window.BNAssetPipelineState.importProcessedAssets(assetPipelineState, files, {
      sourceFolderName: handle.name,
    });
    assetPipelineState = result.state;
    processedAssetIndex = runtimeIndex;
    reviewWorkspaceRerunAssetKeys = rerunAssetKeysBeforeImport.length ? rerunAssetKeysBeforeImport.slice() : [];
    console.log('[CC][assetPipeline] processed import', {
      folder: handle.name,
      files: files.length,
      matched: result.matched,
      unmatched: result.unmatched,
    });
    updateNeedsRerunButton();
    updateAssetReviewControls();
    setStatus(`處理結果已匯入：成功 ${result.matched}，未對應 ${result.unmatched}。`, result.unmatched ? 'error' : 'success');
    if (result.matched) {
      await refreshMainCanvasApprovedAssetsForActiveJob('processed-folder-import');
      openAssetReviewWorkspace({
        initialReviewMode: rerunAssetKeysBeforeImport.length ? 'needs_rerun' : 'all',
        reviewAssetKeys: rerunAssetKeysBeforeImport,
      });
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      setStatus('匯入處理結果失敗：' + e.message, 'error');
    }
  }
}

async function resolveReviewOriginalImage(asset) {
  const filename = asset?.originalAsset?.filename || asset?.originalFilename || '';
  const handle = lookupAsset(filename);
  return handle ? handleToDataUrl(handle) : '';
}

function processedAssetLookupKey(assetOrProcessedAsset) {
  return assetOrProcessedAsset?.processedAsset?.lookupKey
    || assetOrProcessedAsset?.lookupKey
    || String(assetOrProcessedAsset?.processedAsset?.filename || assetOrProcessedAsset?.filename || '').trim().toLowerCase();
}

async function processedAssetEntryToDataUrl(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (entry.dataUrl) return entry.dataUrl;
  if (entry.handle) return handleToDataUrl(entry.handle);
  if (typeof entry.getFile === 'function') return handleToDataUrl(entry);
  return '';
}

async function resolveReviewProcessedImage(asset) {
  const lookupKey = processedAssetLookupKey(asset);
  const entry = lookupKey ? processedAssetIndex[lookupKey] : null;
  return processedAssetEntryToDataUrl(entry);
}

function saveReviewProcessedRuntimeAsset(asset, payload) {
  const lookupKey = processedAssetLookupKey(asset);
  if (!lookupKey || !payload?.dataUrl) return { ok: false };
  processedAssetIndex[lookupKey] = {
    dataUrl: payload.dataUrl,
    filename: asset?.processedAsset?.filename || lookupKey,
    lookupKey,
    width: payload.width || 0,
    height: payload.height || 0,
    runtimeOnly: true,
    cleaned: true,
    updatedAt: new Date().toISOString(),
  };
  console.log('[CC][assetReview] runtime processed asset saved', {
    assetKey: asset?.assetKey,
    lookupKey,
    width: payload.width || 0,
    height: payload.height || 0,
  });
  return { ok: true, lookupKey };
}

async function buildResolvedAssetsForJob(job, scope = 'render') {
  if (!job || !assetPipelineState || !window.BNAssetResolver?.resolveJobAssets) return null;
  const resolved = window.BNAssetResolver.resolveJobAssets(assetPipelineState, job);
  const processedItems = (resolved.items || []).filter(item => item.source === 'processed' && item.processedAsset);
  if (!processedItems.length) return resolved;

  for (const item of processedItems) {
    const lookupKey = processedAssetLookupKey(item.processedAsset);
    const entry = lookupKey ? processedAssetIndex[lookupKey] : null;
    if (!entry) {
      console.warn(`[CC][${scope}][assetResolver] approved processed missing runtime handle, fallback original`, {
        job: job.jobId || job.id,
        assetKey: item.assetKey,
        filename: item.originalFilename,
        processedFilename: item.processedFilename,
      });
      continue;
    }
    try {
      item.dataUrl = await processedAssetEntryToDataUrl(entry);
      if (!item.dataUrl) throw new Error('Processed asset source is empty');
      console.log(`[CC][${scope}][assetResolver] processed source ready`, {
        job: job.jobId || job.id,
        assetKey: item.assetKey,
        role: item.role,
        filename: item.originalFilename,
      });
    } catch (error) {
      console.warn(`[CC][${scope}][assetResolver] processed source read failed, fallback original`, {
        job: job.jobId || job.id,
        assetKey: item.assetKey,
        filename: item.originalFilename,
        error,
      });
    }
  }
  return resolved;
}

async function buildMainCanvasResolvedAssets(job) {
  return buildResolvedAssetsForJob(job, 'main');
}

async function buildThumbnailResolvedAssets(job) {
  return buildResolvedAssetsForJob(job, 'thumb');
}

async function buildBatchResolvedAssets(job) {
  return buildResolvedAssetsForJob(job, 'batch');
}

function formatReviewSummary(summary) {
  if (!summary) return '素材 0';
  return `可審核 ${summary.reviewable || 0} / 已核准 ${summary.approved || 0} / 需重新處理 ${summary.needs_rerun || 0}`;
}

function activeRerunReviewAssetKeys() {
  return (reviewWorkspaceRerunAssetKeys || []).filter(assetKey => {
    const status = assetPipelineState?.assets?.[assetKey]?.status || '';
    return status === 'pending' || status === 'processed' || status === 'needs_rerun';
  });
}

function restoreReviewDecisionSnapshot(snapshot) {
  const assetKey = String(snapshot?.assetKey || '');
  const record = assetKey ? assetPipelineState?.assets?.[assetKey] : null;
  if (!record) return { state: assetPipelineState, record: null, ok: false, reason: 'assetKey not found' };
  record.status = snapshot.status || 'processed';
  if (snapshot.review) record.review = { ...snapshot.review };
  else delete record.review;
  assetPipelineState.reviewUpdatedAt = new Date().toISOString();
  updateNeedsRerunButton();
  const nextSummary = window.BNAssetPipelineState?.getReviewSummary?.(assetPipelineState);
  updateAssetReviewControls();
  setStatus(`素材審核已撤回上一筆：${formatReviewSummary(nextSummary)}。`, 'success');
  console.log('[CC][assetPipeline] review decision restored', { assetKey, status: record.status });
  return { state: assetPipelineState, record, ok: true };
}

function assetBelongsToJob(asset, job) {
  if (!asset || !job) return false;
  const jobKeys = [job.jobId, job.id, job.outputFilename].filter(value => value !== undefined && value !== null).map(String);
  return (asset.jobIds || []).map(String).some(jobId => jobKeys.includes(jobId));
}

function findMainCanvasProductBox(doc, product) {
  const boxes = Array.from(doc.querySelectorAll('.bn-prod-box'));
  const filename = String(product?.filename || '').trim();
  if (filename) {
    const byFilename = boxes.find(box => String(box.dataset.filename || '').trim() === filename);
    if (byFilename) return byFilename;
  }
  const position = Number(product?.position);
  if (Number.isFinite(position)) {
    return boxes.find(box => Number(box.dataset.position) === position) || null;
  }
  return null;
}

async function buildMainCanvasProductPayloadForJob(job) {
  if (!job?.productFilenames?.length || !window.BNAssetRenderPayload?.buildProductPayloads) return null;
  if (activeTemplate) {
    try { await ensureTemplateJson(activeTemplate, job.styleId || '01'); } catch (_) {}
  }
  const resolvedAssets = await buildMainCanvasResolvedAssets(job);
  const payload = await window.BNAssetRenderPayload.buildProductPayloads({
    filenames: job.productFilenames || [],
    templateJson: activeTemplate?._json || {},
    getHandle: lookupAsset,
    handleToDataUrl,
    trim: autoTrim,
    imageUtils: window.BNImageUtils,
    resolvedAssets,
    createId: (kind, index) => 'cc_refresh_' + Date.now() + '_' + index,
  });
  return applyJobManualRenderStateToPayload(job, payload);
}

async function updateMainCanvasImageSourcesForJob(job, reason = '') {
  const frameWindow = el.frame?.contentWindow;
  if (!job || !frameWindow) return { updated: 0, type: '' };
  const payload = await buildMainCanvasProductPayloadForJob(job);
  if (!payload) return { updated: 0, type: '' };
  const doc = frameWindow.document;
  let updated = 0;

  if (payload.type === 'three_products') {
    for (const product of payload.products || []) {
      const box = findMainCanvasProductBox(doc, product);
      const img = box?.querySelector('img');
      if (!img || !product.src) continue;
      img.src = product.src;
      box.dataset.filename = product.filename || box.dataset.filename || '';
      if (product.ratio) box.dataset.ratio = String(product.ratio);
      if (product.baselineRatio) box.dataset.baselineRatio = String(product.baselineRatio);
      updated++;
    }
  } else {
    const personImg = doc.querySelector('#bn-zone-person img.bn-pp-img');
    if (personImg && payload.person?.src) {
      personImg.src = payload.person.src;
      updated++;
    }
    const singleImg = doc.querySelector('#bn-zone-singleprod .bn-single-product-box img, #bn-zone-singleprod img.bn-pp-img');
    if (singleImg && payload.singleProduct?.src) {
      singleImg.src = payload.singleProduct.src;
      const singleBox = singleImg.closest('.bn-single-product-box');
      if (singleBox && payload.singleProduct.ratio) singleBox.dataset.ratio = String(payload.singleProduct.ratio);
      updated++;
    }
  }

  payload.missing?.forEach(filename => console.warn('[CC][assetResolver] refresh asset missing:', filename));
  payload.errors?.forEach(item => console.error('[CC][assetResolver] refresh asset failed:', item.filename, item.error));
  console.log('[CC][assetResolver] main canvas image sources updated', {
    reason,
    job: job.jobId || job.id,
    type: payload.type,
    updated,
  });
  return { updated, type: payload.type };
}

async function refreshMainCanvasApprovedAssetsForActiveJob(reason = '') {
  const job = activeJob();
  if (!job || !frameReady || !el.frame?.contentWindow) return;
  const layoutKey = layoutStateKeyForRenderContext(job, getActiveRenderContext(job.styleId || '01'));
  console.log('[CC][assetResolver] refresh main canvas start', { reason, job: job.jobId || job.id, key: layoutKey });
  await syncActiveLayoutState();
  const result = await updateMainCanvasImageSourcesForJob(job, reason);
  if (result.updated) await waitForFrameImages(el.frame.contentWindow, 4000);
  console.log('[CC][assetResolver] refresh main canvas done', {
    reason,
    job: job.jobId || job.id,
    key: layoutKey,
    updated: result.updated,
    type: result.type,
  });
}

function openAssetReviewWorkspace(options = {}) {
  if (!window.BNAssetReviewWorkspace?.open) {
    setStatus('素材審核工作區尚未載入。', 'error');
    return;
  }
  if (!assetPipelineState) refreshAssetPipelineState();
  if (!assetPipelineState) {
    setStatus('素材處理流程尚未就緒。', 'error');
    return;
  }
  const summary = window.BNAssetPipelineState?.getReviewSummary?.(assetPipelineState);
  if (!summary || !summary.reviewable) {
    setStatus('尚無可審核素材，請先匯入處理結果。', 'error');
    return;
  }
  const reviewAssetKeys = options.reviewAssetKeys || activeRerunReviewAssetKeys();
  window.BNAssetReviewWorkspace.open({
    pipelineState: assetPipelineState,
    initialReviewMode: options.initialReviewMode || (reviewAssetKeys?.length ? 'needs_rerun' : undefined),
    reviewAssetKeys,
    selectedAssetKey: options.selectedAssetKey,
    resolveOriginalImage: resolveReviewOriginalImage,
    resolveProcessedImage: resolveReviewProcessedImage,
    onSaveProcessedAsset: saveReviewProcessedRuntimeAsset,
    onRestoreDecision: restoreReviewDecisionSnapshot,
    onRunRerun: runAiWorkflowRerun,
    onDecision(assetKey, decision) {
      const result = window.BNAssetPipelineState.setAssetReviewDecision(assetPipelineState, assetKey, decision);
      assetPipelineState = result.state;
      const nextSummary = window.BNAssetPipelineState.getReviewSummary(assetPipelineState);
      updateNeedsRerunButton();
      updateAssetReviewControls();
      setStatus(`素材審核已更新：${formatReviewSummary(nextSummary)}。`, 'success');
      console.log('[CC][assetPipeline] review decision', { assetKey, decision, ok: result.ok });
      if (decision === 'approved' && result.ok && assetBelongsToJob(result.record, activeJob())) {
        refreshMainCanvasApprovedAssetsForActiveJob('review-decision:' + decision).catch(error => {
          console.warn('[CC][assetResolver] refresh main canvas failed after review decision', error);
        });
      }
      return result;
    },
  });
}

// AI Workflow Coding Phase 4：Auto Open Review Workspace。
// 沿用既有、唯一的 openAssetReviewWorkspace() 入口，不建立第二套顯示邏輯、
// 不直接操作 Review Workspace 內部 DOM。openAssetReviewWorkspace() 本身
// （以及它呼叫的 window.BNAssetReviewWorkspace.open()）都沒有回傳成功／
// 失敗，且本輪不修改這兩者——因此這裡用它自己已經在檢查的同一組既有條件
// （BNAssetReviewWorkspace.open 是否已載入／assetPipelineState 是否就緒／
// 是否有可審核素材）做唯讀前置判斷，藉此在不改動既有函式的情況下，誠實
// 回報這次呼叫是否真的會開啟，供 Workflow State Machine 判斷是否可以解除
// Global Interaction Lock。第一輪自動開啟固定使用既有「全部素材」檢視
// （initialReviewMode:'all'），不做 Needs Rerun 第二輪 Filter 切換
// （Phase 5 範圍）。
// Phase 5：泛化為可接受 reviewMode（'all' | 'needs_rerun'），供 Rerun 完成
// 後固定以既有「待重新去背」Mode 重新開啟同一個 Review Workspace 入口
// 使用——沿用機制不變，只是多一個參數決定要開哪個既有 Mode，仍然完全不
// 修改 openAssetReviewWorkspace() 或 js/asset-review-workspace.js 本身。
// reviewMode !== 'needs_rerun' 時（First Run）主動清空
// reviewWorkspaceRerunAssetKeys，避免殘留上一輪 Rerun 的子集快照，誤將
// 「全部素材」畫面限制成只顯示舊的 rerun 子集。
function autoOpenReviewWorkspaceForAiWorkflow(reviewMode) {
  if (!window.BNAssetReviewWorkspace?.open) return false;
  if (!assetPipelineState) refreshAssetPipelineState();
  if (!assetPipelineState) return false;
  const summary = window.BNAssetPipelineState?.getReviewSummary?.(assetPipelineState);
  if (!summary || !summary.reviewable) return false;
  if (reviewMode !== 'needs_rerun') reviewWorkspaceRerunAssetKeys = [];
  openAssetReviewWorkspace({ initialReviewMode: reviewMode || 'all' });
  return true;
}

// Phase 5：Review Workspace Completion Screen 的「重新去背素材（N）」實際
// 呼叫的 callback（見下方 openAssetReviewWorkspace() 的 onRunRerun）。沿用
// 既有 pickProcessedFolder() 手動流程已經在用的同一套「Rerun 前先快照
// Needs Rerun assetKeys，Auto Import 之後才設定
// reviewWorkspaceRerunAssetKeys」時序，讓既有的
// activeRerunReviewAssetKeys()／openAssetReviewWorkspace() 機制原封不動地
// 把第二輪畫面限制在本輪 Rerun 子集（Product Rule 12），不重新設計篩選
// 邏輯。呼叫 AI Workflow Orchestrator 的 startRerun()，與 First Run 共用
// 同一套 Ready Check／Execute／Status／Auto Import 資料流（Product Rule
// 1），不再呼叫 exportPhotoshopRerunManifest()（不再匯出檔案，Product
// Rule 5）；沿用同一個已保留的 FileSystemDirectoryHandle（Product Rule
// 6／7，getAssetFolderHandle 不變）。
function runAiWorkflowRerun() {
  if (!assetPipelineState) refreshAssetPipelineState();
  if (!assetPipelineState) return;
  const rerunAssetKeysBeforeImport = window.BNAssetPipelineState?.getNeedsRerunAssets?.(assetPipelineState)
    ?.map(asset => asset.assetKey)
    ?.filter(Boolean) || [];
  if (!rerunAssetKeysBeforeImport.length) return;
  window.BNAIWorkflowOrchestrator?.startRerun?.(
    () => assetPipelineState || refreshAssetPipelineState(),
    lookupAsset,
    getAssetFolderHandle,
    (reviewMode) => {
      reviewWorkspaceRerunAssetKeys = rerunAssetKeysBeforeImport.slice();
      return autoOpenReviewWorkspaceForAiWorkflow(reviewMode);
    },
    onAiWorkflowProcessedAssetsWritten
  );
}

// ══════════════════════════════════════════════════════
//  10b. autoTrim — 鏡像 bn-editor-plugin.js trimLogoSrc 算法
//       跳過：a<10（完全透明）或 RGB>240 且 a>200（近白色不透明）
//       取有效像素最小包圍矩形裁切，不加 padding
// ══════════════════════════════════════════════════════
async function autoTrim(dataUrl) {
  return window.BNAssetProcessing.autoTrim(dataUrl);
}

// ══════════════════════════════════════════════════════
//  11. 素材排序 / 類型偵測
// ══════════════════════════════════════════════════════
function sortLogos(filenames) {
  return window.BNAssetClassifier.sortLogos(filenames);
}

function orderProductsByEditorSlots(filenames) {
  return window.BNAssetClassifier.orderProductsByEditorSlots(filenames);
}

function classifyPersonProductFiles(filenames) {
  return window.BNAssetClassifier.classifyPersonProductFiles(filenames);
}

function showPersonProductFilenameHint() {
  const hint = document.getElementById('bn-pp-drop')?.nextElementSibling;
  const msg = '⚠ 未找到含「_人」或「_品」的檔名，請重新命名後再上傳';
  if (hint) {
    const original = hint.textContent;
    hint.textContent = msg;
    hint.style.color = '#e05c5c';
    setTimeout(() => {
      hint.textContent = original;
      hint.style.color = '';
      if (typeof window._bnUpdateMutualExclusion === 'function') window._bnUpdateMutualExclusion();
    }, 3000);
  }
  setStatus('未找到含 _人 或 _品 的檔名', 'error');
}

function updateProductModeLock() {
  if (typeof window._bnUpdateMutualExclusion === 'function') window._bnUpdateMutualExclusion();
}

// Bug #2（手動換圖 Template 來源不一致）：applyProductsToCanvas()／
// buildProductPayloads() 判斷 autoShadow／ratio／baselineRatio 用的是
// activeTemplate._json（經 ensureTemplateJson() 保證已載入、有 memoization，
// 可靠），手動換圖（js/bn-editor-plugin.js 的 replaceExistingProductImage()）
// 原本讀的是 window.__BN_TEMPLATE__——一個由 selectJob() 內部未 await 的
// promise 非同步指派的全域變數，換圖時機若早於該指派完成，會讀到 null／
// 舊值，導致 autoShadow 誤判為 false、ratio／baselineRatio 用錯資料。這裡
// 提供一個單純的 getter，直接回傳目前 activeTemplate._json 的即時參照，
// 不建立第二份 Template State、不需要另外同步。
window._bnGetActiveTemplateJson = function() {
  return activeTemplate?._json || null;
};

// Bug #2C（手動換圖 Asset Pipeline record 失效化）：手動換圖只更新畫布上的
// 圖片內容，從未更新 assetPipelineState，導致換圖前仍標示 approved 的那一筆
// record（連同其 processedAsset）繼續被 Approved Asset Resolver 選中，蓋過
// 手動換入的新圖。這裡精確限定「目前工單 + role + 該商品 slot（若有）+
// 完整 filename」這一筆 record，只做狀態欄位調整，不掃描、不批次處理，不
// 影響同一工單其他商品、其他工單同檔名素材，或其他角色的 record。沿用既有
// window.BNAssetResolver.resolveApprovedAsset()（不修改 js/asset-resolver.js）
// 取得比對到的 assetKey，直接對 assetPipelineState 內該筆既有 record 更新
// status／processedAsset／review 三個既有欄位，不新增 schema 或狀態值，不改
// Resolver、不改 Asset Pipeline 既有角色。
// 一人一品 Bug Fix（Person + Single Product 手動換圖後暫存還原成舊圖）：
// role 參數新增，預設值 'product' 維持三商品既有呼叫端行為不變；
// js/bn-editor-plugin.js 的 handlePersonProductFiles() 換圖後改呼叫本函式，
// Person 帶入 role:'person'，Single Product 帶入 role:'singleProduct'，
// 沿用同一套機制，不新增第二套失效化邏輯。
function saveJobManualRenderState(job, filename, slot, role) {
  if (!job || !filename) return false;
  const info = classifyProducts(job.productFilenames || []);
  const nextState = job._manualRenderState || {
    products: {},
    person: null,
    singleProduct: null,
  };

  if (role === 'product') {
    const identity = (info.products || []).find(item =>
      item.filename === filename && Number(item.position) === Number(slot)
    );
    const product = (window._bnProducts || []).find(item =>
      item.filename === filename && Number(item.position) === Number(slot)
    );
    if (!identity || !product?.src) return false;
    nextState.products[String(Number(slot))] = {
      filename: identity.filename,
      src: product.src,
      ratio: product.ratio,
      baselineRatio: product.baselineRatio,
    };
  } else if (role === 'person') {
    const person = window._bnPerson;
    if (info.person !== filename || !person?.src) return false;
    nextState.person = {
      filename: info.person,
      src: person.src,
      displayWidth: person.displayWidth,
      objectFit: person.objectFit,
    };
  } else if (role === 'singleProduct') {
    const singleProduct = window._bnSingleProd;
    if (!(info.singles || []).includes(filename) || !singleProduct?.src) return false;
    nextState.singleProduct = {
      filename,
      src: singleProduct.src,
      ratio: singleProduct.ratio,
      displayW: singleProduct.displayW,
      displayH: singleProduct.displayH,
      zoneHeight: singleProduct.zoneHeight,
      objectFit: singleProduct.objectFit,
    };
    pendingManualSingleRenderCapture = { job, filename };
  } else {
    return false;
  }

  job._manualRenderState = nextState;
  return true;
}

function applyJobManualRenderStateToPayload(job, payload) {
  const state = job?._manualRenderState;
  if (!state || !payload) return payload;

  if (payload.type === 'three_products') {
    (payload.products || []).forEach(product => {
      const manual = state.products?.[String(Number(product.position))];
      if (!manual || manual.filename !== product.filename || !manual.src) return;
      product.src = manual.src;
      product.ratio = manual.ratio;
      product.baselineRatio = manual.baselineRatio;
      const message = (payload.messages || []).find(item =>
        item.type === 'bn-product-add' && item.id === product.id
      );
      if (message) {
        message.src = manual.src;
        message.ratio = manual.ratio;
        message.baselineRatio = manual.baselineRatio;
      }
    });
    return payload;
  }

  const person = state.person;
  if (person && person.filename === payload.info?.person && payload.person) {
    payload.person.src = person.src;
    payload.person.displayWidth = person.displayWidth;
    payload.person.objectFit = person.objectFit;
    const message = (payload.messages || []).find(item => item.type === 'bn-person-add');
    if (message) {
      message.src = person.src;
      message.displayWidth = person.displayWidth;
      message.objectFit = person.objectFit;
    }
  }

  const singleProduct = state.singleProduct;
  if (singleProduct && (payload.info?.singles || []).includes(singleProduct.filename) && payload.singleProduct) {
    payload.singleProduct.src = singleProduct.src;
    payload.singleProduct.ratio = singleProduct.ratio;
    payload.singleProduct.displayW = singleProduct.displayW;
    payload.singleProduct.displayH = singleProduct.displayH;
    payload.singleProduct.zoneHeight = singleProduct.zoneHeight;
    payload.singleProduct.objectFit = singleProduct.objectFit;
    const message = (payload.messages || []).find(item => item.type === 'bn-single-product-add');
    if (message) {
      message.src = singleProduct.src;
      message.ratio = singleProduct.ratio;
      message.displayW = singleProduct.displayW;
      message.displayH = singleProduct.displayH;
      message.zoneHeight = singleProduct.zoneHeight;
      message.objectFit = singleProduct.objectFit;
    }
  }
  return payload;
}

window._bnInvalidateApprovedAssetForManualReplace = function(filename, slot, role = 'product') {
  saveJobManualRenderState(activeJob(), filename, slot, role);
  if (!assetPipelineState || !assetPipelineState.assets) return;
  if (!window.BNAssetResolver?.resolveApprovedAsset) return;
  const job = activeJob();
  if (!job || !filename) return;
  const jobId = String(job.jobId || job.id || job.outputFilename || '');
  const result = window.BNAssetResolver.resolveApprovedAsset(assetPipelineState, {
    jobId,
    role,
    slot,
    filename,
  });
  const assetKey = result && result.assetKey;
  const record = assetKey ? assetPipelineState.assets[assetKey] : null;
  if (!record) return;
  record.status = 'pending';
  delete record.processedAsset;
  delete record.review;
  console.log('[CC][assetPipeline] manual replace invalidated approved record', { assetKey, filename, slot, role, jobId });
};

window._bnResetCurrentLayoutState = function(kind) {
  const job = activeJob();
  if (job?.layoutState) {
    if (kind === 'products') {
      job.layoutState.products = [];
    } else if (kind === 'singleProduct') {
      job.layoutState.singleProduct = {};
    }
  }
  if (kind === 'products' && Array.isArray(window._bnProducts)) {
    window._bnProducts.forEach(product => {
      delete product.layout;
      delete product.layouts;
      product.x = product.y = product.width = product.height = undefined;
      product.rotation = 0;
      product.userAdjusted = false;
    });
  }
  if (kind === 'singleProduct' && window._bnSingleProd) {
    window._bnSingleProd.offsetX = 0;
    window._bnSingleProd.offsetY = 0;
    window._bnSingleProd.transform = null;
  }
  scheduleActiveJobThumbnailUpdate(700);
};

function clearPersonProductState(updateLabel = true) {
  window._bnPerson = null;
  window._bnSingleProd = null;
  singleProductGeometry = null;
  updateSingleProductDragOverlay();
  if (frameReady && el.frame.contentWindow) {
    el.frame.contentWindow.postMessage({ type: 'bn-person-remove' }, '*');
    el.frame.contentWindow.postMessage({ type: 'bn-single-product-remove' }, '*');
  }
  updateProductModeLock();
  if (updateLabel) updateTemplateModeLabel(null);
}

function clearThreeProductState(updateLabel = true) {
  const productIds = (window._bnProducts || []).map(p => p.id);
  window._bnProducts = [];
  if (typeof window._bnResetProdSlots === 'function') window._bnResetProdSlots();
  if (typeof window._bnRenderProdList === 'function') window._bnRenderProdList();
  if (frameReady && el.frame.contentWindow) {
    productIds.forEach(id => el.frame.contentWindow.postMessage({ type: 'bn-product-remove', id }, '*'));
  }
  updateProductModeLock();
  if (updateLabel) updateTemplateModeLabel(null);
}

function classifyProducts(filenames) {
  return window.BNAssetClassifier.classifyProducts(filenames);
}

function inferMaterialModeFromJob(job) {
  if (!job?.productFilenames?.length) return null;
  return classifyProducts(job.productFilenames).type;
}

function activeJob() {
  return jobs.find(j => j.id === activeJobId) || null;
}


function isThreeProductJob(job) {
  return inferMaterialModeFromJob(job) === 'three_products';
}

function productMasterLayoutKeyForJob(job) {
  return job ? String(job.id || job.jobId || '') : '';
}

function getRuntimeProductMasterLayout(job) {
  if (!job) return null;
  if (job.productMasterLayout) return job.productMasterLayout;
  const key = productMasterLayoutKeyForJob(job);
  const stored = key ? productMasterLayoutsByJobId.get(key) : null;
  if (stored) setRuntimeProductMasterLayout(job, stored);
  return stored || null;
}

function setRuntimeProductMasterLayout(job, masterLayout) {
  if (!job || !masterLayout) return;
  const copy = cloneLayoutState(masterLayout);
  Object.defineProperty(job, 'productMasterLayout', {
    value: copy,
    writable: true,
    configurable: true,
    enumerable: false,
  });
  const key = productMasterLayoutKeyForJob(job);
  if (key) productMasterLayoutsByJobId.set(key, cloneLayoutState(copy));
}

function hasThreeProductLayoutState(state) {
  return !!window.BNSmartLayoutPropagation?.hasProductsLayout?.(state);
}

async function getActiveTemplateProductsZone(styleId) {
  if (!activeTemplate) return null;
  const templateJson = activeTemplate._json || await ensureTemplateJson(activeTemplate, normalizeStyleId(styleId || '01'));
  return window.BNSmartLayoutPropagation?.productsZoneFromTemplate?.(templateJson) || null;
}

function mergeProductsIntoLayoutState(baseState, productsState) {
  const next = cloneLayoutState(baseState) || {};
  next.products = cloneLayoutState(productsState?.products || []) || [];
  return next;
}

function ensureProductMasterControls() {
  const resetBtn = document.getElementById('bn-prod-reset-btn');
  if (!resetBtn || document.getElementById('bn-product-master-actions')) {
    updateProductMasterControls();
    return;
  }
  const wrap = document.createElement('div');
  wrap.id = 'bn-product-master-actions';
  wrap.className = 'bn-product-master-actions';
  wrap.innerHTML = [
    '<button type="button" class="bn-master-layout-btn" id="bn-update-master-layout-btn">更新 Master Layout</button>',
    '<button type="button" class="bn-master-layout-btn" id="bn-apply-master-layout-btn">套用 Master Layout</button>',
  ].join('');
  resetBtn.insertAdjacentElement('afterend', wrap);
  document.getElementById('bn-update-master-layout-btn')?.addEventListener('click', updateProductMasterLayoutForActiveJob);
  document.getElementById('bn-apply-master-layout-btn')?.addEventListener('click', () => applyProductMasterLayoutForActiveJob({ manual: true }));
  updateProductMasterControls();
}

function updateProductMasterControls() {
  const updateBtn = document.getElementById('bn-update-master-layout-btn');
  const applyBtn = document.getElementById('bn-apply-master-layout-btn');
  if (!updateBtn || !applyBtn) return;
  const job = activeJob();
  const enabled = !!job && isThreeProductJob(job);
  updateBtn.disabled = !enabled;
  applyBtn.disabled = !enabled || !getRuntimeProductMasterLayout(job);
}

function askSmartLayoutPropagationChoice(job, renderContext) {
  return new Promise(resolve => {
    const existing = document.getElementById('smart-layout-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'smart-layout-modal';
    modal.className = 'smart-layout-modal';
    modal.innerHTML = [
      '<div class="smart-layout-modal-box" role="dialog" aria-modal="true" aria-labelledby="smart-layout-title">',
      '  <div class="smart-layout-modal-title" id="smart-layout-title">套用 Master Layout？</div>',
      '  <div class="smart-layout-modal-body">目前尺寸尚未建立三商品排列。可以套用此工單的 Master Layout，或使用此尺寸版型預設。</div>',
      '  <div class="smart-layout-modal-meta">' + (job?.jobId || job?.id || '') + ' · ' + (renderContext?.placementId || '') + '</div>',
      '  <div class="smart-layout-modal-actions">',
      '    <button type="button" class="btn-secondary" data-choice="default">預設</button>',
      '    <button type="button" class="btn-primary" data-choice="apply">套用</button>',
      '  </div>',
      '</div>',
    ].join('');
    function finish(choice) {
      modal.remove();
      resolve(choice);
    }
    modal.addEventListener('click', event => {
      const choice = event.target?.dataset?.choice;
      if (choice) finish(choice);
    });
    document.body.appendChild(modal);
    modal.querySelector('[data-choice="apply"]')?.focus();
  });
}

async function buildPropagatedProductLayoutStateForActiveTemplate(job, layoutKey) {
  const masterLayout = getRuntimeProductMasterLayout(job);
  if (!masterLayout) return null;
  const targetProductsZone = await getActiveTemplateProductsZone(job.styleId || '01');
  const productsState = window.BNSmartLayoutPropagation?.propagateProductMasterLayout?.(masterLayout, targetProductsZone);
  if (!hasThreeProductLayoutState(productsState)) return null;
  return mergeProductsIntoLayoutState(getJobLayoutStateStrict(job, layoutKey), productsState);
}

async function resolveSmartProductLayoutForMainCanvas(job, layoutKey, savedLayoutState, frameWindow, renderContext) {
  if (!job || !isThreeProductJob(job)) return savedLayoutState || null;
  if (hasThreeProductLayoutState(savedLayoutState)) return savedLayoutState;
  if (!getRuntimeProductMasterLayout(job)) return savedLayoutState || null;

  const choice = await askSmartLayoutPropagationChoice(job, renderContext);
  if (choice === 'apply') {
    const propagated = await buildPropagatedProductLayoutStateForActiveTemplate(job, layoutKey);
    if (propagated) {
      scheduleActiveJobThumbnailUpdate(500);
      setStatus('已套用 Master Layout。', 'success');
      return propagated;
    }
    setStatus('Master Layout 套用失敗，改用版型預設。', 'error');
  }

  const defaultState = readLayoutStateFromFrame(frameWindow);
  if (hasThreeProductLayoutState(defaultState)) {
    scheduleActiveJobThumbnailUpdate(500);
    setStatus('已使用此尺寸版型預設，並建立 layoutState。', 'success');
    return defaultState;
  }
  return savedLayoutState || null;
}

async function updateProductMasterLayoutForActiveJob() {
  const job = activeJob();
  if (!job || !isThreeProductJob(job)) {
    setStatus('目前工單不是三商品模式。', 'error');
    return;
  }
  await syncActiveLayoutState();
  const renderContext = getActiveRenderContext(job.styleId || '01');
  const layoutKey = layoutStateKeyForRenderContext(job, renderContext);
  const frameLayoutState = readLayoutStateFromFrame(el.frame?.contentWindow);
  const layoutState = hasThreeProductLayoutState(frameLayoutState)
    ? frameLayoutState
    : getJobLayoutStateStrict(job, layoutKey);
  if (!hasThreeProductLayoutState(layoutState)) {
    setStatus('目前尺寸沒有可更新的三商品 layoutState。', 'error');
    return;
  }
  setJobLayoutState(job, layoutState, layoutKey);
  const sourceProductsZone = await getActiveTemplateProductsZone(job.styleId || '01');
  const masterLayout = window.BNSmartLayoutPropagation?.captureProductMasterLayout?.(layoutState, {
    sourceLayoutKey: layoutKey,
    sourcePlacementId: renderContext.placementId,
    sourceTemplateId: renderContext.templateId,
    sourceProductsZone,
  });
  if (!masterLayout) {
    setStatus('Master Layout 更新失敗。', 'error');
    return;
  }
  setRuntimeProductMasterLayout(job, masterLayout);
  updateProductMasterControls();
  setStatus('已更新此工單的 Master Layout。', 'success');
}

async function applyProductMasterLayoutForActiveJob(options = {}) {
  const job = activeJob();
  if (!job || !isThreeProductJob(job)) {
    setStatus('目前工單不是三商品模式。', 'error');
    return;
  }
  if (!getRuntimeProductMasterLayout(job)) {
    setStatus('此工單尚未建立 Master Layout。', 'error');
    return;
  }
  await syncActiveLayoutState();
  const renderContext = getActiveRenderContext(job.styleId || '01');
  const layoutKey = layoutStateKeyForRenderContext(job, renderContext);
  const existingState = getJobLayoutStateStrict(job, layoutKey);
  if (options.manual && hasThreeProductLayoutState(existingState)) {
    const confirmed = window.confirm('目前尺寸已有三商品排列，是否覆蓋？');
    if (!confirmed) return;
  }
  const propagated = await buildPropagatedProductLayoutStateForActiveTemplate(job, layoutKey);
  if (!propagated) {
    setStatus('Master Layout 套用失敗。', 'error');
    return;
  }
  setJobLayoutState(job, propagated, layoutKey);
  await applyJobLayoutStateToFrame(job, el.frame?.contentWindow, propagated);
  scheduleActiveJobThumbnailUpdate(500);
  setStatus('已套用 Master Layout。', 'success');
}

function getRuntimeMaterialMode() {
  if (window._bnPerson || window._bnSingleProd) return 'person_product';
  if (window._bnProducts && window._bnProducts.length) return 'three_products';
  return null;
}

function computeTemplateMaterialMode(job = activeJob()) {
  return getRuntimeMaterialMode() || inferMaterialModeFromJob(job);
}

function getTemplateDisplayName(template = activeTemplate, job = activeJob(), mode) {
  if (!template) return '';
  return template.name || '預設版型';
}

function createQuickThumbnail(job, template = getTemplateForRenderContext(job)) {
  const json = template?._json || {};
  const w = Number(json.output?.width || json.width || activePlacement?.width || 1080);
  const h = Number(json.output?.height || json.height || activePlacement?.height || 1080);
  const maxSide = 180;
  const scale = maxSide / Math.max(w, h);
  const cw = Math.max(48, Math.round(w * scale));
  const ch = Math.max(32, Math.round(h * scale));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  const bg = json.canvas?.backgroundColor || '#253141';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);

  const g = ctx.createLinearGradient(0, 0, cw, ch);
  g.addColorStop(0, 'rgba(255,255,255,.10)');
  g.addColorStop(0.55, 'rgba(0,0,0,.04)');
  g.addColorStop(1, 'rgba(0,0,0,.24)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);

  const pad = Math.max(6, Math.round(Math.min(cw, ch) * 0.08));
  const mode = inferMaterialModeFromJob(job);
  const tag = mode === 'person_product' ? '1人+1品' : mode === 'three_products' ? '3品' : 'TEXT';
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.fillRect(pad, pad, Math.min(cw - pad * 2, 44), Math.max(10, Math.round(ch * 0.12)));
  ctx.fillStyle = 'rgba(10,20,32,.72)';
  ctx.font = `700 ${Math.max(6, Math.round(ch * 0.07))}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(tag, pad + 4, pad + Math.max(8, Math.round(ch * 0.085)));

  const mainStyle = json.textFields?.main?.style || {};
  const subStyle = json.textFields?.sub?.style || {};
  const mainColor = mainStyle.color || 'rgb(143, 210, 241)';
  const subColor = subStyle.color || 'rgb(253, 245, 161)';
  const align = mainStyle.textAlign === 'center' ? 'center' : 'left';
  const x = align === 'center' ? cw / 2 : pad;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = mainColor;
  ctx.font = `600 ${Math.max(10, Math.round(ch * 0.15))}px -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif`;
  ctx.fillText(shortText(job.headline || '主標', 8), x, Math.round(ch * 0.36), cw - pad * 2);
  ctx.fillStyle = subColor;
  ctx.font = `800 ${Math.max(11, Math.round(ch * 0.18))}px -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif`;
  ctx.fillText(shortText(job.subheadline || '副標', 8), x, Math.round(ch * 0.54), cw - pad * 2);
  if (job.disclaimer) {
    ctx.fillStyle = mainColor;
    ctx.font = `500 ${Math.max(7, Math.round(ch * 0.07))}px -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif`;
    ctx.fillText(shortText(job.disclaimer, 14), x, Math.round(ch * 0.76), cw - pad * 2);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cw - 1, ch - 1);
  return c.toDataURL('image/jpeg', 0.72);
}

function shortText(value, max) {
  const text = String(value || '').trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function assignQuickThumbnail(job, renderContext = getActiveRenderContext(job?.styleId || '01')) {
  if (!JOB_LIST_THUMBNAILS_ENABLED) return;
  if (!job) return;
  job.quickThumbnail = createQuickThumbnail(job, getTemplateForRenderContext(job, renderContext));
  if (!job.thumbnail) job.thumbnailStatus = 'quick';
}

function assignQuickThumbnails(targetJobs = jobs, renderContext = getActiveRenderContext()) {
  targetJobs.forEach(job => assignQuickThumbnail(job, { ...renderContext, styleId: job.styleId || renderContext.styleId || '01' }));
  renderJobList();
}

function thumbnailContextKeyForJob(job) {
  if (!job) return '';
  return thumbnailContextKeyForRenderContext(job, getActiveRenderContext(job.styleId || '01'));
}

function invalidateJobThumbnail(job) {
  if (!job) return;
  job.thumbnail = null;
  job.thumbnailContextKey = '';
  job.quickThumbnail = null;
  job.thumbnailStatus = 'idle';
  assignQuickThumbnail(job);
}

function displayThumbnailForJob(job) {
  if (!job) return '';
  if (job.thumbnail && (!job.thumbnailContextKey || job.thumbnailContextKey === thumbnailContextKeyForJob(job))) {
    return job.thumbnail;
  }
  return job.quickThumbnail || '';
}

function updateTemplateModeLabel(mode) {
  if (!activeTemplate || !el.template) return;
  const option = Array.from(el.template.options).find(opt => opt.value === activeTemplate.id);
  if (!option) return;
  option.textContent = getTemplateDisplayName(activeTemplate, activeJob(), mode);
  if (typeof window._bnApplyMaterialAccordions === 'function') {
    window._bnApplyMaterialAccordions(mode === undefined ? computeTemplateMaterialMode(activeJob()) : mode, false);
  }
}

window._bnUpdateTemplateModeLabel = function(mode) {
  updateTemplateModeLabel(mode);
};

function resetMaterialAccordionsForJob(mode) {
  if (typeof window._bnApplyMaterialAccordions === 'function') {
    window._bnApplyMaterialAccordions(mode || null, true);
  }
}

// ══════════════════════════════════════════════════════
//  12. 工單驗證
// ══════════════════════════════════════════════════════
function validateJob(job) {
  const allFiles = [...(job.logoFilenames || []), ...(job.productFilenames || [])];
  if (!allFiles.length || !Object.keys(assetIndex).length) {
    job.validation = { status: 'pending', missing: [] }; return;
  }
  const missing = allFiles.filter(f => !lookupAsset(f));
  job.validation = { status: missing.length ? 'error' : 'ok', missing };
}

function validateAllJobs() {
  jobs.forEach(validateJob);
  renderValidationPanel();
}

function renderValidationPanel() {
  const allMissing = jobs.flatMap(j => (j.validation?.missing || []).map(f => `[${j.jobId || '?'}] ${f}`));
  if (allMissing.length) {
    el.validationErrors.innerHTML = allMissing
      .map(m => `<div class="validation-error-item">✗ ${m}</div>`).join('');
    el.validationPanel.style.display = 'block';
  } else {
    el.validationPanel.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════
//  13. 工單列表 UI
// ══════════════════════════════════════════════════════
function renderJobList() {
  el.jobList.innerHTML = '';
  jobs.forEach((job, idx) => {
    const card = document.createElement('div');
    card.className = 'job-card' + (job.id === activeJobId ? ' active' : '');
    card.dataset.jobId = job.id;

    const body = document.createElement('div');
    body.className = 'job-card-body';
    const num = document.createElement('div');
    num.className = 'job-card-num';
    num.textContent = job.jobId ? `#${idx + 1} · ${job.jobId}` : `#${idx + 1}`;
    const hl = document.createElement('div');
    hl.className = 'job-card-headline';
    hl.textContent = job.headline || '（空白）';
    const sub = document.createElement('div');
    sub.className = 'job-card-sub';
    sub.textContent = job.subheadline || job.disclaimer || '';
    body.append(num, hl, sub);

    const del = document.createElement('button');
    del.className = 'job-card-del';
    del.title = '刪除';
    del.textContent = '✕';
    del.addEventListener('click', e => { e.stopPropagation(); deleteJob(job.id); });

    card.append(body, del);
    card.addEventListener('click', () => selectJob(job.id));
    el.jobList.appendChild(card);
  });
}

function isJobKeyboardNavigationControl(target) {
  if (!(target instanceof Element)) return false;
  if (target.isContentEditable) return true;
  return !!target.closest('input, textarea, select, button, [role="button"]');
}

function isVisibleJobNavigationOverlay(node) {
  return !!node && !node.hidden && node.getClientRects().length > 0;
}

function isJobKeyboardNavigationBlocked() {
  if (document.activeElement === el.frame) return true;
  if (isVisibleJobNavigationOverlay(el.resetModal)) return true;
  if (isVisibleJobNavigationOverlay(el.batchModal)) return true;
  if (document.getElementById('smart-layout-modal')) return true;
  if (document.querySelector('.asset-review-modal')) return true;
  if (document.getElementById('hbnProductEditorPlugin')?.classList.contains('open')) return true;
  if (document.getElementById('logoCropModal')?.classList.contains('open')) return true;
  if (document.getElementById('bn-prod-modal')?.classList.contains('show')) return true;
  if (document.getElementById('bn-bg-modal')?.classList.contains('show')) return true;
  if (document.getElementById('logoMenuV14')?.classList.contains('show')) return true;
  if (isVisibleJobNavigationOverlay(document.getElementById('_bn_logo_inline_menu'))) return true;
  return Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'))
    .some(isVisibleJobNavigationOverlay);
}

function keepActiveJobCardVisible(jobId) {
  requestAnimationFrame(() => {
    if (!el.jobList || activeJobId !== jobId) return;
    const card = Array.from(el.jobList.querySelectorAll('.job-card'))
      .find(node => node.dataset.jobId === String(jobId));
    if (!card) return;
    const listRect = el.jobList.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (cardRect.top < listRect.top) {
      el.jobList.scrollTop += cardRect.top - listRect.top;
    } else if (cardRect.bottom > listRect.bottom) {
      el.jobList.scrollTop += cardRect.bottom - listRect.bottom;
    }
  });
}

function handleJobArrowNavigation(event) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  if (isJobKeyboardNavigationControl(event.target) || isJobKeyboardNavigationBlocked()) return;
  if (jobs.length <= 1) return;
  const currentIndex = jobs.findIndex(job => job.id === activeJobId);
  if (currentIndex < 0) return;
  const targetIndex = currentIndex + (event.key === 'ArrowUp' ? -1 : 1);
  if (targetIndex < 0 || targetIndex >= jobs.length || targetIndex === currentIndex) return;
  const targetJob = jobs[targetIndex];
  if (!targetJob || targetJob.id === activeJobId) return;
  event.preventDefault();
  selectJob(targetJob.id)
    .then(() => keepActiveJobCardVisible(targetJob.id))
    .catch(error => console.warn('[CC] keyboard job navigation failed:', error));
}

function updateJobListThumbnail(jobId, dataUrl) {
  if (!JOB_LIST_THUMBNAILS_ENABLED) return;
  const card = el.jobList.querySelector(`.job-card[data-job-id="${jobId}"]`);
  if (!card) {
    console.log('[CC][thumb] DOM update skipped', jobId, 'card not rendered');
    renderJobList();
    return;
  }
  const thumb = card.querySelector('.job-card-thumb');
  if (!thumb) {
    console.log('[CC][thumb] DOM update skipped', jobId, 'thumb missing');
    renderJobList();
    return;
  }
  let img = thumb.querySelector('img');
  if (!img) {
    thumb.querySelector('.job-card-thumb-placeholder')?.remove();
    img = document.createElement('img');
    img.alt = '';
    thumb.insertBefore(img, thumb.firstChild);
  }
  img.src = dataUrl;
  console.log('[CC][thumb] DOM img src updated', jobId, 'len=' + String(dataUrl || '').length);
}

function renderAssetFileLists() {
  const job = jobs.find(j => j.id === activeJobId);
  // logo-file-list / product-file-list 由 plugin 接管；null-safe
  renderAssetList(document.getElementById('logo-file-list'),    job?.logoFilenames    || []);
  renderAssetList(document.getElementById('product-file-list'), job?.productFilenames || []);
  ensureProductMasterControls();
}

function renderAssetList(container, filenames) {
  if (!container) return;
  if (!filenames.length) {
    container.innerHTML = '<span class="asset-empty">尚未設定</span>';
    return;
  }
  container.innerHTML = filenames.map(f => {
    const found = !!lookupAsset(f);
    const cls   = Object.keys(assetIndex).length ? (found ? 'ok' : 'miss') : 'none';
    return `<div class="asset-file-item">
      <span class="asset-dot ${cls}"></span>
      <span class="asset-file-name" title="${f}">${f}</span>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════
//  14. 工單管理
// ══════════════════════════════════════════════════════
function createJob(data = {}) {
  const rawTemplate = data.template || data.templateId || 'template';
  const normalizedTemplate = rawTemplate === 'template' ? 'template' : 'template';
  const legacyStyle = rawTemplate !== 'template' ? rawTemplate : '';
  const placement = data.placementId
    ? registry?.placements?.find(p => p.id === data.placementId)
    : defaultPlacementForJob();
  const template = placement?.templates?.find(t => t.id === normalizedTemplate) || placement?.templates?.[0] || null;
  const job = {
    id:               jobIdSeq++,
    jobId:            data.jobId || '',
    template:         template?.id || normalizedTemplate,
    templateId:       template?.id || normalizedTemplate,
    styleId:          normalizeStyleId(data.style || data.styleId || data.templateStyle || legacyStyle || '01'),
    placementId:      data.placementId || placement?.id || '',
    headline:         data.headline    || '',
    subheadline:      data.subheadline || '',
    disclaimer:       data.disclaimer  || '',
    // 合法網址一律存「補完 https:// 後」的版本（docs/proposals/QR-Code-Product-Proposal.md
    // 「網址驗證」：輸入框、Project State、QRCode、檢查網址連結四處皆用補完後網址）；
    // 空值／非法網址維持原始字串，讓使用者能看到並修正。
    qrCodeUrl:        (window.BNQrCodeUrl?.normalize(data.qrCodeUrl || '')) || (data.qrCodeUrl || ''),
    logoFilenames:    data.logoFilenames    || [],
    productFilenames: data.productFilenames || [],
    outputFilename:   data.outputFilename   || '',
    thumbnail:        data.thumbnail || null,
    quickThumbnail:   data.quickThumbnail || null,
    thumbnailStatus:  data.thumbnail ? 'ready' : data.quickThumbnail ? 'quick' : 'idle',
    layoutState:      data.layoutState || null,
    layoutStates:     data.layoutStates || null,
    validation:       { status: 'pending', missing: [] },
  };
  return ensureJobPlacementTemplate(job);
}

function addJob(data = {}) {
  const job = createJob(data);
  ensureJobPlacementTemplate(job);
  validateJob(job);
  jobs.push(job);
  activeJobId = job.id;
  renderJobList();
  renderValidationPanel();
  return job;
}

function deleteJob(id) {
  jobs = jobs.filter(j => j.id !== id);
  if (activeJobId === id) {
    activeJobId = jobs.length ? jobs[0].id : null;
    if (activeJobId) selectJob(activeJobId);
    else {
      fillFields({});
      updateCounters();
      renderAssetFileLists();
      setTopbarBadge(el.csvStatus, el.csvStatusText, '');
      showInitialWorkspaceState();
    }
  }
  renderJobList();
  renderValidationPanel();
}

async function selectJob(id, options = {}) {
  if (!options.skipSync) await syncActiveLayoutState();
  activeJobId = id;
  const job = jobs.find(j => j.id === id);
  if (!job) return;
  ensureJobPlacementTemplate(job);
  fillFields(job);
  ensureWorkspaceReadyForJob();
  const renderContext = getActiveRenderContext(job.styleId || '01');
  const renderPlacement = getPlacementById(renderContext.placementId) || activePlacement;
  if (renderPlacement) {
    activePlacement = renderPlacement;
    if (el.placement) el.placement.value = renderPlacement.id;
    renderTemplateOptions(false);
  }
  const renderTemplate = getTemplateForRenderContext(job, renderContext);
  if (renderTemplate) {
    activeTemplate = renderTemplate;
    if (el.template) el.template.value = renderTemplate.id;
    try {
      const url = new URL(activeTemplate.editorUrl, location.href);
      activeTemplate._templatePath = decodeURIComponent(url.searchParams.get('template') || '');
    } catch (_) {}
  }
  if (!job.quickThumbnail) assignQuickThumbnail(job);
  const jobMaterialMode = inferMaterialModeFromJob(job);
  renderJobList();
  renderAssetFileLists();
  renderStyleOptions(job.styleId || '01');
  // 重置 plugin 狀態，避免上一筆工單資料殘留
  window._bnProducts   = [];
  window._bnLogos      = [];
  window._bnPerson     = null;
  window._bnSingleProd = null;
  if (typeof window._bnResetProdSlots === 'function') window._bnResetProdSlots();
  if (typeof window._bnRenderProdList  === 'function') window._bnRenderProdList();
  if (typeof window._bnRenderLogoList  === 'function') window._bnRenderLogoList();
  updateProductModeLock();
  ensureProductMasterControls();
  updateProductMasterControls();
  updateTemplateModeLabel(jobMaterialMode);
  resetMaterialAccordionsForJob(jobMaterialMode);
  // 重載 canvas（乾淨狀態），ready 後自動送文字 + 素材
  if (!activeTemplate && activePlacement?.templates?.length) {
    selectTemplate(activePlacement.templates[0].id, { skipSync: true });
  } else if (activeTemplate?._templatePath) {
    pendingRecord = currentRecord();
    const layoutKey = layoutStateKeyForRenderContext(job, renderContext);
    const savedLayoutState = getJobLayoutStateStrict(job, layoutKey);
    setMainFrameLayoutTarget(job, layoutKey);
    const loadSeq = loadCanvas(activeTemplate._templatePath, job.styleId || '01');
    const frameWindow = el.frame.contentWindow;
    waitForFrameReady(15000).then(async () => {
      if (loadSeq !== canvasLoadSeq) return;
      await applyLogosToCanvas(job.logoFilenames || []);
      if (loadSeq !== canvasLoadSeq) return;
      await applyProductsToCanvas(job.productFilenames || [], isThreeProductJob(job) ? {
        job,
        loadSeq,
        frameWindow,
      } : {});
      if (loadSeq !== canvasLoadSeq) return;
      await applyQrCodeToCanvas(job);
      if (loadSeq !== canvasLoadSeq) return;
      await waitForFrameImages(el.frame.contentWindow, 3000);
      await sleep(180);
      if (loadSeq !== canvasLoadSeq) return;
      const layoutToApply = await resolveSmartProductLayoutForMainCanvas(job, layoutKey, savedLayoutState, el.frame.contentWindow, renderContext);
      if (loadSeq !== canvasLoadSeq) return;
      if (layoutToApply) {
        setJobLayoutState(job, layoutToApply, layoutKey);
        await applyJobLayoutStateToFrame(job, el.frame.contentWindow, layoutToApply, {
          skipRequest: !!options.skipLayoutStateRequest,
        });
      }
    }).catch(err => console.warn('[CC] selectJob waitForFrameReady:', err));
  }
  if (!job.thumbnail) enqueueThumbnail(job.id, true);
}

function saveCurrentJobData() {
  const job = jobs.find(j => j.id === activeJobId);
  if (!job) return;
  const r = currentRecord();
  job.headline    = r.headline;
  job.subheadline = r.subheadline;
  job.disclaimer  = r.disclaimer;
  assignQuickThumbnail(job);
  renderJobList();
  scheduleActiveJobThumbnailUpdate(800);
}

// ══════════════════════════════════════════════════════
//  15. CSV / Excel 解析
// ══════════════════════════════════════════════════════
function findHeaderRow(rows) {
  const TARGET_KEYS = ['案件編號', '主標', '副標', '小字', '版型'];
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const row = rows[i];
    const hits = TARGET_KEYS.filter(k => row.some(cell => String(cell).includes(k)));
    if (hits.length >= 2) {
      const colMap = {};
      row.forEach((cell, ci) => {
        const c = String(cell).replace(/\n.*/gs, '').trim();
        if (c.includes('案件編號'))                  colMap.jobId      = ci;
        if (c.includes('版型') || c.includes('樣式')) colMap.styleId = ci;
        if (c.includes('主標'))                      colMap.headline   = ci;
        if (c.includes('副標'))                      colMap.subheadline= ci;
        if (c.includes('小字'))                      colMap.disclaimer = ci;
        if (c.includes('主視覺素材'))                colMap.products   = ci;
        if (c.includes('Logo') && c.includes('檔案'))colMap.logos      = ci;
        if (c.includes('輸出檔名'))                  colMap.output     = ci;
        // 真實入稿表同一列裡還有「QRcode統一導shop...」「QRcode雲端(SPX填寫)」等
        // 其他 SPX 內部欄位，開頭都含「QRcode」；這裡清乾淨後的第一行內容必須
        // 「剛好等於」QRcode，才是使用者實際填寫網址的那一欄，避免被後面同樣
        // 含「QRcode」字樣、但屬於 SPX 內部流程、通常是空的欄位覆蓋掉。
        if (/^qrcode$/i.test(c))                      colMap.qrCodeUrl  = ci;
      });
      return { rowIndex: i, colMap };
    }
  }
  return null;
}

function splitMultiline(cell) {
  return String(cell || '').split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);
}

function parseJobsFromRows(rows, headerInfo) {
  const { rowIndex, colMap } = headerInfo;
  const result = [];
  for (let i = rowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const jobId    = String(row[colMap.jobId]    ?? '').trim();
    const headline = String(row[colMap.headline] ?? '').trim();
    if (!jobId || !headline) continue;

    const rawStyle     = String(row[colMap.styleId] ?? '').trim();
    const styleId      = rawStyle ? normalizeStyleId(rawStyle) : '01';
    const subheadline  = String(row[colMap.subheadline] ?? '').trim();
    const disclaimer   = String(row[colMap.disclaimer]  ?? '').trim();
    const outputFn     = String(row[colMap.output]      ?? '').trim() || `${jobId}.png`;
    const logoFilenames    = colMap.logos    != null ? splitMultiline(row[colMap.logos])    : [];
    const productFilenames = colMap.products != null ? splitMultiline(row[colMap.products]) : [];
    const qrCodeUrl        = colMap.qrCodeUrl != null ? String(row[colMap.qrCodeUrl] ?? '').trim() : '';

    result.push({ jobId, template: 'template', templateId: 'template', styleId, headline, subheadline, disclaimer,
      outputFilename: outputFn, logoFilenames, productFilenames, qrCodeUrl });
  }
  return result;
}

function parseCsvToRows(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (ch === '"' && quoted && nx === '"') { value += '"'; i++; }
    else if (ch === '"') { quoted = !quoted; }
    else if (ch === ',' && !quoted) { row.push(value); value = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && nx === '\n') i++;
      row.push(value);
      if (row.some(c => c.trim())) rows.push(row);
      row = []; value = '';
    } else { value += ch; }
  }
  row.push(value);
  if (row.some(c => c.trim())) rows.push(row);
  return rows;
}

async function importFile(file) {
  if (!file) return;
  setTopbarBadge(el.csvStatus, el.csvStatusText, '');
  const ext = file.name.split('.').pop().toLowerCase();
  let rows = [];
  try {
    if (ext === 'csv') {
      rows = parseCsvToRows(await file.text());
    } else if (['xlsx', 'xls'].includes(ext)) {
      if (typeof XLSX === 'undefined') { setStatus('SheetJS 未載入', 'error'); return; }
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      rows = data.map(r => Array.isArray(r) ? r : Object.values(r));
    } else {
      setStatus('不支援的格式（請用 .xlsx / .csv）', 'error'); return;
    }

    const headerInfo = findHeaderRow(rows);
    if (!headerInfo) { setStatus('找不到標題列（需含「案件編號」欄）', 'error'); return; }

    const parsed = parseJobsFromRows(rows, headerInfo);
    if (!parsed.length) { setStatus('沒有可用的工單資料', 'error'); return; }

    await resetWorkspaceState({ keepAssetsFolder: true });
    parsed.forEach(d => addJob(d));
    setTopbarBadge(el.csvStatus, el.csvStatusText, `已匯入工單（${parsed.length}）`);
    setStatus(`已匯入 ${parsed.length} 筆工單。`, 'success');
    console.log('[CC][thumb] CSV import complete', 'parsed=' + parsed.length, 'totalJobs=' + jobs.length);
    const firstNew = jobs[jobs.length - parsed.length];
    if (firstNew) {
      const newJobs = jobs.slice(jobs.length - parsed.length);
      selectJob(firstNew.id);
      assignQuickThumbnails(newJobs);
      refreshAssetPipelineState();
      console.log('[CC][thumb] CSV quick thumbnails ready', newJobs.map(job => job.jobId || job.id).join(','));
      enqueueAllThumbnails(firstNew.id);
    }
    maybeRunAiWorkflowReadyCheck();
  } catch (e) {
    setStatus('匯入失敗：' + e.message, 'error');
    console.error(e);
  }
}

// ══════════════════════════════════════════════════════
//  16. Logo → bn-logos（直接送 canvas iframe）
// ══════════════════════════════════════════════════════
async function applyLogosToCanvas(logoFilenames) {
  if (!logoFilenames.length) return;
  window._bnLogos = [];              // 先清空 plugin 狀態
  let payload;
  try {
    payload = await window.BNAssetRenderPayload.buildLogoPayload({
      filenames: logoFilenames,
      getHandle: lookupAsset,
      handleToDataUrl,
      trim: autoTrim,
      idPrefix: 'cc_logo_',
    });
  } catch (e) {
    console.error('[CC] logo 讀取失敗:', e);
    return;
  }
  payload.missing.forEach(filename => console.warn('[CC] logo 找不到:', filename));
  payload.errors.forEach(item => console.error('[CC] logo 讀取失敗:', item.filename, item.error));
  payload.logos.forEach((logo, index) => {
    const logoObj = { id: logo.id, src: logo.src };
    window._bnLogos.push(logoObj); // 同步到 plugin 狀態
    console.log('[CC] logo ' + (index + 1) + ' trim 完成 ratio=' + logo.ratio.toFixed(3));
  });
  if (!payload.message) return;
  if (typeof window._bnRenderLogoList === 'function') window._bnRenderLogoList(); // 刷新右側 UI
  el.frame.contentWindow.postMessage(payload.message, '*');
  console.log('[CC] bn-logos 送出', payload.logos.length, '個');
  scheduleActiveJobThumbnailUpdate(900);
}

// ══════════════════════════════════════════════════════
//  16.5 QRCode → bn-qrcode-set／bn-qrcode-clear（直接送 canvas iframe）
//  docs/proposals/QR-Code-Product-Proposal.md：網址驅動、即時產生，
//  固定版位（由 template.json 的 qrZone 決定），不接受動態位置/大小。
// ══════════════════════════════════════════════════════
async function applyQrCodeToCanvas(job) {
  if (!el.frame?.contentWindow) return;
  const normalized = window.BNQrCodeUrl?.normalize(job?.qrCodeUrl);
  if (!normalized) {
    el.frame.contentWindow.postMessage({ type: 'bn-qrcode-clear' }, '*');
    return;
  }
  try {
    const src = await new Promise((resolve, reject) => {
      window.QRCode.toDataURL(normalized, {
        errorCorrectionLevel: 'M',
        color: { dark: '#000000ff', light: '#ffffffff' },
      }, (err, url) => (err ? reject(err) : resolve(url)));
    });
    el.frame.contentWindow.postMessage({ type: 'bn-qrcode-set', src }, '*');
  } catch (error) {
    console.error('[CC] QRCode 產生失敗:', error);
    el.frame.contentWindow.postMessage({ type: 'bn-qrcode-clear' }, '*');
  }
}

// ══════════════════════════════════════════════════════
//  17. 商品圖 → bn-product-add（直接送 canvas iframe）
// ══════════════════════════════════════════════════════
async function applyProductsToCanvas(productFilenames, options = {}) {
  if (!productFilenames.length) return;
  const transaction = options.job && options.loadSeq != null && options.frameWindow
    ? { job: options.job, loadSeq: options.loadSeq, frameWindow: options.frameWindow, template: activeTemplate }
    : null;
  const stopStaleProductRender = stage => {
    if (!transaction) return false;
    const stale = transaction.job.id !== activeJobId
      || transaction.loadSeq !== canvasLoadSeq
      || transaction.frameWindow !== el.frame?.contentWindow;
    if (stale) {
      console.log('[CC][products] stale render stopped', {
        stage,
        job: transaction.job.jobId || transaction.job.id,
        loadSeq: transaction.loadSeq,
        activeJobId,
        canvasLoadSeq,
      });
    }
    return stale;
  };
  if (stopStaleProductRender('start')) return;

  const renderTemplate = transaction ? transaction.template : activeTemplate;
  const renderJob = transaction ? transaction.job : activeJob();
  if (renderTemplate) {
    try { await ensureTemplateJson(renderTemplate, renderJob?.styleId || '01'); } catch (_) {}
  }
  if (stopStaleProductRender('template-ready')) return;
  const resolvedAssets = await buildMainCanvasResolvedAssets(renderJob);
  if (stopStaleProductRender('assets-resolved')) return;
  const payload = await window.BNAssetRenderPayload.buildProductPayloads({
    filenames: productFilenames,
    templateJson: renderTemplate?._json || {},
    getHandle: lookupAsset,
    handleToDataUrl,
    trim: autoTrim,
    imageUtils: window.BNImageUtils,
    resolvedAssets,
    createId: (kind, index) => 'cc_p' + Date.now() + '_' + index,
  });
  if (stopStaleProductRender('payload-built')) return;
  applyJobManualRenderStateToPayload(renderJob, payload);
  const info = payload.info;
  console.log('[CC] 商品分類:', payload.type);
  payload.missing.forEach(filename => console.warn('[CC] 商品找不到:', filename));
  payload.errors.forEach(item => console.error('[CC] 商品圖失敗:', item.filename, item.error));

  if (payload.type === 'three_products') {
    if (stopStaleProductRender('before-products-state')) return;
    updateTemplateModeLabel('three_products');
    clearPersonProductState(false);
    if (stopStaleProductRender('before-products-globals')) return;
    window._bnProducts = [];           // 先清空 plugin 狀態
    for (let i = 0; i < payload.products.length; i++) {
      if (stopStaleProductRender('before-product-' + i)) return;
      const product = payload.products[i];
      window._bnProducts.push({
        id: product.id,
        src: product.src,
        ratio: product.ratio,
        baselineRatio: product.baselineRatio,
        name: product.name,
        filename: product.filename,
        sizeScale: product.sizeScale,
        position: product.position,
        zOrder: product.zOrder,
        _slot: product._slot,
      });
      if (stopStaleProductRender('before-product-message-' + i)) return;
      transaction.frameWindow.postMessage(payload.messages[i], '*');
      console.log('[CC] bn-product-add pos=' + product.position +
        ' ratio=' + product.ratio.toFixed(3) +
        ' baselineRatio=' + product.baselineRatio.toFixed(3));
      await sleep(60);
      if (stopStaleProductRender('after-product-message-' + i)) return;
    }
    if (stopStaleProductRender('products-complete')) return;
    if (typeof window._bnRenderProdList === 'function') window._bnRenderProdList(); // 刷新右側 UI
    updateProductModeLock();
    if (!options.skipThumbnail) scheduleActiveJobThumbnailUpdate(900);

  } else {
    // person + single product
    updateTemplateModeLabel('person_product');
    clearThreeProductState(false);
    for (const message of payload.messages) {
      if (message.type === 'bn-person-add' && payload.person) {
        window._bnPerson = {
          src: payload.person.src,
          displayWidth: payload.person.displayWidth,
          objectFit: payload.person.objectFit,
        };
        el.frame.contentWindow.postMessage(message, '*');
        console.log('[CC] bn-person-add fitWidth=' + payload.person.displayWidth);
        await sleep(150);
      } else if (message.type === 'bn-single-product-add' && payload.singleProduct) {
        window._bnSingleProd = {
          src: payload.singleProduct.src,
          ratio: payload.singleProduct.ratio,
          displayW: payload.singleProduct.displayW,
          displayH: payload.singleProduct.displayH,
          zoneHeight: payload.singleProduct.zoneHeight,
          objectFit: payload.singleProduct.objectFit,
        };
        el.frame.contentWindow.postMessage(message, '*');
        console.log('[CC] bn-single-product-add ratio=' + payload.singleProduct.ratio.toFixed(3));
        await sleep(150);
      }
    }
    if (info.ignored?.length) showPersonProductFilenameHint();
    updateProductModeLock();
    if (!options.skipThumbnail) scheduleActiveJobThumbnailUpdate(900);
  }
}

// ══════════════════════════════════════════════════════
//  18. 截圖（bn-capture → bn-snapshot）
// ══════════════════════════════════════════════════════
function captureFromCanvasFrame(timeout = 15000) {
  if (!frameReady) return Promise.resolve(null);
  return new Promise(resolve => {
    const msgId = 'cc_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    function onMsg(e) {
      if (e.data?.type !== 'bn-snapshot' || e.data.msgId !== msgId) return;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      resolve(e.data.dataUrl || null);
    }
    window.addEventListener('message', onMsg);
    el.frame.contentWindow.postMessage({ type: 'bn-capture', msgId }, '*');
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      resolve(null);
    }, timeout);
  });
}

function ensureTemplatePath(template) {
  if (!template || template._templatePath) return template?._templatePath || '';
  try {
    const url = new URL(template.editorUrl, location.href);
    template._templatePath = decodeURIComponent(url.searchParams.get('template') || '');
  } catch (_) {}
  return template._templatePath || '';
}

function normalizeStyleId(value, fallback = '01') {
  const raw = String(value || '').trim();
  const digits = raw.match(/\d+/)?.[0] || String(fallback || '01');
  return digits.padStart(2, '0').slice(-2);
}

function getStyleOptions(template = activeTemplate) {
  if (!template) return [];
  if (Array.isArray(template.styles) && template.styles.length) return template.styles;
  const count = Number(template.styleCount || 16);
  const base = ensureTemplatePath(template).replace(/\/template\.json(?:\?.*)?$/, '');
  return Array.from({ length: count }, (_, index) => {
    const id = String(index + 1).padStart(2, '0');
    return { id, name: `樣式 ${id}`, path: `${base}/styles/${id}.json` };
  });
}

function getStylePath(template = activeTemplate, styleId = activeJob()?.styleId || '01') {
  const id = normalizeStyleId(styleId);
  const found = getStyleOptions(template).find(style => style.id === id);
  if (found?.path) return found.path;
  const base = ensureTemplatePath(template).replace(/\/template\.json(?:\?.*)?$/, '');
  return `${base}/styles/${id}.json`;
}

async function fetchJsonNoStore(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function mergeTemplateStyle(templateJson, styleJson) {
  if (!window.ADTemplateLoader?.applyStyle) {
    throw new Error('ADTemplateLoader.applyStyle is required to merge Template and Style.');
  }
  return window.ADTemplateLoader.applyStyle(templateJson, styleJson);
}

async function ensureTemplateJson(template, styleId = activeJob()?.styleId || '01') {
  const path = ensureTemplatePath(template);
  if (!template || !path) return null;
  const normalized = normalizeStyleId(styleId);
  if (template._json && template._jsonStyleId === normalized) return template._json;
  const templateJson = template._baseJson || await fetchJsonNoStore(path);
  template._baseJson = templateJson;
  const styleJson = await fetchJsonNoStore(getStylePath(template, normalized));
  template._json = mergeTemplateStyle(templateJson, styleJson);
  template._jsonStyleId = normalized;
  return template._json;
}

function getTemplateForJob(job) {
  const placement = registry?.placements?.find(p => p.id === job?.placementId) || activePlacement;
  const templateId = job?.template || job?.templateId || 'template';
  const placementTemplate = placement?.templates?.find(t => t.id === templateId) || placement?.templates?.[0] || null;
  if (placementTemplate) return placementTemplate;
  return activeTemplate || null;
}

function postTextToFrame(frameWindow, record) {
  frameWindow.postMessage({
    type: 'bn-text',
    data: {
      '主標可08個字以內':              record.headline    || '',
      '副標07個字以內':                record.subheadline || '',
      '不放案型日期或警語可在14個字':  record.disclaimer  || '',
    },
  }, '*');
}

async function applyJobLayoutStateToFrame(job, frameWindow = el.frame?.contentWindow, stateOverride = null, options = {}) {
  const state = stateOverride || getJobLayoutState(job);
  if (!state || !frameWindow) return;
  batchTraceState('BATCH_TRACE_3_APPLY', 'applyJobLayoutStateToFrame-state-to-apply', job, stableLayoutStateKeyForJob(job), state);
  traceLayoutState('applyJobLayoutStateToFrame:state-to-apply', job, stableLayoutStateKeyForJob(job), state);
  applyLayoutStateToFrameDom(frameWindow, state, 'before-message');
  frameWindow.postMessage({ type: 'bn-layout-state-apply', state }, '*');
  await sleep(180);
  applyLayoutStateToFrameDom(frameWindow, state, 'after-message');
  if (!options.skipRequest) frameWindow.postMessage({ type: 'bn-layout-state-request' }, '*');
}

function waitForHiddenFrameReady(frame, timeout = 5000, label = '') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error('hidden frame ready timeout ' + label));
    }, timeout);
    function onMsg(event) {
      if (event.source !== frame.contentWindow || event.data?.type !== 'bn-iframe-ready') return;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      resolve();
    }
    window.addEventListener('message', onMsg);
  });
}

function captureFromHiddenFrame(frame, timeout = 5000, label = '') {
  return new Promise(resolve => {
    const msgId = 'thumb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      console.warn('[CC][thumb] hidden capture timeout', label, msgId, 'timeoutMs=' + timeout);
      resolve(null);
    }, timeout);
    function onMsg(event) {
      if (event.source !== frame.contentWindow) return;
      if (event.data?.type !== 'bn-snapshot' || event.data.msgId !== msgId) return;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      console.log('[CC][thumb] bn-snapshot received', label, 'len=' + String(event.data.dataUrl || '').length);
      resolve(event.data.dataUrl || null);
    }
    window.addEventListener('message', onMsg);
    console.log('[CC][thumb] bn-capture sent', label, msgId, 'timeoutMs=' + timeout);
    frame.contentWindow.postMessage({ type: 'bn-capture', msgId }, '*');
  });
}

async function waitForFrameImages(frameWindow, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const images = Array.from(frameWindow.document.images || []);
      const pending = images.filter(img => !img.complete || !img.naturalWidth);
      if (!pending.length) return true;
    } catch (_) {
      return false;
    }
    await sleep(100);
  }
  return false;
}

async function postLogosToFrame(frameWindow, logoFilenames, label = '') {
  if (!logoFilenames?.length) {
    console.log('[CC][thumb] bn-logos skipped', label);
    return;
  }
  const payload = await window.BNAssetRenderPayload.buildLogoPayload({
    filenames: logoFilenames,
    getHandle: lookupAsset,
    handleToDataUrl,
    trim: autoTrim,
    idPrefix: 'thumb_logo_',
  });
  if (payload.message) {
    frameWindow.postMessage(payload.message, '*');
    console.log('[CC][thumb] bn-logos sent', label, 'count=' + payload.logos.length);
  } else {
    console.warn('[CC][thumb] bn-logos skipped', label, 'no matched assets');
  }
}

async function postProductsToFrame(frameWindow, productFilenames, templateJson, label = '', options = {}) {
  if (!productFilenames?.length) {
    console.log('[CC][thumb] products skipped', label);
    return;
  }
  const payload = await window.BNAssetRenderPayload.buildProductPayloads({
    filenames: productFilenames,
    templateJson,
    getHandle: lookupAsset,
    handleToDataUrl,
    trim: autoTrim,
    imageUtils: window.BNImageUtils,
    resolvedAssets: options.resolvedAssets || null,
    createId: (kind, index) => 'thumb_p_' + Date.now() + '_' + index,
  });
  applyJobManualRenderStateToPayload(options.job || null, payload);
  console.log('[CC][thumb] products mode', label, payload.type);
  for (const message of payload.messages) {
    frameWindow.postMessage(message, '*');
    if (message.type === 'bn-product-add') {
      console.log('[CC][thumb] bn-product-add sent', label, message.name, 'pos=' + message.position);
      await sleep(40);
    } else if (message.type === 'bn-person-add') {
      console.log('[CC][thumb] bn-person-add sent', label, payload.info.person);
      await sleep(80);
    } else if (message.type === 'bn-single-product-add') {
      console.log('[CC][thumb] bn-single-product-add sent', label, payload.singleProduct?.filename || '');
      await sleep(80);
    }
  }
}

async function generateJobThumbnail(job, renderContext = getActiveRenderContext(job?.styleId || '01')) {
  const context = normalizeRenderContext(renderContext, job?.styleId || '01');
  const label = job.jobId || String(job.id);
  const layoutKey = layoutStateKeyForRenderContext(job, context);
  const savedLayoutState = getJobLayoutState(job, layoutKey);
  const template = getTemplateForRenderContext(job, context);
  const templatePath = ensureTemplatePath(template);
  console.log('[CC][thumb] generate begin', label, 'templatePath=' + (templatePath || ''));
  if (!templatePath) {
    console.warn('[CC][thumb] generate abort', label, 'missing templatePath');
    return null;
  }
  const templateJson = await ensureTemplateJson(template, job.styleId || '01');
  console.log('[CC][thumb] template json', label, templateJson ? 'ok' : 'missing');
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  const output = templateJson?.output || {};
  const renderPlacement = getPlacementById(context.placementId) || activePlacement;
  const width = Number(output.width || templateJson?.width || renderPlacement?.width || 1080);
  const height = Number(output.height || templateJson?.height || renderPlacement?.height || 1920);
  frame.style.cssText = [
    'position:fixed',
    'left:-100000px',
    'top:0',
    `width:${width}px`,
    `height:${height}px`,
    'border:0',
    'opacity:0',
    'pointer-events:none',
    'z-index:-1',
  ].join(';');
  document.body.appendChild(frame);
  try {
    const ready = waitForHiddenFrameReady(frame, HIDDEN_FRAME_READY_TIMEOUT, label);
    frame.src = `canvas.html?template=${encodeURIComponent(templatePath)}&style=${encodeURIComponent(context.styleId)}&_thumb=${Date.now()}`;
    console.log('[CC][thumb] hidden iframe src set', label, frame.src);
    await ready;
    console.log('[CC][thumb] bn-iframe-ready received', label);
    postTextToFrame(frame.contentWindow, job);
    console.log('[CC][thumb] bn-text sent', label, shortText(job.headline || '', 12), '/', shortText(job.subheadline || '', 12));
    await sleep(180);
    await postLogosToFrame(frame.contentWindow, job.logoFilenames || [], label);
    if (job.logoFilenames?.length) await sleep(240);
    const resolvedAssets = await buildThumbnailResolvedAssets(job);
    await postProductsToFrame(frame.contentWindow, job.productFilenames || [], templateJson, label, { resolvedAssets, job });
    if (job.productFilenames?.length) await sleep(420);
    await applyJobLayoutStateToFrame(job, frame.contentWindow, savedLayoutState, { skipRequest: true });
    await waitForFrameImages(frame.contentWindow, 6000);
    const dataUrl = await captureFromHiddenFrame(frame, HIDDEN_CAPTURE_TIMEOUT, label);
    return dataUrl;
  } finally {
    console.log('[CC][thumb] hidden iframe removed', label);
    frame.remove();
  }
}

// ══════════════════════════════════════════════════════
//  19. Canvas 載入（直接對 canvas.html）
// ══════════════════════════════════════════════════════

function fitPreview() {
  if (!activePlacement) return;
  const bannerW = activePlacement.width;
  const bannerH = activePlacement.height;
  if (!bannerW || !bannerH) return;
  const area = document.getElementById('preview-area');
  if (!area) return;
  const rect = area.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const PAD = 12;
  const scale = Math.min((rect.width - PAD * 2) / bannerW, (rect.height - PAD * 2) / bannerH, 1);
  const wrap = document.getElementById('preview-wrap');
  if (wrap) {
    wrap.style.width  = Math.round(bannerW * scale) + 'px';
    wrap.style.height = Math.round(bannerH * scale) + 'px';
  }
  el.frame.style.width     = bannerW + 'px';
  el.frame.style.height    = bannerH + 'px';
  el.frame.style.transform = `scale(${scale})`;
  previewScale = scale;
}

// ══════════════════════════════════════════════════════
//  19b. 單品 geometry overlay
//       只保留幾何同步與舊 offset 訊息相容。
//       實際拖曳 / 縮放 / 旋轉由 canvas 內的 BNBoxTransformUtils 處理。
// ══════════════════════════════════════════════════════
function getOrCreateDragOverlay() {
  if (dragOverlay) return dragOverlay;
  const wrap = document.getElementById('preview-wrap');
  if (!wrap) return null;
  dragOverlay = document.createElement('div');
  dragOverlay.id = 'single-product-drag-overlay';
  dragOverlay.style.cssText = [
    'position:absolute',
    'display:none',
    'z-index:12',
    'pointer-events:auto',
    'cursor:move',
    'touch-action:none',
    'background:transparent',
    'user-select:none',
  ].join(';');
  wrap.appendChild(dragOverlay);
  ['nw', 'ne', 'sw', 'se'].forEach(corner => {
    const h = document.createElement('div');
    h.dataset.corner = corner;
    h.style.cssText = [
      'position:absolute',
      'width:14px',
      'height:14px',
      'border-radius:50%',
      'background:#4a90e2',
      'border:2px solid #fff',
      'z-index:2',
      corner.includes('n') ? 'top:-7px' : 'bottom:-7px',
      corner.includes('w') ? 'left:-7px' : 'right:-7px',
      `cursor:${corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize'}`,
    ].join(';');
    dragOverlay.appendChild(h);
  });
  const rot = document.createElement('div');
  rot.dataset.rotHandle = '1';
  rot.textContent = 'R';
  rot.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:6px',
    'transform:translateX(-50%)',
    'width:22px',
    'height:22px',
    'border-radius:50%',
    'background:#4a90e2',
    'border:2px solid #fff',
    'z-index:3',
    'cursor:grab',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font-size:12px',
    'font-weight:700',
    'color:#fff',
    'line-height:1',
    'box-shadow:0 2px 6px rgba(0,0,0,.35)',
  ].join(';');
  dragOverlay.appendChild(rot);

  function canvasPoint(e) {
    const rect = wrap.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / previewScale,
      y: (e.clientY - rect.top) / previewScale,
    };
  }

  function sendSingleProductTransform(next) {
    singleProductGeometry = { ...singleProductGeometry, ...next };
    updateSingleProductDragOverlay();
    el.frame.contentWindow.postMessage({
      type: 'bn-single-product-transform',
      canvasLeft: next.left,
      canvasTop: next.top,
      width: next.width,
      height: next.height,
      rotation: next.rotation || 0,
    }, '*');
    scheduleActiveJobThumbnailUpdate(1000);
  }

  dragOverlay.addEventListener('pointerdown', function(e) {
    if (!singleProductGeometry) return;
    e.preventDefault();
    e.stopPropagation();
    const pt = canvasPoint(e);
    const left = Number(singleProductGeometry.left) || 0;
    const top = Number(singleProductGeometry.top) || 0;
    const width = Number(singleProductGeometry.width) || 1;
    const height = Number(singleProductGeometry.height) || 1;
    const rotation = Number(singleProductGeometry.rotation) || 0;
    singleProductDrag = {
      startX:   e.clientX,
      startY:   e.clientY,
      type:     e.target?.dataset?.rotHandle ? 'rotate' : e.target?.dataset?.corner ? 'resize' : 'move',
      corner:   e.target?.dataset?.corner || '',
      left,
      top,
      width,
      height,
      rotation,
      angle:    Math.atan2(pt.y - (top + height / 2), pt.x - (left + width / 2)) * 180 / Math.PI,
      pointerId: e.pointerId,
    };
    try { dragOverlay.setPointerCapture(e.pointerId); } catch (_) {}
  });

  dragOverlay.addEventListener('pointermove', function(e) {
    if (!singleProductDrag || e.pointerId !== singleProductDrag.pointerId) return;
    e.preventDefault();
    const dx = (e.clientX - singleProductDrag.startX) / previewScale;
    const dy = (e.clientY - singleProductDrag.startY) / previewScale;
    const ratio = singleProductDrag.width / Math.max(1, singleProductDrag.height);
    const next = {
      left: singleProductDrag.left,
      top: singleProductDrag.top,
      width: singleProductDrag.width,
      height: singleProductDrag.height,
      rotation: singleProductDrag.rotation,
    };
    if (singleProductDrag.type === 'move') {
      next.left += dx;
      next.top += dy;
    } else if (singleProductDrag.type === 'resize') {
      const c = singleProductDrag.corner;
      const signX = c.includes('w') ? -1 : 1;
      const signY = c.includes('n') ? -1 : 1;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx * signX : dy * signY * ratio;
      next.width = Math.max(20, singleProductDrag.width + delta);
      next.height = Math.max(20, next.width / ratio);
      if (c.includes('w')) next.left = singleProductDrag.left + (singleProductDrag.width - next.width);
      if (c.includes('n')) next.top = singleProductDrag.top + (singleProductDrag.height - next.height);
    } else if (singleProductDrag.type === 'rotate') {
      const pt = canvasPoint(e);
      const cx = singleProductDrag.left + singleProductDrag.width / 2;
      const cy = singleProductDrag.top + singleProductDrag.height / 2;
      const angle = Math.atan2(pt.y - cy, pt.x - cx) * 180 / Math.PI;
      next.rotation = singleProductDrag.rotation + (angle - singleProductDrag.angle);
    }
    sendSingleProductTransform(next);
  });

  function finishDrag(e) {
    if (!singleProductDrag) return;
    try { dragOverlay.releasePointerCapture(singleProductDrag.pointerId); } catch (_) {}
    singleProductDrag = null;
  }
  dragOverlay.addEventListener('pointerup',     finishDrag);
  dragOverlay.addEventListener('pointercancel', finishDrag);

  return dragOverlay;
}

function updateSingleProductDragOverlay() {
  const ov = getOrCreateDragOverlay();
  if (!ov) return;
  ov.style.display = 'none';
  ov.style.pointerEvents = 'none';
  return;
  if (!singleProductGeometry || singleProductGeometry.visible === false) {
    ov.style.display = 'none';
    return;
  }
  ov.style.display = 'block';
  ov.style.left    = (singleProductGeometry.left   * previewScale) + 'px';
  ov.style.top     = (singleProductGeometry.top    * previewScale) + 'px';
  ov.style.width   = (singleProductGeometry.width  * previewScale) + 'px';
  ov.style.height  = (singleProductGeometry.height * previewScale) + 'px';
  ov.style.transform = `rotate(${Number(singleProductGeometry.rotation) || 0}deg)`;
}

/** 載入 canvas.html?template=…（重置 frameReady，等 bn-iframe-ready） */
function loadCanvas(templatePath, styleId = activeJob()?.styleId || '01') {
  const seq = ++canvasLoadSeq;
  frameReady = false;
  clearTimeout(_readyTimeout);
  el.frame.style.display        = 'none';
  el.previewLoader.style.display = 'flex';
  setStatus('連接模板中…');
  el.frame.src = `canvas.html?template=${encodeURIComponent(templatePath)}&style=${encodeURIComponent(normalizeStyleId(styleId))}&_v=${Date.now()}`;
  _readyTimeout = setTimeout(() => {
    if (seq === canvasLoadSeq && !frameReady) setStatus('模板載入逾時，請重新整理', 'error');
  }, 20000);
  return seq;
}

function onFrameReady() {
  if (frameReady) return;
  frameReady = true;
  clearTimeout(_readyTimeout);
  el.previewLoader.style.display = 'none';
  el.frame.style.display         = 'block';
  requestAnimationFrame(fitPreview);
  setStatus('模板已就緒。', 'success');
  // 自動套用暫存文字
  if (pendingRecord) { sendRecord(pendingRecord); pendingRecord = null; }
}

function renderTemplateOptions(autoSelect = true) {
  el.template.replaceChildren();
  el.style?.replaceChildren();
  if (!activeJobId) {
    el.template.add(new Option('—', ''));
    el.template.disabled = true;
    if (el.style) {
      el.style.add(new Option('—', ''));
      el.style.disabled = true;
    }
    return;
  }
  const job = activeJob();
  const jobMaterialMode = inferMaterialModeFromJob(job);
  activePlacement.templates.forEach(t => el.template.add(new Option(getTemplateDisplayName(t, job, jobMaterialMode), t.id)));
  el.template.disabled = !activePlacement.templates.length;

  if (!activePlacement.templates.length) {
    el.template.add(new Option('尚未匯入模板', ''));
    el.frame.removeAttribute('src');
    el.frame.style.display        = 'none';
    el.previewLoader.style.display = 'flex';
    activeTemplate = null;
    setStatus('此尺寸尚未匯入模板。', 'error');
    return;
  }
  if (autoSelect) selectTemplate(activePlacement.templates[0].id);
  else renderStyleOptions(job?.styleId || '01');
}

function renderStyleOptions(selectedStyleId = activeJob()?.styleId || '01') {
  if (!el.style) return;
  el.style.replaceChildren();
  if (!activeJobId || !activeTemplate) {
    el.style.add(new Option('—', ''));
    el.style.disabled = true;
    return;
  }
  getStyleOptions(activeTemplate).forEach(style => {
    el.style.add(new Option(style.name || `樣式 ${style.id}`, style.id));
  });
  el.style.value = normalizeStyleId(selectedStyleId);
  el.style.disabled = false;
}

async function selectPlacement(id) {
  if (!activeJobId) return;
  await syncActiveLayoutState();
  activePlacement = registry.placements.find(p => p.id === id);
  const nextTemplate = activePlacement?.templates?.[0] || null;
  renderTemplateOptions(false);
  assignQuickThumbnails(jobs, getActiveRenderContext(activeJob()?.styleId || '01'));
  renderJobList();
  if (nextTemplate) {
    await selectTemplate(nextTemplate.id, { skipSync: true });
  }
}

async function selectTemplate(id, options = {}) {
  if (!activeJobId) return;
  if (!options.skipSync) await syncActiveLayoutState();
  activeTemplate = activePlacement.templates.find(t => t.id === id);
  if (!activeTemplate) return;
  const selectedJob = activeJob();
  const renderContext = getActiveRenderContext(selectedJob?.styleId || '01');
  if (selectedJob) {
    selectedJob.styleId = normalizeStyleId(selectedJob.styleId || '01');
  }
  window._bnProducts = [];
  window._bnPerson = null;
  window._bnSingleProd = null;
  updateProductModeLock();
  ensureProductMasterControls();
  updateProductMasterControls();
  updateTemplateModeLabel(inferMaterialModeFromJob(activeJob()));

  // 從 editorUrl 取出 template JSON 路徑（e.g. "templates/1599x1080/template.json"）
  try {
    const url = new URL(activeTemplate.editorUrl, location.href);
    activeTemplate._templatePath = decodeURIComponent(url.searchParams.get('template') || '');
  } catch (_) {}

  renderStyleOptions(selectedJob?.styleId || '01');
  updateCounters();

  // 非同步預載 template + style JSON（供 sizeRatios、顏色與縮圖使用）
  if (activeTemplate._templatePath) {
    ensureTemplateJson(activeTemplate, selectedJob?.styleId || '01')
      .then(json => {
        if (json) {
          window.__BN_TEMPLATE__ = json;
          // 對位功能初始化（含 fitFrame + 檢查版位按鈕）
          if (window.ADTemplateControls) window.ADTemplateControls.init(json);
        }
      })
      .catch(() => {});
  }

  // 載入 canvas（不透過 editor）
  pendingRecord = currentRecord();
  if (activeTemplate._templatePath) {
    const layoutKey = layoutStateKeyForRenderContext(selectedJob, renderContext);
    const savedLayoutState = getJobLayoutStateStrict(selectedJob, layoutKey);
    setMainFrameLayoutTarget(selectedJob, layoutKey);
    const loadSeq = loadCanvas(activeTemplate._templatePath, selectedJob?.styleId || '01');
    const frameWindow = el.frame.contentWindow;
    // 若有 active job，ready 後送素材
    const job = jobs.find(j => j.id === activeJobId);
    if (job) {
      waitForFrameReady(15000).then(async () => {
        if (loadSeq !== canvasLoadSeq) return;
        await applyLogosToCanvas(job.logoFilenames || []);
        if (loadSeq !== canvasLoadSeq) return;
        await applyProductsToCanvas(job.productFilenames || [], isThreeProductJob(job) ? {
          job,
          loadSeq,
          frameWindow,
        } : {});
        if (loadSeq !== canvasLoadSeq) return;
        await applyQrCodeToCanvas(job);
        if (loadSeq !== canvasLoadSeq) return;
        await waitForFrameImages(el.frame.contentWindow, 3000);
        await sleep(180);
        if (loadSeq !== canvasLoadSeq) return;
        const layoutToApply = await resolveSmartProductLayoutForMainCanvas(job, layoutKey, savedLayoutState, el.frame.contentWindow, renderContext);
        if (loadSeq !== canvasLoadSeq) return;
        if (layoutToApply) {
          setJobLayoutState(job, layoutToApply, layoutKey);
          await applyJobLayoutStateToFrame(job, el.frame.contentWindow, layoutToApply);
        }
      }).catch(() => {});
    }
  }
  assignQuickThumbnails(jobs, renderContext);
  enqueueAllThumbnails(activeJobId);
}

async function selectStyle(styleId) {
  const job = activeJob();
  if (!job || !activeTemplate) return;
  await syncActiveLayoutState();
  job.styleId = normalizeStyleId(styleId);
  renderStyleOptions(job.styleId);
  try {
    const styleJson = await fetchJsonNoStore(getStylePath(activeTemplate, job.styleId));
    activeTemplate._baseJson = activeTemplate._baseJson || await fetchJsonNoStore(ensureTemplatePath(activeTemplate));
    activeTemplate._json = mergeTemplateStyle(activeTemplate._baseJson, styleJson);
    activeTemplate._jsonStyleId = job.styleId;
    window.__BN_TEMPLATE__ = activeTemplate._json;
    if (frameReady && el.frame?.contentWindow) {
      el.frame.contentWindow.postMessage({ type: 'bn-style-apply', style: styleJson }, '*');
    }
    assignQuickThumbnail(job);
    renderJobList();
    scheduleActiveJobThumbnailUpdate(500);
    setStatus(`已切換${styleJson.name || `樣式 ${job.styleId}`}。`, 'success');
  } catch (error) {
    console.warn('[CC] style switch failed:', error);
    setStatus('樣式切換失敗：' + error.message, 'error');
  }
}

// ══════════════════════════════════════════════════════
//  20. 批次產圖
// ══════════════════════════════════════════════════════
function setBatchProgress(done, total, text) {
  el.batchProgressBar.style.width = (total ? Math.round((done / total) * 100) : 0) + '%';
  el.batchProgressText.textContent = text;
}

function addBatchLog(filename, status, note = '') {
  const item = document.createElement('div');
  item.className = `batch-log-item ${status}`;
  const icon = { ok: '✓', err: '✗', skip: '—' }[status] || '•';
  item.innerHTML = `<span class="log-icon">${icon}</span><span class="log-name">${filename}</span>`;
  if (note) {
    const n = document.createElement('span');
    n.style.cssText = 'font-size:10px;color:var(--text-tertiary);flex-shrink:0;';
    n.textContent = note;
    item.appendChild(n);
  }
  el.batchJobLog.appendChild(item);
  el.batchJobLog.scrollTop = el.batchJobLog.scrollHeight;
}

function addProcessedEntriesToZip(zip, processedEntries, folderName = 'processed') {
  const processedFolder = zip.folder(folderName);
  (processedEntries || []).forEach(item => {
    const b64 = dataUrlBase64(item.dataUrl);
    if (!b64) return;
    processedFolder.file(safeZipSegment(item.filename), b64, { base64: true });
  });
}

async function batchRender() {
  const validJobs = jobs.filter(j => j.headline);
  if (!validJobs.length) { setStatus('沒有可用工單', 'error'); return; }
  const activeBeforeBatch = activeJob();
  const activeBatchKey = stableLayoutStateKeyForJob(activeBeforeBatch);
  batchTraceState('BATCH_TRACE_1_SYNC', 'before-sync-active-job-state', activeBeforeBatch, activeBatchKey, getJobLayoutState(activeBeforeBatch, activeBatchKey));
  traceLayoutState('batch:before-sync-active-job-state', activeBeforeBatch, activeBatchKey, getJobLayoutState(activeBeforeBatch, activeBatchKey));
  await syncActiveLayoutState();
  batchTraceState('BATCH_TRACE_1_SYNC', 'after-sync-active-job-state', activeBeforeBatch, activeBatchKey, getJobLayoutState(activeBeforeBatch, activeBatchKey));
  traceLayoutState('batch:after-sync-active-job-state', activeBeforeBatch, activeBatchKey, getJobLayoutState(activeBeforeBatch, activeBatchKey));

  thumbnailPaused = true;
  clearTimeout(thumbnailTimer);
  clearTimeout(thumbnailQueueTimer);
  batchCancelled = false;
  el.batchModal.style.display = 'flex';
  el.batchJobLog.innerHTML = '';
  setBatchProgress(0, validJobs.length, `共 ${validJobs.length} 筆，準備中…`);

  const pngFiles = [];
  let done = 0, okCount = 0, errCount = 0;

  for (const job of validJobs) {
    if (batchCancelled) { addBatchLog('已取消', 'skip'); break; }
    setBatchProgress(done, validJobs.length, `[${done + 1}/${validJobs.length}] ${job.jobId || job.headline}`);
    try {
      const jobKey = stableLayoutStateKeyForJob(job);
      batchTraceState('BATCH_TRACE_2_STATE', 'before-render-job-state', job, jobKey, getJobLayoutState(job, jobKey));
      traceLayoutState('batch:before-render-job-state', job, jobKey, getJobLayoutState(job, jobKey));
      const dataUrl = await renderSingleJob(job);
      if (dataUrl) {
        const filename = job.outputFilename || `${job.jobId || done + 1}.png`;
        pngFiles.push({ name: filename, dataUrl });
        job.thumbnail = await captureThumb(dataUrl);
        job.thumbnailContextKey = thumbnailContextKeyForJob(job);
        renderJobList();
        addBatchLog(filename, 'ok');
        okCount++;
      } else {
        addBatchLog(job.outputFilename || job.jobId || `job-${done + 1}`, 'err', '截圖失敗');
        errCount++;
      }
    } catch (e) {
      addBatchLog(job.outputFilename || job.jobId || `job-${done + 1}`, 'err', e.message);
      errCount++;
    }
    done++;
    setBatchProgress(done, validJobs.length, `已完成 ${done}/${validJobs.length}（成功 ${okCount}，失敗 ${errCount}）`);
  }

  if (pngFiles.length) {
    setBatchProgress(validJobs.length, validJobs.length, '打包完整專案 ZIP 中…');
    const zip = new JSZip();
    pngFiles.forEach(({ name, dataUrl }) => {
      const b64 = dataUrlBase64(dataUrl);
      if (b64) zip.file(safeZipSegment(name), b64, { base64: true });
    });
    const state = await exportProjectState(validJobs);
    const projectZip = window.BNProjectPersistence?.prepareProjectZipState?.(state) || { state, processedEntries: [] };
    zip.file('project-state.json', JSON.stringify(projectZip.state, null, 2));
    addProcessedEntriesToZip(zip, projectZip.processedEntries, 'processed');
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `project_${new Date().toISOString().slice(0, 10)}.zip`);
  }

  thumbnailPaused = false;
  if (activeJobId) {
    await selectJob(activeJobId, { skipSync: true });
  }
  if (thumbnailQueue.length) startThumbnailQueue();
  setBatchProgress(validJobs.length, validJobs.length,
    batchCancelled
      ? `已取消。成功 ${okCount} 筆。`
      : `完成！成功 ${okCount} 筆${errCount ? `，失敗 ${errCount} 筆` : ''}。`
  );
}

async function renderSingleJob(job) {
  // Download Complete Project 專用最小修正（方向 A，Locked by Jamie）：
  // 產品規格——一次生成器工作流程只有一種尺寸，批次內所有工單都必須使用
  // 使用者最後在控制台選擇的 activePlacement／activeTemplate 來 render，
  // 不分是不是「目前作用中」的工單。selectPlacement() / selectTemplate()
  // 只更新全域 activePlacement / activeTemplate，從未寫回 job.placementId /
  // job.template / job.templateId（本次不修改這兩個函式，也不修改真正的
  // job 物件本身）。只建立一個淺層複製物件供本次查找使用。
  const jobForPlacementLookup = {
    ...job,
    placementId: activePlacement?.id || job?.placementId,
    template: activeTemplate?.id || job?.template,
    templateId: activeTemplate?.id || job?.templateId,
  };
  const renderTemplate = getTemplateForJob(jobForPlacementLookup);
  const templatePath = ensureTemplatePath(renderTemplate);
  if (!templatePath) throw new Error('無 templatePath');
  const previousPlacement = activePlacement;
  const previousTemplate = activeTemplate;
  const previousSuppressLayoutStateWrites = suppressLayoutStateWrites;
  const renderPlacement = registry?.placements?.find(p => p.id === jobForPlacementLookup?.placementId) || activePlacement;
  activePlacement = renderPlacement;
  activeTemplate = renderTemplate;
  suppressLayoutStateWrites = true;
  // layoutKey 必須用與 jobForPlacementLookup 相同（已校正的 activePlacement／
  // activeTemplate）計算，否則會跟使用者實際編輯、透過 syncActiveLayoutState()
  // （同樣以 activePlacement 為準）存檔時使用的 key 對不上，導致位置／大小／
  // 前後順序讀到錯誤或空白的 layoutState。job.layoutStates 這份「資料本體」
  // 仍然來自真正的 job 物件，只有 key 字串校正。
  const layoutKey = stableLayoutStateKeyForJob(jobForPlacementLookup);
  const savedLayoutState = getJobLayoutState(job, layoutKey);
  setMainFrameLayoutTarget(job, layoutKey);
  batchTraceState('BATCH_TRACE_2_STATE', 'renderSingleJob-start-savedLayoutState', job, layoutKey, savedLayoutState);
  traceLayoutState('renderSingleJob:start-savedLayoutState', job, layoutKey, savedLayoutState);
  try {
    const templateJson = await ensureTemplateJson(renderTemplate, job.styleId || '01');

    // 1. 載入 canvas（乾淨狀態），排入文字到 pendingRecord
    pendingRecord = {
      headline:    job.headline,
      subheadline: job.subheadline,
      disclaimer:  job.disclaimer,
    };
    const loadSeq = loadCanvas(templatePath, job.styleId || '01');
    await waitForFrameReady(18000);
    if (loadSeq !== canvasLoadSeq) throw new Error('render interrupted');
    // onFrameReady 已送出 pendingRecord（bn-text）
    await sleep(200);

    // 2. Logo
    if (job.logoFilenames.length) {
      await postLogosToFrame(el.frame.contentWindow, job.logoFilenames, job.jobId || String(job.id));
      await sleep(400);
      if (loadSeq !== canvasLoadSeq) throw new Error('render interrupted');
    }

    // 3. 商品圖
    if (job.productFilenames.length) {
      const resolvedAssets = await buildBatchResolvedAssets(job);
      await postProductsToFrame(el.frame.contentWindow, job.productFilenames, templateJson, job.jobId || String(job.id), { resolvedAssets, job });
      await sleep(900);
      if (loadSeq !== canvasLoadSeq) throw new Error('render interrupted');
    }

    // 3.5 QRCode（docs/proposals/QR-Code-Product-Proposal.md：Export 與主標/副標/小字相同，
    // 合法網址才顯示，空值或非法網址不顯示，只影響這個 job，不影響其他 job）
    await applyQrCodeToCanvas(job);
    if (loadSeq !== canvasLoadSeq) throw new Error('render interrupted');

    traceFrameLayout('renderSingleJob:after-product-payload-before-layout-apply-dom', el.frame.contentWindow, job, layoutKey);
    traceFrameProductDom('renderSingleJob:after-product-payload-before-layout-apply-dom', el.frame.contentWindow, job, layoutKey);
    batchTraceDom('BATCH_TRACE_4_DOM', 'after-product-payload-before-layout-apply-dom', el.frame.contentWindow, job, layoutKey);
    batchTraceState('BATCH_TRACE_3_APPLY', 'state-to-apply-before-apply', job, layoutKey, savedLayoutState);
    await applyJobLayoutStateToFrame(job, el.frame.contentWindow, savedLayoutState, { skipRequest: true });
    await sleep(260);
    traceFrameLayout('renderSingleJob:after-layout-apply-dom', el.frame.contentWindow, job, layoutKey);
    traceFrameProductDom('renderSingleJob:after-layout-apply-dom', el.frame.contentWindow, job, layoutKey);
    batchTraceDom('BATCH_TRACE_4_DOM', 'after-layout-apply-dom', el.frame.contentWindow, job, layoutKey);
    if (loadSeq !== canvasLoadSeq) throw new Error('render interrupted');
    await waitForFrameImages(el.frame.contentWindow, 6000);
    traceFrameLayout('renderSingleJob:before-capture-dom', el.frame.contentWindow, job, layoutKey);
    traceFrameProductDom('renderSingleJob:before-capture-dom', el.frame.contentWindow, job, layoutKey);
    batchTraceDom('BATCH_TRACE_4_DOM', 'before-capture-dom', el.frame.contentWindow, job, layoutKey);

    // 4. 截圖
    return await captureFromCanvasFrame(18000);
  } finally {
    suppressLayoutStateWrites = previousSuppressLayoutStateWrites;
    activePlacement = previousPlacement;
    activeTemplate = previousTemplate;
    if (activeJobId) setMainFrameLayoutTarget(activeJob(), activeJob() ? layoutStateKeyForRenderContext(activeJob(), getActiveRenderContext(activeJob()?.styleId || '01')) : undefined);
  }
}

async function captureThumb(fullPng) {
  if (!fullPng) return null;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = 120 / Math.max(img.width, img.height);
      const c = document.createElement('canvas');
      c.width  = Math.round(img.width  * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(null);
    img.src = fullPng;
  });
}

async function buildAndDownloadZip(files) {
  if (typeof JSZip === 'undefined') {
    files.forEach(({ name, dataUrl }) => {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = name; a.click();
    });
    return;
  }
  const zip = new JSZip();
  files.forEach(({ name, dataUrl }) => {
    const b64 = dataUrl.split(',')[1];
    if (b64) zip.file(name, b64, { base64: true });
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `banners_${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ══════════════════════════════════════════════════════
//  21. 完整暫存 Project State Export / Import
// ══════════════════════════════════════════════════════
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function dataUrlBase64(dataUrl) {
  return String(dataUrl || '').split(',')[1] || '';
}

function dataUrlMime(dataUrl, fallback = 'image/jpeg') {
  return (String(dataUrl || '').match(/^data:([^;]+)/) || [])[1] || fallback;
}

function extFromMime(mime) {
  if (/png/i.test(mime)) return 'png';
  if (/webp/i.test(mime)) return 'webp';
  if (/gif/i.test(mime)) return 'gif';
  return 'jpg';
}

function mimeFromFilename(filename) {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function safeZipSegment(name) {
  return String(name || 'asset')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/^\.+/, '_')
    .slice(0, 120) || 'asset';
}

function assetCategoryForFilename(filename, role = '') {
  if (role === 'logo') return 'logos';
  if (role === 'person') return 'persons';
  const fname = String(filename || '');
  if (fname.indexOf('_人') >= 0) return 'persons';
  return 'products';
}

async function getAssetFile(filename) {
  const handle = lookupAsset(filename);
  if (!handle || typeof handle.getFile !== 'function') return null;
  return handle.getFile();
}

function makeMemoryAssetHandle(file) {
  return {
    kind: 'file',
    name: file.name,
    async getFile() { return file; },
  };
}

function indexMemoryAsset(name, file) {
  if (!name || !file) return;
  assetIndex[String(name).trim().toLowerCase()] = makeMemoryAssetHandle(file);
}

function downloadJson(data, filename) {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), filename);
}

async function dataUrlToFile(dataUrl, name, type) {
  const blob = await fetch(dataUrl).then(res => res.blob());
  return new File([blob], name, { type: type || blob.type || mimeFromFilename(name) });
}

function stateAssetList(state) {
  return [
    ...(state.assets?.logos || []),
    ...(state.assets?.products || []),
    ...(state.assets?.persons || []),
  ];
}

function serializeJobBase(job) {
  return {
    jobId:            job.jobId || '',
    size:             placementSizeForJob(job),
    template:         job.template || job.templateId || activeTemplate?.id || 'template',
    style:            normalizeStyleId(job.styleId || job.style || '01'),
    placementId:      job.placementId || activePlacement?.id || '',
    headline:         job.headline || '',
    subheadline:      job.subheadline || '',
    disclaimer:       job.disclaimer || '',
    qrCodeUrl:        job.qrCodeUrl || '',
    outputFilename:   job.outputFilename || '',
    layoutState:      getJobLayoutState(job),
    layoutStates:     exportableLayoutStatesForJob(job),
    thumbnail:        job.thumbnail || job.quickThumbnail || '',
    logoAssetIds:     [],
    productAssetIds:  [],
  };
}

function placementSizeForJob(job) {
  const placement = registry?.placements?.find(p => p.id === job?.placementId) || activePlacement;
  return placement ? `${placement.width}x${placement.height}` : '';
}

function cloneJobForExport(job) {
  const copy = {
    ...job,
    logoFilenames: [...(job.logoFilenames || [])],
    productFilenames: [...(job.productFilenames || [])],
    layoutState: getJobLayoutState(job),
    layoutStates: exportableLayoutStatesForJob(job),
    _embeddedAssets: {},
  };
  if (job.id !== activeJobId) return copy;

  const key = safeZipSegment(job.jobId || job.outputFilename || 'job');
  // Bug Fix B（匯出抓不到手動置換，2026-07-14 補回）：原本只有在
  // productFilenames「本來是空的」才會回填即時畫布內容，CSV 匯入的工單
  // 本來就有檔名，永遠不會回填，導致手動置換的圖片下載時還是舊圖。這裡
  // 改成只要是目前作用中的工單（上面 job.id !== activeJobId 已經擋掉
  // 非作用中工單），一律以即時畫布狀態為準，跟畫面上看到的一致。
  if (window._bnLogos?.length) {
    copy.logoFilenames = window._bnLogos.map((logo, index) => {
      const ext = extFromMime(dataUrlMime(logo.src, 'image/png'));
      const name = `${key}_LOGO_${String(index + 1).padStart(2, '0')}.${ext}`;
      copy._embeddedAssets[name] = { dataUrl: logo.src, category: 'logos', type: dataUrlMime(logo.src, 'image/png') };
      return name;
    });
  }

  if (window._bnProducts?.length) {
    const labels = ['主品', '左配品', '右配品'];
    // Bug #2（陰影重複烘焙修正）：手動換圖後 product.src 是 autoTrim／
    // autoShadow 處理「後」的 render 圖；若直接內嵌這張圖，重新匯入時
    // buildProductPayloads() 會把它當原始素材再處理一次，造成陰影疊加、
    // 整組尺寸跑掉。product.manualReplaceRawSrc（js/bn-editor-plugin.js
    // 的 replaceExistingProductImage() 寫入的 runtime-only 屬性，僅服務
    // 本次手動換圖流程，與 Crop/Eraser/Shadow Editor 專用的 baseSrc 無關）
    // 若存在，優先內嵌這張「處理前」的原始圖；未曾手動換圖的商品沒有這個
    // 屬性，維持原本內嵌 product.src 的既有行為不變。
    copy.productFilenames = window._bnProducts
      .slice()
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      .map((product, index) => {
        const position = product.position ?? index;
        const embedSrc = product.manualReplaceRawSrc || product.src;
        const ext = extFromMime(dataUrlMime(embedSrc, 'image/png'));
        const name = `${key}_PRODUCT_${String(position + 1).padStart(2, '0')}_${labels[position] || '商品'}.${ext}`;
        copy._embeddedAssets[name] = { dataUrl: embedSrc, category: 'products', type: dataUrlMime(embedSrc, 'image/png') };
        return name;
      });
  } else if (window._bnPerson || window._bnSingleProd) {
    copy.productFilenames = [];
    if (window._bnPerson?.src) {
      const ext = extFromMime(dataUrlMime(window._bnPerson.src, 'image/png'));
      const name = `${key}_PERSON_人.${ext}`;
      copy._embeddedAssets[name] = { dataUrl: window._bnPerson.src, category: 'persons', type: dataUrlMime(window._bnPerson.src, 'image/png') };
      copy.productFilenames.push(name);
    }
    if (window._bnSingleProd?.src) {
      const ext = extFromMime(dataUrlMime(window._bnSingleProd.src, 'image/png'));
      const name = `${key}_PRODUCT_品.${ext}`;
      copy._embeddedAssets[name] = { dataUrl: window._bnSingleProd.src, category: 'products', type: dataUrlMime(window._bnSingleProd.src, 'image/png') };
      copy.productFilenames.push(name);
    }
  }
  return copy;
}

function prepareJobsForStateExport(sourceJobs) {
  return sourceJobs.map(cloneJobForExport);
}

async function syncActiveLayoutState() {
  const job = activeJob();
  if (!frameReady || !el.frame?.contentWindow || !job) return;
  const key = layoutStateKeyForRenderContext(job, getActiveRenderContext(job.styleId || '01'));
  traceLayoutState('syncActiveLayoutState:start-current-job-state', job, key, getJobLayoutState(job, key));
  traceFrameLayout('syncActiveLayoutState:start-frame-dom', el.frame.contentWindow, job, key);
  setMainFrameLayoutTarget(job, key);
  if (pendingLayoutStateRequest?.timer) clearTimeout(pendingLayoutStateRequest.timer);
  const received = await new Promise(resolve => {
    const request = {
      source: el.frame.contentWindow,
      jobId: job.id,
      key,
      resolve,
      timer: setTimeout(() => {
        if (pendingLayoutStateRequest === request) pendingLayoutStateRequest = null;
        resolve(false);
      }, 1200),
    };
    pendingLayoutStateRequest = request;
    el.frame.contentWindow.postMessage({ type: 'bn-layout-state-request' }, '*');
  });
  traceLayoutState('syncActiveLayoutState:after-request-job-state', job, key, getJobLayoutState(job, key));
  if (!received) {
    const directState = readLayoutStateFromFrame(el.frame.contentWindow);
    traceLayoutState('syncActiveLayoutState:timeout-direct-frame-state', job, key, directState);
    if (directState) {
      console.warn('[CC][layoutState] bn-layout-state timeout; saved state from iframe DOM', job.jobId || job.id, key, directState);
      setJobLayoutState(job, directState, key);
    }
  }
  traceLayoutState('syncActiveLayoutState:end-job-state', job, key, getJobLayoutState(job, key));
}

async function readImageSize(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}


async function buildProcessedAssetsStatePayload(pipelineMetadata) {
  const payload = await window.BNProjectPersistence?.buildProcessedAssetsPayloadAsync?.(pipelineMetadata, processedAssetIndex, {
    readEntryDataUrl: processedAssetEntryToDataUrl,
  });
  return payload && Object.keys(payload).length ? payload : null;
}

async function buildProjectState(sourceJobs, type = 'project') {
  const exportJobs = prepareJobsForStateExport(sourceJobs);
  const exportedAt = new Date().toISOString();
  const state = {
    schema: 'spx-ad-project-state',
    version: 5,
    type,
    exportedAt,
    activePlacementId: activePlacement?.id || exportJobs[0]?.placementId || '',
    activeTemplate: activeTemplate?.id || exportJobs[0]?.template || 'template',
    activeStyle: normalizeStyleId(activeJob()?.styleId || exportJobs[0]?.styleId || '01'),
    activeJobKey: activeJob()?.jobId || '',
    assets: { logos: [], products: [], persons: [] },
    jobs: [],
  };
  const assetIdsByKey = new Map();
  let assetSeq = 1;

  const addAsset = async (filename, role, job) => {
    if (!filename) return null;
    const embedded = job?._embeddedAssets?.[filename];
    let dataUrl = embedded?.dataUrl || '';
    let name = filename;
    let type = embedded?.type || '';
    if (!dataUrl) {
      const file = await getAssetFile(filename);
      if (!file) return null;
      dataUrl = await fileToDataUrl(file);
      name = file.name || filename;
      type = file.type || mimeFromFilename(name);
    }
    const category = embedded?.category || assetCategoryForFilename(filename, role);
    const dedupeKey = (name || filename).toLowerCase() + '|' + dataUrl.slice(0, 80);
    if (assetIdsByKey.has(dedupeKey)) return assetIdsByKey.get(dedupeKey);
    const id = `${category}_${assetSeq++}`;
    const size = await readImageSize(dataUrl);
    state.assets[category].push({
      id,
      name: name || filename,
      originalName: filename,
      type: type || dataUrlMime(dataUrl, mimeFromFilename(name || filename)),
      dataUrl,
      width: size.width,
      height: size.height,
    });
    assetIdsByKey.set(dedupeKey, id);
    return id;
  };

  const pipelineMetadata = window.BNAssetPipelineState?.exportAssetPipelineMetadataForJobs?.(assetPipelineState, exportJobs, { exportedAt });
  if (pipelineMetadata) {
    state.assetPipelineState = pipelineMetadata;
    const processedAssets = await buildProcessedAssetsStatePayload(pipelineMetadata);
    if (processedAssets) state.processedAssets = processedAssets;
  }

  for (const job of exportJobs) {
    const item = serializeJobBase(job);
    const exportKey = stableLayoutStateKeyForJob(job);
    batchTraceState('BATCH_TRACE_5_EXPORT', 'buildProjectState-serialized-job-layoutState', job, exportKey, item.layoutStates?.[exportKey] || item.layoutState);
    traceLayoutState('buildProjectState:serialized-job-layoutState', job, exportKey, item.layoutStates?.[exportKey] || item.layoutState);
    for (const filename of job.logoFilenames || []) {
      const id = await addAsset(filename, 'logo', job);
      if (id) item.logoAssetIds.push(id);
    }
    for (const filename of job.productFilenames || []) {
      const id = await addAsset(filename, 'product', job);
      if (id) item.productAssetIds.push(id);
    }
    state.jobs.push(item);
  }
  return state;
}

async function exportSingleState() {
  const job = activeJob();
  if (!job) { setStatus('尚未選擇工單', 'error'); return; }
  console.log('[CC][layoutState] export-single start', job.jobId || job.id);
  const exportKey = stableLayoutStateKeyForJob(job);
  traceLayoutState('exportSingleState:before-force-sync', job, exportKey, getJobLayoutState(job, exportKey));
  const forcedBeforeSync = forceSaveActiveLayoutStateFromFrame('export-single-before-sync');
  await syncActiveLayoutState({ reason: 'export-single' });
  const forcedAfterSync = forceSaveActiveLayoutStateFromFrame('export-single-after-sync');
  traceLayoutState('exportSingleState:after-force-sync', job, exportKey, getJobLayoutState(job, exportKey));
  console.log('[CC][layoutState] export-single synced', {
    forcedBeforeSync,
    forcedAfterSync,
    hasLayoutStates: !!job.layoutStates,
    keys: Object.keys(job.layoutStates || {}),
  });
  if (!job.thumbnail && frameReady) {
    await waitForFrameImages(el.frame.contentWindow, 6000);
    const dataUrl = await captureFromCanvasFrame(12000);
    if (dataUrl) job.thumbnail = await captureThumb(dataUrl);
  }
  try {
    setStatus('產生單張暫存 JSON 中…');
    const state = await buildProjectState([job], 'single');
    downloadJson(state, 'single-state.json');
    setStatus('單張暫存下載完成。', 'success');
  } catch (error) {
    console.error(error);
    setStatus('暫存下載失敗：' + error.message, 'error');
  }
}

async function exportProjectState(sourceJobs) {
  return buildProjectState(sourceJobs, 'project');
}

async function exportProjectZip() {
  if (!jobs.length) {
    setStatus('沒有可匯出的專案資料。', 'error');
    return;
  }
  if (typeof JSZip === 'undefined') {
    setStatus('JSZip 未載入，無法匯出專案 ZIP。', 'error');
    return;
  }
  try {
    setStatus('產生專案 ZIP 中…');
    await syncActiveLayoutState();
    const state = await exportProjectState(jobs);
    const projectZip = window.BNProjectPersistence?.prepareProjectZipState?.(state) || { state, processedEntries: [] };
    const zip = new JSZip();
    zip.file('project-state.json', JSON.stringify(projectZip.state, null, 2));
    addProcessedEntriesToZip(zip, projectZip.processedEntries, 'processed');
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `project_${new Date().toISOString().slice(0, 10)}.zip`);
    setStatus(`完整專案下載完成。處理結果：${projectZip.processedEntries.length}`, 'success');
  } catch (error) {
    console.error(error);
    setStatus('專案 ZIP 匯出失敗：' + error.message, 'error');
  }
}

async function importState(file) {
  if (!file) return;
  if (!/\.(json|zip)$/i.test(file.name || '')) {
    setStatus('不支援的暫存格式：請選擇 single-state.json、project-state.json 或 project.zip', 'error');
    return;
  }
  try {
    setStatus('匯入暫存中…');
    let state;
    if (/\.zip$/i.test(file.name || '')) {
      try {
        state = await window.BNProjectPersistence.extractProjectZipState(file, JSZip);
      } catch (error) {
        throw new Error('project.zip 解析失敗：' + error.message);
      }
    } else {
      try {
        state = JSON.parse(await file.text());
      } catch (error) {
        throw new Error('暫存 JSON 解析失敗');
      }
    }
    if (state.schema !== 'spx-ad-project-state') throw new Error('不支援的暫存格式');
    if (![2, 3, 4, 5].includes(Number(state.version))) throw new Error('暫存檔版本不相容');
    if (!Array.isArray(state.jobs)) throw new Error('暫存格式不正確：找不到 jobs');

    await resetWorkspaceState({ keepAssetsFolder: false });
    assetIndex = {};
    processedAssetIndex = {};
    reviewWorkspaceRerunAssetKeys = [];
    assetPipelineState = window.BNAssetPipelineState?.importAssetPipelineMetadata?.(state.assetPipelineState) || null;
    if (Number(state.version) >= 5 && state.processedAssets) {
      processedAssetIndex = window.BNProjectPersistence?.buildProcessedAssetIndex?.(state.processedAssets) || {};
    }
    updateNeedsRerunButton();
    assetFolderName = file.name.replace(/\.(json|zip)$/i, '');
    assetSourceMode = 'state';
    const assetsById = new Map();
    for (const asset of stateAssetList(state)) {
      if (!asset?.id || !asset.dataUrl) continue;
      const name = asset.name || asset.originalName || asset.id;
      const fileObj = await dataUrlToFile(asset.dataUrl, name, asset.type);
      assetsById.set(asset.id, { ...asset, file: fileObj, name });
      indexMemoryAsset(asset.id, fileObj);
      indexMemoryAsset(name, fileObj);
      indexMemoryAsset(asset.originalName, fileObj);
    }

    jobs = state.jobs.map(saved => {
      const job = createJob({
        jobId: saved.jobId || '',
        template: saved.template || saved.templateId || 'template',
        templateId: saved.template || saved.templateId || 'template',
        styleId: saved.style || saved.styleId || (saved.templateId && saved.templateId !== 'template' ? saved.templateId : '01'),
        placementId: saved.placementId || '',
        headline: saved.headline || '',
        subheadline: saved.subheadline || '',
        disclaimer: saved.disclaimer || '',
        qrCodeUrl: saved.qrCodeUrl || '',
        outputFilename: saved.outputFilename || '',
        logoFilenames: (saved.logoAssetIds || []).map(id => assetsById.get(id)?.name || id),
        productFilenames: (saved.productAssetIds || []).map(id => assetsById.get(id)?.name || id),
        layoutState: saved.layoutState || null,
        layoutStates: saved.layoutStates || null,
        thumbnail: saved.thumbnail || null,
      });
      const importKey = stableLayoutStateKeyForJob(job);
      traceLayoutState('importState:loaded-job-layoutState', job, importKey, job.layoutStates?.[importKey] || job.layoutState);
      return job;
    });
    activeJobId = jobs[0]?.id || null;

    ensureWorkspaceReadyForJob();
    const preferredPlacementId = state.activePlacementId || jobs[0]?.placementId || '';
    if (preferredPlacementId && registry?.placements?.length) {
      const foundPlacement = registry.placements.find(p => p.id === preferredPlacementId);
      if (foundPlacement) {
        activePlacement = foundPlacement;
        el.placement.value = foundPlacement.id;
        renderTemplateOptions(false);
      }
    }
    const firstJob = activeJob();
    if (firstJob && activePlacement?.templates?.length) {
      const foundTemplate = activePlacement.templates.find(t => t.id === (firstJob.template || firstJob.templateId || 'template')) || activePlacement.templates[0];
      activeTemplate = foundTemplate;
      el.template.value = foundTemplate.id;
      renderStyleOptions(firstJob.styleId || '01');
      try {
        const url = new URL(foundTemplate.editorUrl, location.href);
        foundTemplate._templatePath = decodeURIComponent(url.searchParams.get('template') || '');
      } catch (_) {}
    }

    setTopbarBadge(el.folderStatus, el.folderStatusText, `${assetFolderName}（${stateAssetList(state).length}）`);
    validateAllJobs();
    renderJobList();
    if (activeJobId) await selectJob(activeJobId, { skipSync: true, skipLayoutStateRequest: true });
    setStatus(`暫存已匯入：${jobs.length} 筆工單。`, 'success');
  } catch (error) {
    console.error(error);
    setStatus('匯入暫存失敗：' + error.message, 'error');
  }
}

// ══════════════════════════════════════════════════════
//  22. 下載單張（bn-capture → 下載）
// ══════════════════════════════════════════════════════
async function downloadCurrentBanner() {
  if (!frameReady) { setStatus('模板尚未就緒', 'error'); return; }
  await syncActiveLayoutState();
  setStatus('產圖中…');
  await waitForFrameImages(el.frame.contentWindow, 6000);
  const dataUrl = await captureFromCanvasFrame(18000);
  if (!dataUrl) { setStatus('截圖失敗，請確認模板已就緒。', 'error'); return; }
  const job = jobs.find(j => j.id === activeJobId);
  const a   = document.createElement('a');
  a.href     = dataUrl;
  a.download = job?.outputFilename || 'banner.png';
  a.click();
  setStatus('下載完成。', 'success');
}

// ══════════════════════════════════════════════════════
//  23. 初始化
// ══════════════════════════════════════════════════════
async function initialize() {
  try {
    if (window.AD_TEMPLATES_CONFIG) {
      registry = window.AD_TEMPLATES_CONFIG;
    } else {
      const res = await fetch('config/templates.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      registry = await res.json();
    }

    showInitialWorkspaceState();
  } catch (e) {
    setStatus('模板設定讀取失敗：' + e.message, 'error');
  }
}

// ══════════════════════════════════════════════════════
//  24. 事件綁定
// ══════════════════════════════════════════════════════

// 版位 / 模板
el.placement.addEventListener('change', e => selectPlacement(e.target.value));
el.template.addEventListener('change',  e => selectTemplate(e.target.value));
el.style?.addEventListener('change', e => selectStyle(e.target.value));

// ── 禁用語引擎 ────────────────────────────────────────
var BANWORD_FIELD_MAP = {
  'field-headline':    '主標',
  'field-subheadline': '副標',
  'field-disclaimer':  'date'
};
function runBanwordCheck(id, el) {
  var engine = window.banwordEngine;
  if (!engine) return;
  var role = BANWORD_FIELD_MAP[id] || '';
  var shadowId = '_bw_shadow_' + id;
  var shadow = document.getElementById(shadowId);
  if (!shadow) {
    shadow = document.createElement('div');
    shadow.id = shadowId;
    shadow.setAttribute('contenteditable', 'true');
    shadow.dataset.role = role;
    shadow.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(shadow);
  }
  shadow.textContent = el.value;
  var result = engine.applyToElement(shadow, { role: role, force: true, getText: function(e){ return e.textContent; } });
  if (result && result.text !== undefined && result.text !== el.value) {
    el.value = result.text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (result && result.message) {
    var existing = document.getElementById('_bw_toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = '_bw_toast';
    toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#7f1d1d;color:#fca5a5;padding:8px 20px;border-radius:10px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.5);z-index:99999;white-space:nowrap;max-width:90vw;';
    toast.textContent = result.message;
    document.body.appendChild(toast);
    setTimeout(function(){ toast.remove(); }, result.duration || 4000);
  }
}

// 文字欄位
Object.values(el.fields).forEach(input => {
  input.addEventListener('input', () => { updateCounters(); saveCurrentJobData(); });
});

// 禁用語 blur 檢查
['field-headline', 'field-subheadline', 'field-disclaimer'].forEach(function(id) {
  var fieldEl = document.getElementById(id);
  if (!fieldEl) return;
  fieldEl.addEventListener('blur', function() { runBanwordCheck(id, fieldEl); });
});

// 套用文字
el.applyRecord.addEventListener('click', () => sendRecord(currentRecord()));

// QRCode（貼上／Enter／失焦皆驗證；獨立於「套用文字到模板」按鈕之外）
if (el.qrCodeUrlInput) {
  el.qrCodeUrlInput.addEventListener('paste', () => {
    setTimeout(() => commitQrCodeUrl(el.qrCodeUrlInput.value), 0);
  });
  el.qrCodeUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commitQrCodeUrl(el.qrCodeUrlInput.value); }
  });
  el.qrCodeUrlInput.addEventListener('blur', () => commitQrCodeUrl(el.qrCodeUrlInput.value));
}
if (el.qrCodeCheckLink) {
  el.qrCodeCheckLink.addEventListener('click', e => {
    if (el.qrCodeCheckLink.getAttribute('aria-disabled') === 'true') e.preventDefault();
  });
}

// 新增工單
el.addJobBtn.addEventListener('click', () => {
  const job = addJob();
  selectJob(job.id);
});

// 匯入
el.importBtn.addEventListener('click',  () => el.importFile.click());
el.importFile.addEventListener('change', e => {
  if (e.target.files[0]) importFile(e.target.files[0]);
  e.target.value = '';
});
el.importStateBtn.addEventListener('click', () => el.importStateFile.click());
el.importStateFile.addEventListener('change', e => {
  if (e.target.files[0]) importState(e.target.files[0]);
  e.target.value = '';
});

// 素材資料夾
el.folderBtn.addEventListener('click', pickAssetFolder);
el.assetReviewMenuBtn?.addEventListener('click', event => {
  event.stopPropagation();
  updateAssetReviewControls();
  setAssetReviewMenuOpen(!!el.assetReviewMenu?.hidden);
});
document.addEventListener('click', event => {
  if (!el.assetReviewMenu || el.assetReviewMenu.hidden) return;
  if (event.target.closest('#asset-review-entry')) return;
  setAssetReviewMenuOpen(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') setAssetReviewMenuOpen(false);
});
el.manifestBtn?.addEventListener('click', exportPhotoshopManifest);
el.rerunManifestBtn?.addEventListener('click', exportPhotoshopRerunManifest);
el.processedFolderBtn?.addEventListener('click', pickProcessedFolder);
el.reviewAssetsBtn?.addEventListener('click', openAssetReviewWorkspace);
[el.manifestBtn, el.rerunManifestBtn, el.processedFolderBtn, el.reviewAssetsBtn].forEach(button => {
  button?.addEventListener('click', () => setAssetReviewMenuOpen(false));
});

// ── AI Workflow — Phase 6：Error / Recovery Hardening 串接 ──
// 每次 Orchestrator 的 Workflow State 改變時，重新查詢
// js/ai-workflow-recovery.js 的統一 Recovery State Model，決定是否顯示
// Recovery Banner；本函式本身不判斷任何一個 phase 的意義，只是把
// presentation 結果轉交給 Processing Mode Controller 顯示／隱藏，並把按下
// 按鈕的動作原封不動轉交給 Orchestrator 唯一的 retry(kind) 入口。
function renderAiWorkflowRecoveryUI() {
  const presentation = window.BNAIWorkflowRecovery?.getPresentation?.();
  if (!presentation) {
    window.BNAIWorkflowProcessingMode?.hideRecovery?.();
    return;
  }
  window.BNAIWorkflowProcessingMode?.showRecovery?.(presentation.message, presentation.actionLabel, () => {
    window.BNAIWorkflowRecovery?.retry?.();
  });
}
window.BNAIWorkflowOrchestrator?.onPhaseChange?.(renderAiWorkflowRecoveryUI);

// Phase 6（情境 L：Page Refresh／Navigation）：本 Phase 不修改 Project
// State schema，Runtime-only 的 Workflow State 在重新整理頁面後必然遺失
// （Known Limitation，見驗證報告）。最小安全行為：Global Interaction Lock
// 期間（素材處理／Auto Import／開啟 Review Workspace 進行中）攔截意外的
// 頁面關閉／重新整理，避免使用者誤操作而不自知目前有 Execution 正在進行。
window.addEventListener('beforeunload', event => {
  if (window.BNAIWorkflowProcessingMode?.isActive?.()) {
    event.preventDefault();
    event.returnValue = '';
  }
});

// 拖曳 CSV 到工單面板
el.jobPanel.addEventListener('dragover', e => {
  e.preventDefault();
  el.jobPanel.classList.add('drop-highlight');
});
el.jobPanel.addEventListener('dragleave', () => el.jobPanel.classList.remove('drop-highlight'));
el.jobPanel.addEventListener('drop', e => {
  e.preventDefault();
  el.jobPanel.classList.remove('drop-highlight');
  const f = e.dataTransfer.files[0];
  if (f) importFile(f);
});

// 截圖存縮圖功能已改為背景自動更新，不再顯示手動按鈕。
if (el.captureBtn) {
  el.captureBtn.addEventListener('click', async () => scheduleActiveJobThumbnailUpdate(0));
}

// 下載單張
el.downloadBtn.addEventListener('click', downloadCurrentBanner);
el.singleStateBtn.addEventListener('click', exportSingleState);
if (el.projectZipBtn) el.projectZipBtn.addEventListener('click', exportProjectZip);

// 批次產圖
el.batchBtn.addEventListener('click', batchRender);

// 重設工作區
function openResetModal() {
  if (!el.resetModal) return;
  el.resetModal.style.display = 'flex';
  requestAnimationFrame(() => el.resetConfirmBtn?.focus());
}

function closeResetModal() {
  if (el.resetModal) el.resetModal.style.display = 'none';
}

el.resetWorkspaceBtn?.addEventListener('click', openResetModal);
el.resetCloseBtn?.addEventListener('click', closeResetModal);
el.resetCancelBtn?.addEventListener('click', closeResetModal);
el.resetConfirmBtn?.addEventListener('click', resetWorkspace);

el.resetModal?.addEventListener('click', e => {
  if (e.target === el.resetModal) closeResetModal();
});

// 關閉批次 Modal
function closeBatchModal() {
  if (el.batchModal) el.batchModal.style.display = 'none';
}
el.batchCancelBtn?.addEventListener('click', closeBatchModal);

// 關閉批次 Modal（點擊背景）
el.batchModal?.addEventListener('click', e => {
  if (e.target === el.batchModal) closeBatchModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (el.resetModal && el.resetModal.style.display !== 'none') closeResetModal();
    if (el.batchModal && el.batchModal.style.display !== 'none') closeBatchModal();
    return;
  }
  handleJobArrowNavigation(e);
});

// ── postMessage 接收 ──────────────────────────────────
window.addEventListener('message', event => {
  const { type } = event.data || {};
  if (type === 'bn-iframe-ready') {
    if (event.source === el.frame.contentWindow) onFrameReady();
  }
  if (event.source !== el.frame.contentWindow) return;
  if (type === 'bn-single-product-geometry') {
    singleProductGeometry = event.data.visible === false ? null : event.data;
    const pending = pendingManualSingleRenderCapture;
    if (pending && pending.job?.id !== activeJobId) {
      pendingManualSingleRenderCapture = null;
    } else if (pending && singleProductGeometry) {
      const manual = pending.job?._manualRenderState?.singleProduct;
      const currentSrc = el.frame.contentWindow?.document
        ?.querySelector('#bn-zone-singleprod .bn-single-product-box img')?.src;
      if (manual?.filename === pending.filename && currentSrc === manual.src) {
        const width = Number(singleProductGeometry.width);
        const height = Number(singleProductGeometry.height);
        if (width > 0 && height > 0) {
          manual.displayW = width;
          manual.displayH = height;
          pendingManualSingleRenderCapture = null;
        }
      }
    }
    updateSingleProductDragOverlay();
  }
  if (type === 'bn-layout-state' && suppressLayoutStateWrites) {
    console.log('[CC][trace][layout] message:bn-layout-state-suppressed', {
      targetJobId: layoutStateTarget?.jobId || activeJobId,
      key: layoutStateTarget?.key || '',
      summary: summarizeLayoutStateForTrace(event.data?.state || {}),
    });
    return;
  }
  if (type === 'bn-layout-state' && Array.isArray(event.data?.state?.products) && window._bnProducts) {
    const targetJobId = pendingLayoutStateRequest?.jobId || layoutStateTarget?.jobId || activeJobId;
    if (targetJobId === activeJobId) {
      const productsById = new Map((event.data.state.products || []).map(p => [p.id, p]));
      const zOrderCandidates = [];
      window._bnProducts.forEach(product => {
        const state = productsById.get(product.id);
        if (!state) return;
        product.layout = {
          left: state.left || '',
          top: state.top || '',
          width: state.width || '',
          height: state.height || '',
          rotation: Number(state.rotation) || 0,
          zIndex: state.zIndex || '',
          userAdjusted: !!state.userAdjusted,
        };
        product.x = product.layout.left;
        product.y = product.layout.top;
        product.width = product.layout.width;
        product.height = product.layout.height;
        product.rotation = product.layout.rotation;
        product.userAdjusted = product.layout.userAdjusted;
        if (!product.layout.userAdjusted) {
          delete product.layouts;
        }
        const zIndexNum = Number(state.zIndex);
        if (Number.isFinite(zIndexNum)) zOrderCandidates.push({ product, zIndexNum });
      });
      // Bug Fix（zOrder 暫存保存／還原）：Canvas 端已透過 layoutState 還原
      // 每個商品的 z-index（見 layout-runtime.js applyLayoutState()），但
      // window._bnProducts[].zOrder（右側清單排序、▲/▼ 依據的數字欄位）
      // 從未跟著同步。這裡依這批已還原的 z-index 重新推導 zOrder（z-index
      // 越高排越前面），同步完成，不需要使用者先操作一次 ▲/▼ 才會更新。
      // 不改動 layoutStates schema、不改動 layout-runtime.js。
      if (zOrderCandidates.length) {
        zOrderCandidates.sort((a, b) => b.zIndexNum - a.zIndexNum);
        zOrderCandidates.forEach((entry, rank) => { entry.product.zOrder = rank; });
        // 資料更新後同步重繪右側清單，避免清單畫面停留在舊排序，
        // 需要使用者先操作一次（例如按 ▲/▼）才會刷新。
        if (typeof window._bnRenderProdList === 'function') window._bnRenderProdList();
      }
    }
  }
  if (type === 'bn-layout-state' && window._bnSingleProd && event.data?.state?.singleProduct) {
    const targetJobId = pendingLayoutStateRequest?.jobId || layoutStateTarget?.jobId || activeJobId;
    if (targetJobId === activeJobId) {
      const state = event.data.state.singleProduct;
      window._bnSingleProd.offsetX = Number(state.offsetX) || 0;
      window._bnSingleProd.offsetY = Number(state.offsetY) || 0;
      window._bnSingleProd.transform = {
        left: state.left || '',
        top: state.top || '',
        width: state.width || '',
        height: state.height || '',
        rotation: Number(state.rotation) || 0,
        zIndex: state.zIndex || '',
        userAdjusted: !!state.userAdjusted,
      };
      if (!window._bnSingleProd.transform.userAdjusted) {
        window._bnSingleProd.transform = null;
      }
    }
  }
  if (type === 'bn-layout-state') {
    const request = pendingLayoutStateRequest;
    const targetJobId = request?.jobId || layoutStateTarget?.jobId || activeJobId;
    const job = jobs.find(j => j.id === targetJobId) || activeJob();
    traceLayoutState('message:bn-layout-state-received', job, request?.key || layoutStateTarget?.key || stableLayoutStateKeyForJob(job), event.data.state || {});
    if (job) {
      setJobLayoutState(job, event.data.state || {}, request?.key || layoutStateTarget?.key || stableLayoutStateKeyForJob(job));
    }
    if (typeof window._bnUpdateMutualExclusion === 'function') window._bnUpdateMutualExclusion();
    if (targetJobId === activeJobId) scheduleActiveJobThumbnailUpdate(1000);
    if (request) {
      clearTimeout(request.timer);
      if (pendingLayoutStateRequest === request) pendingLayoutStateRequest = null;
      request.resolve(true);
    }
  }
  // bn-snapshot 由 captureFromCanvasFrame 內部各自監聽，不需在此處理
});

// ── 啟動 ─────────────────────────────────────────────
initialize();
