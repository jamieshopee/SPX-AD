(function (global) {
  if (global.BNAssetReviewEditor) return;

  var MIN_ZOOM = 0.08;
  var MAX_ZOOM = 8;
  var MIN_CROP = 32;
  var MIN_BRUSH = 8;
  var MAX_BRUSH = 160;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  function loadImageElement(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Image load failed')); };
      img.src = src;
    });
  }

  function normalizeRect(rect, width, height) {
    var x = clamp(Number(rect?.x) || 0, 0, Math.max(0, width - MIN_CROP));
    var y = clamp(Number(rect?.y) || 0, 0, Math.max(0, height - MIN_CROP));
    var w = clamp(Number(rect?.width) || width, MIN_CROP, width - x);
    var h = clamp(Number(rect?.height) || height, MIN_CROP, height - y);
    return { x: x, y: y, width: w, height: h };
  }

  function createEditor(options) {
    var session = options.session;
    var root = options.root;
    var stage = options.stage;
    var image = options.image;
    var status = options.status;
    var modeButton = options.modeButton;
    var fitButton = options.fitButton;
    var cropButton = options.cropButton;
    var eraserButton = options.eraserButton;
    var undoButton = options.undoButton;
    var saveButton = options.saveButton;
    var cropApplyButton = options.cropApplyButton;
    var cropCancelButton = options.cropCancelButton;
    var brushModeButtons = Array.prototype.slice.call(options.brushModeButtons || []);
    var brushSizeInput = options.brushSizeInput;
    var brushSizeLabel = options.brushSizeLabel;
    var eraserSettings = options.eraserSettings;
    var toolButtons = Array.prototype.slice.call(options.toolButtons || []);
    var disposed = false;
    var spaceDown = false;
    var dragState = null;
    var cropDrag = null;
    var cropLayer = null;
    var cropBox = null;
    var eraserCanvas = null;
    var eraserCtx = null;
    var brushCursor = null;
    var eraserStroke = null;
    var lastBrushPoint = null;
    var recentEraserClickStrokes = [];
    var lastEraserPointerDown = null;
    var saving = false;
    var saveFeedbackTimer = null;

    function setStatus(message) {
      if (status) status.textContent = message || '';
    }

    function getSource() {
      return global.BNAssetEditSession.getActiveSource(session);
    }

    function imageSize() {
      return {
        width: session.image.naturalWidth || image.naturalWidth || 1,
        height: session.image.naturalHeight || image.naturalHeight || 1,
      };
    }

    function imageRectOnStage() {
      var stageRect = stage.getBoundingClientRect();
      var size = imageSize();
      var width = size.width * session.zoom;
      var height = size.height * session.zoom;
      return {
        left: stageRect.width / 2 + session.pan.x - width / 2,
        top: stageRect.height / 2 + session.pan.y - height / 2,
        width: width,
        height: height,
      };
    }

    function stagePointToImage(clientX, clientY) {
      var stageRect = stage.getBoundingClientRect();
      var size = imageSize();
      return {
        x: (clientX - stageRect.left - stageRect.width / 2 - session.pan.x) / session.zoom + size.width / 2,
        y: (clientY - stageRect.top - stageRect.height / 2 - session.pan.y) / session.zoom + size.height / 2,
      };
    }

    function pointInImage(point) {
      var size = imageSize();
      return point.x >= 0 && point.y >= 0 && point.x <= size.width && point.y <= size.height;
    }

    function updateUndoState() {
      if (undoButton) undoButton.disabled = !session.undoStack.length;
      if (undoButton) undoButton.classList.toggle('is-disabled', !session.undoStack.length);
    }

    function updateSaveState(label) {
      if (!saveButton) return;
      if (label) saveButton.textContent = label;
      else if (!saving) saveButton.textContent = 'Save';
      saveButton.disabled = saving || !session.dirty;
      saveButton.classList.toggle('is-disabled', saveButton.disabled);
      saveButton.classList.toggle('is-saving', saving);
    }

    function clearSaveFeedbackTimer() {
      if (!saveFeedbackTimer) return;
      clearTimeout(saveFeedbackTimer);
      saveFeedbackTimer = null;
    }

    function notifyDirtyState() {
      if (root) root.setAttribute('data-dirty', session.dirty ? 'true' : 'false');
      updateSaveState();
      if (typeof options.onDirtyChange === 'function') options.onDirtyChange(!!session.dirty);
    }

    function updateBrushControls() {
      var brush = session.brush || { mode: 'hard', size: 40 };
      if (brushSizeInput) brushSizeInput.value = String(brush.size);
      if (brushSizeLabel) brushSizeLabel.textContent = Math.round(brush.size) + 'px';
      brushModeButtons.forEach(function (button) {
        button.classList.toggle('is-active', button.getAttribute('data-brush-mode') === brush.mode);
      });
      if (brushCursor) {
        brushCursor.setAttribute('data-brush-mode', brush.mode);
        brushCursor.style.width = (brush.size * session.zoom) + 'px';
        brushCursor.style.height = (brush.size * session.zoom) + 'px';
      }
      if (eraserSettings) eraserSettings.hidden = session.currentTool !== 'eraser';
    }

    function ensureCropLayer() {
      if (cropLayer) return;
      cropLayer = document.createElement('div');
      cropLayer.className = 'asset-review-crop-layer';
      cropBox = document.createElement('div');
      cropBox.className = 'asset-review-crop-box';
      cropBox.setAttribute('data-crop-part', 'move');
      ['top', 'right', 'bottom', 'left', 'nw', 'ne', 'se', 'sw'].forEach(function (part) {
        var handle = document.createElement('div');
        handle.className = 'asset-review-crop-handle handle-' + part;
        handle.setAttribute('data-crop-part', part);
        cropBox.appendChild(handle);
      });
      cropLayer.appendChild(cropBox);
      stage.appendChild(cropLayer);
    }

    function ensureEraserLayer() {
      if (!eraserCanvas) {
        eraserCanvas = document.createElement('canvas');
        eraserCanvas.className = 'asset-review-eraser-canvas';
        stage.appendChild(eraserCanvas);
        eraserCtx = eraserCanvas.getContext('2d');
      }
      if (!brushCursor) {
        brushCursor = document.createElement('div');
        brushCursor.className = 'asset-review-brush-cursor';
        stage.appendChild(brushCursor);
      }
    }

    function renderCropOverlay() {
      if (!cropLayer || !session.cropDraft) return;
      var imgRect = imageRectOnStage();
      var rect = session.cropDraft.rect;
      cropLayer.style.display = session.currentTool === 'crop' ? 'block' : 'none';
      cropBox.style.left = (imgRect.left + rect.x * session.zoom) + 'px';
      cropBox.style.top = (imgRect.top + rect.y * session.zoom) + 'px';
      cropBox.style.width = (rect.width * session.zoom) + 'px';
      cropBox.style.height = (rect.height * session.zoom) + 'px';
    }

    function renderEraserOverlay() {
      if (!eraserCanvas) return;
      var imgRect = imageRectOnStage();
      eraserCanvas.style.display = session.currentTool === 'eraser' ? 'block' : 'none';
      eraserCanvas.style.left = imgRect.left + 'px';
      eraserCanvas.style.top = imgRect.top + 'px';
      eraserCanvas.style.width = imgRect.width + 'px';
      eraserCanvas.style.height = imgRect.height + 'px';
      if (session.currentTool !== 'eraser') hideBrushCursor();
    }

    function hideBrushCursor() {
      if (brushCursor) brushCursor.style.display = 'none';
    }

    function showBrushCursor(point) {
      if (!brushCursor || session.currentTool !== 'eraser' || !pointInImage(point)) {
        hideBrushCursor();
        return;
      }
      var imgRect = imageRectOnStage();
      var brush = session.brush || { mode: 'hard', size: 40 };
      var size = brush.size * session.zoom;
      brushCursor.style.display = 'block';
      brushCursor.setAttribute('data-brush-mode', brush.mode);
      brushCursor.style.width = size + 'px';
      brushCursor.style.height = size + 'px';
      brushCursor.style.left = (imgRect.left + point.x * session.zoom - size / 2) + 'px';
      brushCursor.style.top = (imgRect.top + point.y * session.zoom - size / 2) + 'px';
    }

    function setCropControls(active) {
      if (cropApplyButton) cropApplyButton.hidden = !active;
      if (cropCancelButton) cropCancelButton.hidden = !active;
    }

    function cancelCropDraft() {
      session.cropDraft = null;
      if (cropLayer) cropLayer.style.display = 'none';
      setCropControls(false);
      cropDrag = null;
    }

    function cancelEraserStroke(commit) {
      if (!eraserStroke) return;
      if (commit && eraserStroke.drew && eraserCanvas) {
        var dataUrl = eraserCanvas.toDataURL('image/png');
        global.BNAssetEditSession.setCurrentImage(session, dataUrl, eraserCanvas.width, eraserCanvas.height);
        global.BNAssetEditSession.setDirty(session, true);
        image.onload = null;
        image.src = dataUrl;
        if (eraserStroke.moved) {
          recentEraserClickStrokes = [];
        } else {
          recentEraserClickStrokes.push({
            at: Date.now(),
            point: eraserStroke.startPoint,
          });
          if (recentEraserClickStrokes.length > 4) recentEraserClickStrokes.shift();
        }
      } else if (eraserStroke.undoPushed && !eraserStroke.drew) {
        global.BNAssetEditSession.discardLastUndo(session);
      }
      eraserStroke = null;
      lastBrushPoint = null;
      updateUndoState();
      applyTransform();
    }

    function syncEraserCanvasFromCurrentImage() {
      ensureEraserLayer();
      return loadImageElement(session.currentImage || session.sources.processed).then(function (sourceImage) {
        var width = sourceImage.naturalWidth || sourceImage.width || session.image.naturalWidth;
        var height = sourceImage.naturalHeight || sourceImage.height || session.image.naturalHeight;
        eraserCanvas.width = width;
        eraserCanvas.height = height;
        eraserCtx.clearRect(0, 0, width, height);
        eraserCtx.globalCompositeOperation = 'source-over';
        eraserCtx.drawImage(sourceImage, 0, 0, width, height);
        global.BNAssetEditSession.setImageSize(session, width, height);
        renderEraserOverlay();
      });
    }

    function enterCropMode() {
      if (session.viewMode === 'original') return;
      cancelEraserStroke(true);
      hideBrushCursor();
      if (eraserCanvas) eraserCanvas.style.display = 'none';
      var size = imageSize();
      session.cropDraft = { rect: { x: 0, y: 0, width: size.width, height: size.height } };
      global.BNAssetEditSession.setTool(session, 'crop');
      ensureCropLayer();
      setCropControls(true);
      applyTransform();
    }

    function exitCropMode() {
      cancelCropDraft();
      global.BNAssetEditSession.setTool(session, 'view');
      applyTransform();
    }

    function enterEraserMode() {
      if (session.viewMode === 'original') return;
      cancelCropDraft();
      cancelEraserStroke(true);
      global.BNAssetEditSession.setTool(session, 'eraser');
      syncEraserCanvasFromCurrentImage().then(function () {
        if (session.currentTool !== 'eraser') return;
        image.style.opacity = '0';
        applyTransform();
      }).catch(function (error) {
        console.error('[asset-review] eraser canvas sync failed', error);
      });
      applyTransform();
    }

    function exitEraserMode() {
      cancelEraserStroke(true);
      hideBrushCursor();
      if (eraserCanvas) eraserCanvas.style.display = 'none';
      image.style.opacity = '';
      global.BNAssetEditSession.setTool(session, 'view');
      applyTransform();
    }

    function applyTransform() {
      image.style.transform = 'translate(' + session.pan.x + 'px, ' + session.pan.y + 'px) scale(' + session.zoom + ')';
      image.style.cursor = spaceDown ? (dragState ? 'grabbing' : 'grab') : 'default';
      if (root) {
        root.setAttribute('data-view-mode', session.viewMode);
        root.setAttribute('data-tool', session.currentTool);
        root.setAttribute('data-dirty', session.dirty ? 'true' : 'false');
      }
      if (modeButton) modeButton.textContent = session.viewMode === 'original' ? '查看處理圖' : '查看原圖';
      toolButtons.forEach(function (button) {
        var tool = button.getAttribute('data-tool');
        button.classList.toggle('is-active', tool === session.currentTool);
        if (tool === 'crop' || tool === 'eraser') {
          var disabled = session.viewMode === 'original';
          button.disabled = disabled;
          button.classList.toggle('is-disabled', disabled);
        }
      });
      if (session.currentTool !== 'eraser') image.style.opacity = '';
      updateUndoState();
      updateSaveState();
      updateBrushControls();
      renderCropOverlay();
      renderEraserOverlay();
      setStatus(Math.round(session.zoom * 100) + '%');
      notifyDirtyState();
    }

    function saveCurrentImage() {
      if (saving) return Promise.resolve(false);
      if (!session.dirty) {
        updateSaveState();
        return Promise.resolve(true);
      }
      cancelEraserStroke(true);
      saving = true;
      if (typeof options.onSavingChange === 'function') options.onSavingChange(true);
      clearSaveFeedbackTimer();
      updateSaveState('Saving...');
      var wasDirty = !!session.dirty;
      var result = global.BNAssetEditSession.saveSession(session);
      return Promise.resolve()
        .then(function () {
          if (!result.ok) throw new Error('No processed image to save');
          if (typeof options.onSave === 'function') {
            return options.onSave({
              asset: session.reviewAsset,
              dataUrl: result.dataUrl,
              width: result.width,
              height: result.height,
            });
          }
          return null;
        })
        .then(function () {
          saving = false;
          if (typeof options.onSavingChange === 'function') options.onSavingChange(false);
          updateUndoState();
          notifyDirtyState();
          updateSaveState('✓ 已儲存');
          if (typeof options.onSaved === 'function') options.onSaved(result);
          saveFeedbackTimer = setTimeout(function () {
            saveFeedbackTimer = null;
            updateSaveState();
          }, 1000);
          return true;
        })
        .catch(function (error) {
          global.BNAssetEditSession.setDirty(session, wasDirty);
          saving = false;
          if (typeof options.onSavingChange === 'function') options.onSavingChange(false);
          updateSaveState();
          if (typeof options.onSaveError === 'function') options.onSaveError(error);
          throw error;
        });
    }

    function discardToSaved() {
      cancelEraserStroke(false);
      cancelCropDraft();
      var result = global.BNAssetEditSession.discardToSaved(session);
      image.onload = null;
      image.src = result.dataUrl || session.currentImage || '';
      updateUndoState();
      notifyDirtyState();
      applyTransform();
      return result;
    }

    function fitToScreen() {
      if (session.currentTool === 'crop') return;
      var rect = stage.getBoundingClientRect();
      var size = imageSize();
      var scale = Math.min((rect.width - 48) / size.width, (rect.height - 48) / size.height);
      session.zoom = clamp(scale, MIN_ZOOM, MAX_ZOOM);
      session.pan = { x: 0, y: 0 };
      global.BNAssetEditSession.setViewport(session, { zoom: session.zoom, pan: session.pan });
      applyTransform();
    }

    function fitToScreenAfterLoad() {
      var rect = stage.getBoundingClientRect();
      var size = imageSize();
      var scale = Math.min((rect.width - 48) / size.width, (rect.height - 48) / size.height);
      session.zoom = clamp(scale, MIN_ZOOM, MAX_ZOOM);
      session.pan = { x: 0, y: 0 };
      global.BNAssetEditSession.setViewport(session, { zoom: session.zoom, pan: session.pan });
      applyTransform();
    }

    function loadImage() {
      var src = getSource();
      image.removeAttribute('src');
      image.style.opacity = '';
      if (!src) {
        setStatus('No image');
        return;
      }
      setStatus('Loading');
      image.onload = function () {
        if (disposed) return;
        global.BNAssetEditSession.setImageSize(session, image.naturalWidth, image.naturalHeight);
        fitToScreenAfterLoad();
      };
      image.onerror = function () {
        if (disposed) return;
        setStatus('Load failed');
      };
      image.src = src;
    }

    function setTool(tool) {
      if (tool === 'crop') {
        if (session.currentTool === 'crop') exitCropMode();
        else enterCropMode();
        return;
      }
      if (tool === 'eraser') {
        if (session.currentTool === 'eraser') exitEraserMode();
        else enterEraserMode();
        return;
      }
      cancelEraserStroke(true);
      cancelCropDraft();
      hideBrushCursor();
      if (eraserCanvas) eraserCanvas.style.display = 'none';
      global.BNAssetEditSession.setTool(session, tool === 'pan' ? 'view' : tool);
      applyTransform();
    }

    function toggleOriginalView() {
      if (session.currentTool === 'crop') exitCropMode();
      if (session.currentTool === 'eraser') exitEraserMode();
      var nextMode = session.viewMode === 'original' ? 'processed' : 'original';
      global.BNAssetEditSession.setViewMode(session, nextMode);
      loadImage();
      applyTransform();
    }

    function zoomAt(clientX, clientY, nextZoom) {
      var rect = stage.getBoundingClientRect();
      var originX = clientX - rect.left - rect.width / 2;
      var originY = clientY - rect.top - rect.height / 2;
      var oldZoom = session.zoom || 1;
      var zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      if (zoom === oldZoom) return;
      var factor = zoom / oldZoom;
      session.pan = {
        x: originX - (originX - session.pan.x) * factor,
        y: originY - (originY - session.pan.y) * factor,
      };
      session.zoom = zoom;
      global.BNAssetEditSession.setViewport(session, { zoom: session.zoom, pan: session.pan });
      applyTransform();
    }

    function onWheel(event) {
      if (session.currentTool === 'crop') {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      var delta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(event.clientX, event.clientY, session.zoom * delta);
    }

    function canPan() {
      return !!spaceDown;
    }

    function applyMoveCrop(startRect, startPoint, point) {
      var size = imageSize();
      var dx = point.x - startPoint.x;
      var dy = point.y - startPoint.y;
      return normalizeRect({
        x: clamp(startRect.x + dx, 0, size.width - startRect.width),
        y: clamp(startRect.y + dy, 0, size.height - startRect.height),
        width: startRect.width,
        height: startRect.height,
      }, size.width, size.height);
    }

    function applyEdgeCrop(part, startRect, point) {
      var size = imageSize();
      var left = startRect.x;
      var top = startRect.y;
      var right = startRect.x + startRect.width;
      var bottom = startRect.y + startRect.height;
      if (part === 'left') left = clamp(point.x, 0, right - MIN_CROP);
      if (part === 'right') right = clamp(point.x, left + MIN_CROP, size.width);
      if (part === 'top') top = clamp(point.y, 0, bottom - MIN_CROP);
      if (part === 'bottom') bottom = clamp(point.y, top + MIN_CROP, size.height);
      return normalizeRect({ x: left, y: top, width: right - left, height: bottom - top }, size.width, size.height);
    }

    function applyCornerCrop(part, startRect, startPoint, point) {
      var size = imageSize();
      var isLeft = part.indexOf('w') >= 0;
      var isTop = part.indexOf('n') >= 0;
      var dx = point.x - startPoint.x;
      var dy = point.y - startPoint.y;
      var inwardX = isLeft ? dx : -dx;
      var inwardY = isTop ? dy : -dy;
      var delta = Math.abs(inwardX) > Math.abs(inwardY) ? inwardX : inwardY;
      var maxIn = Math.min((startRect.width - MIN_CROP) / 2, (startRect.height - MIN_CROP) / 2);
      var maxOut = Math.min(startRect.x, startRect.y, size.width - startRect.x - startRect.width, size.height - startRect.y - startRect.height);
      delta = clamp(delta, -maxOut, maxIn);
      return normalizeRect({
        x: startRect.x + delta,
        y: startRect.y + delta,
        width: startRect.width - delta * 2,
        height: startRect.height - delta * 2,
      }, size.width, size.height);
    }

    function eraseAt(point) {
      if (!eraserCtx || !pointInImage(point)) return false;
      var brush = session.brush || { mode: 'hard', size: 40 };
      var radius = brush.size / 2;
      eraserCtx.save();
      eraserCtx.globalCompositeOperation = 'destination-out';
      eraserCtx.beginPath();
      eraserCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      if (brush.mode === 'soft') {
        var gradient = eraserCtx.createRadialGradient(point.x, point.y, radius * 0.35, point.x, point.y, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        eraserCtx.fillStyle = gradient;
      } else {
        eraserCtx.fillStyle = 'rgba(0,0,0,1)';
      }
      eraserCtx.fill();
      eraserCtx.restore();
      return true;
    }

    function eraseLine(from, to) {
      var brush = session.brush || { mode: 'hard', size: 40 };
      var step = Math.max(1, brush.size / 4);
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var count = Math.max(1, Math.ceil(distance / step));
      var drew = false;
      for (var i = 0; i <= count; i++) {
        var point = { x: from.x + dx * (i / count), y: from.y + dy * (i / count) };
        drew = eraseAt(point) || drew;
      }
      return drew;
    }

    function startEraserStroke(event) {
      if (!eraserCanvas || session.viewMode === 'original') return;
      var point = stagePointToImage(event.clientX, event.clientY);
      showBrushCursor(point);
      if (!pointInImage(point)) return;
      event.preventDefault();
      global.BNAssetEditSession.pushUndo(session);
      eraserStroke = { pointerId: event.pointerId, undoPushed: true, drew: false, moved: false, startPoint: point };
      stage.setPointerCapture(event.pointerId);
      eraserStroke.drew = eraseAt(point) || eraserStroke.drew;
      lastBrushPoint = point;
    }

    function moveEraserStroke(event) {
      var point = stagePointToImage(event.clientX, event.clientY);
      showBrushCursor(point);
      if (!eraserStroke || eraserStroke.pointerId !== event.pointerId) return;
      if (eraserStroke.startPoint) {
        var dx = point.x - eraserStroke.startPoint.x;
        var dy = point.y - eraserStroke.startPoint.y;
        if (Math.sqrt(dx * dx + dy * dy) > 2) eraserStroke.moved = true;
      }
      if (lastBrushPoint) eraserStroke.drew = eraseLine(lastBrushPoint, point) || eraserStroke.drew;
      lastBrushPoint = point;
    }

    function finishEraserStroke(event) {
      if (!eraserStroke || eraserStroke.pointerId !== event.pointerId) return;
      cancelEraserStroke(true);
    }

    function restoreDoubleClickEraserStroke(event) {
      if (!recentEraserClickStrokes.length) return;
      var point = stagePointToImage(event.clientX, event.clientY);
      var brush = session.brush || { size: 40 };
      var maxDistance = Math.max(brush.size, 24);
      var restored = false;
      while (recentEraserClickStrokes.length) {
        var item = recentEraserClickStrokes[recentEraserClickStrokes.length - 1];
        if (Date.now() - item.at > 700) break;
        var savedPoint = item.point || point;
        var dx = point.x - savedPoint.x;
        var dy = point.y - savedPoint.y;
        if (Math.sqrt(dx * dx + dy * dy) > maxDistance) break;
        recentEraserClickStrokes.pop();
        var result = global.BNAssetEditSession.undo(session);
        if (!result.ok) break;
        restored = true;
      }
      if (!restored) return;
      image.onload = null;
      image.src = session.currentImage;
      updateUndoState();
      syncEraserCanvasFromCurrentImage().then(function () {
        if (session.currentTool === 'eraser') applyTransform();
      }).catch(function (error) {
        console.error('[asset-review] eraser double click restore failed', error);
      });
    }

    function onPointerDown(event) {
      if (spaceDown && event.button === 0 && canPan()) {
        event.preventDefault();
        dragState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          panX: session.pan.x,
          panY: session.pan.y,
        };
        stage.setPointerCapture(event.pointerId);
        applyTransform();
        return;
      }
      if (session.currentTool === 'crop') {
        var part = event.target?.getAttribute?.('data-crop-part');
        if (!part || !session.cropDraft) return;
        event.preventDefault();
        cropDrag = {
          pointerId: event.pointerId,
          part: part,
          startPoint: stagePointToImage(event.clientX, event.clientY),
          startRect: Object.assign({}, session.cropDraft.rect),
        };
        stage.setPointerCapture(event.pointerId);
        return;
      }
      if (session.currentTool === 'eraser' && !spaceDown) {
        var eraserPoint = stagePointToImage(event.clientX, event.clientY);
        var now = Date.now();
        var brush = session.brush || { size: 40 };
        var doubleClickDistance = Math.max(brush.size, 32);
        var isRecentSecondClick = false;
        if (lastEraserPointerDown && now - lastEraserPointerDown.at < 500) {
          var dx = eraserPoint.x - lastEraserPointerDown.point.x;
          var dy = eraserPoint.y - lastEraserPointerDown.point.y;
          isRecentSecondClick = Math.sqrt(dx * dx + dy * dy) <= doubleClickDistance;
        }
        if (event.detail > 1 || isRecentSecondClick) {
          event.preventDefault();
          lastEraserPointerDown = null;
          restoreDoubleClickEraserStroke(event);
          fitToScreen();
          return;
        }
        lastEraserPointerDown = { at: now, point: eraserPoint };
        startEraserStroke(event);
        return;
      }
      if (!canPan() || event.button !== 0) return;
      event.preventDefault();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: session.pan.x,
        panY: session.pan.y,
      };
      stage.setPointerCapture(event.pointerId);
      applyTransform();
    }

    function onPointerMove(event) {
      if (dragState && dragState.pointerId === event.pointerId) {
        session.pan = {
          x: dragState.panX + event.clientX - dragState.startX,
          y: dragState.panY + event.clientY - dragState.startY,
        };
        global.BNAssetEditSession.setViewport(session, { pan: session.pan });
        applyTransform();
        return;
      }
      if (session.currentTool === 'eraser') {
        moveEraserStroke(event);
        return;
      }
      if (cropDrag && cropDrag.pointerId === event.pointerId) {
        var point = stagePointToImage(event.clientX, event.clientY);
        var nextRect = cropDrag.part === 'move'
          ? applyMoveCrop(cropDrag.startRect, cropDrag.startPoint, point)
          : /^(top|right|bottom|left)$/.test(cropDrag.part)
            ? applyEdgeCrop(cropDrag.part, cropDrag.startRect, point)
            : applyCornerCrop(cropDrag.part, cropDrag.startRect, cropDrag.startPoint, point);
        session.cropDraft.rect = nextRect;
        renderCropOverlay();
        return;
      }
    }

    function endPointer(event) {
      if (dragState && dragState.pointerId === event.pointerId) {
        dragState = null;
        applyTransform();
        return;
      }
      if (session.currentTool === 'eraser') {
        finishEraserStroke(event);
        return;
      }
      if (cropDrag && cropDrag.pointerId === event.pointerId) {
        cropDrag = null;
        return;
      }
    }

    function applyCrop() {
      if (!session.cropDraft || session.viewMode === 'original') return Promise.resolve(false);
      var rect = normalizeRect(session.cropDraft.rect, session.image.naturalWidth, session.image.naturalHeight);
      return loadImageElement(session.currentImage || session.sources.processed).then(function (sourceImage) {
        global.BNAssetEditSession.pushUndo(session);
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(MIN_CROP, Math.round(rect.width));
        canvas.height = Math.max(MIN_CROP, Math.round(rect.height));
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(sourceImage, Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height), 0, 0, canvas.width, canvas.height);
        var dataUrl = canvas.toDataURL('image/png');
        global.BNAssetEditSession.setCurrentImage(session, dataUrl, canvas.width, canvas.height);
        global.BNAssetEditSession.setDirty(session, true);
        exitCropMode();
        loadImage();
        updateUndoState();
        return true;
      });
    }

    function undoEdit() {
      cancelEraserStroke(false);
      var result = global.BNAssetEditSession.undo(session);
      if (!result.ok) return;
      cancelCropDraft();
      hideBrushCursor();
      if (eraserCanvas) eraserCanvas.style.display = 'none';
      global.BNAssetEditSession.setTool(session, 'view');
      loadImage();
      updateUndoState();
      applyTransform();
    }

    function onKeydown(event) {
      if (disposed || !root?.isConnected || isTypingTarget(event.target)) return;
      var key = event.key;
      var command = event.metaKey || event.ctrlKey;
      if (key === ' ') {
        event.preventDefault();
        spaceDown = true;
        applyTransform();
        return;
      }
      if (command && key.toLowerCase() === 'z') {
        event.preventDefault();
        undoEdit();
        return;
      }
      if (command && key === '0') {
        event.preventDefault();
        fitToScreen();
        return;
      }
      if (key === 'Escape') {
        event.preventDefault();
        setTool('view');
      }
    }

    function onKeyup(event) {
      if (event.key !== ' ') return;
      spaceDown = false;
      applyTransform();
    }

    function onResize() {
      if (!disposed) {
        if (session.currentTool === 'crop') renderCropOverlay();
        else if (session.currentTool === 'eraser') renderEraserOverlay();
        else fitToScreen();
      }
    }

    function onDoubleClick(event) {
      if (session.currentTool === 'crop') {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      if (session.currentTool === 'eraser') restoreDoubleClickEraserStroke(event);
      fitToScreen();
    }

    function onPointerLeave() {
      hideBrushCursor();
    }

    toolButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setTool(button.getAttribute('data-tool') || 'pan');
      });
    });
    brushModeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        global.BNAssetEditSession.setBrush(session, { mode: button.getAttribute('data-brush-mode') || 'hard' });
        updateBrushControls();
      });
    });
    brushSizeInput?.addEventListener('input', function () {
      global.BNAssetEditSession.setBrush(session, { size: clamp(Number(brushSizeInput.value) || 40, MIN_BRUSH, MAX_BRUSH) });
      updateBrushControls();
    });
    cropApplyButton?.addEventListener('click', function () {
      applyCrop().catch(function (error) { console.error('[asset-review] crop apply failed', error); });
    });
    cropCancelButton?.addEventListener('click', exitCropMode);
    undoButton?.addEventListener('click', undoEdit);
    saveButton?.addEventListener('click', function () {
      saveCurrentImage().catch(function (error) { console.error('[asset-review] save failed', error); });
    });
    modeButton?.addEventListener('click', toggleOriginalView);
    fitButton?.addEventListener('click', fitToScreen);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('dblclick', onDoubleClick);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('keyup', onKeyup);
    window.addEventListener('resize', onResize);

    global.BNAssetEditSession.setTool(session, 'view');
    loadImage();
    setCropControls(false);
    updateUndoState();
    updateBrushControls();
    updateSaveState();
    applyTransform();

    return {
      fitToScreen: fitToScreen,
      save: saveCurrentImage,
      discardToSaved: discardToSaved,
      hasUnsavedChanges: function () { return !!session.dirty; },
      isSaving: function () { return !!saving; },
      getSession: function () { return session; },
      destroy: function () {
        disposed = true;
        clearSaveFeedbackTimer();
        cancelEraserStroke(false);
        image.onload = null;
        image.onerror = null;
        toolButtons.forEach(function (button) { button.replaceWith(button.cloneNode(true)); });
        brushModeButtons.forEach(function (button) { button.replaceWith(button.cloneNode(true)); });
        if (cropLayer) cropLayer.remove();
        if (eraserCanvas) eraserCanvas.remove();
        if (brushCursor) brushCursor.remove();
        cropLayer = null;
        cropBox = null;
        eraserCanvas = null;
        brushCursor = null;
        stage.removeEventListener('wheel', onWheel);
        stage.removeEventListener('dblclick', onDoubleClick);
        stage.removeEventListener('pointerdown', onPointerDown);
        stage.removeEventListener('pointermove', onPointerMove);
        stage.removeEventListener('pointerup', endPointer);
        stage.removeEventListener('pointercancel', endPointer);
        stage.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('keydown', onKeydown);
        document.removeEventListener('keyup', onKeyup);
        window.removeEventListener('resize', onResize);
      },
    };
  }

  global.BNAssetReviewEditor = { createEditor: createEditor };
})(window);
