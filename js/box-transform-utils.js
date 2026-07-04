(function (global) {
  'use strict';

  if (global.BNBoxTransformUtils && global.BNBoxTransformUtils.attachBoxTransform) return;

  function numberValue(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function styleNumber(style, key, fallback) {
    return numberValue(style && parseFloat(style[key]), fallback);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function zoneMetrics(zone, options) {
    var rect = zone.getBoundingClientRect();
    var style = options.configStyle || {};
    var width = zone.offsetWidth || styleNumber(style, 'width', 0);
    var height = zone.offsetHeight || styleNumber(style, 'height', 0);
    return {
      rect: rect,
      width: width,
      height: height,
      scale: width ? (rect.width / width || 1) : 1
    };
  }

  function ensureCornerHandles(box) {
    ['nw', 'ne', 'sw', 'se'].forEach(function (corner) {
      var handle = box.querySelector('[data-corner="' + corner + '"]');
      if (!handle) {
        handle = document.createElement('div');
        handle.dataset.corner = corner;
        handle.setAttribute('data-html2canvas-ignore', 'true');
        box.appendChild(handle);
      }
      handle.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;background:#4a90e2;border:2px solid #fff;z-index:6;pointer-events:auto;' +
        (corner === 'nw' ? 'left:-7px;top:-7px;cursor:nwse-resize;' : '') +
        (corner === 'ne' ? 'right:-7px;top:-7px;cursor:nesw-resize;' : '') +
        (corner === 'sw' ? 'left:-7px;bottom:-7px;cursor:nesw-resize;' : '') +
        (corner === 'se' ? 'right:-7px;bottom:-7px;cursor:nwse-resize;' : '');
    });
  }

  function ensureRotationHandle(box) {
    var handle = box.querySelector('[data-rot-handle]');
    if (!handle) {
      handle = document.createElement('div');
      handle.dataset.rotHandle = '1';
      handle.setAttribute('data-html2canvas-ignore', 'true');
      handle.textContent = 'R';
      box.appendChild(handle);
    }
    handle.style.cssText = 'position:absolute;left:50%;top:6px;transform:translateX(-50%);width:22px;height:22px;border-radius:50%;background:#4a90e2;border:2px solid #fff;z-index:7;cursor:grab;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;line-height:1;box-shadow:0 2px 6px rgba(0,0,0,.35);user-select:none;touch-action:none;pointer-events:auto;';
    return handle;
  }

  function setBoxRect(box, left, top, width, height, metrics, dragBounds) {
    dragBounds = dragBounds || {};
    var visibleX = numberValue(dragBounds.minVisibleRatioX, 1);
    var visibleY = numberValue(dragBounds.minVisibleRatioY, 1);
    var minLeft = -(width * (1 - visibleX));
    var maxLeft = metrics.width - (width * visibleX);
    var minTop = -(height * (1 - visibleY));
    var maxTop = metrics.height - (height * visibleY);
    box.style.left = clamp(left, minLeft, Math.max(minLeft, maxLeft)) + 'px';
    box.style.top = clamp(top, minTop, Math.max(minTop, maxTop)) + 'px';
    box.style.width = width + 'px';
    box.style.height = height + 'px';
  }

  function collectBoxTransform(box) {
    return {
      left: box.style.left || '',
      top: box.style.top || '',
      width: box.style.width || '',
      height: box.style.height || '',
      rotation: Number(box.dataset.rotation) || 0,
      zIndex: box.style.zIndex || '',
      userAdjusted: box.dataset.userAdjusted === '1'
    };
  }

  function applyBoxTransform(box, state) {
    if (!box || !state) return;
    if (state.left) box.style.left = state.left;
    if (state.top) box.style.top = state.top;
    if (state.width) box.style.width = state.width;
    if (state.height) box.style.height = state.height;
    if (state.zIndex) box.style.zIndex = state.zIndex;
    box.dataset.rotation = String(Number(state.rotation) || 0);
    box.style.transform = Number(state.rotation) ? 'rotate(' + Number(state.rotation) + 'deg)' : '';
    if (state.userAdjusted) box.dataset.userAdjusted = '1';
    box.dataset.offsetX = String((parseFloat(box.style.left) || 0) - (Number(box.dataset.baseLeft) || 0));
    box.dataset.offsetY = String((parseFloat(box.style.top) || 0) - (Number(box.dataset.baseTop) || 0));
  }

  function resetTransform(box, defaults) {
    if (!box) return;
    defaults = defaults || {};
    delete box.dataset.userAdjusted;
    box.dataset.rotation = '0';
    box.style.transform = '';
    if (defaults.left !== undefined) box.style.left = numberValue(defaults.left, 0) + 'px';
    if (defaults.top !== undefined) box.style.top = numberValue(defaults.top, 0) + 'px';
    if (defaults.width !== undefined) box.style.width = Math.max(1, numberValue(defaults.width, box.offsetWidth || 1)) + 'px';
    if (defaults.height !== undefined) box.style.height = Math.max(1, numberValue(defaults.height, box.offsetHeight || 1)) + 'px';
    if (defaults.zIndex !== undefined) box.style.zIndex = defaults.zIndex;
    var baseLeft = Number(box.dataset.baseLeft) || 0;
    var baseTop = Number(box.dataset.baseTop) || 0;
    box.dataset.offsetX = String((parseFloat(box.style.left) || 0) - baseLeft);
    box.dataset.offsetY = String((parseFloat(box.style.top) || 0) - baseTop);
  }

  function attachBoxTransform(box, zone, options) {
    options = options || {};
    if (!box || !zone || box.dataset.bnTransformBound === '1') return;
    box.dataset.bnTransformBound = '1';
    box.dataset.bnTransformRole = options.role || box.dataset.bnTransformRole || '';
    box.style.cursor = 'move';
    box.style.pointerEvents = 'auto';
    box.style.touchAction = 'none';
    box.style.transformOrigin = '50% 50%';
    box.style.boxSizing = 'border-box';
    if (!box.style.outline) box.style.outline = '2px solid transparent';
    ensureCornerHandles(box);
    var rotHandle = ensureRotationHandle(box);

    var dragBounds = options.dragBounds || {};
    var minWidth = numberValue(dragBounds.minWidth, 1);
    var minHeight = numberValue(dragBounds.minHeight, 1);
    var defaultMaxRatio = options.role === 'singleProduct' ? 2 : 1;
    var maxWidthRatio = numberValue(dragBounds.maxWidthRatio, defaultMaxRatio);
    var maxHeightRatio = numberValue(dragBounds.maxHeightRatio, defaultMaxRatio);
    var drag = null;
    var rotDrag = null;

    function debug(action, detail) {
      if (!options.debug) return;
      try {
        console.log('[BNBoxTransform][' + (options.role || 'box') + '] ' + action, detail || {
          left: box.style.left,
          top: box.style.top,
          width: box.style.width,
          height: box.style.height,
          rotation: box.dataset.rotation || '0',
          userAdjusted: box.dataset.userAdjusted || ''
        });
      } catch (_) {}
    }

    function changed() {
      var baseLeft = Number(box.dataset.baseLeft) || 0;
      var baseTop = Number(box.dataset.baseTop) || 0;
      box.dataset.offsetX = String((parseFloat(box.style.left) || 0) - baseLeft);
      box.dataset.offsetY = String((parseFloat(box.style.top) || 0) - baseTop);
      if (typeof options.onChange === 'function') options.onChange(box);
    }

    box.addEventListener('pointerdown', function (event) {
      if ((event.target.dataset && event.target.dataset.corner) || (event.target.dataset && event.target.dataset.rotHandle)) return;
      event.preventDefault();
      event.stopPropagation();
      box.dataset.userAdjusted = '1';
      var metrics = zoneMetrics(zone, options);
      drag = {
        type: 'move',
        pointerId: event.pointerId,
        sx: event.clientX,
        sy: event.clientY,
        left: parseFloat(box.style.left) || 0,
        top: parseFloat(box.style.top) || 0,
        width: parseFloat(box.style.width) || box.offsetWidth,
        height: parseFloat(box.style.height) || box.offsetHeight,
        metrics: metrics
      };
      try { box.setPointerCapture(event.pointerId); } catch (_) {}
      box.style.outline = '2px solid #4a90e2';
      debug('pointerdown:move');
    });

    box.querySelectorAll('[data-corner]').forEach(function (handle) {
      handle.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        event.stopPropagation();
        box.dataset.userAdjusted = '1';
        drag = {
          type: 'resize',
          pointerId: event.pointerId,
          corner: handle.dataset.corner,
          sx: event.clientX,
          sy: event.clientY,
          left: parseFloat(box.style.left) || 0,
          top: parseFloat(box.style.top) || 0,
          width: parseFloat(box.style.width) || box.offsetWidth,
          height: parseFloat(box.style.height) || box.offsetHeight,
          ratio: parseFloat(box.dataset.ratio) || Math.max(0.1, (box.offsetWidth || 1) / (box.offsetHeight || 1)),
          metrics: zoneMetrics(zone, options)
        };
        try { handle.setPointerCapture(event.pointerId); } catch (_) {}
        box.style.outline = '2px solid #4a90e2';
        debug('pointerdown:resize', { corner: handle.dataset.corner });
      });
    });

    function moveResize(event) {
      if (!drag) return;
      if (drag.pointerId !== undefined && event.pointerId !== undefined && event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      var metrics = drag.metrics;
      if (drag.type === 'move') {
        var left = drag.left + (event.clientX - drag.sx) / metrics.scale;
        var top = drag.top + (event.clientY - drag.sy) / metrics.scale;
        setBoxRect(box, left, top, drag.width, drag.height, metrics, dragBounds);
      } else if (drag.type === 'resize') {
        var dx = (event.clientX - drag.sx) / metrics.scale;
        var dy = (event.clientY - drag.sy) / metrics.scale;
        var corner = drag.corner;
        var ratio = drag.ratio;
        var signX = corner.indexOf('w') !== -1 ? -1 : 1;
        var signY = corner.indexOf('n') !== -1 ? -1 : 1;
        var delta = Math.abs(dx) > Math.abs(dy) ? dx * signX : dy * signY * ratio;
        var width = Math.max(minWidth, drag.width + delta);
        var height = width / ratio;
        if (height < minHeight) {
          height = minHeight;
          width = height * ratio;
        }
        if (width > metrics.width * maxWidthRatio) {
          width = metrics.width * maxWidthRatio;
          height = width / ratio;
        }
        if (height > metrics.height * maxHeightRatio) {
          height = metrics.height * maxHeightRatio;
          width = height * ratio;
        }
        var resizeLeft = drag.left;
        var resizeTop = drag.top;
        if (corner.indexOf('w') !== -1) resizeLeft = drag.left + (drag.width - width);
        if (corner.indexOf('n') !== -1) resizeTop = drag.top + (drag.height - height);
        setBoxRect(box, resizeLeft, resizeTop, width, height, metrics, dragBounds);
      }
      changed();
      debug('pointermove:' + drag.type);
    }

    function finishMoveResize(event) {
      if (!drag) return;
      if (drag.pointerId !== undefined && event.pointerId !== undefined && event.pointerId !== drag.pointerId) return;
      debug('pointerup:' + drag.type);
      drag = null;
      box.style.outline = '2px solid transparent';
      changed();
    }

    function cancelMoveResize() {
      drag = null;
      box.style.outline = '2px solid transparent';
    }

    box.addEventListener('pointermove', moveResize);
    box.addEventListener('pointerup', finishMoveResize);
    box.addEventListener('pointercancel', cancelMoveResize);
    document.addEventListener('pointermove', moveResize, { passive: false });
    document.addEventListener('pointerup', finishMoveResize);
    document.addEventListener('pointercancel', cancelMoveResize);

    box.addEventListener('wheel', function (event) {
      event.preventDefault();
      box.dataset.userAdjusted = '1';
      var metrics = zoneMetrics(zone, options);
      var scale = event.deltaY < 0 ? 1.08 : 0.93;
      var ratio = parseFloat(box.dataset.ratio) || Math.max(0.1, (box.offsetWidth || 1) / (box.offsetHeight || 1));
      var currentWidth = parseFloat(box.style.width) || box.offsetWidth;
      var currentHeight = parseFloat(box.style.height) || box.offsetHeight;
      var width = Math.max(minWidth, Math.min(currentWidth * scale, metrics.width * maxWidthRatio));
      var height = width / ratio;
      if (height < minHeight) {
        height = minHeight;
        width = height * ratio;
      }
      if (height > metrics.height * maxHeightRatio) {
        height = metrics.height * maxHeightRatio;
        width = height * ratio;
      }
      var left = (parseFloat(box.style.left) || 0) + currentWidth / 2 - width / 2;
      var top = (parseFloat(box.style.top) || 0) + currentHeight / 2 - height / 2;
      setBoxRect(box, left, top, width, height, metrics, dragBounds);
      changed();
    }, { passive: false });

    rotHandle.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      event.stopPropagation();
      box.dataset.userAdjusted = '1';
      var rect = box.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      rotDrag = {
        pointerId: event.pointerId,
        cx: cx,
        cy: cy,
        startAngle: Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI,
        startRotation: parseFloat(box.dataset.rotation || '0')
      };
      try { rotHandle.setPointerCapture(event.pointerId); } catch (_) {}
      rotHandle.style.cursor = 'grabbing';
      box.style.outline = '2px solid #4a90e2';
      debug('pointerdown:rotate');
    });
    function rotateMove(event) {
      if (!rotDrag) return;
      if (rotDrag.pointerId !== undefined && event.pointerId !== undefined && event.pointerId !== rotDrag.pointerId) return;
      event.preventDefault();
      var angle = Math.atan2(event.clientY - rotDrag.cy, event.clientX - rotDrag.cx) * 180 / Math.PI;
      var rotation = rotDrag.startRotation + (angle - rotDrag.startAngle);
      box.dataset.rotation = String(Math.round(rotation * 10) / 10);
      box.style.transform = 'rotate(' + rotation + 'deg)';
      changed();
      debug('pointermove:rotate');
    }
    function rotateEnd(event) {
      if (!rotDrag) return;
      if (rotDrag.pointerId !== undefined && event.pointerId !== undefined && event.pointerId !== rotDrag.pointerId) return;
      debug('pointerup:rotate');
      rotDrag = null;
      rotHandle.style.cursor = 'grab';
      box.style.outline = '2px solid transparent';
      try { rotHandle.releasePointerCapture(event.pointerId); } catch (_) {}
      changed();
    }
    function rotateCancel() {
      rotDrag = null;
      rotHandle.style.cursor = 'grab';
      box.style.outline = '2px solid transparent';
    }
    rotHandle.addEventListener('pointermove', rotateMove);
    rotHandle.addEventListener('pointerup', rotateEnd);
    rotHandle.addEventListener('pointercancel', rotateCancel);
    document.addEventListener('pointermove', rotateMove, { passive: false });
    document.addEventListener('pointerup', rotateEnd);
    document.addEventListener('pointercancel', rotateCancel);
  }

  global.BNBoxTransformUtils = {
    attachBoxTransform: attachBoxTransform,
    collectBoxTransform: collectBoxTransform,
    applyBoxTransform: applyBoxTransform,
    resetTransform: resetTransform
  };
})(window);
