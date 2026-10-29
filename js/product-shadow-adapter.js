(function (global) {
  'use strict';
  if (global.BNProductShadowAdapter) return;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  var DEFAULTS = clone(global.ProductShadow.DEFAULTS || {});
  var DEFAULT_SETTINGS = {
    colorMode: 'auto',
    manualColor: '#53000b',
    light: 'right',
    angle: 35,
    offsetXRatio: 0,
    offsetYRatio: 0,
    scaleX: 1,
    scaleY: 1
  };
  Object.keys(DEFAULTS).forEach(function (key) { DEFAULT_SETTINGS[key] = DEFAULTS[key]; });
  var pending = [];

  function normalize(input) {
    var out = clone(DEFAULT_SETTINGS);
    Object.keys(input || {}).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(out, key) && input[key] !== undefined) out[key] = input[key];
    });
    return out;
  }

  function rootCanvas(box) {
    return box && (box.closest('#canvas') || document.getElementById('canvas'));
  }

  function boxRect(box, root) {
    var x = 0, y = 0, node = box;
    while (node && node !== root) {
      x += Number(node.offsetLeft) || 0;
      y += Number(node.offsetTop) || 0;
      node = node.offsetParent;
    }
    return {
      x: x,
      y: y,
      width: box.offsetWidth || parseFloat(box.style.width) || 1,
      height: box.offsetHeight || parseFloat(box.style.height) || 1,
      rotation: Number(box.dataset.rotation) || 0
    };
  }

  function layerFor(box, root) {
    var layer = box._bnShadowLayer;
    if (layer && layer.parentNode === root) return layer;
    layer = document.createElement('canvas');
    layer.className = 'bn-product-shadow-layer';
    layer.width = Math.max(1, root.clientWidth || parseFloat(root.style.width) || 1);
    layer.height = Math.max(1, root.clientHeight || parseFloat(root.style.height) || 1);
    layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    root.appendChild(layer);
    box._bnShadowLayer = layer;
    return layer;
  }

  function setLayerOrder(box, layer) {
    var z = Number(box.style.zIndex) || 15;
    layer.style.zIndex = String(Math.max(0, z - 1));
  }

  function backgroundColor(root) {
    var color = global.getComputedStyle(root).backgroundColor;
    return color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)' ? color : undefined;
  }

  var backgroundCanvasCache = null;
  function backgroundCanvas(root) {
    var bg = document.getElementById('底圖');
    if (!bg || !bg.src || !bg.complete || !bg.naturalWidth) return null;
    var width = Math.max(1, root.clientWidth || parseFloat(root.style.width) || 1);
    var height = Math.max(1, root.clientHeight || parseFloat(root.style.height) || 1);
    var key = [bg.currentSrc || bg.src, bg.naturalWidth, bg.naturalHeight, width, height].join('|');
    if (backgroundCanvasCache && backgroundCanvasCache.key === key) return backgroundCanvasCache.canvas;
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    var baseColor = backgroundColor(root);
    if (baseColor) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, width, height);
    }
    var fit = global.getComputedStyle(bg).objectFit || 'fill';
    if (fit === 'cover' || fit === 'contain') {
      var scale = fit === 'cover'
        ? Math.max(width / bg.naturalWidth, height / bg.naturalHeight)
        : Math.min(width / bg.naturalWidth, height / bg.naturalHeight);
      var drawWidth = bg.naturalWidth * scale;
      var drawHeight = bg.naturalHeight * scale;
      var position = (global.getComputedStyle(bg).objectPosition || '50% 50%').split(/\s+/);
      var px = parseFloat(position[0]);
      var py = parseFloat(position[1]);
      if (!isFinite(px)) px = 50;
      if (!isFinite(py)) py = 50;
      ctx.drawImage(bg, (width - drawWidth) * px / 100, (height - drawHeight) * py / 100, drawWidth, drawHeight);
    } else {
      ctx.drawImage(bg, 0, 0, width, height);
    }
    backgroundCanvasCache = { key: key, canvas: canvas };
    return canvas;
  }

  function waitForImage(image) {
    if (!image || !image.src || (image.complete && image.naturalWidth)) return Promise.resolve();
    return new Promise(function (resolve) {
      var done = function () { image.removeEventListener('load', done); image.removeEventListener('error', done); resolve(); };
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', done, { once: true });
    });
  }

  function imageFor(box) {
    return box.querySelector('img');
  }

  function render(box, settings, enabled) {
    var root = rootCanvas(box);
    var img = imageFor(box);
    if (!root || !img) return Promise.resolve(false);
    var layer = layerFor(box, root);
    setLayerOrder(box, layer);
    var generation = (box._bnShadowGeneration || 0) + 1;
    box._bnShadowGeneration = generation;
    var ctx = layer.getContext('2d');
    layer.width = Math.max(1, root.clientWidth || parseFloat(root.style.width) || 1);
    layer.height = Math.max(1, root.clientHeight || parseFloat(root.style.height) || 1);
    ctx.clearRect(0, 0, layer.width, layer.height);
    if (!enabled || !global.ProductShadow || settings.light === 'off') return Promise.resolve(true);

    function draw() {
      if (generation !== box._bnShadowGeneration) return false;
      var rect = boxRect(box, root);
      var s = normalize(settings);
      var backgroundImage = backgroundCanvas(root);
      var background = backgroundImage || backgroundColor(root);
      var backgroundBox = global.ProductShadow.contentBox(img, rect.x, rect.y, rect.width, rect.height);
      var samplePad = backgroundBox.width * 0.15;
      global.ProductShadow.renderShadow(ctx, {
        image: img,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotate: rect.rotation,
        pivotX: rect.x + rect.width / 2,
        pivotY: rect.y + rect.height / 2,
        light: s.light === 'custom' ? Number(s.angle) : s.light,
        offsetX: Number(s.offsetXRatio || 0) * rect.width,
        offsetY: Number(s.offsetYRatio || 0) * rect.height,
        scaleX: Number(s.scaleX) || 1,
        scaleY: Number(s.scaleY) || 1,
        color: s.colorMode === 'manual' ? s.manualColor : 'auto',
        darken: Number(s.darken),
        background: background || backgroundImage,
        backgroundRect: backgroundImage ? {
          x: backgroundBox.x - samplePad,
          y: backgroundBox.groundY - backgroundBox.height * 0.12,
          width: backgroundBox.width + samplePad * 2,
          height: backgroundBox.height * 0.24
        } : undefined,
        quality: s.quality || 'normal'
      });
      return true;
    }

    var bg = document.getElementById('底圖');
    var promise = Promise.all([waitForImage(img), waitForImage(bg)]).then(function () {
      return draw();
    });
    pending.push(promise);
    promise.then(function () { pending = pending.filter(function (item) { return item !== promise; }); });
    return promise;
  }

  function clear(box) {
    if (box && box._bnShadowLayer) {
      var ctx = box._bnShadowLayer.getContext('2d');
      ctx.clearRect(0, 0, box._bnShadowLayer.width, box._bnShadowLayer.height);
    }
  }

  global.BNProductShadowAdapter = {
    DEFAULTS: DEFAULTS,
    DEFAULT_SETTINGS: clone(DEFAULT_SETTINGS),
    normalize: normalize,
    render: render,
    clear: clear,
    update: function (box, settings, enabled) {
      box._bnShadowSettings = normalize(settings || box._bnShadowSettings || {});
      return render(box, box._bnShadowSettings, enabled !== false);
    },
    ready: function () { return Promise.all(pending.slice()); },
    settings: function (box) { return normalize(box && box._bnShadowSettings || {}); }
  };
})(window);
