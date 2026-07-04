(function (global) {
  if (global.BNImageUtils && global.BNImageUtils.autoApplyShadow) return;

  function autoApplyShadow(src, ratio) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var imgW = img.naturalWidth;
        var imgH = img.naturalHeight;

        var shadowRX = imgW * 0.44;
        var shadowRY = Math.max(55, imgW * 0.12);
        var extraH = Math.ceil(shadowRY * 1.6);
        var outH = imgH + extraH;

        var out = document.createElement('canvas');
        out.width = imgW;
        out.height = outH;
        var ctx = out.getContext('2d');

        var shadowCX = imgW / 2;
        var shadowCY = imgH - shadowRY * 0.4;

        ctx.save();
        ctx.translate(shadowCX, shadowCY);
        ctx.scale(1, shadowRY / shadowRX);
        var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowRX);
        grd.addColorStop(0, 'rgba(0,0,0,0.82)');
        grd.addColorStop(0.4, 'rgba(0,0,0,0.50)');
        grd.addColorStop(1, 'rgba(0,0,0,0.00)');
        ctx.beginPath();
        ctx.arc(0, 0, shadowRX, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = grd;
        ctx.fillRect(-shadowRX, -shadowRX, shadowRX * 2, shadowRX * 2);
        ctx.restore();

        ctx.drawImage(img, 0, 0);

        var newSrc = out.toDataURL('image/png');
        var baselineRatio = imgH / outH;
        console.log('[bn-shadow] done imgW=' + imgW + ' imgH=' + imgH
          + ' outH=' + outH + ' baselineRatio=' + baselineRatio.toFixed(4) + ' pngLen=' + newSrc.length);
        resolve({ src: newSrc, ratio: imgW / outH, baselineRatio: baselineRatio });
      };
      img.onerror = function () {
        resolve({ src: src, ratio: ratio, baselineRatio: 1 });
      };
      img.src = src;
    });
  }

  global.BNImageUtils = global.BNImageUtils || {};
  global.BNImageUtils.autoApplyShadow = autoApplyShadow;
})(window);
