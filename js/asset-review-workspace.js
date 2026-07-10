(function (global) {
  if (global.BNAssetReviewWorkspace) return;

  var root = null;
  var currentOptions = null;
  var currentAssets = [];
  var allReviewAssets = [];
  var selectedAssetKey = '';
  var currentReviewMode = 'all';
  var runtimeReviewAssetKeys = null;
  var completeMessage = '';
  var lastDecisionSnapshot = null;
  var undoDecisionButton = null;
  var loadSeq = 0;
  var currentSession = null;
  var currentEditor = null;
  var isSaving = false;
  var guardDialog = null;
  var toastTimer = null;
  var inspectorState = 'collapsed';
  var REVIEW_ROLES = { product: true, person: true, singleProduct: true };
  var REVIEW_MODES = { all: true, needs_rerun: true };

  function text(value) {
    return value == null || value === '' ? '-' : String(value);
  }

  function statusLabel(status) {
    var labels = {
      pending: '待審閱',
      processed: '已處理',
      approved: '核准',
      needs_rerun: '重新去背'
    };
    return labels[status] || text(status);
  }

  function shortStatusLabel(status) {
    var labels = {
      pending: '待審閱',
      processed: '已處理',
      approved: '核准',
      needs_rerun: '重新去背'
    };
    return labels[status] || text(status);
  }

  function roleLabel(role) {
    var labels = {
      logo: 'Logo',
      product: 'Product',
      person: 'Person',
      singleProduct: 'SingleProduct'
    };
    return labels[role] || text(role);
  }

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }

  function button(className, label, onClick) {
    var node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  }

  function getSummary() {
    return currentAssets.reduce(function (summary, asset) {
      var status = asset.status || 'pending';
      summary.reviewable++;
      if (summary[status] == null) summary[status] = 0;
      summary[status]++;
      return summary;
    }, { reviewable: 0, approved: 0, needs_rerun: 0 });
  }

  function getNeedsRerunAssets() {
    if (global.BNAssetPipelineState?.getNeedsRerunAssets) {
      return global.BNAssetPipelineState.getNeedsRerunAssets(currentOptions.pipelineState) || [];
    }
    var assets = allReviewAssets.length ? allReviewAssets : baseReviewAssets();
    return assets.filter(function (asset) { return (asset.status || 'pending') === 'needs_rerun'; });
  }

  function getGlobalReviewableAssets() {
    return allReviewAssets.length ? allReviewAssets : baseReviewAssets();
  }

  function dirtyAssetKey() {
    return hasUnsavedChanges() ? selectedAssetKey : '';
  }

  function isUnreviewed(asset) {
    var status = asset?.status || 'pending';
    return status === 'pending' || status === 'processed';
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  function makeAssetKeySet(keys) {
    var set = {};
    (keys || []).forEach(function (key) {
      if (key) set[String(key)] = true;
    });
    return Object.keys(set).length ? set : null;
  }

  function baseReviewAssets() {
    if (global.BNAssetPipelineState?.getReviewableAssets) {
      allReviewAssets = global.BNAssetPipelineState.getReviewableAssets(currentOptions.pipelineState);
    } else {
      var assets = currentOptions.pipelineState?.assets || {};
      allReviewAssets = Object.keys(assets).map(function (key) { return assets[key]; }).filter(function (asset) {
        return !!asset.processedAsset;
      });
    }
    allReviewAssets = allReviewAssets.filter(function (asset) {
      return !!REVIEW_ROLES[asset.role];
    });
    return allReviewAssets;
  }

  function filterAssetsForMode(assets) {
    if (currentReviewMode !== 'needs_rerun') return assets.slice();
    if (runtimeReviewAssetKeys) {
      return assets.filter(function (asset) {
        return !!runtimeReviewAssetKeys[asset.assetKey] && (asset.status || 'pending') !== 'approved';
      });
    }
    return assets.filter(function (asset) { return (asset.status || 'pending') === 'needs_rerun'; });
  }

  function refreshAssets() {
    currentAssets = filterAssetsForMode(baseReviewAssets());
    if (!selectedAssetKey && currentAssets[0]) selectedAssetKey = currentAssets[0].assetKey;
    if (selectedAssetKey && !currentAssets.some(function (asset) { return asset.assetKey === selectedAssetKey; })) {
      selectedAssetKey = currentAssets[0]?.assetKey || '';
    }
  }

  function renderSummary(target) {
    if (!target) return;
    var summary = getSummary();
    var index = selectedAssetIndex();
    target.innerHTML = '';
    target.appendChild(el('span', 'asset-review-progress-main', currentAssets.length ? ((index + 1) + ' / ' + currentAssets.length) : '0 / 0'));
    target.appendChild(el('span', 'asset-review-progress-chip', '核准 ' + (summary.approved || 0)));
    target.appendChild(el('span', 'asset-review-progress-chip', '重新去背 ' + (summary.needs_rerun || 0)));
    if (completeMessage) target.appendChild(el('span', 'asset-review-complete-message', completeMessage));
  }

  function setInspectorState(state) {
    inspectorState = state === 'expanded' ? 'expanded' : 'collapsed';
    root?.querySelector?.('.asset-review-workspace')?.setAttribute('data-inspector', inspectorState);
  }

  function expandInspector() {
    setInspectorState('expanded');
  }

  function collapseInspector() {
    setInspectorState('collapsed');
  }

  function updateNavigatorDirtyIndicators() {
    if (!root) return;
    var dirtyKey = dirtyAssetKey();
    root.querySelectorAll('.asset-review-item').forEach(function (item) {
      var assetKey = item.getAttribute('data-asset-key') || '';
      var dot = item.querySelector('.asset-review-dirty-dot');
      if (assetKey === dirtyKey) {
        if (!dot) item.querySelector('.asset-review-item-top')?.appendChild(el('span', 'asset-review-dirty-dot', '●'));
      } else if (dot) {
        dot.remove();
      }
    });
  }

  function updateUndoDecisionButton() {
    if (!undoDecisionButton) return;
    var disabled = isSaving || !lastDecisionSnapshot;
    undoDecisionButton.disabled = disabled;
    undoDecisionButton.classList.toggle('is-disabled', disabled);
  }

  function selectedAssetIndex() {
    return currentAssets.findIndex(function (item) { return item.assetKey === selectedAssetKey; });
  }

  function selectAssetAt(index) {
    if (!currentAssets.length) return;
    var next = currentAssets[Math.max(0, Math.min(currentAssets.length - 1, index))];
    if (!next) return;
    selectedAssetKey = next.assetKey;
    inspectorState = 'collapsed';
    completeMessage = '';
    render();
  }

  function hasUnsavedChanges() {
    return !!(currentEditor?.hasUnsavedChanges?.() || currentSession?.dirty);
  }

  function setBusy(busy) {
    isSaving = !!busy;
    if (!root) return;
    root.setAttribute('data-saving', isSaving ? 'true' : 'false');
    root.querySelectorAll('.asset-review-nav-btn, .asset-review-close, .asset-review-item, .asset-review-action, .asset-review-completion-btn').forEach(function (node) {
      node.disabled = isSaving;
      node.classList.toggle('is-disabled', isSaving);
    });
    updateUndoDecisionButton();
  }

  function hideToast() {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    root?.querySelector?.('.asset-review-toast')?.remove();
  }

  function showToast(message) {
    if (!root) return;
    var toast = root.querySelector('.asset-review-toast');
    if (!toast) {
      toast = el('div', 'asset-review-toast');
      root.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastTimer = null;
      toast.remove();
    }, 2000);
  }

  function removeGuardDialog() {
    if (guardDialog) guardDialog.remove();
    guardDialog = null;
  }

  function saveCurrentSession() {
    if (!currentEditor?.save) return Promise.resolve(false);
    return currentEditor.save();
  }

  function runGuarded(action) {
    if (isSaving) return;
    if (!hasUnsavedChanges()) {
      action();
      return;
    }
    showUnsavedGuard(action);
  }

  function showUnsavedGuard(action) {
    if (!root || guardDialog) return;
    guardDialog = el('div', 'asset-review-unsaved-backdrop');
    var panel = el('div', 'asset-review-unsaved-dialog');
    panel.appendChild(el('div', 'asset-review-unsaved-title', '尚未儲存修改'));
    panel.appendChild(el('div', 'asset-review-unsaved-copy', '是否要儲存？'));
    var actions = el('div', 'asset-review-unsaved-actions');
    actions.appendChild(button('asset-review-unsaved-btn primary', '儲存', function () {
      removeGuardDialog();
      saveCurrentSession().then(function () { action(); }).catch(function (error) {
        console.error('[asset-review] guarded save failed', error);
      });
    }));
    actions.appendChild(button('asset-review-unsaved-btn', '不儲存', function () {
      removeGuardDialog();
      currentEditor?.discardToSaved?.();
      action();
    }));
    actions.appendChild(button('asset-review-unsaved-btn ghost', '取消', removeGuardDialog));
    panel.appendChild(actions);
    guardDialog.appendChild(panel);
    root.appendChild(guardDialog);
  }

  function requestSelectAssetAt(index) {
    runGuarded(function () { selectAssetAt(index); });
  }

  function requestSelectAsset(assetKey) {
    if (assetKey === selectedAssetKey && !completeMessage) return;
    runGuarded(function () {
      selectedAssetKey = assetKey;
      inspectorState = 'collapsed';
      completeMessage = '';
      render();
    });
  }

  function requestClose() {
    runGuarded(close);
  }

  function requestDecision(assetKey, decision) {
    runGuarded(function () { decide(assetKey, decision); });
  }

  function requestUndoLastDecision() {
    if (!lastDecisionSnapshot) return;
    runGuarded(undoLastDecision);
  }

  function requestRunRerun() {
    if (isSaving || typeof currentOptions.onRunRerun !== 'function') return;
    var assets = getNeedsRerunAssets();
    currentOptions.onRunRerun({
      count: assets.length,
      assets: assets,
    });
  }

  function destroyEditorSession() {
    loadSeq++;
    if (currentEditor?.destroy) currentEditor.destroy();
    currentEditor = null;
    if (global.BNAssetEditSession?.destroySession) {
      global.BNAssetEditSession.destroySession(currentSession);
    }
    currentSession = null;
  }

  function renderList(target) {
    target.innerHTML = '';
    if (!currentAssets.length) {
      target.appendChild(el('div', 'asset-review-empty', '尚無可審閱素材'));
      return;
    }
    var dirtyKey = dirtyAssetKey();
    currentAssets.forEach(function (asset) {
      var item = button('asset-review-item' + (asset.assetKey === selectedAssetKey ? ' is-active' : ''), '', function () {
        requestSelectAsset(asset.assetKey);
      });
      item.setAttribute('data-asset-key', asset.assetKey || '');
      var top = el('div', 'asset-review-item-top');
      top.appendChild(el('span', 'asset-review-status status-' + (asset.status || 'pending'), shortStatusLabel(asset.status)));
      if (asset.assetKey === dirtyKey) {
        top.appendChild(el('span', 'asset-review-dirty-dot', '●'));
      }
      var name = el('div', 'asset-review-filename', asset.originalFilename || asset.assetKey);
      item.appendChild(top);
      item.appendChild(name);
      target.appendChild(item);
    });
  }

  function renderDetail(target) {
    destroyEditorSession();
    target.innerHTML = '';
    var asset = currentAssets.find(function (item) { return item.assetKey === selectedAssetKey; });
    if (!asset) {
      var emptyMessage = currentReviewMode === 'needs_rerun'
        ? '目前沒有待重新去背的素材'
        : '請選擇素材';
      target.appendChild(el('div', 'asset-review-filter-empty', emptyMessage));
      return;
    }

    var workspace = el('div', 'asset-review-workspace');
    workspace.setAttribute('data-inspector', inspectorState);

    var toolbar = el('aside', 'asset-review-tools');
    var cropButton = button('asset-review-tool', '裁切', expandInspector);
    cropButton.setAttribute('data-tool', 'crop');
    var eraserButton = button('asset-review-tool', '橡皮擦', expandInspector);
    eraserButton.setAttribute('data-tool', 'eraser');
    var undoButton = button('asset-review-tool is-disabled', '復原', function () {});
    undoButton.disabled = true;
    var fitButton = button('asset-review-tool', '符合畫面', function () {});
    var saveButton = button('asset-review-tool asset-review-save-tool is-disabled', '儲存', function () {});
    saveButton.disabled = true;
    toolbar.appendChild(cropButton);
    toolbar.appendChild(eraserButton);
    toolbar.appendChild(undoButton);
    toolbar.appendChild(fitButton);
    toolbar.appendChild(saveButton);

    var editorPane = el('section', 'asset-review-editor-pane');
    var editorHead = el('div', 'asset-review-editor-head');
    var titleWrap = el('div', 'asset-review-editor-title-wrap');
    titleWrap.appendChild(el('div', 'asset-review-detail-title', asset.originalFilename || asset.assetKey));
    var editorActions = el('div', 'asset-review-editor-actions');
    var viewToggle = button('asset-review-secondary-action', '查看原圖', function () {});
    var cropApplyButton = button('asset-review-secondary-action asset-review-crop-action', '套用裁切', function () {});
    cropApplyButton.hidden = true;
    var cropCancelButton = button('asset-review-secondary-action asset-review-crop-action', '取消裁切', collapseInspector);
    cropCancelButton.hidden = true;
    var zoomStatus = el('span', 'asset-review-zoom-status', '100%');
    editorActions.appendChild(cropApplyButton);
    editorActions.appendChild(cropCancelButton);
    editorActions.appendChild(viewToggle);
    editorActions.appendChild(zoomStatus);
    editorHead.appendChild(titleWrap);
    editorHead.appendChild(editorActions);

    var stage = el('div', 'asset-review-editor-stage');
    stage.tabIndex = 0;
    var stageInner = el('div', 'asset-review-editor-stage-inner');
    var image = el('img', 'asset-review-editor-image');
    image.alt = asset.originalFilename || asset.assetKey;
    stageInner.appendChild(image);
    stage.appendChild(stageInner);
    stage.appendChild(el('div', 'asset-review-loading asset-review-editor-loading', '載入中'));
    editorPane.appendChild(editorHead);
    editorPane.appendChild(stage);

    var settings = el('aside', 'asset-review-settings');
    var viewSettings = el('div', 'asset-review-inspector-panel asset-review-view-settings');
    viewSettings.appendChild(el('div', 'asset-review-settings-title', '查看'));
    viewSettings.appendChild(el('div', 'asset-review-settings-note', '目前顯示處理結果，可切換查看原圖，或使用符合畫面調整顯示範圍。'));
    var cropSettings = el('div', 'asset-review-inspector-panel asset-review-crop-settings');
    cropSettings.appendChild(el('div', 'asset-review-settings-title', '裁切'));
    cropSettings.appendChild(el('div', 'asset-review-settings-note', '拖曳裁切框調整範圍，完成後按「套用裁切」，或按「取消裁切」放棄本次裁切。'));
    var eraserSettings = el('div', 'asset-review-eraser-settings');
    eraserSettings.hidden = true;
    eraserSettings.appendChild(el('div', 'asset-review-settings-title', '橡皮擦'));
    var brushModeWrap = el('div', 'asset-review-brush-mode');
    var hardBrushButton = button('asset-review-brush-mode-btn is-active', '硬邊', function () {});
    hardBrushButton.setAttribute('data-brush-mode', 'hard');
    var softBrushButton = button('asset-review-brush-mode-btn', '軟邊', function () {});
    softBrushButton.setAttribute('data-brush-mode', 'soft');
    brushModeWrap.appendChild(hardBrushButton);
    brushModeWrap.appendChild(softBrushButton);
    var brushSizeWrap = el('label', 'asset-review-brush-size');
    var brushSizeLabel = el('span', 'asset-review-brush-size-label', '40px');
    var brushSizeInput = document.createElement('input');
    brushSizeInput.className = 'asset-review-brush-size-input';
    brushSizeInput.type = 'range';
    brushSizeInput.min = '8';
    brushSizeInput.max = '160';
    brushSizeInput.step = '1';
    brushSizeInput.value = '40';
    brushSizeWrap.appendChild(el('span', '', '筆刷大小'));
    brushSizeWrap.appendChild(brushSizeLabel);
    brushSizeWrap.appendChild(brushSizeInput);
    eraserSettings.appendChild(brushModeWrap);
    eraserSettings.appendChild(brushSizeWrap);

    settings.appendChild(viewSettings);
    settings.appendChild(cropSettings);
    settings.appendChild(eraserSettings);
    settings.appendChild(el('div', 'asset-review-settings-note', '修圖只會影響目前素材的處理結果；按「儲存」後才會套用。'));

    workspace.appendChild(toolbar);
    workspace.appendChild(editorPane);
    workspace.appendChild(settings);
    target.appendChild(workspace);

    var actions = el('div', 'asset-review-actions asset-review-bottom-actions');
    actions.appendChild(button('asset-review-action approve', '核准', function () {
      requestDecision(asset.assetKey, 'approved');
    }));
    actions.appendChild(button('asset-review-action rerun', '重新去背', function () {
      requestDecision(asset.assetKey, 'needs_rerun');
    }));
    undoDecisionButton = button('asset-review-action undo-decision is-disabled', '撤回上一個決策', requestUndoLastDecision);
    undoDecisionButton.disabled = true;
    actions.appendChild(undoDecisionButton);
    target.appendChild(actions);

    var seq = ++loadSeq;
    Promise.all([
      Promise.resolve().then(function () { return currentOptions.resolveOriginalImage ? currentOptions.resolveOriginalImage(asset) : ''; }),
      Promise.resolve().then(function () { return currentOptions.resolveProcessedImage ? currentOptions.resolveProcessedImage(asset) : ''; })
    ]).then(function (sources) {
      if (seq !== loadSeq) return;
      var loading = stage.querySelector('.asset-review-editor-loading');
      if (loading) loading.remove();
      if (!global.BNAssetEditSession?.createSession || !global.BNAssetReviewEditor?.createEditor) {
        stage.appendChild(el('div', 'asset-review-missing', '素材編輯器尚未載入'));
        return;
      }
      currentSession = global.BNAssetEditSession.createSession(asset, {
        original: sources[0],
        processed: sources[1],
      });
      currentEditor = global.BNAssetReviewEditor.createEditor({
        session: currentSession,
        root: workspace,
        stage: stage,
        image: image,
        status: zoomStatus,
        modeButton: viewToggle,
        fitButton: fitButton,
        cropButton: cropButton,
        eraserButton: eraserButton,
        undoButton: undoButton,
        saveButton: saveButton,
        cropApplyButton: cropApplyButton,
        cropCancelButton: cropCancelButton,
        brushModeButtons: [hardBrushButton, softBrushButton],
        brushSizeInput: brushSizeInput,
        brushSizeLabel: brushSizeLabel,
        eraserSettings: eraserSettings,
        toolButtons: [cropButton, eraserButton],
        onDirtyChange: updateNavigatorDirtyIndicators,
        onSavingChange: setBusy,
        onSave: function (payload) {
          if (typeof currentOptions.onSaveProcessedAsset === 'function') {
            return currentOptions.onSaveProcessedAsset(asset, payload);
          }
          return null;
        },
        onSaved: function () {
          collapseInspector();
          showToast('✓ 已儲存修改');
        },
      });
    }).catch(function (error) {
      if (seq !== loadSeq) return;
      var loading = stage.querySelector('.asset-review-editor-loading');
      if (loading) loading.remove();
      stage.appendChild(el('div', 'asset-review-missing', error?.message || '載入失敗'));
    });
  }

  function renderCompletion(target) {
    destroyEditorSession();
    undoDecisionButton = null;
    target.innerHTML = '';

    var needsRerunCount = getNeedsRerunAssets().length;
    var screen = el('section', 'asset-review-completion');
    screen.appendChild(el('div', 'asset-review-completion-mark', '✓'));
    screen.appendChild(el('h2', 'asset-review-completion-title', '全部素材已完成審閱'));
    if (needsRerunCount > 0) {
      screen.appendChild(el('p', 'asset-review-completion-copy', needsRerunCount + ' 個素材待重新去背'));
    }

    var actions = el('div', 'asset-review-completion-actions');
    if (needsRerunCount > 0) {
      var rerunButton = button('asset-review-completion-btn rerun', '重新去背素材（' + needsRerunCount + '）', requestRunRerun);
      if (typeof currentOptions.onRunRerun !== 'function') {
        rerunButton.disabled = true;
        rerunButton.classList.add('is-disabled');
      }
      actions.appendChild(rerunButton);
    }
    actions.appendChild(button('asset-review-completion-btn secondary', '返回控制台', requestClose));
    undoDecisionButton = button('asset-review-completion-btn undo-decision is-disabled', '撤回上一個決策', requestUndoLastDecision);
    undoDecisionButton.disabled = true;
    actions.appendChild(undoDecisionButton);
    screen.appendChild(actions);
    target.appendChild(screen);
  }

  function snapshotDecision(assetKey) {
    var record = currentOptions.pipelineState?.assets?.[assetKey];
    if (!record) return null;
    return {
      assetKey: assetKey,
      status: record.status || 'pending',
      review: record.review ? Object.assign({}, record.review) : null,
    };
  }

  function isAssetReviewed(asset) {
    return asset && !isUnreviewed(asset);
  }

  function isGlobalReviewComplete() {
    var assets = getGlobalReviewableAssets();
    return !!assets.length && assets.every(isAssetReviewed);
  }

  function updateCompleteMessage() {
    completeMessage = isGlobalReviewComplete() ? '✓ 全部素材已完成審閱' : '';
  }

  function decide(assetKey, decision) {
    if (!currentOptions.onDecision) return;
    var beforeAssets = currentAssets.slice();
    var beforeIndex = selectedAssetIndex();
    var snapshot = snapshotDecision(assetKey);
    var result = currentOptions.onDecision(assetKey, decision);
    if (result && result.state) currentOptions.pipelineState = result.state;
    if (result?.ok && snapshot) lastDecisionSnapshot = snapshot;
    refreshAssets();
    if (isGlobalReviewComplete()) {
      updateCompleteMessage();
      render();
      return;
    }
    var nextAsset = null;
    if (beforeIndex >= 0 && beforeIndex < beforeAssets.length - 1) {
      var nextKey = beforeAssets[beforeIndex + 1]?.assetKey;
      nextAsset = currentAssets.find(function (item) { return item.assetKey === nextKey; })
        || currentAssets[Math.min(beforeIndex, currentAssets.length - 1)];
    }
    if (nextAsset) {
      selectedAssetKey = nextAsset.assetKey;
      inspectorState = 'collapsed';
      completeMessage = '';
    } else {
      if (!currentAssets.some(function (item) { return item.assetKey === selectedAssetKey; })) {
        selectedAssetKey = currentAssets[currentAssets.length - 1]?.assetKey || '';
      }
      updateCompleteMessage();
    }
    render();
  }

  function undoLastDecision() {
    if (!lastDecisionSnapshot || !currentOptions.onRestoreDecision) return;
    var result = currentOptions.onRestoreDecision(lastDecisionSnapshot);
    if (result && result.state) currentOptions.pipelineState = result.state;
    selectedAssetKey = lastDecisionSnapshot.assetKey;
    inspectorState = 'collapsed';
    lastDecisionSnapshot = null;
    completeMessage = '';
    refreshAssets();
    updateCompleteMessage();
    render();
  }

  function close() {
    removeGuardDialog();
    hideToast();
    destroyEditorSession();
    if (root) root.remove();
    root = null;
    currentOptions = null;
    currentAssets = [];
    allReviewAssets = [];
    selectedAssetKey = '';
    currentReviewMode = 'all';
    runtimeReviewAssetKeys = null;
    completeMessage = '';
    lastDecisionSnapshot = null;
    undoDecisionButton = null;
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(event) {
    if (!root || isSaving || isTypingTarget(event.target)) return;
    var key = event.key;
    if (key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }
    if (key === 'ArrowLeft') {
      event.preventDefault();
      requestSelectAssetAt(selectedAssetIndex() - 1);
      return;
    }
    if (key === 'ArrowRight') {
      event.preventDefault();
      requestSelectAssetAt(selectedAssetIndex() + 1);
      return;
    }
    if (key.toLowerCase() === 'a') {
      event.preventDefault();
      if (selectedAssetKey) requestDecision(selectedAssetKey, 'approved');
      return;
    }
    if (key.toLowerCase() === 'r') {
      event.preventDefault();
      if (selectedAssetKey) requestDecision(selectedAssetKey, 'needs_rerun');
    }
  }

  function setReviewMode(mode) {
    if (!REVIEW_MODES[mode] || currentReviewMode === mode) return;
    currentReviewMode = mode;
    selectedAssetKey = '';
    completeMessage = '';
    refreshAssets();
    pickSmartEntry();
    render();
  }

  function pickSmartEntry() {
    if (!currentAssets.length) {
      selectedAssetKey = '';
      return;
    }
    var firstUnreviewed = currentAssets.find(isUnreviewed);
    selectedAssetKey = (firstUnreviewed || currentAssets[0]).assetKey;
  }

  function chooseInitialMode(options) {
    if (REVIEW_MODES[options.initialReviewMode]) return options.initialReviewMode;
    if (runtimeReviewAssetKeys) return 'needs_rerun';
    var assets = allReviewAssets.length ? allReviewAssets : baseReviewAssets();
    if (assets.some(isUnreviewed)) return 'all';
    if (assets.some(function (asset) { return (asset.status || 'pending') === 'needs_rerun'; })) return 'needs_rerun';
    return 'all';
  }

  function render() {
    if (!root) return;
    var summary = root.querySelector('[data-review-summary]');
    var list = root.querySelector('[data-review-list]');
    var detail = root.querySelector('[data-review-detail]');
    renderSummary(summary);
    renderList(list);
    if (completeMessage) {
      renderCompletion(detail);
    } else {
      renderDetail(detail);
    }
    updateUndoDecisionButton();
    root.querySelectorAll('[data-review-mode]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-review-mode') === currentReviewMode);
    });
  }

  function open(options) {
    currentOptions = options || {};
    if (!currentOptions.pipelineState) return;
    if (root) root.remove();
    runtimeReviewAssetKeys = makeAssetKeySet(currentOptions.reviewAssetKeys || currentOptions.runtimeReviewAssetKeys || []);
    allReviewAssets = [];
    baseReviewAssets();
    currentReviewMode = chooseInitialMode(currentOptions);
    var requestedAssetKey = currentOptions.selectedAssetKey || '';
    selectedAssetKey = requestedAssetKey;
    completeMessage = '';
    lastDecisionSnapshot = null;
    inspectorState = 'collapsed';
    refreshAssets();
    if (!requestedAssetKey) pickSmartEntry();
    updateCompleteMessage();

    root = el('div', 'asset-review-modal asset-review-modal-workspace');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '素材審閱工作區');

    var dialog = el('div', 'asset-review-dialog');
    var header = el('div', 'asset-review-header');
    var titleWrap = el('div', 'asset-review-title-wrap');
    titleWrap.appendChild(el('div', 'asset-review-title', '素材審閱'));
    header.appendChild(titleWrap);

    header.appendChild(button('asset-review-close', '關閉', requestClose));

    var body = el('div', 'asset-review-body');
    var navigator = el('aside', 'asset-review-navigator');
    var navigatorHeader = el('div', 'asset-review-navigator-header');
    var summary = el('div', 'asset-review-summary asset-review-navigator-summary');
    summary.setAttribute('data-review-summary', '');
    var modeWrap = el('div', 'asset-review-mode-switch');
    var allButton = button('asset-review-mode-btn', '全部素材', function () { setReviewMode('all'); });
    allButton.setAttribute('data-review-mode', 'all');
    var rerunButton = button('asset-review-mode-btn', '待重新去背', function () { setReviewMode('needs_rerun'); });
    rerunButton.setAttribute('data-review-mode', 'needs_rerun');
    modeWrap.appendChild(allButton);
    modeWrap.appendChild(rerunButton);
    navigatorHeader.appendChild(summary);
    navigatorHeader.appendChild(modeWrap);
    var list = el('div', 'asset-review-list');
    list.setAttribute('data-review-list', '');
    navigator.appendChild(navigatorHeader);
    navigator.appendChild(list);
    var detail = el('main', 'asset-review-detail');
    detail.setAttribute('data-review-detail', '');
    body.appendChild(navigator);
    body.appendChild(detail);

    dialog.appendChild(header);
    dialog.appendChild(body);
    root.appendChild(dialog);
    document.body.appendChild(root);
    document.addEventListener('keydown', onKeydown);
    render();
  }

  global.BNAssetReviewWorkspace = {
    open: open,
    close: close
  };
})(window);
