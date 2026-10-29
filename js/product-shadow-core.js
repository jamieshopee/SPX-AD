/*!
 * product-shadow.js — 商品去背圖的接地陰影（v1.0.0）
 * ------------------------------------------------------------
 * 從 Mall SKBN 編輯器的商品陰影（js/shadow-plugin.js ＋ product-module.js 的用法）
 * 整理出來的通用版，畫出來的效果跟 SKBN 一樣。不依賴任何套件。
 *
 *   1. 自動偵測背景色：陰影顏色跟著背景走（同色相、同飽和度、只壓暗明度）
 *   2. 旋轉直接套用：商品轉幾度，陰影就照轉完的輪廓重新算，碰地線自動跟著換
 *   3. 光源角度與參數：左／中／右／關或任意角度；位移、縮放、柔邊、淡出…都可調
 *
 * 最簡單的用法（詳見 product-shadow.md）：
 *
 *   ProductShadow.render(ctx, {
 *     image: img,                         // 已載入的去背 PNG（<img> 或 canvas）
 *     x: 100, y: 50, width: 300, height: 300,   // 整張 PNG 要畫在哪（左上角＋寬高）
 *     light: 'right',                     // 'left' | 'top' | 'right' | 'off' | 角度數字
 *     rotate: 0,                          // 商品旋轉角度（度）
 *     color: 'auto'                       // 'auto' = 依背景自動；或直接給 '#53000b'
 *   });
 *
 * ⚠ 要讀圖片像素（偵測透明留白、取樣背景色），圖片必須是同網域或 data: URL。
 *    用 file:// 直接開 HTML 時，外部 PNG 會讀不到像素，見說明書「常見問題」。
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';

  /* ══════════════════ 參數（跟 SKBN 一樣的預設值） ══════════════════
     *Pct 都是「佔商品畫出來尺寸的百分比」，商品畫多大都維持一樣的視覺比例。
     （絕對 px 會讓細長商品跟寬扁商品看起來差很多，SKBN 2026-09 改成百分比） */
  var DEFAULTS = {
    // 主斜切陰影（光源左／右時）
    softPct: 1.5,        // 柔邊範圍（佔商品高度 %）
    fade: 82,            // 陰影長度：0～100，越大尾巴拉越長才淡掉
    squash: 0.41,        // 陰影壓扁比例：越小越扁（越像貼在地上）
    shearFactor: 0.55,   // 光源角度轉成斜切量的係數：越大越斜
    tailMid: 0.34,       // 淡出中段位置（0～1）
    tailMidAlpha: 0.68,  // 淡出中段的濃度
    tailBlurPct: 6.5,    // 尾端模糊（佔商品高度 %）：根部清楚、尾巴越來越糊
    tailBlurStart: 0.27, // 尾端模糊從哪裡開始（0～1）
    tailBlurSpan: 0.36,  // 尾端模糊漸變的長度（0～1）
    clipBelowPx: 5,      // 陰影最多超出接地線幾 px（避免滲到商品下方太多）
    // 接地陰影（商品實際碰到地面的那一條，任何光源角度都會畫）
    contactUpPct: 1.5,   // 從接地線往上展開（佔商品高度 %）
    contactDownPct: 0.8, // 從接地線往下展開（佔商品高度 %）
    contactAlpha: 0.7,   // 接地陰影濃度 0～1
    contactBlurXPct: 2,  // 接地陰影左右模糊（佔商品寬度 %）
    // 顏色
    darken: 0.6          // 自動顏色：背景明度壓暗比例（0 = 不變、1 = 全黑）
  };
  var LIGHT_PRESETS = { left: -35, top: 0, right: 35 };

  var P = {};                     // 目前使用中的參數
  var paramsVer = 0;              // 參數一改就 +1，讓所有快取失效
  function setParams(obj) {
    if (!obj) return;
    Object.keys(obj).forEach(function (k) {
      if (k in DEFAULTS && typeof obj[k] === 'number' && isFinite(obj[k])) P[k] = obj[k];
    });
    paramsVer++;
  }
  function getParams() { var o = {}; for (var k in P) o[k] = P[k]; return o; }
  function resetParams() { P = {}; for (var k in DEFAULTS) P[k] = DEFAULTS[k]; paramsVer++; }
  resetParams();

  /* ══════════════════ 顏色工具 ══════════════════ */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hexToRgb(hex) {
    hex = String(hex || '').trim().replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex, 16);
    if (isNaN(n) || hex.length !== 6) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    function h(v) { v = clamp(Math.round(v), 0, 255); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + h(r) + h(g) + h(b);
  }
  function parseColor(c) {
    if (!c) return null;
    if (typeof c === 'object' && c.r != null) return c;
    var s = String(c).trim();
    if (s.charAt(0) === '#') return hexToRgb(s);
    var m = s.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    m = s.match(/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return null;
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    if (s === 0) { var v = l * 255; return { r: v, g: v, b: v }; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var hk = h / 360;
    return { r: f(hk + 1 / 3) * 255, g: f(hk) * 255, b: f(hk - 1 / 3) * 255 };
  }
  /* 陰影色公式（SKBN）：同色相、同飽和度，只把明度壓暗 k。
     例：底色 #d0011b → 陰影 #53000b（k=0.6）。任何底色都用同一套，不用一色一色寫死。 */
  function shadowColorFor(bg, k) {
    var rgb = parseColor(bg);
    if (!rgb) return null;
    if (k == null) k = P.darken;
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    var o = hslToRgb(hsl.h, hsl.s, hsl.l * (1 - k));
    return rgbToHex(o.r, o.g, o.b);
  }

  /* 取樣背景：平均某一塊範圍的顏色（忽略透明像素）。
     src：canvas / <img> / CanvasRenderingContext2D；rect 不給就取下方 35%（地面）。 */
  function sampleColor(src, rect) {
    try {
      var canvas = src && src.canvas ? src.canvas : src;
      var sw = canvas.naturalWidth || canvas.width, sh = canvas.naturalHeight || canvas.height;
      if (!sw || !sh) return null;
      var r0 = rect || { x: 0, y: sh * 0.65, width: sw, height: sh * 0.35 };
      var rx = clamp(Math.floor(r0.x), 0, sw - 1), ry = clamp(Math.floor(r0.y), 0, sh - 1);
      var rw = clamp(Math.ceil(r0.width), 1, sw - rx), rh = clamp(Math.ceil(r0.height), 1, sh - ry);
      var c = document.createElement('canvas'); c.width = 32; c.height = 32;
      var cx = c.getContext('2d');
      cx.drawImage(canvas, rx, ry, rw, rh, 0, 0, 32, 32);
      var d = cx.getImageData(0, 0, 32, 32).data, r = 0, g = 0, b = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
      if (!n) return null;
      return rgbToHex(r / n, g / n, b / n);
    } catch (e) {
      console.warn('[ProductShadow] 讀不到背景像素（圖片跨網域或 file:// 開啟），改用預設陰影色', e);
      return null;
    }
  }

  /* ══════════════════ 引擎（SKBN ShadowPlugin，畫法不變） ══════════════════ */
  var shadowRGB = '90,90,90';

  function buildSilhouette(img) {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function tintWhole(p) {
    if (p.tinted && p.tintedRGB === shadowRGB) return;
    var t = document.createElement('canvas');
    t.width = p.silhouette.width; t.height = p.silhouette.height;
    var tc = t.getContext('2d');
    tc.drawImage(p.silhouette, 0, 0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = 'rgb(' + shadowRGB + ')';
    tc.fillRect(0, 0, t.width, t.height);
    p.tinted = t; p.tintedRGB = shadowRGB;
  }
  // 先把輪廓縮到要畫的大小再上色（快很多；跟先上色再縮結果一樣）
  function tintedAtSize(p, w, h) {
    var tw = Math.max(1, Math.ceil(w)), th = Math.max(1, Math.ceil(h));
    if (tw >= p.silhouette.width || th >= p.silhouette.height) { tintWhole(p); return p.tinted; }
    var sc = p.silScaled;
    if (!(sc && sc.width === tw && sc.height === th)) {
      sc = document.createElement('canvas'); sc.width = tw; sc.height = th;
      var sx = sc.getContext('2d');
      sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
      sx.drawImage(p.silhouette, 0, 0, tw, th);
      p.silScaled = sc; p.tintedScaled = null;
    }
    var t = p.tintedScaled;
    if (t && t.width === tw && t.height === th && p.tintedScaledRGB === shadowRGB) return t;
    t = document.createElement('canvas'); t.width = tw; t.height = th;
    var tc = t.getContext('2d');
    tc.drawImage(sc, 0, 0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = 'rgb(' + shadowRGB + ')';
    tc.fillRect(0, 0, tw, th);
    p.tintedScaled = t; p.tintedScaledRGB = shadowRGB;
    return t;
  }
  /* 透明留白比例（上下左右，0～1）。偵測解析度 300px。 */
  function detectAlphaTrim(img) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var scale = Math.min(1, 300 / Math.max(iw, ih));
    var w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var cx = c.getContext('2d');
    cx.drawImage(img, 0, 0, w, h);
    var t = { top: 0, bottom: 0, left: 0, right: 0, ok: false };
    try {
      var d = cx.getImageData(0, 0, w, h).data;
      var minY = h, maxY = -1, minX = w, maxX = -1;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 10) {
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
        }
      }
      if (maxY >= 0) {
        t.top = minY / h; t.bottom = (h - 1 - maxY) / h;
        t.left = minX / w; t.right = (w - 1 - maxX) / w; t.ok = true;
      }
    } catch (e) {
      console.warn('[ProductShadow] 讀不到圖片像素，透明留白當成 0（陰影可能浮在商品下方）。圖片要同網域或 data: URL。', e);
    }
    return t;
  }

  function stampLayer(tc, tinted, ox, oy, pw, ph, shear, squash, spread, totalAlpha, samples) {
    if (!tinted) return;
    tc.save();
    tc.globalCompositeOperation = 'multiply';
    tc.globalAlpha = totalAlpha / samples;
    for (var i = 0; i < samples; i++) {
      var ang = (i / samples) * Math.PI * 2 * 2.4;
      var rad = spread * Math.sqrt((i + 0.5) / samples);
      tc.save();
      tc.translate(ox + Math.cos(ang) * rad, oy + Math.sin(ang) * rad * 0.4);
      tc.transform(1, 0, shear, squash, 0, 0);
      tc.drawImage(tinted, -pw / 2, -ph, pw, ph);
      tc.restore();
    }
    tc.restore();
  }
  // 只有左右方向的模糊：垂直拉高 14 倍再模糊，再壓回來
  function blurHorizontalOnly(src, radius) {
    if (radius <= 0) return src;
    var S = 14, w = src.width, h = src.height;
    var tall = document.createElement('canvas'); tall.width = w; tall.height = h * S;
    var t = tall.getContext('2d'); t.imageSmoothingEnabled = false; t.drawImage(src, 0, 0, w, h, 0, 0, w, h * S);
    var bl = document.createElement('canvas'); bl.width = w; bl.height = h * S;
    var b = bl.getContext('2d'); b.filter = 'blur(' + radius + 'px)'; b.drawImage(tall, 0, 0); b.filter = 'none';
    var out = document.createElement('canvas'); out.width = w; out.height = h;
    var o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(bl, 0, 0, w, h * S, 0, 0, w, h);
    return out;
  }

  /* 畫一個商品（沒旋轉、或旋轉代理圖）的陰影。
     state：x = 整張 PNG（含透明留白）的水平中心；y = 商品「真正碰地」的那條線；
            w/h = 整張 PNG 畫出來的大小；groundAnchorX/Y = 沒加陰影位移的原始位置；
            angle = 光源角度；isTop = 光源正上方（只畫接地陰影）；scaleX/scaleY = 主陰影縮放 */
  function drawGroundShadow(ctx, p, state) {
    var pw = state.w, ph = state.h, cx = state.x;
    var squash = P.squash;
    var trimBottomPad = p.trim ? p.trim.bottom * ph : 0;
    var py = state.y + trimBottomPad;
    var shadowGroundY = state.y + trimBottomPad * squash;
    var shadowCx = cx;
    var spw = pw * (state.scaleX || 1), sph = ph * (state.scaleY || 1);

    // ── 接地陰影（不跟陰影位移走，永遠貼在商品腳下）──
    var upPx = P.contactUpPct / 100 * ph, downPx = P.contactDownPct / 100 * ph;
    if ((upPx > 0 || downPx > 0) && P.contactAlpha > 0) {
      var trueCx = state.groundAnchorX != null ? state.groundAnchorX : cx;
      var trueGroundY = state.groundAnchorY != null ? state.groundAnchorY : (py - trimBottomPad);
      var bw = Math.ceil(pw) + 2, bh = Math.ceil(upPx + downPx) + 2;
      var imgYInTemp = trimBottomPad - ph + upPx;
      var maskKey = pw + '|' + ph + '|' + paramsVer;
      var contactMask = (p.contactMask && p.contactMask.key === maskKey) ? p.contactMask.canvas : null;
      if (!contactMask) {
        var sil = p.silhouette;
        var above = document.createElement('canvas'); above.width = bw; above.height = bh;
        var ac = above.getContext('2d');
        if (upPx > 0) { ac.save(); ac.beginPath(); ac.rect(0, 0, bw, upPx); ac.clip(); ac.drawImage(sil, 0, imgYInTemp, pw, ph); ac.restore(); }
        var below = document.createElement('canvas'); below.width = bw; below.height = bh;
        var bc = below.getContext('2d');
        if (downPx > 0) {
          bc.drawImage(sil, 0, imgYInTemp + downPx, pw, ph);
          bc.globalCompositeOperation = 'destination-out';
          bc.drawImage(sil, 0, imgYInTemp, pw, ph);
          bc.globalCompositeOperation = 'source-over';
        }
        var comb = document.createElement('canvas'); comb.width = bw; comb.height = bh;
        var cc = comb.getContext('2d'); cc.drawImage(above, 0, 0); cc.drawImage(below, 0, 0);
        contactMask = blurHorizontalOnly(comb, P.contactBlurXPct / 100 * pw);
        p.contactMask = { key: maskKey, canvas: contactMask }; p.contactCache = null;
      }
      var ck = maskKey + '|' + shadowRGB;
      var contact = (p.contactCache && p.contactCache.key === ck) ? p.contactCache.canvas : null;
      if (!contact) {
        contact = document.createElement('canvas'); contact.width = contactMask.width; contact.height = contactMask.height;
        var kc = contact.getContext('2d');
        kc.drawImage(contactMask, 0, 0);
        kc.globalCompositeOperation = 'source-in';
        kc.fillStyle = 'rgb(' + shadowRGB + ')';
        kc.fillRect(0, 0, contact.width, contact.height);
        p.contactCache = { key: ck, canvas: contact };
      }
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = clamp(P.contactAlpha, 0, 1);
      ctx.drawImage(contact, trueCx - pw / 2, trueGroundY - upPx);
      ctx.restore();
    }

    // ── 主斜切陰影（光源正上方時不畫，只留接地陰影）──
    if (state.isTop) return;
    var angle = state.angle * Math.PI / 180;
    var soft = P.softPct / 100 * ph;
    var fadeMul = P.fade / 100;
    var shear = Math.tan(angle * P.shearFactor);
    var maxSpread = soft * 1.8;
    // 斜切支點在 PNG 最底邊，真正碰地的線在它上面「底部留白」那麼高，會被推開 shear×留白，這裡補回來
    shadowCx += shear * (p.trim ? p.trim.bottom * sph : 0);

    var halfW = spw / 2 + Math.abs(shear) * sph + maxSpread * 2 + 20;
    var tempW = Math.ceil(halfW * 2);
    var tempH = Math.ceil(sph * squash * 2 + maxSpread * 2 + 40);
    var anchorX = halfW, anchorY = Math.ceil(tempH * 0.5);
    // 陰影長相只跟大小、角度、顏色、參數有關；移動位置時直接沿用
    var mainKey = spw + '|' + sph + '|' + state.angle + '|' + shadowRGB + '|' + paramsVer;
    var tmp = (p.mainShadowCache && p.mainShadowCache.key === mainKey) ? p.mainShadowCache.canvas : null;
    if (!tmp) {
      tmp = document.createElement('canvas'); tmp.width = tempW; tmp.height = tempH;
      var tc = tmp.getContext('2d');
      var stamp = tintedAtSize(p, spw, sph);
      stampLayer(tc, stamp, anchorX, anchorY, spw, sph, shear, squash, soft * 1.8, 0.28, 12);
      stampLayer(tc, stamp, anchorX, anchorY, spw, sph, shear, squash, soft * 0.8, 0.4, 10);
      stampLayer(tc, stamp, anchorX, anchorY, spw, sph, shear, squash, soft * 0.25, 0.35, 6);
      // 淡出用純垂直漸層：同一列（同一個高度）不管多寬都一樣淡，寬扁商品才不會整個消失
      var tipY = -squash * sph * fadeMul - soft * 0.6;
      var tailBlurPx = P.tailBlurPct / 100 * ph;
      if (tailBlurPx > 0) {
        var bs = clamp(P.tailBlurStart, 0, 0.9), be = Math.min(1, bs + Math.max(0.05, P.tailBlurSpan));
        var blurred = document.createElement('canvas'); blurred.width = tempW; blurred.height = tempH;
        var bx = blurred.getContext('2d');
        bx.filter = 'blur(' + tailBlurPx + 'px)'; bx.drawImage(tmp, 0, 0); bx.filter = 'none';
        var gb = bx.createLinearGradient(anchorX, anchorY, anchorX, anchorY + tipY);
        gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(bs, 'rgba(255,255,255,0)');
        gb.addColorStop(be, 'rgba(255,255,255,1)'); gb.addColorStop(1, 'rgba(255,255,255,1)');
        bx.globalCompositeOperation = 'destination-in'; bx.fillStyle = gb; bx.fillRect(0, 0, tempW, tempH);
        var gs = tc.createLinearGradient(anchorX, anchorY, anchorX, anchorY + tipY);
        gs.addColorStop(0, 'rgba(255,255,255,1)'); gs.addColorStop(bs, 'rgba(255,255,255,1)');
        gs.addColorStop(be, 'rgba(255,255,255,0)'); gs.addColorStop(1, 'rgba(255,255,255,0)');
        tc.globalCompositeOperation = 'destination-in'; tc.fillStyle = gs; tc.fillRect(0, 0, tempW, tempH);
        tc.globalCompositeOperation = 'lighter'; tc.drawImage(blurred, 0, 0);
        tc.globalCompositeOperation = 'destination-in';
        var gf = tc.createLinearGradient(0, anchorY - 2, 0, anchorY + 5);
        gf.addColorStop(0, 'rgba(255,255,255,1)'); gf.addColorStop(1, 'rgba(255,255,255,0)');
        tc.fillStyle = gf; tc.fillRect(0, 0, tempW, tempH);
        tc.globalCompositeOperation = 'source-over';
      }
      tc.globalCompositeOperation = 'destination-in';
      var grad = tc.createLinearGradient(anchorX, anchorY, anchorX, anchorY + tipY);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(clamp(P.tailMid, 0.01, 0.99), 'rgba(255,255,255,' + clamp(P.tailMidAlpha, 0, 1) + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      tc.fillStyle = grad; tc.fillRect(0, 0, tempW, tempH);
      tc.globalCompositeOperation = 'source-over';
      p.mainShadowCache = { key: mainKey, canvas: tmp };
    }
    ctx.save();
    ctx.beginPath();
    var span = ctx.canvas.width * 3;
    ctx.rect(shadowCx - span, shadowGroundY - span, span * 2, span + P.clipBelowPx);
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(tmp, shadowCx - anchorX, shadowGroundY - anchorY);
    ctx.restore();
  }

  /* 旋轉：先把商品照目前角度轉好，畫進一張外接矩形大小的「代理圖」，
     重做輪廓＋透明留白，再當成沒旋轉的商品去算陰影——碰地線自動變成
     轉完後輪廓的最低點。同一個角度／大小再畫就沿用快取。 */
  var ROT_PROXY_MAX = 900;
  var FAST_MAX = 260;           // quality:'fast' 時，陰影計算用的商品最長邊（px）
  function getRotatedProxy(p, w, h, rotDeg) {
    var r = rotDeg * Math.PI / 180, co = Math.abs(Math.cos(r)), si = Math.abs(Math.sin(r));
    var bw = w * co + h * si, bh = w * si + h * co;
    var k = Math.min(1, ROT_PROXY_MAX / Math.max(bw, bh));
    var key = (Math.round(rotDeg * 10) / 10) + '|' + Math.round(bw * k) + '|' + Math.round(bh * k);
    if (p._rotProxy && p._rotProxy.key === key) return p._rotProxy;
    var cw = Math.max(1, Math.round(bw * k)), ch = Math.max(1, Math.round(bh * k));
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.translate(cw / 2, ch / 2); x.rotate(r);
    x.drawImage(p.img, -w * k / 2, -h * k / 2, w * k, h * k);
    p._rotProxy = { key: key, bw: bw, bh: bh, img: c, silhouette: buildSilhouette(c), trim: detectAlphaTrim(c) };
    return p._rotProxy;
  }

  /* ══════════════════ 商品資料快取（同一張圖只算一次輪廓/留白） ══════════════════ */
  var store = (typeof WeakMap === 'function') ? new WeakMap() : null;
  var fallbackList = [];
  function getProduct(img) {
    if (!img) return null;
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    var p = store ? store.get(img) : null;
    if (!p && !store) for (var i = 0; i < fallbackList.length; i++) if (fallbackList[i].img === img) { p = fallbackList[i]; break; }
    // 同一個 <img> 換了 src：重算
    var sig = (img.currentSrc || img.src || '') + '|' + w + 'x' + h;
    if (p && p.sig === sig) return p;
    p = { img: img, sig: sig, silhouette: buildSilhouette(img), trim: detectAlphaTrim(img) };
    if (store) store.set(img, p); else fallbackList.push(p);
    return p;
  }
  function forget(img) { if (store) store.delete(img); else fallbackList = fallbackList.filter(function (p) { return p.img !== img; }); }

  /* 商品「有色範圍」（不含透明留白）在畫布上的位置，旋轉樞紐、吸附對齊都用這個 */
  function contentBox(img, x, y, width, height) {
    var p = getProduct(img); var t = p ? p.trim : { top: 0, bottom: 0, left: 0, right: 0 };
    var bx = x + t.left * width, by = y + t.top * height;
    var bw = width * (1 - t.left - t.right), bh = height * (1 - t.top - t.bottom);
    return { x: bx, y: by, width: bw, height: bh, cx: bx + bw / 2, cy: by + bh / 2, groundY: y + height - t.bottom * height };
  }

  function lightAngle(light) {
    if (typeof light === 'number') return light;
    if (light in LIGHT_PRESETS) return LIGHT_PRESETS[light];
    return LIGHT_PRESETS.right;
  }

  /* 決定這次要用的陰影顏色 → 'r,g,b' */
  function resolveColor(ctx, o, cb) {
    var c = o.color;
    var hex = null;
    if (c && c !== 'auto') hex = (parseColor(c) ? rgbToHex(parseColor(c).r, parseColor(c).g, parseColor(c).b) : null);
    if (!hex) {
      var bgHex = null;
      if (o.background) {
        bgHex = parseColor(o.background) ? o.background : sampleColor(o.background, o.backgroundRect);
      } else {
        // 沒給背景：取樣畫布上商品腳下那一塊（陰影要在商品之前畫，所以這時候畫布上還只有背景）
        var pad = cb.width * 0.15;
        bgHex = sampleColor(ctx, { x: cb.x - pad, y: cb.groundY - cb.height * 0.12, width: cb.width + pad * 2, height: cb.height * 0.24 });
      }
      hex = (bgHex && shadowColorFor(bgHex, o.darken)) || '#5a5a5a';
    }
    var rgb = hexToRgb(hex);
    return { hex: hex, rgb: rgb.r + ',' + rgb.g + ',' + rgb.b };
  }

  /* ══════════════════ 對外：一次畫好陰影＋商品 ══════════════════ */
  function render(ctx, o) {
    var img = o.image;
    var p = getProduct(img);
    if (!p) return null;
    var x = +o.x || 0, y = +o.y || 0, w = +o.width, h = +o.height;
    if (!w || !h) { w = img.naturalWidth || img.width; h = img.naturalHeight || img.height; }
    var rot = +o.rotate || 0;
    var light = (o.light == null) ? 'right' : o.light;
    var cb = contentBox(img, x, y, w, h);
    var pivotX = o.pivotX != null ? o.pivotX : cb.cx, pivotY = o.pivotY != null ? o.pivotY : cb.cy;
    var info = { color: null, contentBox: cb, pivot: { x: pivotX, y: pivotY } };

    if (light !== 'off' && light !== false) {
      var col = resolveColor(ctx, o, cb);
      shadowRGB = col.rgb; info.color = col.hex;
      var angle = lightAngle(light);
      var isTop = (light === 'top' || angle === 0);
      var offX = +o.offsetX || 0, offY = +o.offsetY || 0;
      var common = { angle: angle, isTop: isTop, scaleX: o.scaleX || 1, scaleY: o.scaleY || 1 };
      /* quality:'fast'（拖曳、拉滑桿時用）：陰影用比較小的解析度算，再放大貼上。
         陰影本來就是模糊的，看起來幾乎一樣，但旋轉到新角度時快 3～8 倍。
         放開滑鼠後再用一般品質畫一次。 */
      var k = (o.quality === 'fast') ? Math.min(1, FAST_MAX / Math.max(w, h)) : 1;
      ctx.save();
      if (k < 1) ctx.scale(1 / k, 1 / k);
      if (!rot) {
        var ax = x + w / 2, ay = cb.groundY;        // x：整張 PNG 中心；y：真正碰地的線
        drawGroundShadow(ctx, p, extend({ x: (ax + offX) * k, y: (ay + offY) * k, w: w * k, h: h * k, groundAnchorX: ax * k, groundAnchorY: ay * k }, common));
      } else {
        // 整張 PNG 中心繞樞紐轉到旋轉後的位置，再用代理圖算陰影
        var r = rot * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
        var icx = x + w / 2, icy = y + h / 2, dx = icx - pivotX, dy = icy - pivotY;
        var crx = pivotX + dx * co - dy * si, cry = pivotY + dx * si + dy * co;
        var px = getRotatedProxy(p, w * k, h * k, rot);
        var ground2 = cry * k + px.bh / 2 - px.trim.bottom * px.bh;
        drawGroundShadow(ctx, px, extend({ x: (crx + offX) * k, y: ground2 + offY * k, w: px.bw, h: px.bh, groundAnchorX: crx * k, groundAnchorY: ground2 }, common));
      }
      ctx.restore();
    }

    if (o.drawImage !== false) {
      ctx.save();
      if (rot) { ctx.translate(pivotX, pivotY); ctx.rotate(rot * Math.PI / 180); ctx.translate(-pivotX, -pivotY); }
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    }
    return info;
  }

  /* 只畫陰影（商品自己另外畫時用）：等於 render 加 drawImage:false */
  function renderShadow(ctx, o) { return render(ctx, extend(extend({}, o), { drawImage: false })); }

  function extend(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }

  /* 圖片載入小工具：回傳 Promise<HTMLImageElement> */
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      if (!/^data:|^blob:/.test(src)) im.crossOrigin = 'anonymous';
      im.onload = function () { resolve(im); };
      im.onerror = reject;
      im.src = src;
    });
  }

  global.ProductShadow = {
    version: VERSION,
    render: render,
    renderShadow: renderShadow,
    // 參數
    DEFAULTS: (function () { var o = {}; for (var k in DEFAULTS) o[k] = DEFAULTS[k]; return o; })(),
    LIGHT_PRESETS: LIGHT_PRESETS,
    setParams: setParams,
    getParams: getParams,
    resetParams: resetParams,
    // 顏色
    shadowColorFor: shadowColorFor,
    sampleColor: sampleColor,
    // 工具
    contentBox: contentBox,
    trimOf: function (img) { var p = getProduct(img); return p ? extend({}, p.trim) : null; },
    forget: forget,
    loadImage: loadImage
  };
})(window);
