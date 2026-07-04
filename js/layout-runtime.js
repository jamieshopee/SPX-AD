/*!
 * layout-runtime.js
 * 所有排版版位共用的執行邏輯
 * 由各版位 HTML 載入：<script src="../js/layout-runtime.js"></script>
 */
(function(){

(function () {
  var searchParams = new URLSearchParams(location.search);
  var urlId = parseInt(searchParams.get('bnid')) || 0;
  var fname = searchParams.get('css') ||
    decodeURIComponent(location.pathname.split('/').pop().replace(/\.html$/i, ''));
  var template = window.__BN_TEMPLATE__ || null;
  var inited = false;

  function numberValue(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function styleNumber(style, key, fallback) {
    return numberValue(style && parseFloat(style[key]), fallback);
  }

  function loadCSS(href, cb) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    l.onload = cb || function(){};
    l.onerror = function(){ if(cb) cb(); };
    document.head.appendChild(l);
  }
  var loaded = 0;
  function onBothLoaded() {
    loaded++;
    if (loaded < 2) return;
    /* CSS 兩個都載完後，等字型也載完再 init
       document.fonts.ready 在字型下載完成後 resolve，
       保證 scrollWidth / getComputedStyle 拿到的是正確字型的量測值 */
    function doInit() {
      requestAnimationFrame(function(){ requestAnimationFrame(init); });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(doInit);
    } else {
      doInit();
    }
  }
  if(template){
    requestAnimationFrame(function(){ requestAnimationFrame(init); });
    window.addEventListener('load', function(){ setTimeout(init, 100); });
  }else{
    loadCSS(fname + '.css',        onBothLoaded);
    loadCSS(fname + '.config.css', onBothLoaded);
    window.addEventListener('load', function(){ setTimeout(init, 600); });
  }

  function init() {
    if (inited) return;
    inited = true;
    var root = getComputedStyle(document.documentElement);
    var canvas = document.getElementById('canvas');
    var W = template ? Number(template.width) :
      (parseFloat(root.getPropertyValue('--canvas-w')) || parseFloat(document.body.dataset.fw) || 900);
    var H = template ? Number(template.height) :
      (parseFloat(root.getPropertyValue('--canvas-h')) || parseFloat(document.body.dataset.fh) || 600);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    if(template&&template.canvas&&template.canvas.backgroundColor) canvas.style.background=template.canvas.backgroundColor;

    var bgRaw = root.getPropertyValue('--bg-img').trim();
    if (bgRaw && bgRaw !== 'none' && bgRaw !== '') {
      var bsrc = bgRaw.replace(/^url\(["']?/,'').replace(/["']?\)$/,'').trim();
      var bimg = document.getElementById('底圖');
      if (bimg) { bimg.src = bsrc; bimg.style.display = 'block'; }
    }

    var ctaRaw = root.getPropertyValue('--cta-classes').trim().replace(/^["']/,'').replace(/["']$/,'');
    var ctaSet = {};
    if (ctaRaw) ctaRaw.split(',').forEach(function(s){ var k=s.trim(); if(k) ctaSet[k]=true; });

    if(template){
      function addConfiguredLayer(className,text,style){
        var el=document.createElement('div');
        el.className=className;
        if(text) el.textContent=text;
        Object.keys(style||{}).forEach(function(key){
          var value=style[key];
          if(key==='fontFamily'&&value&&!/^["']/.test(value)) value='"'+value+'"';
          el.style[key]=value;
        });
        canvas.appendChild(el);
      }
      if(template.logo) addConfiguredLayer(template.logo.className,'',template.logo.style);
      Object.keys(template.textFields||{}).forEach(function(key){
        var field=template.textFields[key];
        addConfiguredLayer(field.className,field.defaultText,field.style);
      });
      var products=template.productZones&&template.productZones.threeProducts;
      if(products) {
        addConfiguredLayer(products.className,'',products.style);
        var productLayer = document.querySelector('.' + products.className);
        if(productLayer) productLayer.style.pointerEvents = 'none';
      }
    } else {
      var layersRaw = root.getPropertyValue('--layers').trim().replace(/^["']/,'').replace(/["']$/,'');
      if (layersRaw) {
      layersRaw.split(',').forEach(function(s) {
        s = s.trim(); if (!s) return;
        var parts = s.split('|'), cls = parts[0].trim(), txt = parts.length>1 ? parts[1].trim() : '';
        if (!cls) return;
        var el = document.createElement('div');
        el.className = cls;
        if (ctaSet[cls]) {
          var s1 = document.createElement('span'); s1.className = 'cta-text'; if(txt) s1.textContent = txt;
          var s2 = document.createElement('span'); s2.className = 'cta-arrow';
          el.appendChild(s1); el.appendChild(s2);
        } else { if(txt) el.textContent = txt; }
        canvas.appendChild(el);
      });
      }
    }

    function fit() {
      if (window.parent !== window) {
        canvas.style.transform = 'none';
        var st = document.getElementById('stage');
        if (st) { st.style.width = W+'px'; st.style.height = H+'px'; }
        return;
      }
      var sc = Math.min(window.innerWidth/W, window.innerHeight/H);
      var st = document.getElementById('stage');
      canvas.style.transform = 'scale('+sc+')';
      st.style.width  = (W*sc)+'px';
      st.style.height = (H*sc)+'px';
    }
    window.addEventListener('resize', fit);
    fit();
    if (window.parent !== window)
      window.parent.postMessage({type:'bn-iframe-ready',id:urlId||1,w:W,h:H},'*');

    /* Search_Image：動態置中 */
    if(fname.toLowerCase().indexOf('search_image') !== -1){
      /* Search_Image2：兩個 logo 各自垂直置中，水平位置由 PS CSS 決定 */
      if(fname.toLowerCase().indexOf('search_image2') !== -1 || fname.toLowerCase().indexOf('search_image3') !== -1){
        var _si23H = H;
        /* 所有 logo 範圍垂直置中 */
        ['logo範圍_左','logo範圍_中','logo範圍_右'].forEach(function(cls){
          var el = canvas.querySelector('.'+cls);
          if(!el) return;
          var elH = parseFloat(window.getComputedStyle(el).height) || 121;
          el.style.top = ((_si23H - elH) / 2) + 'px';
        });
        /* 間隔線垂直置中（支援單名和左右命名）*/
        ['.logo間隔直線','.logo間隔直線_左','.logo間隔直線_右'].forEach(function(sel){
          var el = canvas.querySelector(sel);
          if(!el) return;
          var elH = parseFloat(window.getComputedStyle(el).height) || 55;
          el.style.top = ((_si23H - elH) / 2) + 'px';
        });
        return;
      }
      var _siLogo = canvas.querySelector('.logo範圍');
      var _siText = canvas.querySelector('.副標案型七字內');
      if(_siLogo && _siText){
        var _siCanvasH = H;
        /* 文案區：紅底右邊緣 ~ CTA 左邊緣 */
        var _siRedEl  = canvas.querySelector('.蝦皮商城logo紅底');
        var _siCtaEl  = canvas.querySelector('.cta圓底');
        var _siAreaLeft  = _siRedEl  ?
          parseFloat(window.getComputedStyle(_siRedEl).left) + parseFloat(window.getComputedStyle(_siRedEl).width) : 299;
        var _siAreaRight = _siCtaEl  ?
          parseFloat(window.getComputedStyle(_siCtaEl).left) : 1007;
        var _siAreaCenter = (_siAreaLeft + _siAreaRight) / 2;

        /* logo 固定尺寸（從 CSS 讀，之後不變）*/
        var _siLogoW = parseFloat(window.getComputedStyle(_siLogo).width)  || 120;
        var _siLogoH = parseFloat(window.getComputedStyle(_siLogo).height) || 121;

        function siLayout(){
          /* canvas 縮放比例（用於把 getBoundingClientRect 轉回原始座標）*/
          var m = canvas.style.transform && canvas.style.transform.match(/scale\(([\d.]+)\)/);
          var scale = m ? parseFloat(m[1]) : 1;

          /* 副標實際視覺寬高（原始座標）
             getBoundingClientRect 回傳的是螢幕像素，除以 scale 得原始大小
             但文字有 matrix transform，用 scrollWidth 更準確 */
          var textW = _siText.scrollWidth;
          /* matrix scale 也會影響視覺寬度 */
          var matStyle = window.getComputedStyle(_siText).transform;
          var matM = matStyle && matStyle.match(/matrix\(([^,]+)/);
          var matScale = matM ? parseFloat(matM[1]) : 1;
          var visTextW = textW * matScale;

          var visTextH = parseFloat(window.getComputedStyle(_siText).fontSize) * matScale;

          /* 整體寬度：logo + 26px 間距 + 副標視覺寬 */
          var totalW = _siLogoW + 26 + visTextW;

          /* 左右置中在文案區 */
          var startX = _siAreaCenter - totalW / 2;
          _siLogo.style.left = startX + 'px';
          _siText.style.left = (startX + _siLogoW + 26) + 'px';

          /* 上下置中：logo 和文字各自垂直置中 */
          _siLogo.style.top = ((_siCanvasH - _siLogoH) / 2) + 'px';
          _siText.style.top = ((_siCanvasH - visTextH) / 2) + 'px';
        }

        /* 等字型載完再算位置，避免 fallback 字型造成 scrollWidth 偏差 */
        window._siRelayout = siLayout;
        function runSiLayout() {
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() {
              siLayout();
            });
          } else {
            /* 不支援 document.fonts：延遲兩幀保守等待 */
            requestAnimationFrame(function(){
              requestAnimationFrame(siLayout);
            });
          }
        }
        runSiLayout();
      }
    } /* end search_image */

    /* 啟用畫布文字直接編輯 */
    attachEditableToAll();
  }

  window.addEventListener('message', function(e) {
    if (!e.data) return;

    if (e.data.type === 'bn-text') {
      var d = e.data.data||{};
      ['品牌名','主標','主標可08個字以內','副標','副標07個字以內','副標案型七字內','日期','小字','不放案型日期或警語可在14個字'].forEach(function(cls) {
        if (d[cls]===undefined) return;
        document.querySelectorAll('.'+cls).forEach(function(el) {
          var ct = el.querySelector('.cta-text');
          if(ct) ct.textContent = d[cls];
          else if(!el.children.length) el.textContent = d[cls];
        });
        /* Search_Image：副標案型七字內 連動副標（雙向同步）*/
        if(cls === '副標'){
          var siEl = document.querySelector('.副標案型七字內');
          if(siEl && !siEl.children.length) {
            siEl.textContent = d[cls];
            if(typeof window._siRelayout === 'function'){
              if(document.fonts && document.fonts.ready){
                document.fonts.ready.then(function(){ window._siRelayout(); });
              } else {
                setTimeout(window._siRelayout, 150);
              }
            }
          }
        }
      });
    }

    /* 畫布直接編輯完成後，父層轉換好再推回來 */
    if (e.data.type === 'bn-text-set') {
      var cls = e.data.field;
      var val = e.data.value;
      if(!cls) return;
      document.querySelectorAll('.'+cls).forEach(function(el) {
        var ct = el.querySelector('.cta-text');
        /* 編輯中不更新，避免跟 contenteditable 衝突 */
        if(el.contentEditable === 'true') return;
        if(ct) ct.textContent = val;
        else if(!el.children.length) el.textContent = val;
      });
    }

    if (e.data.type === 'bn-color') {
      var c = e.data.data||{}, cv = document.getElementById('canvas');
      if (c.canvasBg) {
        /* 支援 .背景色 和 .bg 兩種 class 名稱 */
        var bg = cv.querySelector('.背景色') || cv.querySelector('.bg');
        if(bg) bg.style.backgroundColor = c.canvasBg; else cv.style.background = c.canvasBg;
        /* 漸層顏色跟著背景色同步（讀 CSS --grad-dir 變數）*/
        /* 漸層顏色同步：transparent → rgba(r,g,b,0) 避免截圖變黑 */
        function _toRgba0rt(color){
          var m=color.match(/rgb[a]?\((\d+),\s*(\d+),\s*(\d+)/);
          if(m) return 'rgba('+m[1]+','+m[2]+','+m[3]+',0)';
          var h=color.replace('#','');
          if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
          if(h.length===6) return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+',0)';
          return 'rgba(0,0,0,0)';
        }
        var _dirsRt = {'漸層左':'to right','漸層右':'to left','漸層上':'to bottom','漸層下':'to top'};
        ['漸層左','漸層右','漸層上','漸層下'].forEach(function(cls){
          var gel = cv.querySelector('.'+cls);
          if(!gel) return;
          var dir = _dirsRt[cls] || window.getComputedStyle(gel).getPropertyValue('--grad-dir').trim();
          if(dir){
            gel.style.background = 'linear-gradient(' + dir + ', ' + c.canvasBg + ' 0%, ' + _toRgba0rt(c.canvasBg) + ' 100%)';
          }
        });
        /* 所有保護色塊跟著背景色同步 */
        ['.文案保護','.右側保護','.左側保護','.上方保護','.下方保護','.上保護','.下保護'].forEach(function(sel){
          var el = cv.querySelector(sel);
          if(el) el.style.background = c.canvasBg;
        });
        /* .bg 純色塊也同步（Coin 等版位） */
        var bgEl2 = cv.querySelector('.bg');
        if(bgEl2 && !cv.querySelector('.背景色')) bgEl2.style.backgroundColor = c.canvasBg;
      }
      function ac(cls,col){ if(!col)return; document.querySelectorAll('.'+cls).forEach(function(el){ if(!el.querySelector('.cta-text')) el.style.color=col; }); }
      ac('主標',c.mainText); ac('副標',c.subText); ac('日期',c.dateText); ac('品牌名',c.brandText);
      /* Search_Image：副標案型七字內 顏色鎖定白色，不跟 subText 連動 */
      document.querySelectorAll('.副標案型七字內').forEach(function(el){ el.style.color='#ffffff'; });
      document.querySelectorAll('.cta-text').forEach(function(el){ if(c.ctaText) el.style.color=c.ctaText; });
      document.querySelectorAll('.cta-arrow').forEach(function(el){ if(c.ctaText) el.style.borderLeftColor=c.ctaText; });
      /* CTA 底色：.逛逛去按鈕 / .cta底 / .逛逛去底 */
      document.querySelectorAll('.逛逛去按鈕,.cta底,.逛逛去底').forEach(function(el){ if(c.ctaBg) el.style.backgroundColor=c.ctaBg; });
      /* CTA 文字色：.放心買_安心退 / .逛逛去 */
      document.querySelectorAll('.放心買_安心退,.逛逛去').forEach(function(el){ if(c.ctaText) el.style.color=c.ctaText; });
      /* CTA 三角色：.cta三角標 / .逛逛去三角標 */
      document.querySelectorAll('.cta三角標').forEach(function(el){ if(c.ctaText) el.style.borderLeftColor=c.ctaText; });
      document.querySelectorAll('.逛逛去三角標').forEach(function(el){ if(c.ctaText) el.style.borderLeftColor=c.ctaText; });
    }

    if (e.data.type === 'bn-logo' || e.data.type === 'bn-logos') {
      var zone = null;
      /* Search_Image2：依 logo index 分左右 zone */
      var _fname2 = decodeURIComponent(location.pathname.split('/').pop()).toLowerCase();
      if(_fname2.indexOf('search_image2') !== -1 || _fname2.indexOf('search_image3') !== -1){
        var logos2 = Array.isArray(e.data.logos) ? e.data.logos :
                     (e.data.src ? [e.data] : []);
        var _is3 = _fname2.indexOf('search_image3') !== -1;
        /* 2logo：左/右；3logo：左/中/右 */
        var _zoneNames = _is3
          ? ['logo範圍_左','logo範圍_中','logo範圍_右']
          : ['logo範圍_左','logo範圍_右'];
        function _siPlaceLogo(zn, lg){
          if(!zn||!lg) return;
          Array.from(zn.querySelectorAll('img.bn-logo-img')).forEach(function(i){i.remove();});
          zn.style.background = 'transparent'; zn.style.opacity = '1'; zn.style.overflow = 'hidden';
          zn.style.display = 'flex'; zn.style.alignItems = 'center'; zn.style.justifyContent = 'center';
          var img = new Image(); img.className = 'bn-logo-img';
          img.style.cssText = 'max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;pointer-events:none;display:block;';
          if(lg.round) img.style.borderRadius = '50%';
          img.src = lg.src;
          zn.appendChild(img);
        }
        _zoneNames.forEach(function(cls, i){
          var zn = document.querySelector('.'+cls);
          if(logos2[i]) _siPlaceLogo(zn, logos2[i]);
        });
        return;
      }
      var logoClass = template && template.logo && template.logo.className;
      if (logoClass) zone = document.querySelector('.' + logoClass);
      ['logo範圍','LOGO範圍'].forEach(function(n){ if(!zone){ var z=document.querySelector('.'+n); if(z) zone=z; } });
      if (!zone) return;

      var logos = [];
      if (e.data.type === 'bn-logos') logos = e.data.logos || [];
      else if (e.data.dataUrl) logos = [{id:'single', src:e.data.dataUrl}];

      Array.from(zone.querySelectorAll('img.bn-logo-img')).forEach(function(el){el.remove();});

      if (!logos.length) { zone.style.display = 'none'; return; }

      var _logoConfig=(template&&template.logo)||{};
      var _logoStyle=_logoConfig.style||{};
      var _logoLayout=_logoConfig.layout||{};
      var _maxLogos=Math.max(1,numberValue(_logoConfig.max,logos.length));
      logos=logos.slice(0,_maxLogos);
      var _BH = numberValue(_logoLayout.blockHeight,styleNumber(_logoStyle,'height',zone.clientHeight));
      var _MAXW = numberValue(_logoLayout.maxWidth,styleNumber(_logoStyle,'width',zone.clientWidth));
      var _HMAX = numberValue(_logoLayout.maxLogoHeight,_BH);
      var _VPAD = numberValue(_logoLayout.verticalPadding,0);
      var _HPAD = numberValue(_logoLayout.horizontalPadding,0);
      var _GAP = numberValue(_logoLayout.gap,0);
      var _CW = numberValue(_logoLayout.canvasWidth,numberValue(template&&template.width,zone.parentElement&&zone.parentElement.clientWidth));
      var _shrinkToContent = _logoLayout.shrinkToContent !== false;
      var _logoAlign = _logoLayout.align || 'center';
      var _configuredLeft = styleNumber(_logoStyle,'left',Math.round((_CW-_MAXW)/2));
      var _borderRadius = _logoLayout.borderRadius || _logoStyle.borderRadius || '0px';
      var _itemBorderRadius = _logoLayout.itemBorderRadius || _borderRadius;
      var _n = logos.length;
      var _ratios = logos.map(function(){ return 1; });
      var _loaded = 0;

      logos.forEach(function(lg, i) {
        var tmp = new Image();
        tmp.onload = function() {
          _ratios[i] = tmp.naturalWidth / (tmp.naturalHeight || 1);
          if (++_loaded === _n) _renderTVBN();
        };
        tmp.onerror = function() { if (++_loaded === _n) _renderTVBN(); };
        tmp.src = lg.src;
      });

      function _renderTVBN() {
        var pad = _HPAD * 2 + _GAP * Math.max(0,_n - 1);
        var sumR = _ratios.reduce(function(a, b){ return a + b; }, 0);
        var H = (pad + _HMAX * sumR > _MAXW) ? (_MAXW - pad) / sumR : _HMAX;
        H = Math.min(H,Math.max(1,_BH-_VPAD*2));
        H = Math.max(1, Math.floor(H));
        var widths = _ratios.map(function(r){ return Math.round(H * r); });
        var logoGroupW = widths.reduce(function(a, b){ return a + b; }, 0) + _GAP*Math.max(0,_n-1);
        var cW = _shrinkToContent ? (_HPAD*2+logoGroupW) : _MAXW;
        Array.from(zone.querySelectorAll('img.bn-logo-img')).forEach(function(el){el.remove();});
        zone.style.display = 'block';
        zone.style.height  = _BH + 'px';
        zone.style.width   = cW + 'px';
        zone.style.left    = (_shrinkToContent && _logoAlign !== 'left' ? Math.round((_CW-cW)/2) : _configuredLeft) + 'px';
        zone.style.borderRadius = _borderRadius;
        var x = _shrinkToContent ? _HPAD : Math.round((cW-logoGroupW)/2);
        logos.forEach(function(lg, i) {
          var img = new Image(); img.className = 'bn-logo-img';
          img.src = lg.src;
          var _top = Math.round((_BH - H) / 2);
          img.style.cssText = 'position:absolute;left:' + x + 'px;top:' + _top + 'px;width:' + widths[i] + 'px;height:' + H + 'px;object-fit:contain;pointer-events:none;' + (lg.round ? 'border-radius:'+_itemBorderRadius+';' : '');
          zone.appendChild(img);
          x += widths[i] + _GAP;
        });
      }
    }

    if(e.data.type==='bn-layout-state-request'){
      notifyLayoutState();
      return;
    }

    if(e.data.type==='bn-layout-state-apply'){
      applyLayoutState(e.data.state||{});
      return;
    }

    /* 商品新增 */
    if (e.data.type === 'bn-product-add') {
      var pzone = getProductZone(); if(!pzone) return;
      pzone.style.background = 'transparent'; pzone.style.opacity = '1';
      pzone.style.pointerEvents = 'auto';
      var _pzStyle = template&&template.productZones&&template.productZones.threeProducts&&template.productZones.threeProducts.style;
      pzone.style.overflow = (_pzStyle&&_pzStyle.overflow) || 'hidden';
      pzone.style.position = 'relative';
      var box = document.createElement('div');
      box.className = 'bn-prod-box'; box.dataset.id = e.data.id; box.dataset.ratio = e.data.ratio||1;
      box.dataset.sizeScale = e.data.sizeScale||1;
      box.dataset.position  = e.data.position !== undefined ? e.data.position : e.data.index || 0;
      box.dataset.baselineRatio = e.data.baselineRatio||1;
      var pimg = document.createElement('img'); pimg.src = e.data.src;
      pimg.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;display:block;';
      box.appendChild(pimg);
      ['nw','ne','sw','se'].forEach(function(c){
        var h = document.createElement('div'); h.dataset.corner = c;
        h.setAttribute('data-html2canvas-ignore','true');
        h.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;background:#4a90e2;border:2px solid #fff;z-index:5;'
          +(c==='nw'?'left:-7px;top:-7px;cursor:nwse-resize;':'')
          +(c==='ne'?'right:-7px;top:-7px;cursor:nesw-resize;':'')
          +(c==='sw'?'left:-7px;bottom:-7px;cursor:nesw-resize;':'')
          +(c==='se'?'right:-7px;bottom:-7px;cursor:nwse-resize;':'');
        box.appendChild(h);
      });
      pzone.appendChild(box);
      setupProdDrag(box, pzone);

      var _pos = String(box.dataset.position || '0');
      var _saved = _boxStates[_pos];
      if(_saved){
        /* 還原上次手動調整的位置、大小、旋轉（one-time use，用後清除） */
        delete _boxStates[_pos];
        box.dataset.userAdjusted = '1';
        box.dataset.rotation = _saved.rotation;
        var _rot = parseFloat(_saved.rotation);
        box.style.cssText = [
          'position:absolute;',
          'left:'+_saved.left+';top:'+_saved.top+';',
          'width:'+_saved.width+';height:'+_saved.height+';',
          'cursor:move;box-sizing:border-box;',
          'outline:2px solid transparent;',
          'transform-origin:50% 50%;',
          _saved.zIndex ? 'z-index:'+_saved.zIndex+';' : 'z-index:15;',
          _rot ? 'transform:rotate('+_rot+'deg);' : '',
        ].join('');
      } else {
        var _existingBoxes = Array.from(pzone.querySelectorAll('.bn-prod-box'));
        var _otherBoxes = _existingBoxes.filter(function(b){ return b !== box; });
        var _anyAdjusted = _otherBoxes.some(function(b){ return b.dataset.userAdjusted === '1'; });
        if(_anyAdjusted){
          layoutNewBoxDefault(box, pzone);
        } else {
          layoutProducts(pzone);
        }
      }
      setTimeout(notifyLayoutState,30);
    }

    if (e.data.type === 'bn-product-reset-layout' || e.data.type === 'bn-reset-products') {
      console.log('[reset] request received products');
      _boxStates = {};
      var resetZone = getProductZone();
      if(resetZone){
        Array.from(resetZone.querySelectorAll('.bn-prod-box')).forEach(function(box){
          if(window.BNBoxTransformUtils && window.BNBoxTransformUtils.resetTransform){
            window.BNBoxTransformUtils.resetTransform(box);
          }else{
            delete box.dataset.userAdjusted;
            box.dataset.rotation = '0';
            box.style.transform = '';
          }
        });
        console.log('[reset] products transform cleared');
        layoutProducts(resetZone);
        console.log('[reset] products template layout applied');
        notifyLayoutState();
      }
      return;
    }

    if (e.data.type === 'bn-product-remove') {
      var pzone = getProductZone(); if(!pzone) return;
      var el = pzone.querySelector('.bn-prod-box[data-id="'+e.data.id+'"]');
      if(el){
        if(el.dataset.userAdjusted === '1'){
          var _rpos = String(el.dataset.position || '0');
          _boxStates[_rpos] = {
            left:     el.style.left,
            top:      el.style.top,
            width:    el.style.width,
            height:   el.style.height,
            rotation: el.dataset.rotation || '0',
            zIndex:   el.style.zIndex || '',
          };
        }
        el.remove();
      }
      var remaining = Array.from(pzone.querySelectorAll('.bn-prod-box'));
      if(!remaining.length){ pzone.style.background=''; pzone.style.opacity=''; pzone.style.pointerEvents='none'; }
      else if(remaining.some(function(b){ return b.dataset.userAdjusted === '1'; })){
        /* 有手動調整過的 box，保留原位不重排 */
      } else {
        layoutProducts(pzone);
      }
      notifyLayoutState();
    }

    /* z-index 順序更新：order[0] = 最上層（z 最高） */
    if (e.data.type === 'bn-product-zorder') {
      var pzone = getProductZone(); if(!pzone) return;
      var order = e.data.order || [];
      var total = order.length;
      order.forEach(function(id, i){
        var box = pzone.querySelector('.bn-prod-box[data-id="'+id+'"]');
        if(box) box.style.zIndex = String(total - i + 10);
      });
      notifyLayoutState();
    }

    /* 空間位置更新：換排序後更新 data-position 並重新 layout */
    if (e.data.type === 'bn-product-reposition') {
      var pzone = getProductZone(); if(!pzone) return;
      (e.data.positions || []).forEach(function(item){
        var box = pzone.querySelector('.bn-prod-box[data-id="'+item.id+'"]');
        if(box) box.dataset.position = String(item.position);
      });
      layoutProducts(pzone);
      notifyLayoutState();
    }

    /* 背景圖：放到 .背景色（如有）或畫布底層 */
    if (e.data.type === 'bn-bg') {
      /* 支援 .背景色 和 .bg 兩種 class 名稱 */
      var bgContainer = document.querySelector('.背景色') || document.querySelector('.bg');
      var bimg2 = document.getElementById('底圖');
      var bgSrc   = e.data.src   || null;
      var bgFit   = e.data.fit   || 'cover';
      var bgScale = e.data.scale !== undefined ? e.data.scale : 100;
      var bgX     = e.data.x     !== undefined ? e.data.x     : 50;
      var bgY     = e.data.y     !== undefined ? e.data.y     : 50;

      /* background-size 根據模式計算 */
      var bgSize, bgPos;
      if(bgFit === 'cover'){
        bgSize = 'cover';
        bgPos  = bgX + '% ' + bgY + '%';
      } else if(bgFit === 'contain'){
        bgSize = 'contain';
        bgPos  = bgX + '% ' + bgY + '%';
      } else {
        /* 原尺寸（auto）：用 background-size 百分比，從中心縮放
           技巧：position 設 50% 50%，size 設 scale%，
           這樣圖片中心固定在容器中心，往外放大 */
        bgSize = bgScale + '%';
        /* 以中心為基準：position 固定在 50% 50%，
           再用 background-position-x/y 微調偏移 */
        var offsetX = bgX - 50;  /* -50~+50 */
        var offsetY = bgY - 50;
        bgPos = 'calc(50% + ' + offsetX + '%) calc(50% + ' + offsetY + '%)';
      }

      if(bgSrc){
        if(bgContainer){
          bgContainer.style.backgroundImage    = 'url(' + bgSrc + ')';
          bgContainer.style.backgroundSize     = bgSize;
          bgContainer.style.backgroundPosition = bgPos;
          bgContainer.style.backgroundRepeat   = 'no-repeat';
        } else {
          if(bimg2){
            bimg2.src = bgSrc;
            bimg2.style.display = 'block';
            bimg2.style.objectFit = bgFit === 'auto' ? 'none' : bgFit;
            bimg2.style.objectPosition = bgPos;
            if(bgFit === 'auto') bimg2.style.transform = 'scale(' + bgScale/100 + ')';
          }
        }
      } else {
        if(bgContainer) bgContainer.style.backgroundImage = '';
        if(bimg2){ bimg2.src=''; bimg2.style.display='none'; bimg2.style.transform=''; }
      }
      return;
    }

    /* 底圖核對：疊加半透明底圖 */
    if (e.data.type === 'bn-bg-overlay') {
      var overlay = document.getElementById('_bn_bg_overlay');
      if(!overlay){
        overlay = document.createElement('img');
        overlay.id = '_bn_bg_overlay';
        overlay.style.cssText = [
          'position:absolute;top:0;left:0;',
          'width:100%;height:100%;',
          'object-fit:contain;object-position:top left;',
          'z-index:9999;pointer-events:none;',
          'opacity:0.5;',
        ].join('');
        document.getElementById('canvas').appendChild(overlay);
      }
      if(e.data.src){
        overlay.style.display = 'none'; /* 先隱藏，load 成功再顯示 */
        overlay.onerror = function(){ overlay.style.display = 'none'; };
        overlay.onload  = function(){ overlay.style.display = 'block'; };
        overlay.src = e.data.src;
      } else {
        overlay.style.display = 'none';
        overlay.src = '';
      }
      return;
    }

    if (e.data.type === 'bn-capture') {
      console.log('[canvas][capture] request received msgId=' + (e.data.msgId || ''));
      console.log('[canvas][capture] handler start');
      var _cv = document.getElementById('canvas');

      /* 隱藏所有編輯用控制元素（縮放點等），截完再還原 */
      var _editEls = [];
      if(_cv){
        _cv.querySelectorAll('[data-corner],[data-rot-handle]').forEach(function(h){
          _editEls.push({el:h, disp:h.style.display});
          h.style.display = 'none';
        });
      }

      captureCanvas(function(dataUrl){
        _editEls.forEach(function(o){ o.el.style.display = o.disp; });
        var output=template&&template.output||{};
        console.log('[canvas][capture] capture finish dataUrlLen=' + String(dataUrl || '').length);
        console.log('[canvas][capture] post bn-snapshot msgId=' + (e.data.msgId || ''));
        window.parent.postMessage({
          type:'bn-snapshot',
          msgId:e.data.msgId,
          dataUrl:dataUrl,
          width:Number(output.width)||Number(template&&template.width)||1080,
          height:Number(output.height)||Number(template&&template.height)||1920
        },'*');
      });
    }
  });

  /* 正三角排品（仿 freelyapp 邏輯）
     主品（第0張）居中最大，左配品（第1張）次之，右配品（第2張）最小
     底部對齊，所有尺寸以商品範圍 px 為單位，不超出邊界 */
  function layoutProducts(pzone) {
    var allBoxes = Array.from(pzone.querySelectorAll('.bn-prod-box'));
    var n = allBoxes.length; if(!n) return;

    /* 依 position 排序：0=主品，1=左配，2=右配 */
    var boxes = allBoxes.slice().sort(function(a,b){
      return (parseInt(a.dataset.position)||0) - (parseInt(b.dataset.position)||0);
    });

    /* 從 CSS 直接讀取 zone 的 width/height（不受 iframe 縮放影響） */
    var cs   = window.getComputedStyle(pzone);
    var zw   = parseFloat(cs.width)  || pzone.offsetWidth  || 400;
    var zh   = parseFloat(cs.height) || pzone.offsetHeight || 300;
    var layoutCfg=template&&template.productZones&&template.productZones.threeProducts&&template.productZones.threeProducts.defaultLayout||{};
    var PAD = numberValue(layoutCfg.padding,0);
    var GAP = n > 1 ? numberValue(layoutCfg.gap,0) : 0;
    var maxHeightRatio = numberValue(layoutCfg.maxHeightRatio,1);
    var topPadding = numberValue(layoutCfg.topPadding,0);
    var bottomPadding = numberValue(layoutCfg.bottomPadding,0);
    var ctaGap = numberValue(layoutCfg.ctaGap,0);
    var ctaHeightRatio = numberValue(layoutCfg.ctaHeightRatio,1);
    var heightCentered = layoutCfg.layoutMode === 'heightCentered';
    var heightBottom = layoutCfg.layoutMode === 'heightBottom';
    var heightBodyCentered = layoutCfg.layoutMode === 'heightBodyCentered';

    /* 寬高比 */
    var ratios = boxes.map(function(b){ return Math.max(0.1, parseFloat(b.dataset.ratio)||0.75); });
    var baselines = boxes.map(function(b){
      return Math.max(0.05,Math.min(1,parseFloat(b.dataset.baselineRatio)||1));
    });

    /* 大小比例：主品1.0，左0.85，右0.72 */
    var wsMap = Array.isArray(layoutCfg.sizeRatios) ? layoutCfg.sizeRatios : [1];
    var ov = numberValue(layoutCfg.overlap,0);
    var overlapRatio = Math.max(0,Math.min(0.95,numberValue(layoutCfg.overlapRatio,0)));

    var r0 = ratios[0];
    var r1 = n>=2 ? ratios[1] : 0;
    var r2 = n>=3 ? ratios[2] : 0;
    var ws1 = n>=2 ? wsMap[1] : 0;
    var ws2 = n>=3 ? wsMap[2] : 0;

    /* heightBottom / heightBodyCentered 模式：本體高度基準（影子延伸到 zone 外）*/
    var maxH0 = (heightBottom || heightBodyCentered)
      ? Math.floor(zh * maxHeightRatio / Math.max(0.5, baselines[0]))
      : Math.floor(zh * maxHeightRatio);
    var ctaEl = document.querySelector('.cta底');
    if(ctaEl){
      var ctaTop    = parseFloat(window.getComputedStyle(ctaEl).top)   || 0;
      var pzoneTop  = parseFloat(window.getComputedStyle(pzone).top)   || 0;
      var ctaRelTop = ctaTop - pzoneTop - ctaGap;
      if(ctaRelTop > 0 && ctaRelTop < zh){
        maxH0 = Math.min(maxH0, Math.floor(ctaRelTop * ctaHeightRatio));
      }
    }

    /* 算主品寬度：讓三張總寬不超出可用寬（留 PAD*2） */
    /* 主品寬 w0，左品寬 w1=ws1*h0*r1，右品寬 w2=ws2*h0*r2 */
    /* h0 = w0/r0；總寬 = w0 + w1 + w2 = w0(1 + ws1*r1/r0 + ws2*r2/r0) */
    var spanFactor = 1 + ws1*r1/r0 + ws2*r2/r0
      - (n>=2 ? overlapRatio*ws1*r1/r0 : 0)
      - (n>=3 ? overlapRatio*ws2*r2/r0 : 0);
    var avail = zw - PAD*2 - GAP*(n-1) + ov*Math.max(0,n-1);
    var h0 = maxH0;
    var w0 = h0 * r0;
    var naturalGroupWidth = w0 * spanFactor + GAP*(n-1) - ov*Math.max(0,n-1);
    if(naturalGroupWidth > zw-PAD*2){
      var fitScale = (zw-PAD*2-GAP*(n-1)+ov*Math.max(0,n-1)) / (w0*spanFactor);
      fitScale = Math.max(0,Math.min(1,fitScale));
      h0 *= fitScale;
      w0 *= fitScale;
    }

    var w1 = n>=2 ? Math.round(ws1*h0*r1) : 0;
    var h1 = n>=2 ? Math.round(ws1*h0)    : 0;
    var w2 = n>=3 ? Math.round(ws2*h0*r2) : 0;
    var h2 = n>=3 ? Math.round(ws2*h0)    : 0;
    var overlapLeft = n>=2 ? Math.round(w1*overlapRatio)+ov : 0;
    var overlapRight = n>=3 ? Math.round(w2*overlapRatio)+ov : 0;

    w0 = Math.round(w0); h0 = Math.round(h0);

    /* 底部 y 位置：優先使用 CTA 頂部上方，否則用 zone 底部 */
    var zoneBottom = zh - bottomPadding;
    if(ctaEl){
      var ctaTop2   = parseFloat(window.getComputedStyle(ctaEl).top)  || 0;
      var pzoneTop2 = parseFloat(window.getComputedStyle(pzone).top)  || 0;
      var ctaRel2   = ctaTop2 - pzoneTop2 - ctaGap;
      if(ctaRel2 > 0 && ctaRel2 < zh) zoneBottom = ctaRel2;
    }

    /* 以商品本體底線對齊；heightCentered 模式則改為各商品上下置中。 */
    var zoneTop = topPadding;
    var zoneH   = zoneBottom - zoneTop;
    var heights=[h0,h1,h2].slice(0,n);
    var maxAbove=0,maxBelow=0;
    heights.forEach(function(height,index){
      maxAbove=Math.max(maxAbove,height*baselines[index]);
      maxBelow=Math.max(maxBelow,height*(1-baselines[index]));
    });
    var visualBaseline=zoneTop+Math.floor((zoneH+maxAbove-maxBelow)/2);
    visualBaseline=Math.max(zoneTop+maxAbove,Math.min(visualBaseline,zoneBottom-maxBelow));
    /* heightBodyCentered：整組本體底部對齊同一條線，整組置中於 zone（影子延伸至 zone 外） */
    var commonBodyBottom=zoneTop+Math.floor((zoneH+maxAbove)/2);
    function productY(height,index){
      if(heightBottom) return zoneBottom-Math.round(height*baselines[index]);
      if(heightBodyCentered) return commonBodyBottom-Math.round(height*baselines[index]);
      return heightCentered
        ? zoneTop+Math.floor((zoneH-height)/2)
        : visualBaseline-height*baselines[index];
    }

    /* 水平：主品居中，左品在左，右品在右 */
    var totalW = w0 + (n>=2 ? w1+GAP-overlapLeft : 0) + (n>=3 ? w2+GAP-overlapRight : 0);
    var startX = Math.max(PAD, Math.floor((zw - totalW) / 2));

    /* 排列順序：左品、主品、右品（視覺上中間最大） */
    var positions = [];
    if(n===1){
      positions = [{box:boxes[0], x:startX, y:productY(h0,0), w:w0, h:h0}];
    } else if(n===2){
      /* 左=小，右=主 or 左=主，右=小 → 左配+主 */
      positions = [
        {box:boxes[1], x:startX,          y:productY(h1,1), w:w1, h:h1},
        {box:boxes[0], x:startX+w1+GAP-overlapLeft,   y:productY(h0,0), w:w0, h:h0},
      ];
    } else {
      positions = [
        {box:boxes[1], x:startX,              y:productY(h1,1), w:w1, h:h1},
        {box:boxes[0], x:startX+w1+GAP-overlapLeft,       y:productY(h0,0), w:w0, h:h0},
        {box:boxes[2], x:startX+w1+GAP-overlapLeft+w0+GAP-overlapRight, y:productY(h2,2), w:w2, h:h2},
      ];
    }

    positions.forEach(function(p, i){
      if(p.box.dataset.userAdjusted === '1') return;
      var rot = parseFloat(p.box.dataset.rotation || '0');
      p.box.style.cssText = [
        'position:absolute;',
        'left:'+p.x+'px;top:'+p.y+'px;',
        'width:'+p.w+'px;height:'+p.h+'px;',
        'cursor:move;box-sizing:border-box;',
        'outline:2px solid transparent;',
        'transform-origin:50% 50%;',
        'z-index:'+(15-i)+';',
        rot ? 'transform:rotate('+rot+'deg);' : '',
      ].join('');
    });

    /* 套用 objectPosition（如 JSON 設定 "center bottom" 可讓商品圖片貼齊 box 底部） */
    var _objPos = layoutCfg.objectPosition || '';
    if (_objPos) {
      positions.forEach(function(p) {
        var img = p.box.querySelector('img');
        if (img) img.style.objectPosition = _objPos;
      });
    }
  }

  function layoutNewBoxDefault(box, pzone){
    var cs = window.getComputedStyle(pzone);
    var zw = parseFloat(cs.width)  || pzone.offsetWidth  || 400;
    var zh = parseFloat(cs.height) || pzone.offsetHeight || 300;
    var r  = Math.max(0.1, parseFloat(box.dataset.ratio) || 0.75);
    var layoutCfg=template&&template.productZones&&template.productZones.threeProducts&&template.productZones.threeProducts.defaultLayout||{};
    var initialHeightRatio=numberValue(layoutCfg.initialHeightRatio,0.55);
    var initialMaxWidthRatio=numberValue(layoutCfg.initialMaxWidthRatio,0.65);
    var h  = zh * initialHeightRatio;
    var w  = h * r;
    if(w > zw * initialMaxWidthRatio){ w = zw * initialMaxWidthRatio; h = w / r; }
    h = Math.round(h); w = Math.round(w);
    box.style.cssText = [
      'position:absolute;',
      'left:'+Math.round((zw-w)/2)+'px;',
      'top:'+Math.round((zh-h)/2)+'px;',
      'width:'+w+'px;height:'+h+'px;',
      'cursor:move;box-sizing:border-box;',
      'outline:2px solid transparent;',
      'transform-origin:50% 50%;',
      'z-index:15;',
    ].join('');
  }

  var _boxStates = {};   /* {position: {left,top,width,height,rotation,zIndex}} */

  function collectLayoutState(){
    var zone=getProductZone();
    var products=[];
    if(zone){
      Array.from(zone.querySelectorAll('.bn-prod-box')).forEach(function(box){
        products.push({
          id:box.dataset.id||'',
          position:Number(box.dataset.position)||0,
          left:box.style.left||'',
          top:box.style.top||'',
          width:box.style.width||'',
          height:box.style.height||'',
          rotation:Number(box.dataset.rotation)||0,
          zIndex:box.style.zIndex||'',
          userAdjusted:box.dataset.userAdjusted==='1'
        });
      });
    }
    var single=document.querySelector('#bn-zone-singleprod .bn-single-product-box');
    var personZone=document.getElementById('bn-zone-person');
    var singleState=single && window.BNBoxTransformUtils
      ? window.BNBoxTransformUtils.collectBoxTransform(single)
      : {};
    return {
      products:products,
      person:personZone ? {
        left:personZone.style.left||'',
        top:personZone.style.top||''
      } : {},
      singleProduct:Object.assign(singleState,{
        offsetX:single ? (Number(single.dataset.offsetX)||0) : 0,
        offsetY:single ? (Number(single.dataset.offsetY)||0) : 0
      })
    };
  }

  function notifyLayoutState(){
    try{window.parent.postMessage({type:'bn-layout-state',state:collectLayoutState()},'*');}catch(error){
      console.warn('[LayoutRuntime] 無法回傳版位狀態。',error);
    }
  }
  window._bnNotifyLayoutState=notifyLayoutState;

  function applyLayoutState(state){
    var zone=getProductZone();
    if(zone&&state&&Array.isArray(state.products)){
      state.products.forEach(function(saved){
        var box=saved.id ? zone.querySelector('.bn-prod-box[data-id="'+saved.id+'"]') : null;
        if(!box) box=zone.querySelector('.bn-prod-box[data-position="'+saved.position+'"]');
        if(!box) return;
        if(saved.left) box.style.left=saved.left;
        if(saved.top) box.style.top=saved.top;
        if(saved.width) box.style.width=saved.width;
        if(saved.height) box.style.height=saved.height;
        if(saved.zIndex) box.style.zIndex=saved.zIndex;
        box.dataset.rotation=String(Number(saved.rotation)||0);
        box.style.transform=Number(saved.rotation)?'rotate('+Number(saved.rotation)+'deg)':'';
        if(saved.userAdjusted) box.dataset.userAdjusted='1';
      });
    }
    if(state&&state.singleProduct){
      var single=document.querySelector('#bn-zone-singleprod .bn-single-product-box');
      if(single){
        var singleZone=document.getElementById('bn-zone-singleprod');
        var baseLeft=Number(single.dataset.baseLeft)||0;
        var baseTop=Number(single.dataset.baseTop)||0;
        var singleCfg=template&&template.productZones&&template.productZones.singleProduct||{};
        var singleDefaults=singleCfg.defaultLayout||{};
        var zoneWidth=(singleZone&&singleZone.clientWidth)||styleNumber(singleCfg.style,'width',numberValue(singleDefaults.maxWidth,0));
        var zoneHeight=(singleZone&&singleZone.clientHeight)||styleNumber(singleCfg.style,'height',numberValue(singleDefaults.maxHeight,0));
        var dragBounds=singleDefaults.dragBounds||{};
        var visibleX=1;
        var visibleY=1;
        var boxWidth=single.offsetWidth||parseFloat(single.style.width)||0;
        var boxHeight=single.offsetHeight||parseFloat(single.style.height)||0;
        var minX=-(boxWidth*(1-visibleX))-baseLeft;
        var maxX=zoneWidth-(boxWidth*visibleX)-baseLeft;
        var minY=-(boxHeight*(1-visibleY))-baseTop;
        var maxY=zoneHeight-(boxHeight*visibleY)-baseTop;
        var offsetX=Math.max(minX,Math.min(maxX,Number(state.singleProduct.offsetX)||0));
        var offset=Math.max(minY,Math.min(maxY,Number(state.singleProduct.offsetY)||0));
        single.dataset.offsetX=String(offsetX);
        single.dataset.offsetY=String(offset);
        single.style.left=(baseLeft+offsetX)+'px';
        single.style.top=(baseTop+offset)+'px';
        if(window.BNBoxTransformUtils){
          window.BNBoxTransformUtils.applyBoxTransform(single,state.singleProduct);
        }
      }
    }
    if(state&&state.person){
      var personZone=document.getElementById('bn-zone-person');
      if(personZone){
        if(state.person.left) personZone.style.left=state.person.left;
        if(state.person.top) personZone.style.top=state.person.top;
      }
    }
    notifyLayoutState();
  }

  function getProductZone(){
    var configured=template&&template.productZones&&template.productZones.threeProducts&&template.productZones.threeProducts.className;
    if(configured){
      var configuredZone=document.querySelector('.'+configured);
      if(configuredZone)return configuredZone;
    }
    var names=['商品範圍','商品圖範圍'];
    for(var i=0;i<names.length;i++){ var z=document.querySelector('.'+names[i]); if(z)return z; }
    return null;
  }

  function setupProdDrag(box,zone){
    var threeCfg=template&&template.productZones&&template.productZones.threeProducts||{};
    var layoutCfg=threeCfg.defaultLayout||{};
    var dragBounds=layoutCfg.dragBounds||{};
    if(!window.BNBoxTransformUtils){
      console.warn('[LayoutRuntime] 找不到共用商品 transform 工具。');
      return;
    }
    window.BNBoxTransformUtils.attachBoxTransform(box,zone,{
      configStyle:threeCfg.style||{},
      dragBounds:dragBounds,
      onChange:notifyLayoutState
    });
  }

  /* ── 畫布文字直接點擊編輯 ── */
  var EDITABLE_CLASSES = ['主標','主標可08個字以內','副標','副標07個字以內','副標案型七字內','日期','品牌名','小字','不放案型日期或警語可在14個字'];
  /* ── 字數計算（中文1字，英數0.5字） ── */
  var CHAR_LIMITS = { '品牌名':9, '主標':8, '主標可08個字以內':8, '副標':7, '副標07個字以內':7, '副標案型七字內':7, '日期':14, '小字':14, '不放案型日期或警語可在14個字':14 };

  function calcUnits(text){
    var units = 0;
    for(var i=0; i<text.length; i++){
      var c = text.charCodeAt(i);
      /* 中文、全形等 CJK 算 1，其餘算 0.5 */
      units += (c > 0x2E7F) ? 1 : 0.5;
    }
    return Math.round(units * 10) / 10;
  }

  function updateCharCounter(el, cls){
    var limit = CHAR_LIMITS[cls];
    if(!limit) return;
    var counter = document.getElementById('_bn_counter_'+cls);
    if(!counter) return;
    var text = el.textContent;
    var used = calcUnits(text);
    counter.textContent = used.toFixed(1) + ' / ' + limit + ' 字';
    counter.style.color = used > limit ? '#ef4444' : used > limit * 0.85 ? '#f59e0b' : '#687090';
  }

  function showCounter(el, cls){
    /* 通知父層（BN編輯器）更新字數顯示 */
    if(window.parent !== window){
      var limit = CHAR_LIMITS[cls] || 0;
      var used  = calcUnits(el.textContent);
      window.parent.postMessage({
        type:'bn-char-count', field:cls, used:used, limit:limit
      }, '*');
    }
  }

  function hideCounter(cls){
    if(window.parent !== window){
      window.parent.postMessage({type:'bn-char-count', field:cls, used:null}, '*');
    }
  }

  function enforceLimit(el, cls){
    var limit = CHAR_LIMITS[cls];
    if(!limit) return;
    var text = el.textContent;
    var units = calcUnits(text);
    if(units <= limit) return;
    /* 截斷到限制 */
    var out = '';
    var sum = 0;
    for(var i=0; i<text.length; i++){
      var c = text.charCodeAt(i);
      var w = (c > 0x2E7F) ? 1 : 0.5;
      if(sum + w > limit) break;
      out += text[i];
      sum += w;
    }
    /* 保留游標位置 */
    var sel = window.getSelection();
    el.textContent = out;
    /* 游標移到尾端 */
    var r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  /* ── makeEditable ── */
  function makeEditable(el, cls){
    if(el.dataset.bnEditBound === '1') return;
    el.dataset.bnEditBound = '1';
    el.style.cursor = 'text';

    var _editing = false;
    var _rightClickPending = false;  /* 右鍵選單開啟中，阻止 blur 關閉編輯 */

    function startEditing(clientX, clientY){
      if(_editing) return;
      _editing = true;
      el.contentEditable = 'true';
      el.style.outline = '1.5px solid rgba(74,144,226,.55)';
      el.style.borderRadius = '2px';
      requestAnimationFrame(function(){
        if(typeof clientX === 'number' && document.caretRangeFromPoint){
          var rng = document.caretRangeFromPoint(clientX, clientY);
          if(rng){ var s=window.getSelection(); s.removeAllRanges(); s.addRange(rng); }
        }
        showCounter(el, cls);
      });
    }

    function commitEdit(){
      _editing = false;
      el.contentEditable = 'false';
      el.style.outline = 'none';
      hideCounter(cls);
      _sendUpdate(el, cls);
    }

    el.addEventListener('mousedown', function(e){
      if(e.button === 2) return; /* 右鍵由 contextmenu 處理 */
      e.stopPropagation();
      startEditing(e.clientX, e.clientY);
    });

    el.addEventListener('input', function(){
      updateCharCounter(el, cls);
      var limit = CHAR_LIMITS[cls];
      if(limit && calcUnits(el.textContent) > limit){
        enforceLimit(el, cls);
        updateCharCounter(el, cls);
        el.style.outline = '1.5px solid #ef4444';
        setTimeout(function(){ if(_editing) el.style.outline='1.5px solid rgba(74,144,226,.55)'; }, 400);
      }
      showCounter(el, cls);
    });

    el.addEventListener('blur', function(){
      if(_rightClickPending) return; /* 右鍵選單開啟中，不關閉編輯 */
      if(_editing) commitEdit();
    });

    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); commitEdit(); }
      if(e.key === 'Escape'){
        _editing = false;
        el.contentEditable = 'false';
        el.style.outline = 'none';
        hideCounter(cls);
        if(window.parent !== window){
          window.parent.postMessage({type:'bn-text-cancel', field:cls}, '*');
        }
      }
    });

    el.addEventListener('contextmenu', function(e){
      e.preventDefault(); e.stopPropagation();

      /* 確保進入編輯模式 */
      if(!_editing) startEditing(e.clientX, e.clientY);

      /* 立刻把選取的文字和位置存下來 */
      var savedSelText = '';
      var savedStart = -1;
      var savedEnd   = -1;
      var sel = window.getSelection();
      if(sel && sel.rangeCount > 0 && !sel.isCollapsed){
        savedSelText = sel.toString();
        var range = sel.getRangeAt(0);
        var preRange = document.createRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        savedStart = preRange.toString().length;
        savedEnd   = savedStart + savedSelText.length;
      }

      _rightClickPending = true;
      showCanvasTextMenu(e, el, cls, savedSelText, savedStart, savedEnd, function onMenuClose(){
        _rightClickPending = false;
      });
    });
  }

  /* sba.html 同款：工具函式 */
  function _cleanNum(t){ return t.replace(/[$,]/g,'').trim(); }
  function _isNumeric(t){ var c=_cleanNum(t); return /^\d+$/.test(c) && c.length>0; }
  function _addThousands(d){ return String(d).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
  function _fmtDollar(n){ return '$'+(n.length>=4?_addThousands(n):n); }
  function _getExempt(el){ try{ return JSON.parse(el.dataset.dollarExempt||'[]'); }catch(_){ return []; } }
  function _setExempt(el, list){
    if(list.length) el.dataset.dollarExempt = JSON.stringify(list);
    else el.removeAttribute('data-dollar-exempt');
  }
  function _replaceSelText(savedRange, text){
    var sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(savedRange);
    try{ document.execCommand('insertText', false, text); }
    catch(_){
      savedRange.deleteContents();
      var node = document.createTextNode(text);
      savedRange.insertNode(node);
      sel.removeAllRanges(); sel.collapse(node, node.length);
    }
  }

  function _sendUpdate(el, cls){
    var text = el.textContent.trim();
    /* 把豁免清單一起送出，父層用這個清單跳過對應數字的 $ 格式化 */
    var exemptList = _getExempt(el);
    if(window.parent !== window){
      window.parent.postMessage({
        type:'bn-text-update', field:cls, value:text,
        dollarExempt: exemptList.length > 0 ? exemptList : false
      }, '*');
    }
  }

  function showCanvasTextMenu(e, el, cls, savedSelText, savedStart, savedEnd, onMenuClose){
    var existing = document.getElementById('_bn_canvas_ctx');
    if(existing) existing.remove();

    /* 只有選取的是純數字才顯示選單（同 sba.html） */
    var savedRange = null;
    var sel = window.getSelection();
    if(sel && sel.rangeCount > 0 && !sel.isCollapsed){
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    var cleanSel  = _cleanNum(savedSelText);
    var isNumSel  = _isNumeric(savedSelText);
    var hasDollar = savedSelText.indexOf('$') !== -1;
    var exemptList = _getExempt(el);
    var alreadyExempt = exemptList.indexOf(cleanSel) !== -1;

    /* 如果沒有選取數字，不顯示選單 */
    if(!savedSelText){ return; }

    var menu = document.createElement('div');
    menu.id = '_bn_canvas_ctx';
    menu.style.cssText=[
      'position:fixed;z-index:999999;',
      'background:#1a1d2a;border:1px solid #2e3347;',
      'border-radius:10px;padding:6px 0;',
      'box-shadow:0 8px 24px rgba(0,0,0,.5);',
      'min-width:200px;font-size:13px;',
    ].join('');

    function menuBtn(label, handler){
      var btn = document.createElement('div');
      btn.textContent = label;
      btn.style.cssText = 'padding:8px 16px;cursor:pointer;color:#dde3f0;white-space:nowrap;';
      btn.addEventListener('mouseenter', function(){ btn.style.background='#2b2f42'; });
      btn.addEventListener('mouseleave', function(){ btn.style.background=''; });
      btn.addEventListener('mousedown', function(ev){
        ev.preventDefault();
        menu.remove();
        if(typeof onMenuClose === 'function') onMenuClose();
        handler();
        setTimeout(function(){ el.focus(); }, 0);
      });
      menu.appendChild(btn);
    }

    if(isNumSel){
      if(alreadyExempt || !hasDollar){
        /* 恢復：補回 $ 千分位，從豁免清單移除 */
        menuBtn('恢復 $'+_addThousands(cleanSel)+' 的千分位格式', function(){
          var list = _getExempt(el).filter(function(n){ return n !== cleanSel; });
          _setExempt(el, list);
          if(savedRange) _replaceSelText(savedRange, _fmtDollar(cleanSel));
          _sendUpdate(el, cls);
        });
      } else {
        /* 移除：拿掉 $ 和千分位，加入豁免清單 */
        menuBtn('暫時不加$和千分位符號', function(){
          var list = _getExempt(el);
          if(list.indexOf(cleanSel) === -1) list.push(cleanSel);
          _setExempt(el, list);
          if(savedRange) _replaceSelText(savedRange, cleanSel);
          _sendUpdate(el, cls);
        });
      }
    } else {
      /* 非純數字的選取：整段文字豁免選項 */
      menuBtn('暫時不加$和千分位符號（整段）', function(){
        /* 把選取範圍的所有數字加進豁免清單，並移除 $ */
        var nums = savedSelText.match(/\d+/g) || [];
        var list = _getExempt(el);
        nums.forEach(function(n){ if(list.indexOf(n)===-1) list.push(n); });
        _setExempt(el, list);
        var cleaned = savedSelText.replace(/\$/g,'').replace(/(\d),(\d{3})(?!\d)/g,'$1$2');
        if(savedRange) _replaceSelText(savedRange, cleaned);
        _sendUpdate(el, cls);
      });
    }

    menu.style.left = Math.min(e.clientX, window.innerWidth  - 230) + 'px';
    menu.style.top  = Math.min(e.clientY, window.innerHeight - 80)  + 'px';
    document.body.appendChild(menu);
    menu.tabIndex = -1;

    document.addEventListener('mousedown', function rm(ev){
      if(!menu.contains(ev.target)){
        menu.remove();
        document.removeEventListener('mousedown', rm);
        if(typeof onMenuClose === 'function') onMenuClose();
      }
    });
  }
  function attachEditableToAll(){
    EDITABLE_CLASSES.forEach(function(cls){
      document.querySelectorAll('.'+cls).forEach(function(el){
        makeEditable(el, cls);
      });
    });
  }

  function captureCanvas(cb){
    console.log('[canvas][capture] render ready');
    if(window.html2canvas){doCapture(cb);return;}
    var s=document.createElement('script');
    s.src='js/html2canvas.min.js';
    var settled=false;
    var timer=setTimeout(function(){
      if(settled) return;
      settled=true;
      console.warn('[canvas][capture] html2canvas load timeout, using fallback');
      doCapture(cb);
    },5000);
    s.onload=function(){
      if(settled) return;
      settled=true;
      clearTimeout(timer);
      doCapture(cb);
    };
    s.onerror=function(){
      if(settled) return;
      settled=true;
      clearTimeout(timer);
      console.warn('[02編輯器] html2canvas 載入失敗，改用基本圖片備援輸出。');
      doCapture(cb);
    };
    document.head.appendChild(s);
  }

  function waitForCaptureImage(img){
    return new Promise(function(resolve){
      var src = img.currentSrc || img.src || '';
      if(!src){
        console.warn('[02編輯器] 截圖區內有圖片缺少來源，已略過。', img);
        resolve();
        return;
      }
      if(src.indexOf('data:') !== 0){
        console.warn('[02編輯器] 圖片不是 dataURL，可能無法離線輸出：', src);
      }

      function decodeOrContinue(){
        if(typeof img.decode === 'function'){
          img.decode().catch(function(err){
            console.warn('[02編輯器] 圖片 decode() 失敗，使用已載入內容繼續截圖。', err);
          }).then(resolve);
        }else{
          resolve();
        }
      }

      if(img.complete){
        if(!img.naturalWidth) console.warn('[02編輯器] 圖片已完成但沒有可用尺寸，已繼續截圖。', img);
        decodeOrContinue();
        return;
      }

      var settled=false;
      function finish(skipDecode){
        if(settled) return;
        settled=true;
        img.removeEventListener('load',loaded);
        img.removeEventListener('error',failed);
        if(skipDecode) resolve();
        else decodeOrContinue();
      }
      function loaded(){ finish(false); }
      function failed(){
        console.warn('[02編輯器] 圖片載入失敗，已略過並繼續截圖。', src);
        finish(true);
      }
      img.addEventListener('load',loaded);
      img.addEventListener('error',failed);
      setTimeout(function(){
        if(!settled){
          console.warn('[02編輯器] 圖片等待逾時，已繼續截圖。', src);
          finish(true);
        }
      },5000);
    });
  }

  function isTransparentCanvas(canvas){
    try{
      var ctx=canvas.getContext('2d');
      var data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      var step=Math.max(4,Math.floor(data.length/12000/4)*4);
      for(var i=3;i<data.length;i+=step){
        if(data[i]!==0) return false;
      }
      return true;
    }catch(err){
      console.warn('[02編輯器] 無法檢查 canvas 是否空白，仍繼續下載。',err);
      return false;
    }
  }

  function makeFixedOutput(source,W,H){
    var output=template&&template.output||{};
    var outputW=Number(output.width)||Number(template&&template.width)||1080;
    var outputH=Number(output.height)||Number(template&&template.height)||1920;
    var out=document.createElement('canvas');
    out.width=outputW;
    out.height=outputH;
    var ctx=out.getContext('2d');
    if(source) ctx.drawImage(source,0,0,W,H,0,0,outputW,outputH);
    return out;
  }

  function makeImageFallback(cv,W,H){
    var output=template&&template.output||{};
    var outputW=Number(output.width)||Number(template&&template.width)||1080;
    var outputH=Number(output.height)||Number(template&&template.height)||1920;
    var out=document.createElement('canvas');
    out.width=outputW;
    out.height=outputH;
    var ctx=out.getContext('2d');
    var base=cv.getBoundingClientRect();
    Array.from(cv.querySelectorAll('img:not([data-html2canvas-ignore])')).forEach(function(img){
      if(!img.complete || !img.naturalWidth) return;
      try{
        var r=img.getBoundingClientRect();
        ctx.drawImage(
          img,
          (r.left-base.left)*outputW/W,
          (r.top-base.top)*outputH/H,
          r.width*outputW/W,
          r.height*outputH/H
        );
      }catch(err){
        console.warn('[02編輯器] 備援輸出略過一張圖片。',err);
      }
    });
    return out;
  }

  function doCapture(cb){
    var cv=document.getElementById('canvas');
    if(!cv){
      console.warn('[02編輯器] 找不到 Banner 主畫布。');
      if(cb)cb(null);
      return;
    }
    var W = parseFloat(cv.style.width)  || cv.offsetWidth;
    var H = parseFloat(cv.style.height) || cv.offsetHeight;
    console.log('[canvas][capture] canvas size W=' + W + ' H=' + H + ' offset=' + cv.offsetWidth + 'x' + cv.offsetHeight);
    if(!W||!H){
      console.warn('[02編輯器] Banner 主畫布尺寸無效。');
      if(cb)cb(null);
      return;
    }

    var overlay = document.getElementById('_bn_bg_overlay');
    if(overlay) overlay.style.display = 'none';
    var singleBox = document.querySelector('.bn-single-product-box');
    var savedSingleOutline = singleBox ? singleBox.style.outline : '';
    if(singleBox) singleBox.style.outline = 'none';

    var savedTransform = cv.style.transform;
    cv.style.transform = 'none';

    var imgs = Array.from(cv.querySelectorAll('img:not([data-html2canvas-ignore])'));

    function restore(){
      cv.style.transform=savedTransform;
      if(overlay) overlay.style.display='';
      if(singleBox) singleBox.style.outline=savedSingleOutline;
    }

    function finishWith(out){
      if(isTransparentCanvas(out)){
        console.warn('[02編輯器] 輸出 canvas 可能為空白，仍會產生 PNG。');
      }
      try{
        if(cb) cb(out.toDataURL('image/png'));
      }catch(err){
        console.warn('[02編輯器] PNG 轉換失敗。',err);
        if(cb) cb(null);
      }
    }

    function runCapture(){
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          console.log('[canvas][capture] capture start');
          if(typeof window.html2canvas !== 'function'){
            console.warn('[02編輯器] html2canvas 不可用，使用基本圖片備援輸出。');
            var basic=makeImageFallback(cv,W,H);
            restore();
            finishWith(basic);
            return;
          }
          /* 大尺寸 canvas（>400萬像素）用 scale:1，避免超出瀏覽器記憶體上限 */
          var captureScale = (W * H > 4000000) ? 1 : 2;
          var captureSettled=false;
          var captureTimer=setTimeout(function(){
            if(captureSettled) return;
            captureSettled=true;
            console.warn('[canvas][capture] html2canvas timeout, using fallback');
            var fallback=makeImageFallback(cv,W,H);
            restore();
            finishWith(fallback);
          },12000);
          window.html2canvas(cv,{
            useCORS:false,
            allowTaint:true,
            backgroundColor:null,
            scale:captureScale,
            width:W,
            height:H,
            logging:false
          }).then(function(rendered){
            if(captureSettled) return;
            captureSettled=true;
            clearTimeout(captureTimer);
            var out=makeFixedOutput(rendered,rendered.width,rendered.height);
            restore();
            finishWith(out);
          }).catch(function(err){
            if(captureSettled) return;
            captureSettled=true;
            clearTimeout(captureTimer);
            console.warn('[02編輯器] html2canvas 截圖失敗，使用基本圖片備援輸出。',err);
            var fallback=makeImageFallback(cv,W,H);
            restore();
            finishWith(fallback);
          });
        });
      });
    }

    console.log('[canvas][capture] images wait count=' + imgs.length);
    Promise.all(imgs.map(waitForCaptureImage))
      .then(function(){
        console.log('[canvas][capture] images ready');
        if(document.fonts && document.fonts.ready){
          return Promise.race([
            document.fonts.ready.catch(function(err){
              console.warn('[02編輯器] 字型等待失敗，仍繼續截圖。',err);
            }),
            new Promise(function(resolve){
              setTimeout(function(){
                console.warn('[02編輯器] 字型等待逾時，仍繼續截圖。');
                resolve();
              },4000);
            })
          ]);
        }
      })
      .then(function(){
        console.log('[canvas][capture] fonts ready');
        runCapture();
      })
      .catch(function(err){
        console.warn('[02編輯器] 截圖前等待發生錯誤，仍繼續截圖。',err);
        runCapture();
      });
  }

  function renderLogosWithMode(zone, logos, mode, shape) {
    var logoConfig=template&&template.logo||{};
    var logoStyle=logoConfig.style||{};
    var logoLayout=logoConfig.layout||{};
    var modeHeights=logoLayout.modeHeights||{};
    var BLOCK_H=numberValue(modeHeights[mode],numberValue(logoLayout.blockHeight,styleNumber(logoStyle,'height',zone.clientHeight)));
    var TOP_Y=styleNumber(logoStyle,'top',zone.offsetTop);
    var MAX_W=numberValue(logoLayout.maxWidth,styleNumber(logoStyle,'width',zone.clientWidth));
    var PAD_V=numberValue(logoLayout.verticalPadding,0);
    var PAD_H=numberValue(logoLayout.horizontalPadding,0);
    var GAP=numberValue(logoLayout.gap,0);
    var CANVAS_W=numberValue(logoLayout.canvasWidth,numberValue(template&&template.width,zone.parentElement&&zone.parentElement.clientWidth));
    var BLOCK_RADIUS=logoLayout.borderRadius||logoStyle.borderRadius||'0px';
    var ITEM_RADIUS=logoLayout.itemBorderRadius||BLOCK_RADIUS;
    var SQUARE_SIZE=numberValue(logoLayout.squareSize,BLOCK_H);
    var logoH    = BLOCK_H - PAD_V * 2;

    if (!logos.length) {
      zone.style.cssText = '';
      return;
    }

    /* 直式 + 1 logo → 正方形色塊（支援圓形） */
    if (mode === 'vertical' && logos.length === 1) {
      var isCircle  = shape === 'circle';
      var BW        = BLOCK_H;
      var blockLeft = Math.round((CANVAS_W - BW) / 2);
      var blockTop  = TOP_Y;
      applyLogoBlockStyle(zone, blockLeft, blockTop, BW, BLOCK_H, isCircle ? '50%' : BLOCK_RADIUS);
      var img = document.createElement('img');
      img.className = 'bn-logo-img';
      if (isCircle) {
        img.style.cssText = 'width:'+SQUARE_SIZE+'px;height:'+SQUARE_SIZE+'px;border-radius:50%;object-fit:contain;pointer-events:none;display:block;';
      } else {
        var maxSz = logoH;
        img.style.cssText = 'max-width:' + maxSz + 'px;max-height:' + maxSz + 'px;' +
          'width:auto;height:auto;object-fit:contain;pointer-events:none;display:block;' +
          (logos[0].round ? 'border-radius:'+ITEM_RADIUS+';' : '');
      }
      img.src = logos[0].squareSrc || logos[0].src;
      zone.appendChild(img);
      return;
    }

    /* 其他所有情況：先預載取自然寬高再計算排版 */
    var total   = logos.length;
    var loadedW = logos.map(function(){ return logoH; });
    var pending = total;

    function onAllLoaded() {
      var groupW = loadedW.reduce(function(s, w){ return s + w; }, 0) + GAP * (total - 1);
      var scale, blockW;
      if (groupW + PAD_H * 2 > MAX_W) {
        blockW = MAX_W;
        scale  = (MAX_W - PAD_H * 2) / groupW;
      } else {
        blockW = groupW + PAD_H * 2;
        scale  = 1;
      }
      var scaledLogoH = Math.round(logoH * scale);
      var blockLeft   = Math.round((CANVAS_W - blockW) / 2);
      var blockTop    = TOP_Y;
      applyLogoBlockStyle(zone, blockLeft, blockTop, blockW, BLOCK_H);
      logos.forEach(function(lg, i) {
        var img = document.createElement('img');
        img.className = 'bn-logo-img';
        var w = Math.max(1, Math.round(loadedW[i] * scale));
        img.style.cssText = 'width:' + w + 'px;height:' + scaledLogoH + 'px;' +
          'object-fit:contain;flex-shrink:0;pointer-events:none;' +
          (lg.round ? 'border-radius:'+ITEM_RADIUS+';' : '');
        img.src = lg.src;
        zone.appendChild(img);
      });
    }

    logos.forEach(function(lg, i) {
      var tmp = new Image();
      tmp.onload = function() {
        var ratio = tmp.naturalHeight > 0 ? (tmp.naturalWidth / tmp.naturalHeight) : 1;
        loadedW[i] = Math.max(1, Math.round(logoH * ratio));
        if (--pending === 0) onAllLoaded();
      };
      tmp.onerror = function() {
        loadedW[i] = logoH;
        if (--pending === 0) onAllLoaded();
      };
      tmp.src = lg.src;
    });
  }

  function applyLogoBlockStyle(zone, left, top, width, height, borderRadius) {
    zone.style.position       = 'absolute';
    zone.style.left           = left + 'px';
    zone.style.top            = top + 'px';
    zone.style.width          = width + 'px';
    zone.style.height         = height + 'px';
    zone.style.background     = '#ffffff';
    zone.style.borderRadius   = borderRadius || '15px';
    zone.style.display        = 'flex';
    zone.style.alignItems     = 'center';
    zone.style.justifyContent = 'center';
    zone.style.gap            = '20px';
    zone.style.overflow       = 'hidden';
    zone.style.opacity        = '1';
    zone.style.boxSizing      = 'border-box';
  }
})();

})();
