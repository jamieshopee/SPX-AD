(function (global) {
  if (global.BNAssetReviewWorkspace) return;

  var root = null;
  var currentOptions = null;
  var currentAssets = [];
  var selectedAssetKey = '';
  var loadSeq = 0;

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
    if (global.BNAssetPipelineState?.getReviewSummary) {
      return global.BNAssetPipelineState.getReviewSummary(currentOptions.pipelineState);
    }
    return { reviewable: currentAssets.length, approved: 0, needs_rerun: 0, rejected: 0 };
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

  function renderList(target) {
    target.innerHTML = '';
    if (!currentAssets.length) {
      target.appendChild(el('div', 'asset-review-empty', '尚無 processed assets 可檢視'));
      return;
    }
    currentAssets.forEach(function (asset) {
      var item = button('asset-review-item' + (asset.assetKey === selectedAssetKey ? ' is-active' : ''), '', function () {
        selectedAssetKey = asset.assetKey;
        render();
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

  function renderPreview(target, title, loader, asset, seq) {
    var pane = el('section', 'asset-review-preview');
    pane.appendChild(el('div', 'asset-review-preview-title', title));
    var stage = el('div', 'asset-review-preview-stage');
    stage.appendChild(el('div', 'asset-review-loading', 'Loading'));
    pane.appendChild(stage);
    target.appendChild(pane);

    Promise.resolve()
      .then(function () { return loader ? loader(asset) : ''; })
      .then(function (src) {
        if (seq !== loadSeq) return;
        stage.innerHTML = '';
        if (!src) {
          stage.appendChild(el('div', 'asset-review-missing', 'No image'));
          return;
        }
        var img = el('img', 'asset-review-img');
        img.alt = title + ' - ' + (asset.originalFilename || asset.assetKey);
        img.src = src;
        stage.appendChild(img);
      })
      .catch(function (error) {
        if (seq !== loadSeq) return;
        stage.innerHTML = '';
        stage.appendChild(el('div', 'asset-review-missing', error?.message || 'Load failed'));
      });
  }

  function renderDetail(target) {
    target.innerHTML = '';
    var asset = currentAssets.find(function (item) { return item.assetKey === selectedAssetKey; });
    if (!asset) {
      target.appendChild(el('div', 'asset-review-empty', '請選擇 processed asset'));
      return;
    }

    var head = el('div', 'asset-review-detail-head');
    var title = el('div', 'asset-review-detail-title', asset.originalFilename || asset.assetKey);
    var status = el('span', 'asset-review-status status-' + (asset.status || 'pending'), statusLabel(asset.status));
    head.appendChild(title);
    head.appendChild(status);
    target.appendChild(head);

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
    target.appendChild(facts);

    var previews = el('div', 'asset-review-previews');
    var seq = ++loadSeq;
    renderPreview(previews, 'Original', currentOptions.resolveOriginalImage, asset, seq);
    renderPreview(previews, 'Processed', currentOptions.resolveProcessedImage, asset, seq);
    target.appendChild(previews);

    var actions = el('div', 'asset-review-actions');
    actions.appendChild(button('asset-review-action approve', 'Approve', function () {
      decide(asset.assetKey, 'approved');
    }));
    actions.appendChild(button('asset-review-action rerun', 'Needs Rerun', function () {
      decide(asset.assetKey, 'needs_rerun');
    }));
    actions.appendChild(button('asset-review-action reject', 'Reject', function () {
      decide(asset.assetKey, 'rejected');
    }));
    target.appendChild(actions);
  }

  function decide(assetKey, decision) {
    if (!currentOptions.onDecision) return;
    var result = currentOptions.onDecision(assetKey, decision);
    if (result && result.state) currentOptions.pipelineState = result.state;
    refreshAssets();
    render();
  }

  function close() {
    loadSeq++;
    if (root) root.remove();
    root = null;
    currentOptions = null;
    currentAssets = [];
    selectedAssetKey = '';
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') close();
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

    root = el('div', 'asset-review-modal');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Processed Assets Review Workspace');
    root.addEventListener('click', function (event) {
      if (event.target === root) close();
    });

    var dialog = el('div', 'asset-review-dialog');
    var header = el('div', 'asset-review-header');
    var titleWrap = el('div', 'asset-review-title-wrap');
    titleWrap.appendChild(el('div', 'asset-review-title', 'Processed Assets Review'));
    var summary = el('div', 'asset-review-summary');
    summary.setAttribute('data-review-summary', '');
    titleWrap.appendChild(summary);
    header.appendChild(titleWrap);
    header.appendChild(button('asset-review-close', '×', close));

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
