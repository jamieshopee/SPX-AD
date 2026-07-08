(function (global) {
  if (global.BNAssetReviewWorkspace) return;

  var root = null;
  var currentOptions = null;
  var currentAssets = [];
  var selectedAssetKey = '';
  var loadSeq = 0;
  var currentSession = null;
  var currentEditor = null;
  var isSaving = false;
  var guardDialog = null;
  var toastTimer = null;
  var REVIEW_ROLES = { product: true, person: true, singleProduct: true };

  function text(value) {
    return value == null || value === '' ? '-' : String(value);
  }

  function statusLabel(status) {
    var labels = {
      pending: 'Pending',
      processed: 'Processed',
      approved: 'Approved',
      needs_rerun: 'Needs Rerun',
      rejected: 'Rejected'
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
    }, { reviewable: 0, approved: 0, needs_rerun: 0, rejected: 0 });
  }

  function refreshAssets() {
    if (global.BNAssetPipelineState?.getReviewableAssets) {
      currentAssets = global.BNAssetPipelineState.getReviewableAssets(currentOptions.pipelineState);
    } else {
      var assets = currentOptions.pipelineState?.assets || {};
      currentAssets = Object.keys(assets).map(function (key) { return assets[key]; }).filter(function (asset) {
        return !!asset.processedAsset;
      });
    }
    currentAssets = currentAssets.filter(function (asset) {
      return !!REVIEW_ROLES[asset.role];
    });
    if (!selectedAssetKey && currentAssets[0]) selectedAssetKey = currentAssets[0].assetKey;
    if (selectedAssetKey && !currentAssets.some(function (asset) { return asset.assetKey === selectedAssetKey; })) {
      selectedAssetKey = currentAssets[0]?.assetKey || '';
    }
  }

  function renderSummary(target) {
    var summary = getSummary();
    target.textContent = [
      'Reviewable ' + (summary.reviewable || 0),
      'Approved ' + (summary.approved || 0),
      'Needs Rerun ' + (summary.needs_rerun || 0),
      'Rejected ' + (summary.rejected || 0)
    ].join(' / ');
  }

  function selectedAssetIndex() {
    return currentAssets.findIndex(function (item) { return item.assetKey === selectedAssetKey; });
  }

  function selectAssetAt(index) {
    if (!currentAssets.length) return;
    var next = currentAssets[Math.max(0, Math.min(currentAssets.length - 1, index))];
    if (!next) return;
    selectedAssetKey = next.assetKey;
    render();
  }

  function hasUnsavedChanges() {
    return !!(currentEditor?.hasUnsavedChanges?.() || currentSession?.dirty);
  }

  function setBusy(busy) {
    isSaving = !!busy;
    if (!root) return;
    root.setAttribute('data-saving', isSaving ? 'true' : 'false');
    root.querySelectorAll('.asset-review-nav-btn, .asset-review-close, .asset-review-item, .asset-review-action').forEach(function (node) {
      node.disabled = isSaving;
      node.classList.toggle('is-disabled', isSaving);
    });
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
    if (assetKey === selectedAssetKey) return;
    runGuarded(function () {
      selectedAssetKey = assetKey;
      render();
    });
  }

  function requestClose() {
    runGuarded(close);
  }

  function requestDecision(assetKey, decision) {
    runGuarded(function () { decide(assetKey, decision); });
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
      target.appendChild(el('div', 'asset-review-empty', '尚無 processed assets 可檢視'));
      return;
    }
    currentAssets.forEach(function (asset) {
      var item = button('asset-review-item' + (asset.assetKey === selectedAssetKey ? ' is-active' : ''), '', function () {
        requestSelectAsset(asset.assetKey);
      });
      var top = el('div', 'asset-review-item-top');
      top.appendChild(el('span', 'asset-review-role', roleLabel(asset.role)));
      top.appendChild(el('span', 'asset-review-status status-' + (asset.status || 'pending'), statusLabel(asset.status)));
      var name = el('div', 'asset-review-filename', asset.originalFilename || asset.assetKey);
      var meta = el('div', 'asset-review-meta', [
        'job ' + text((asset.jobIds || [])[0]),
        asset.slot == null ? 'slot -' : 'slot ' + asset.slot
      ].join(' · '));
      item.appendChild(top);
      item.appendChild(name);
      item.appendChild(meta);
      target.appendChild(item);
    });
  }

  function renderDetail(target) {
    destroyEditorSession();
    target.innerHTML = '';
    var asset = currentAssets.find(function (item) { return item.assetKey === selectedAssetKey; });
    if (!asset) {
      target.appendChild(el('div', 'asset-review-empty', '請選擇 processed asset'));
      return;
    }

    var workspace = el('div', 'asset-review-workspace');

    var toolbar = el('aside', 'asset-review-tools');
    var panButton = button('asset-review-tool is-active', '拖曳', function () {});
    panButton.setAttribute('data-tool', 'pan');
    var cropButton = button('asset-review-tool', '裁切', function () {});
    cropButton.setAttribute('data-tool', 'crop');
    var eraserButton = button('asset-review-tool', '橡皮擦', function () {});
    eraserButton.setAttribute('data-tool', 'eraser');
    var undoButton = button('asset-review-tool is-disabled', '復原', function () {});
    undoButton.disabled = true;
    var fitButton = button('asset-review-tool', '符合畫面', function () {});
    var saveButton = button('asset-review-tool asset-review-save-tool is-disabled', 'Save', function () {});
    saveButton.disabled = true;
    toolbar.appendChild(panButton);
    toolbar.appendChild(cropButton);
    toolbar.appendChild(eraserButton);
    toolbar.appendChild(undoButton);
    toolbar.appendChild(fitButton);
    toolbar.appendChild(saveButton);

    var editorPane = el('section', 'asset-review-editor-pane');
    var editorHead = el('div', 'asset-review-editor-head');
    var titleWrap = el('div', 'asset-review-editor-title-wrap');
    titleWrap.appendChild(el('div', 'asset-review-detail-title', asset.originalFilename || asset.assetKey));
    titleWrap.appendChild(el('div', 'asset-review-meta', [
      roleLabel(asset.role),
      'job ' + text((asset.jobIds || [])[0]),
      asset.slot == null ? 'slot -' : 'slot ' + asset.slot
    ].join(' · ')));
    var editorActions = el('div', 'asset-review-editor-actions');
    var viewToggle = button('asset-review-secondary-action', '查看原圖', function () {});
    var cropApplyButton = button('asset-review-secondary-action asset-review-crop-action', '套用裁切', function () {});
    cropApplyButton.hidden = true;
    var cropCancelButton = button('asset-review-secondary-action asset-review-crop-action', '取消裁切', function () {});
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
    stage.appendChild(el('div', 'asset-review-loading asset-review-editor-loading', 'Loading'));
    editorPane.appendChild(editorHead);
    editorPane.appendChild(stage);

    var settings = el('aside', 'asset-review-settings');
    var status = el('span', 'asset-review-status status-' + (asset.status || 'pending'), statusLabel(asset.status));
    var facts = el('div', 'asset-review-facts');
    [
      ['Asset Key', asset.assetKey],
      ['Role', roleLabel(asset.role)],
      ['Job ID', (asset.jobIds || []).join(', ') || '-'],
      ['Slot', asset.slot == null ? '-' : asset.slot],
      ['Mode', asset.mode || '-'],
      ['Processed', asset.processedAsset?.filename || '-']
    ].forEach(function (pair) {
      var row = el('div', 'asset-review-fact');
      row.appendChild(el('span', '', pair[0]));
      row.appendChild(el('strong', '', text(pair[1])));
      facts.appendChild(row);
    });
    var eraserSettings = el('div', 'asset-review-eraser-settings');
    eraserSettings.hidden = true;
    eraserSettings.appendChild(el('div', 'asset-review-settings-title', '橡皮擦設定'));
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

    settings.appendChild(status);
    settings.appendChild(facts);
    settings.appendChild(eraserSettings);
    settings.appendChild(el('div', 'asset-review-settings-note', '裁切與橡皮擦只修改目前 Edit Session。可復原，但不會儲存 cleaned asset，也不會改變 Review Decision。'));

    workspace.appendChild(toolbar);
    workspace.appendChild(editorPane);
    workspace.appendChild(settings);
    target.appendChild(workspace);

    var actions = el('div', 'asset-review-actions asset-review-bottom-actions');
    actions.appendChild(button('asset-review-action approve', '核准', function () {
      requestDecision(asset.assetKey, 'approved');
    }));
    actions.appendChild(button('asset-review-action rerun', '重新處理', function () {
      requestDecision(asset.assetKey, 'needs_rerun');
    }));
    actions.appendChild(button('asset-review-action reject', '拒絕', function () {
      requestDecision(asset.assetKey, 'rejected');
    }));
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
        stage.appendChild(el('div', 'asset-review-missing', 'Review editor is not loaded'));
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
        toolButtons: [panButton, cropButton, eraserButton],
        onSavingChange: setBusy,
        onSave: function (payload) {
          if (typeof currentOptions.onSaveProcessedAsset === 'function') {
            return currentOptions.onSaveProcessedAsset(asset, payload);
          }
          return null;
        },
        onSaved: function () { showToast('✓ 已儲存修改'); },
      });
    }).catch(function (error) {
      if (seq !== loadSeq) return;
      var loading = stage.querySelector('.asset-review-editor-loading');
      if (loading) loading.remove();
      stage.appendChild(el('div', 'asset-review-missing', error?.message || 'Load failed'));
    });
  }

  function decide(assetKey, decision) {
    if (!currentOptions.onDecision) return;
    var result = currentOptions.onDecision(assetKey, decision);
    if (result && result.state) currentOptions.pipelineState = result.state;
    refreshAssets();
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
    selectedAssetKey = '';
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') return;
  }

  function render() {
    if (!root) return;
    var summary = root.querySelector('[data-review-summary]');
    var list = root.querySelector('[data-review-list]');
    var detail = root.querySelector('[data-review-detail]');
    renderSummary(summary);
    renderList(list);
    renderDetail(detail);
  }

  function open(options) {
    currentOptions = options || {};
    if (!currentOptions.pipelineState) return;
    refreshAssets();
    if (root) root.remove();

    root = el('div', 'asset-review-modal asset-review-modal-workspace');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Processed Assets Review Workspace');

    var dialog = el('div', 'asset-review-dialog');
    var header = el('div', 'asset-review-header');
    var titleWrap = el('div', 'asset-review-title-wrap');
    titleWrap.appendChild(el('div', 'asset-review-title', '素材審閱'));
    var summary = el('div', 'asset-review-summary');
    summary.setAttribute('data-review-summary', '');
    titleWrap.appendChild(summary);
    header.appendChild(titleWrap);

    var nav = el('div', 'asset-review-nav');
    nav.appendChild(button('asset-review-nav-btn', '上一張', function () {
      requestSelectAssetAt(selectedAssetIndex() - 1);
    }));
    nav.appendChild(button('asset-review-nav-btn', '下一張', function () {
      requestSelectAssetAt(selectedAssetIndex() + 1);
    }));
    header.appendChild(nav);
    header.appendChild(button('asset-review-close', '×', requestClose));

    var body = el('div', 'asset-review-body');
    var list = el('aside', 'asset-review-list');
    list.setAttribute('data-review-list', '');
    var detail = el('main', 'asset-review-detail');
    detail.setAttribute('data-review-detail', '');
    body.appendChild(list);
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
