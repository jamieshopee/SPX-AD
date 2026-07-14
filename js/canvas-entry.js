(function (global) {
  'use strict';

  function numberValue(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function styleNumber(style, key, fallback) {
    return numberValue(style && parseFloat(style[key]), fallback);
  }

  function applyStyle(element, style) {
    Object.keys(style || {}).forEach(function (key) {
      var value = style[key];
      if (key === 'fontFamily' && value && !/^["']/.test(value)) {
        value = '"' + value + '"';
      }
      element.style[key] = value;
    });
  }

  function addFonts(fonts) {
    if (!fonts || !fonts.length) return;
    var style = document.createElement('style');
    style.textContent = fonts.map(function (font) {
      return '@font-face{font-family:"' + font.family + '";font-weight:' + font.weight +
        ';src:url("' + font.src + '") format("truetype");}';
    }).join('\n');
    document.head.appendChild(style);
  }

  function waitForFonts(template) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var fields = template.textFields || {};
    var requests = [];
    Object.keys(fields).forEach(function (key) {
      var style = fields[key].style || {};
      var family = style.fontFamily;
      if (!family) return;
      var weight = style.fontWeight || '400';
      var size = style.fontSize || '16px';
      requests.push(document.fonts.load(weight + ' ' + size + ' "' + family + '"', '中文ABC123'));
    });
    return Promise.all(requests).then(function () {
      return document.fonts.ready;
    }).catch(function (error) {
      console.warn('[Canvas] 字型載入失敗，使用瀏覽器可用字型繼續。', error);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('載入失敗：' + src)); };
      document.head.appendChild(script);
    });
  }

  function buildBase(template) {
    var canvas = document.getElementById('canvas');
    canvas.style.width = template.width + 'px';
    canvas.style.height = template.height + 'px';
    canvas.style.background = template.canvas.backgroundColor || 'transparent';
    document.body.dataset.fw = template.width;
    document.body.dataset.fh = template.height;
    document.title = template.templateName + ' — 共用畫布';

    var background = document.createElement('img');
    background.id = '底圖';
    background.alt = '';
    canvas.appendChild(background);

    var info = document.createElement('img');
    info.id = '下方資訊';
    info.alt = '';
    applyStyle(info, template.canvas.infoStyle || {});
    canvas.appendChild(info);

    var qrcode = document.createElement('img');
    qrcode.id = 'bn-qrcode';
    qrcode.alt = '';
    applyStyle(qrcode, (template.qrZone || {}).style || {});
    qrcode.style.display = 'none';
    canvas.appendChild(qrcode);

    ['person', 'singleProduct'].forEach(function (key) {
      var config = template.productZones[key];
      var zone = document.createElement('div');
      zone.id = key === 'person' ? 'bn-zone-person' : 'bn-zone-singleprod';
      zone.className = config.className;
      applyStyle(zone, config.style);
      if (key === 'person') zone.style.pointerEvents = 'none';
      canvas.appendChild(zone);
    });
  }

  function applyAssets(template) {
    var assets = global.__BN_ASSETS__ || {};
    var background = document.getElementById('底圖');
    var info = document.getElementById('下方資訊');
    var visual = template.visual || template.style || {};
    var backgroundSrc = assets.bg || assets.background || visual.background || '';
    var infoSrc = assets.info || visual.infoGraphic || '';
    if (backgroundSrc) {
      background.src = backgroundSrc;
      background.style.display = 'block';
    } else {
      console.warn('[Canvas] 找不到底圖。');
    }
    if (infoSrc) {
      info.src = infoSrc;
      info.style.display = 'block';
    } else {
      console.warn('[Canvas] 找不到資訊圖。');
    }
  }

  function applyVisualStyle(style) {
    if (!style) return;
    var background = document.getElementById('底圖');
    var info = document.getElementById('下方資訊');
    if (background && style.background) background.src = style.background;
    if (info && style.infoGraphic) info.src = style.infoGraphic;
    var mappings = [
      ['.主標可08個字以內', style.headlineColor],
      ['.副標07個字以內', style.subHeadlineColor],
      ['.不放案型日期或警語可在14個字', style.smallTextColor]
    ];
    mappings.forEach(function (item) {
      if (!item[1]) return;
      document.querySelectorAll(item[0]).forEach(function (node) {
        node.style.color = item[1];
      });
    });
    global.__BN_TEMPLATE__ = global.ADTemplateLoader && global.__BN_TEMPLATE__
      ? global.ADTemplateLoader.applyStyle(global.__BN_TEMPLATE__, style)
      : global.__BN_TEMPLATE__;
  }

  function setSingleProductPosition(box, zone, offsetX, offsetY, notifyParent) {
    var singleConfig = ((global.__BN_TEMPLATE__ || {}).productZones || {}).singleProduct || {};
    var singleDefaults = singleConfig.defaultLayout || {};
    var dragBounds = singleDefaults.dragBounds || {};
    var zoneWidth = zone.clientWidth || styleNumber(singleConfig.style, 'width', numberValue(singleDefaults.maxWidth, 0));
    var zoneHeight = zone.clientHeight || styleNumber(singleConfig.style, 'height', numberValue(singleDefaults.maxHeight, 0));
    var boxWidth = box.offsetWidth || parseFloat(box.style.width) || 0;
    var boxHeight = box.offsetHeight || parseFloat(box.style.height) || 0;
    var baseLeft = Number(box.dataset.baseLeft) || 0;
    var baseTop = Number(box.dataset.baseTop) || 0;
    var visibleX = numberValue(dragBounds.minVisibleRatioX, 0.5);
    var visibleY = numberValue(dragBounds.minVisibleRatioY, 0.5);
    var minX = -(boxWidth * (1 - visibleX)) - baseLeft;
    var maxX = zoneWidth - (boxWidth * visibleX) - baseLeft;
    var minY = -(boxHeight * (1 - visibleY)) - baseTop;
    var maxY = zoneHeight - (boxHeight * visibleY) - baseTop;
    var x = Math.max(minX, Math.min(maxX, Number(offsetX) || 0));
    var y = Math.max(minY, Math.min(maxY, Number(offsetY) || 0));
    box.dataset.offsetX = String(x);
    box.dataset.offsetY = String(y);
    box.style.left = (baseLeft + x) + 'px';
    box.style.top = (baseTop + y) + 'px';
    if (notifyParent) {
      try {
        global.parent.postMessage({
          type: 'bn-single-product-position',
          offsetX: x,
          offsetY: y
        }, '*');
      } catch (error) {
        console.warn('[Canvas] 無法同步單品位置。', error);
      }
    }
    if (global._bnNotifyLayoutState) global._bnNotifyLayoutState();
    syncSingleProductGeometry(box, zone);
  }

  function syncSingleProductGeometry(box, zone) {
    if (!box || !zone) return;
    var baseLeft = Number(box.dataset.baseLeft) || 0;
    var baseTop = Number(box.dataset.baseTop) || 0;
    var left = parseFloat(box.style.left) || 0;
    var top = parseFloat(box.style.top) || 0;
    var width = box.offsetWidth || parseFloat(box.style.width) || 0;
    var height = box.offsetHeight || parseFloat(box.style.height) || 0;
    box.dataset.offsetX = String(left - baseLeft);
    box.dataset.offsetY = String(top - baseTop);
    try {
      global.parent.postMessage({
        type: 'bn-single-product-geometry',
        visible: true,
        left: zone.offsetLeft + left,
        top: zone.offsetTop + top,
        width: width,
        height: height,
        offsetX: Number(box.dataset.offsetX) || 0,
        offsetY: Number(box.dataset.offsetY) || 0,
        rotation: Number(box.dataset.rotation) || 0
      }, '*');
    } catch (error) {
      console.warn('[Canvas] 無法同步單品拖曳範圍。', error);
    }
  }

  function bindPersonProduct() {
    global.addEventListener('message', function (event) {
      if (!event.data) return;
      var data = event.data;
      if (data.type === 'bn-style-apply') {
        applyVisualStyle(data.style);
      }
      if (data.type === 'bn-person-add') {
        var personZone = document.getElementById('bn-zone-person');
        var personConfig = ((global.__BN_TEMPLATE__ || {}).productZones || {}).person || {};
        var personDefaults = personConfig.defaultLayout || {};
        if (personDefaults.sizingMode === 'zone' || personDefaults.resetZoneOnUpload) {
          applyStyle(personZone, personConfig.style || {});
        }
        personZone.innerHTML = '';
        var person = document.createElement('img');
        person.className = 'bn-pp-img';
        person.src = data.src;
        person.style.width = numberValue(data.displayWidth, numberValue(personDefaults.fitWidth, styleNumber(personConfig.style, 'width', 1))) + 'px';
        person.style.height = data.displayHeight
          ? numberValue(data.displayHeight, numberValue(personDefaults.fitHeight, styleNumber(personConfig.style, 'height', 1))) + 'px'
          : 'auto';
        person.style.objectFit = data.objectFit || personDefaults.objectFit || 'contain';
        person.style.display = 'block';
        person.style.pointerEvents = 'none';
        person.style.marginLeft = (data.marginLeft || 0) + 'px';
        person.style.marginTop = (data.marginTop || 0) + 'px';
        personZone.appendChild(person);
        personZone.style.display = 'block';
      }
      if (data.type === 'bn-person-remove') {
        var removePerson = document.getElementById('bn-zone-person');
        removePerson.innerHTML = '';
        removePerson.style.display = 'none';
      }
      if (data.type === 'bn-single-product-add') {
        var productZone = document.getElementById('bn-zone-singleprod');
        productZone.innerHTML = '';
        var singleConfig = ((global.__BN_TEMPLATE__ || {}).productZones || {}).singleProduct || {};
        var singleDefaults = singleConfig.defaultLayout || {};
        var zoneWidth = styleNumber(singleConfig.style, 'width', productZone.clientWidth || numberValue(singleDefaults.maxWidth, 0));
        var zoneHeight = styleNumber(singleConfig.style, 'height', productZone.clientHeight || numberValue(singleDefaults.maxHeight, 0));
        if (!zoneWidth) zoneWidth = numberValue(singleDefaults.maxWidth, 0);
        if (!zoneHeight) zoneHeight = numberValue(singleDefaults.maxHeight, 0);
        var displayWidth = numberValue(data.displayW, zoneWidth);
        var displayHeight = numberValue(data.displayH, zoneHeight);
        var baseLeft = Math.max(0, (zoneWidth - displayWidth) / 2);
        var baseTop = Number(data.zoneHeight) > displayHeight
          ? Math.max(0, (zoneHeight - displayHeight) / 2)
          : 0;
        productZone.style.position = productZone.style.position || 'absolute';
        productZone.style.pointerEvents = 'auto';
        productZone.style.overflow = 'visible';
        productZone.style.height = zoneHeight + 'px';
        productZone.style.display = 'block';
        var box = document.createElement('div');
        box.className = 'bn-single-product-box';
        box.style.width = displayWidth + 'px';
        box.style.height = displayHeight + 'px';
        box.style.position = 'absolute';
        box.style.left = baseLeft + 'px';
        box.style.top = baseTop + 'px';
        box.style.boxSizing = 'border-box';
        box.style.outline = '3px solid #4a90e2';
        box.style.cursor = 'move';
        box.style.touchAction = 'none';
        box.style.pointerEvents = 'auto';
        box.style.transformOrigin = '50% 50%';
        box.style.zIndex = '20';
        box.dataset.bnTransformRole = 'singleProduct';
        box.dataset.ratio = String(data.ratio || 1);
        box.dataset.baseLeft = String(baseLeft);
        box.dataset.baseTop = String(baseTop);
        box.dataset.baseWidth = String(displayWidth);
        box.dataset.baseHeight = String(displayHeight);
        var product = document.createElement('img');
        product.className = 'bn-pp-img';
        product.src = data.src;
        /* html2canvas 不支援 object-fit，改用明確像素尺寸 + flexbox 置中 */
        var _spFit = data.objectFit || singleDefaults.objectFit || 'contain';
        var _spRatio = Number(data.ratio) || 0;
        if (_spFit === 'contain' && _spRatio > 0) {
          box.style.display = 'flex';
          box.style.alignItems = 'center';
          box.style.justifyContent = 'center';
          product.style.width    = '100%';
          product.style.height   = '100%';
          product.style.objectFit = 'contain';
          product.style.flexShrink = '0';
        } else {
          product.style.width = '100%';
          product.style.height = '100%';
          product.style.objectFit = _spFit;
        }
        product.style.display = 'block';
        product.style.pointerEvents = 'none';
        box.appendChild(product);
        ['nw', 'ne', 'sw', 'se'].forEach(function (corner) {
          var handle = document.createElement('div');
          handle.className = 'bn-single-selection-ui';
          handle.dataset.corner = corner;
          handle.setAttribute('data-html2canvas-ignore', 'true');
          handle.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;background:#4a90e2;border:2px solid #fff;z-index:2;pointer-events:auto;' +
            (corner.indexOf('n') !== -1 ? 'top:0;' : 'bottom:0;') +
            (corner.indexOf('w') !== -1 ? 'left:0;' : 'right:0;');
          box.appendChild(handle);
        });
        productZone.appendChild(box);
        if (global.BNBoxTransformUtils) {
          var singleDragBounds = Object.assign({}, singleDefaults.dragBounds || {}, {
            minVisibleRatioX: 1,
            minVisibleRatioY: 1
          });
          global.BNBoxTransformUtils.attachBoxTransform(box, productZone, {
            role: 'singleProduct',
            configStyle: singleConfig.style || {},
            dragBounds: singleDragBounds,
            onChange: function () {
              syncSingleProductGeometry(box, productZone);
              if (global._bnNotifyLayoutState) global._bnNotifyLayoutState();
            }
          });
        } else {
          console.warn('[Canvas] BNBoxTransformUtils 未載入，singleProduct 不啟用手動 transform。');
        }
        setTimeout(function () {
          setSingleProductPosition(box, productZone, data.offsetX, data.offsetY, false);
          if (global.BNBoxTransformUtils && data.transform) {
            global.BNBoxTransformUtils.applyBoxTransform(box, data.transform);
            syncSingleProductGeometry(box, productZone);
          }
        }, 0);
      }
      if (data.type === 'bn-single-product-offset') {
        var currentBox = document.querySelector('#bn-zone-singleprod .bn-single-product-box');
        if (currentBox) {
          setSingleProductPosition(
            currentBox,
            document.getElementById('bn-zone-singleprod'),
            data.offsetX !== undefined ? data.offsetX : currentBox.dataset.offsetX,
            data.offsetY,
            true
          );
        }
      }
      if (data.type === 'bn-single-product-transform') {
        var transformBox = document.querySelector('#bn-zone-singleprod .bn-single-product-box');
        var transformZone = document.getElementById('bn-zone-singleprod');
        if (transformBox && transformZone) {
          var nextLeft = data.canvasLeft !== undefined
            ? Number(data.canvasLeft) - transformZone.offsetLeft
            : parseFloat(transformBox.style.left) || 0;
          var nextTop = data.canvasTop !== undefined
            ? Number(data.canvasTop) - transformZone.offsetTop
            : parseFloat(transformBox.style.top) || 0;
          transformBox.dataset.userAdjusted = '1';
          if (data.width !== undefined) transformBox.style.width = Math.max(1, Number(data.width) || transformBox.offsetWidth || 1) + 'px';
          if (data.height !== undefined) transformBox.style.height = Math.max(1, Number(data.height) || transformBox.offsetHeight || 1) + 'px';
          transformBox.style.left = nextLeft + 'px';
          transformBox.style.top = nextTop + 'px';
          transformBox.dataset.rotation = String(Number(data.rotation) || 0);
          transformBox.style.transform = Number(data.rotation) ? 'rotate(' + Number(data.rotation) + 'deg)' : '';
          syncSingleProductGeometry(transformBox, transformZone);
          if (global._bnNotifyLayoutState) global._bnNotifyLayoutState();
        }
      }
      if (data.type === 'bn-reset-single-product' || data.type === 'bn-single-product-reset-layout') {
        console.log('[reset] request received singleProduct');
        var resetBox = document.querySelector('#bn-zone-singleprod .bn-single-product-box');
        var resetZone = document.getElementById('bn-zone-singleprod');
        if (resetBox && resetZone) {
          var baseLeft = Number(resetBox.dataset.baseLeft) || 0;
          var baseTop = Number(resetBox.dataset.baseTop) || 0;
          var baseWidth = Number(resetBox.dataset.baseWidth) || resetBox.offsetWidth || 1;
          var baseHeight = Number(resetBox.dataset.baseHeight) || resetBox.offsetHeight || 1;
          if (global.BNBoxTransformUtils && global.BNBoxTransformUtils.resetTransform) {
            global.BNBoxTransformUtils.resetTransform(resetBox, { left: baseLeft, top: baseTop, width: baseWidth, height: baseHeight });
          } else {
            delete resetBox.dataset.userAdjusted;
            resetBox.dataset.rotation = '0';
            resetBox.style.left = baseLeft + 'px';
            resetBox.style.top = baseTop + 'px';
            resetBox.style.width = baseWidth + 'px';
            resetBox.style.height = baseHeight + 'px';
            resetBox.style.transform = '';
            resetBox.dataset.offsetX = '0';
            resetBox.dataset.offsetY = '0';
          }
          console.log('[reset] singleProduct transform cleared');
          syncSingleProductGeometry(resetBox, resetZone);
          console.log('[reset] singleProduct template layout applied');
          if (global._bnNotifyLayoutState) global._bnNotifyLayoutState();
        }
      }
      if (data.type === 'bn-single-product-remove') {
        var removeProduct = document.getElementById('bn-zone-singleprod');
        removeProduct.innerHTML = '';
        removeProduct.style.display = 'none';
        removeProduct.style.height = '';
        try {
          global.parent.postMessage({type:'bn-single-product-geometry',visible:false}, '*');
        } catch (_) {}
        if (global._bnNotifyLayoutState) global._bnNotifyLayoutState();
      }
    });
  }

  function start(template, templatePath) {
    global.__BN_TEMPLATE__ = template;
    global.__BN_TEMPLATE_PATH__ = templatePath;
    addFonts(template.fonts);
    buildBase(template);
    bindPersonProduct();
    waitForFonts(template).then(function () {
      applyAssets(template);
      return loadScript('js/box-transform-utils.js?v=20260701t');
    }).then(function () {
      return loadScript('js/layout-runtime.js?v=20260714-qrcode-a');
    }).catch(function (error) {
      console.warn('[Canvas] 初始化失敗。', error);
    });
  }

  var source = location.search || (location.hash ? '?' + location.hash.slice(1) : '');
  var params = new URLSearchParams(source);
  var templatePath = params.get('template') || 'templates/1080x1920/template.json';
  var styleId = params.get('style') || '01';
  if (location.protocol === 'file:') {
    var template = global.ADTemplateLoader.loadSync(templatePath, styleId);
    if (template) start(template, templatePath);
    else console.warn('[Canvas] 找不到離線模板：', templatePath);
  } else {
    global.ADTemplateLoader.load(templatePath, styleId).then(function (template) {
      start(template, templatePath);
    }).catch(function (error) {
      console.warn('[Canvas] 找不到模板：', templatePath, error);
    });
  }
})(window);
