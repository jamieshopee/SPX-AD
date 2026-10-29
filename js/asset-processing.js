(function (global) {
  if (global.BNAssetProcessing && global.BNAssetProcessing.autoTrim) return;

  function autoTrim(dataUrl) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        var ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        var d = ctx.getImageData(0, 0, w, h).data;
        var top = h;
        var bottom = -1;
        var left = w;
        var right = -1;
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var i = (y * w + x) * 4;
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var a = d[i + 3];
            if (a < 10) continue;
            if (a > 200 && r > 240 && g > 240 && b > 240) continue;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
        if (bottom < 0 || right < 0) {
          resolve({ src: dataUrl, ratio: w / h });
          return;
        }
        var cw = right - left + 1;
        var ch = bottom - top + 1;
        var o = document.createElement('canvas');
        o.width = cw;
        o.height = ch;
        o.getContext('2d').drawImage(img, left, top, cw, ch, 0, 0, cw, ch);
        resolve({ src: o.toDataURL('image/png'), ratio: cw / ch });
      };
      img.onerror = function () {
        resolve({ src: dataUrl, ratio: 1 });
      };
      img.src = dataUrl;
    });
  }

  var TWO_PERSON_VISIBLE_ALPHA_THRESHOLD = 2;

  function analyzeAlphaBounds(dataUrl, alphaThreshold) {
    var threshold = Number(alphaThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) threshold = 0;
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        var ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        var d = ctx.getImageData(0, 0, w, h).data;
        var top = h;
        var bottom = -1;
        var left = w;
        var right = -1;
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var i = (y * w + x) * 4;
            var alpha = d[i + 3];
            if (threshold > 0 ? alpha < threshold : alpha <= 0) continue;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
        resolve({
          src: dataUrl,
          sourceWidth: w,
          sourceHeight: h,
          visible: bottom < 0 || right < 0 ? null : {
            x: left,
            y: top,
            width: right - left + 1,
            height: bottom - top + 1
          },
          alphaThreshold: threshold
        });
      };
      img.onerror = function () {
        resolve({ src: dataUrl, sourceWidth: 0, sourceHeight: 0, visible: null });
      };
      img.src = dataUrl;
    });
  }

  global.BNAssetProcessing = {
    autoTrim: autoTrim,
    trimImage: autoTrim,
    analyzeAlphaBounds: analyzeAlphaBounds,
    TWO_PERSON_VISIBLE_ALPHA_THRESHOLD: TWO_PERSON_VISIBLE_ALPHA_THRESHOLD
  };
})(window);
