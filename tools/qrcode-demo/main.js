/*
 * QR Code Visual Baseline Demo
 * ----------------------------
 * Standalone demo (NOT part of SPX AD's production app). Uses the vendored
 * browser build of soldair/node-qrcode (see qrcode.js / LICENSE in this folder).
 *
 * Fixed rendering rules (per spec):
 *   - black modules / white background only
 *   - library-native Quiet Zone (no crop, no logo, no extra padding, no
 *     rounded corners, no shadow, no border, no text overlay)
 *   - Error Correction Level: 'M' (library default when unspecified)
 */

(function () {
  'use strict';

  var DEFAULT_URL = 'https://sho.pe/99umcm';
  var ECC_LEVEL = 'M'; // library default; not exposed as a control per spec

  var el = {
    urlInput: document.getElementById('url-input'),
    urlError: document.getElementById('url-error'),
    sizeSlider: document.getElementById('size-slider'),
    sizeValue: document.getElementById('size-value'),
    overlayToggle: document.getElementById('overlay-toggle'),
    gridSelect: document.getElementById('grid-select'),
    qrStage: document.getElementById('qr-stage'),
    qrCanvas: document.getElementById('qr-canvas'),
    overlayBoxes: document.getElementById('overlay-boxes'),
    overlayGrid: document.getElementById('overlay-grid'),
    sizeWarning: document.getElementById('size-warning'),
    marginCompare: document.getElementById('margin-compare'),
    scanGallery: document.getElementById('scan-gallery'),
    downloadPng: document.getElementById('download-png'),
    downloadSvg: document.getElementById('download-svg'),
    measure: {
      outer: document.getElementById('m-outer'),
      black: document.getElementById('m-black'),
      qzTop: document.getElementById('m-qz-top'),
      qzBottom: document.getElementById('m-qz-bottom'),
      qzLeft: document.getElementById('m-qz-left'),
      qzRight: document.getElementById('m-qz-right'),
      blackPct: document.getElementById('m-black-pct'),
      qzPct: document.getElementById('m-qz-pct'),
      modules: document.getElementById('m-modules'),
      version: document.getElementById('m-version'),
      ecc: document.getElementById('m-ecc'),
      margin: document.getElementById('m-margin'),
      actual: document.getElementById('m-actual')
    }
  };

  // ---- state -----------------------------------------------------------
  var state = {
    url: DEFAULT_URL,      // last known-valid, trimmed URL
    sizePx: 200
  };

  // ---- URL validation ----------------------------------------------------
  function validateUrl (raw) {
    var trimmed = (raw || '').trim();
    if (!trimmed) return { valid: false, value: trimmed };
    try {
      var u = new URL(trimmed);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return { valid: false, value: trimmed };
      }
      return { valid: true, value: trimmed };
    } catch (e) {
      return { valid: false, value: trimmed };
    }
  }

  function setUrlValidState (isValid) {
    el.urlInput.classList.toggle('invalid', !isValid);
    el.urlError.hidden = isValid;
  }

  // ---- core render + measurement ----------------------------------------

  // Renders `url` onto `canvas` at approx `widthPx`, with given margin (modules).
  // Returns a promise resolving to { canvas, N, margin, version, ecc, actualSize }.
  function renderToCanvas (canvas, url, widthPx, marginModules) {
    return new Promise(function (resolve, reject) {
      var opts = {
        errorCorrectionLevel: ECC_LEVEL,
        margin: marginModules,
        width: widthPx,
        color: { dark: '#000000ff', light: '#ffffffff' }
      };
      QRCode.toCanvas(canvas, url, opts, function (err) {
        if (err) { reject(err); return; }
        var qr = QRCode.create(url, { errorCorrectionLevel: ECC_LEVEL });
        resolve({
          canvas: canvas,
          N: qr.modules.size,
          margin: marginModules,
          version: qr.version,
          ecc: eccLabel(qr.errorCorrectionLevel),
          actualSize: canvas.width // ground truth: library sets canvas.width itself
        });
      });
    });
  }

  function eccLabel (ecc) {
    // qr.errorCorrectionLevel is an object like {bit:..}; derive letter from ECC_LEVEL constant instead.
    return ECC_LEVEL;
  }

  function fmtPx (n) { return n + ' px'; }
  function fmtPct (n) { return n.toFixed(1) + '%'; }

  // ---- main preview + measurement panel ----------------------------------

  function renderMain () {
    var requested = state.sizePx;
    renderToCanvas(el.qrCanvas, state.url, requested, 4).then(function (r) {
      var totalModules = r.N + r.margin * 2;
      var scale = r.actualSize / totalModules; // px per module (may be fractional)
      var blackBoxPx = Math.round(r.N * scale);
      var qzPx = Math.round(r.margin * scale);
      var blackPct = (Math.pow(r.N * scale, 2) / Math.pow(r.actualSize, 2)) * 100;
      var qzPct = 100 - blackPct;

      el.measure.outer.textContent = r.actualSize + ' × ' + r.actualSize + ' px';
      el.measure.black.textContent = blackBoxPx + ' × ' + blackBoxPx + ' px';
      el.measure.qzTop.textContent = fmtPx(qzPx);
      el.measure.qzBottom.textContent = fmtPx(qzPx);
      el.measure.qzLeft.textContent = fmtPx(qzPx);
      el.measure.qzRight.textContent = fmtPx(qzPx);
      el.measure.blackPct.textContent = fmtPct(blackPct);
      el.measure.qzPct.textContent = fmtPct(qzPct);
      el.measure.modules.textContent = r.N + ' × ' + r.N;
      el.measure.version.textContent = 'Version ' + r.version;
      el.measure.ecc.textContent = r.ecc;
      el.measure.margin.textContent = r.margin + ' modules（library default = 4）';
      el.measure.actual.textContent = r.actualSize + ' px（滑桿請求：' + requested + ' px）';

      if (r.actualSize !== requested) {
        var minWidth = totalModules;
        el.sizeWarning.hidden = false;
        el.sizeWarning.textContent =
          '目前網址在 Error Correction Level ' + r.ecc + ' 下需要 Version ' + r.version +
          '（' + r.N + '×' + r.N + ' modules），含 Quiet Zone 後最小可用寬度為 ' + minWidth +
          ' px。請求的 ' + requested + ' px 小於此值，Library 已自動改用內建預設 scale，' +
          '實際輸出為 ' + r.actualSize + ' px，而不是滑桿請求的尺寸。';
      } else {
        el.sizeWarning.hidden = true;
      }

      updateOverlays(r, scale);
    }).catch(function (err) {
      console.error('renderMain failed', err);
    });
  }

  function updateOverlays (r, scale) {
    var size = r.actualSize;
    el.qrStage.style.width = size + 'px';
    el.qrStage.style.height = size + 'px';

    // Bounding box overlay
    if (el.overlayToggle.checked) {
      var qzPx = r.margin * scale;
      var blackPx = r.N * scale;
      el.overlayBoxes.hidden = false;
      el.overlayBoxes.style.width = size + 'px';
      el.overlayBoxes.style.height = size + 'px';
      el.overlayBoxes.innerHTML =
        '<div class="box outer" style="left:0;top:0;width:' + size + 'px;height:' + size + 'px;"></div>' +
        '<div class="box inner" style="left:' + qzPx + 'px;top:' + qzPx + 'px;width:' + blackPx + 'px;height:' + blackPx + 'px;"></div>';
    } else {
      el.overlayBoxes.hidden = true;
      el.overlayBoxes.innerHTML = '';
    }

    // Grid overlay
    var gridPx = parseInt(el.gridSelect.value, 10);
    if (gridPx > 0) {
      el.overlayGrid.hidden = false;
      el.overlayGrid.style.width = size + 'px';
      el.overlayGrid.style.height = size + 'px';
      el.overlayGrid.style.backgroundSize = gridPx + 'px ' + gridPx + 'px';
    } else {
      el.overlayGrid.hidden = true;
    }
  }

  // ---- margin comparison row ---------------------------------------------

  var MARGIN_VARIANTS = [
    { label: 'Default\n(unspecified)', margin: undefined },
    { label: 'margin = 0', margin: 0 },
    { label: 'margin = 1', margin: 1 },
    { label: 'margin = 2', margin: 2 },
    { label: 'margin = 4', margin: 4 }
  ];
  var COMPARE_SCALE = 6; // fixed px-per-module so only the quiet zone framing differs visually

  function renderMarginCompare () {
    el.marginCompare.innerHTML = '';
    MARGIN_VARIANTS.forEach(function (variant) {
      var item = document.createElement('div');
      item.className = 'compare-item';
      var canvas = document.createElement('canvas');
      item.appendChild(canvas);
      var label = document.createElement('div');
      label.className = 'label';
      item.appendChild(label);
      el.marginCompare.appendChild(item);

      var effectiveMargin = variant.margin === undefined ? 4 : variant.margin;
      var opts = {
        errorCorrectionLevel: ECC_LEVEL,
        scale: COMPARE_SCALE,
        color: { dark: '#000000ff', light: '#ffffffff' }
      };
      if (variant.margin !== undefined) opts.margin = variant.margin;

      QRCode.toCanvas(canvas, state.url, opts, function (err) {
        if (err) { console.error(err); return; }
        var qr = QRCode.create(state.url, { errorCorrectionLevel: ECC_LEVEL });
        var qz = effectiveMargin * COMPARE_SCALE;
        label.textContent = variant.label + '\n' + canvas.width + '×' + canvas.width + ' px\nQuiet Zone: ' + qz + 'px/side';
      });
    });
  }

  // ---- scanning validation gallery ---------------------------------------

  var SCAN_SIZES = [50, 75, 100, 125, 150, 175, 200, 250, 300];

  function renderScanGallery () {
    el.scanGallery.innerHTML = '';
    SCAN_SIZES.forEach(function (px) {
      var item = document.createElement('div');
      item.className = 'compare-item';
      var canvas = document.createElement('canvas');
      item.appendChild(canvas);
      var label = document.createElement('div');
      label.className = 'label';
      item.appendChild(label);
      el.scanGallery.appendChild(item);

      renderToCanvas(canvas, state.url, px, 4).then(function (r) {
        label.textContent = '請求 ' + px + 'px\n實際 ' + r.actualSize + '×' + r.actualSize + ' px';
      }).catch(function (err) { console.error(err); });
    });
  }

  // ---- download -----------------------------------------------------------

  function triggerDownload (href, filename) {
    var a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function downloadPng () {
    var dataUrl = el.qrCanvas.toDataURL('image/png');
    triggerDownload(dataUrl, 'qrcode-' + el.qrCanvas.width + 'px.png');
  }

  function downloadSvg () {
    QRCode.toString(state.url, {
      type: 'svg',
      errorCorrectionLevel: ECC_LEVEL,
      margin: 4,
      width: state.sizePx,
      color: { dark: '#000000ff', light: '#ffffffff' }
    }, function (err, svg) {
      if (err) { console.error(err); return; }
      var blob = new Blob([svg], { type: 'image/svg+xml' });
      var url = URL.createObjectURL(blob);
      triggerDownload(url, 'qrcode-' + state.sizePx + 'px.svg');
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  // ---- wiring --------------------------------------------------------------

  function regenerateAll () {
    renderMain();
    renderMarginCompare();
    renderScanGallery();
  }

  el.urlInput.addEventListener('input', function () {
    var result = validateUrl(el.urlInput.value);
    setUrlValidState(result.valid);
    if (result.valid) {
      state.url = result.value;
      regenerateAll();
    }
    // invalid: keep last valid state.url and all rendered QR codes untouched
  });

  el.sizeSlider.addEventListener('input', function () {
    state.sizePx = parseInt(el.sizeSlider.value, 10);
    el.sizeValue.textContent = state.sizePx;
    renderMain();
  });

  el.overlayToggle.addEventListener('change', function () { renderMain(); });
  el.gridSelect.addEventListener('change', function () { renderMain(); });

  el.downloadPng.addEventListener('click', downloadPng);
  el.downloadSvg.addEventListener('click', downloadSvg);

  // ---- init ----------------------------------------------------------------

  (function init () {
    // trim + validate default value on load too
    var result = validateUrl(el.urlInput.value);
    el.urlInput.value = result.value;
    setUrlValidState(result.valid);
    if (result.valid) state.url = result.value;

    regenerateAll();
  })();
})();
