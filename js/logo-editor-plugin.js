/*!
 * Logo Menu Plugin v14
 * 從 hbn.html jimmy-new-logo-menu-only-script 抽取
 * 提供：logo 縮圖右上角 ✎ 觸發器 + 下拉選單（編輯/往右移/刪除/加圓角）
 *       + CropperJS Logo 裁切 Modal
 *
 * 使用：
 *   window.BNLogoMenu.attach(imgEl, options)
 *     options.onEdit(imgEl)    → 點「編輯」
 *     options.onSwap(imgEl)    → 點「往右移」（可選）
 *     options.onDelete(imgEl)  → 點「刪除」
 *     options.showSwap         → 是否顯示「往右移」
 *
 *   window.BNLogoMenu.openCropEditor(src, onDone)
 *     → 開啟 CropperJS 裁切視窗，完成後呼叫 onDone(newSrc)
 */
(function(global){
  if(global.__BN_LOGO_MENU_PLUGIN__) return;
  global.__BN_LOGO_MENU_PLUGIN__ = true;

  /* ── 載入 CropperJS ── */
  function loadCropper(cb){
    if(global.Cropper){ cb(); return; }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'js/cropper.min.css';
    document.head.appendChild(link);
    var s = document.createElement('script');
    s.src = 'js/cropper.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  /* ── 注入 CSS ── */
  function injectCSS(){
    if(document.getElementById('_bn_lm_css')) return;

    var s1 = document.createElement('style');
    s1.id = '_bn_lm_css';
    s1.textContent = [
      '.logo-edit-btn,.logo-swap-btn,.logo-delete-btn,.logo-white-btn,.logo-main-pen-btn,.logo-action-menu{display:none !important}',
      '.logo-v14-trigger{position:absolute !important;top:-24px !important;right:-2px !important;width:20px !important;height:20px !important;border-radius:50% !important;background:#000 !important;color:#fff !important;display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;z-index:2147483645 !important;font-size:12px !important;line-height:1 !important;user-select:none !important;box-shadow:0 2px 6px rgba(0,0,0,.25)}',
      '.logo-item,#square .brand{overflow:visible !important}',
      '#logoMenuV14{position:fixed !important;min-width:118px !important;background:#111 !important;color:#fff !important;border-radius:10px !important;box-shadow:0 8px 24px rgba(0,0,0,.28) !important;padding:6px 0 !important;display:none !important;z-index:2147483647 !important}',
      '#logoMenuV14.show{display:block !important}',
      '#logoMenuV14 button{width:100% !important;border:0 !important;background:transparent !important;color:#fff !important;text-align:left !important;padding:7px 12px !important;font-size:12px !important;line-height:1.35 !important;cursor:pointer !important}',
      '#logoMenuV14 button:hover{background:#2b2b2b !important}',
      '#logoMenuV14 button[hidden]{display:none !important}',
      '.is-exporting .logo-v14-trigger,.is-exporting #logoMenuV14{display:none !important}',
      '#logoCropModal{z-index:2147483646 !important}',
    ].join('\n');
    document.head.appendChild(s1);

    var s2 = document.createElement('style');
    s2.id = '_bn_lm_crop_css';
    s2.textContent = [
      '.cropper-modal-wrap{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:2147483646}',
      '.cropper-modal-wrap.open{display:flex}',
      '.cropper-panel{width:min(90vw,900px);max-height:90vh;background:#fff;border-radius:12px;display:flex;flex-direction:column}',
      '.cropper-panel header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;margin:0;flex-shrink:0}',
      '.cropper-panel .body{flex:1;overflow:hidden;min-height:300px;max-height:65vh;position:relative}',
      '.cropper-panel .actions{display:flex;gap:8px;padding:10px;justify-content:flex-end;flex-shrink:0}',
      '.cropper-panel .body img{display:block;max-width:100%;max-height:100%}',
    ].join('\n');
    document.head.appendChild(s2);
  }

  /* ── 注入 Modal HTML ── */
  function injectHTML(){
    if(document.getElementById('logoCropModal')) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = "<div id=\"logoCropModal\" class=\"cropper-modal-wrap\">\n  <div class=\"cropper-panel\">\n    <header>\n      <strong>Logo \u88c1\u5207</strong>\n      <button id=\"logoCropClose\" class=\"btn secondary\" type=\"button\">\u95dc\u9589</button>\n    </header>\n    <div class=\"body\"><img id=\"logoCropImg\" alt=\"Logo \u88c1\u5207\" /></div>\n    <div class=\"actions\">\n<div style=\"font-size:12px;color:#888;padding:0 12px 10px;\">Shift + \u62d6\u4e0a/\u4e0b\u908a \u2192 \u4e0a\u4e0b\u5c0d\u7a31\u7e2e\uff1bShift + \u62d6\u5de6/\u53f3\u908a \u2192 \u5de6\u53f3\u5c0d\u7a31\u7e2e</div>\n      <button id=\"logoCropUndo\" class=\"btn secondary\" type=\"button\" style=\"margin-right:auto\">\u4e0a\u4e00\u6b65</button>\n      <button id=\"logoCropApply\" class=\"btn\" type=\"button\">\u5957\u7528</button>\n    </div>\n  </div>\n</div>\n\n";
    while(tmp.firstChild) document.body.appendChild(tmp.firstChild);
  }

  /* ── 核心邏輯（從 hbn.html 抽取，移除 hbn 專屬 DOM 依賴） ── */

  var ctx = null;
  var activeCropper = null;
  var activeTarget = null;
  var _cropDone = null;
  var _historyEntries  = [];
  var _cropTargetImg   = null;
  var _cropSrc         = null;
  var _cropSessionStack = [];   /* 本次開啟 modal 內的 cropbox 狀態堆疊 */

  function getImgHistory(img) {
    for (var i = 0; i < _historyEntries.length; i++) {
      if (_historyEntries[i].img === img) return _historyEntries[i].srcs;
    }
    var entry = { img: img, srcs: [] };
    _historyEntries.push(entry);
    return entry.srcs;
  }

  function _refreshUndoBtn(btn) {
    if (!btn) return;
    var canUndo = _cropSessionStack.length > 0 || (_cropTargetImg && getImgHistory(_cropTargetImg).length > 0);
    btn.disabled = false;             /* 按鈕始終可點擊 */
    btn.style.opacity = canUndo ? '1' : '0.55';
    btn.style.cursor  = '';
    btn.title = canUndo ? '上一步' : '重設裁切框';
  }

  function q(sel, root){ return (root||document).querySelector(sel); }

  function closeMenu(){
    var menu = document.getElementById('logoMenuV14');
    if(menu) menu.classList.remove('show');
  }

  function ensureMenu(){
    var menu = document.getElementById('logoMenuV14');
    if(menu) return menu;
    menu = document.createElement('div');
    menu.id = 'logoMenuV14';
    menu.innerHTML =
      '<button type="button" data-action="edit">編輯</button>' +
      '<button type="button" data-action="swap">往右移</button>' +
      '<button type="button" data-action="delete">刪除</button>' +
      '<button type="button" data-action="round">加圓角</button>' +
      '<button type="button" data-action="undo">上一步</button>';
    document.body.appendChild(menu);
    menu.addEventListener('mousedown', function(e){ e.stopPropagation(); }, true);
    menu.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
      if(!btn) return;
      e.preventDefault(); e.stopPropagation();
      runAction(btn.dataset.action);
      closeMenu();
    }, true);
    return menu;
  }

  function updateMenu(){
    var menu = ensureMenu();
    var swapBtn = menu.querySelector('[data-action="swap"]');
    if(swapBtn) swapBtn.hidden = !(ctx && ctx.showSwap);
    var roundBtn = menu.querySelector('[data-action="round"]');
    if(roundBtn){
      roundBtn.textContent = (ctx && ctx.img && ctx.img.dataset.bnLogoRound === '1') ? '取消圓角' : '加圓角';
    }
    var undoMenuBtn = menu.querySelector('[data-action="undo"]');
    if(undoMenuBtn){
      var hist = ctx && ctx.img ? getImgHistory(ctx.img) : [];
      undoMenuBtn.hidden = hist.length === 0;
    }
  }

  function openMenu(wrap, img, trigger, opts){
    ctx = { wrap:wrap, img:img, opts:opts||{}, showSwap:!!(opts&&opts.showSwap) };
    var menu = ensureMenu();
    updateMenu();
    var rect = trigger.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.round(rect.right - 118)) + 'px';
    menu.style.top  = Math.max(8, Math.round(rect.bottom + 6)) + 'px';
    menu.classList.add('show');
  }

  function runAction(action){
    if(!ctx || !ctx.img) return;
    var img = ctx.img, opts = ctx.opts||{};
    if(action === 'edit'){
      /* 開啟 CropperJS 裁切，完成後回呼 opts.onEdit */
      openCropEditor(img.src, function(newSrc){
        if(!newSrc) return;
        img.src = newSrc;
        if(typeof opts.onEdit === 'function') opts.onEdit(img, newSrc);
      }, img);
    } else if(action === 'swap'){
      if(typeof opts.onSwap === 'function') opts.onSwap(img);
    } else if(action === 'delete'){
      if(typeof opts.onDelete === 'function') opts.onDelete(img);
    } else if(action === 'round'){
      var isRound = ctx.img.dataset.bnLogoRound === '1';
      ctx.img.dataset.bnLogoRound = isRound ? '' : '1';
      ctx.img.style.borderRadius = isRound ? '' : '50%';
      updateMenu();
      if(typeof opts.onRound === 'function') opts.onRound(img, !isRound);
    } else if(action === 'undo'){
      var hist = getImgHistory(img);
      if(hist.length){
        img.src = hist.pop();
        if(typeof opts.onEdit === 'function') opts.onEdit(img, img.src);
      }
    }
  }

  /* ── CropperJS 裁切 ── */
  var _shiftDown = false;
  var _cropStartData = null;
  var _cropAction = null;
  var _inAdjust = false;

  function _onKeyDown(e){ if(e.key === 'Shift') _shiftDown = true; }
  function _onKeyUp(e)  { if(e.key === 'Shift') _shiftDown = false; }

  function destroyCropper(){
    try{ activeCropper && activeCropper.destroy(); }catch(_){}
    activeCropper = null;
    _cropStartData = null;
    _shiftDown = false;
  }

  function _onCropStart(e){
    _cropAction    = e.detail ? e.detail.action : null;
    _cropStartData = activeCropper ? activeCropper.getData(true) : null;
  }

  function _onCropEnd(){
    if(!activeCropper || !_cropStartData) return;
    var cur = activeCropper.getData(true);
    /* 只在框真的有移動時才存快照 */
    if(cur.x !== _cropStartData.x || cur.y !== _cropStartData.y ||
       cur.width !== _cropStartData.width || cur.height !== _cropStartData.height){
      _cropSessionStack.push(_cropStartData);
      _refreshUndoBtn(document.getElementById('logoCropUndo'));
    }
  }

  function _onCropMove(){
    if(_inAdjust || !_shiftDown || !_cropStartData || !activeCropper) return;
    var a = _cropAction;
    if(a !== 'n' && a !== 's' && a !== 'e' && a !== 'w') return;
    var d  = activeCropper.getData();
    var sd = _cropStartData;
    var cx = sd.x + sd.width  / 2;
    var cy = sd.y + sd.height / 2;
    var nd = null;
    if(a === 'n'){
      var h = 2 * (cy - d.y);
      if(h > 1) nd = { x: sd.x, y: d.y, width: sd.width, height: h };
    } else if(a === 's'){
      var bot = d.y + d.height;
      var h   = 2 * (bot - cy);
      if(h > 1) nd = { x: sd.x, y: 2*cy - bot, width: sd.width, height: h };
    } else if(a === 'e'){
      var r = d.x + d.width;
      var w = 2 * (r - cx);
      if(w > 1) nd = { x: 2*cx - r, y: sd.y, width: w, height: sd.height };
    } else if(a === 'w'){
      var w = 2 * (cx - d.x);
      if(w > 1) nd = { x: d.x, y: sd.y, width: w, height: sd.height };
    }
    if(nd){
      _inAdjust = true;
      activeCropper.setData(nd);
      _inAdjust = false;
    }
  }

  function _initCropper(cropImg){
    destroyCropper();
    _cropSessionStack = [];     /* 每次載入新圖都重設 session 堆疊 */
    activeCropper = new Cropper(cropImg, {
      viewMode: 1,
      autoCropArea: 1,
      movable: true,
      zoomable: true,
      scalable: true,
      background: false,
      ready: function(){
        cropImg.removeEventListener('cropstart', _onCropStart);
        cropImg.removeEventListener('cropmove',  _onCropMove);
        cropImg.removeEventListener('cropend',   _onCropEnd);
        cropImg.addEventListener('cropstart', _onCropStart);
        cropImg.addEventListener('cropmove',  _onCropMove);
        cropImg.addEventListener('cropend',   _onCropEnd);
        _refreshUndoBtn(document.getElementById('logoCropUndo'));
      }
    });
  }

  function openCropEditor(src, onDone, imgRef){
    injectCSS();
    injectHTML();
    _cropDone      = onDone || null;
    _cropTargetImg = imgRef || null;
    _cropSrc       = src    || null;
    loadCropper(function(){
      var modal   = document.getElementById('logoCropModal');
      var cropImg = document.getElementById('logoCropImg');
      var apply   = document.getElementById('logoCropApply');
      var close   = document.getElementById('logoCropClose');
      var undoBtn = document.getElementById('logoCropUndo');
      if(!modal || !cropImg) return;

      activeTarget = null;
      destroyCropper();
      cropImg.removeAttribute('src');
      modal.classList.add('open');

      document.removeEventListener('keydown', _onKeyDown);
      document.removeEventListener('keyup',   _onKeyUp);
      document.addEventListener('keydown', _onKeyDown);
      document.addEventListener('keyup',   _onKeyUp);

      cropImg.onload = function(){
        cropImg.onload = null;
        _initCropper(cropImg);
        /* _refreshUndoBtn 已在 _initCropper ready 裡呼叫 */
      };
      cropImg.src = src;

      /* 「套用」按鈕 */
      if(apply && apply.dataset.bnBound !== '1'){
        apply.dataset.bnBound = '1';
        apply.addEventListener('click', function(){
          if(!activeCropper) return;
          var out = activeCropper.getCroppedCanvas();
          if(!out) return;
          var url = out.toDataURL('image/png');
          destroyCropper();
          modal.classList.remove('open');
          document.removeEventListener('keydown', _onKeyDown);
          document.removeEventListener('keyup',   _onKeyUp);
          if(_cropTargetImg && _cropSrc) getImgHistory(_cropTargetImg).push(_cropSrc);
          if(typeof _cropDone === 'function'){ _cropDone(url); _cropDone = null; }
        });
      }
      /* 「關閉」按鈕 */
      if(close && close.dataset.bnBound !== '1'){
        close.dataset.bnBound = '1';
        close.addEventListener('click', function(){
          destroyCropper();
          modal.classList.remove('open');
          document.removeEventListener('keydown', _onKeyDown);
          document.removeEventListener('keyup',   _onKeyUp);
          _cropDone = null;
        });
      }
      /* 「上一步」按鈕 */
      if(undoBtn && undoBtn.dataset.bnBound !== '1'){
        undoBtn.dataset.bnBound = '1';
        undoBtn.addEventListener('click', function(){
          /* 優先：還原 session 內的上一個裁切框位置 */
          if(_cropSessionStack.length > 0 && activeCropper){
            var prev = _cropSessionStack.pop();
            _inAdjust = true;
            try{ activeCropper.setData(prev); }catch(ex){}
            _inAdjust = false;
            _refreshUndoBtn(undoBtn);
            return;
          }
          /* 次要：還原上一張套用的圖片 */
          var hist = _cropTargetImg ? getImgHistory(_cropTargetImg) : [];
          if(hist.length){
            var prevSrc = hist.pop();
            destroyCropper();
            cropImg.removeAttribute('src');
            cropImg.onload = function(){
              cropImg.onload = null;
              _initCropper(cropImg);
            };
            cropImg.src = prevSrc;
            return;
          }
          /* 最後：重設裁切框到全圖 */
          if(activeCropper) activeCropper.reset();
          _refreshUndoBtn(undoBtn);
        });
      }
    });
  }

  /* ── 附加觸發器到 logo 縮圖 ── */
  function attach(imgEl, opts){
    if(!imgEl || imgEl.nodeType !== 1) return;
    injectCSS();
    var wrap = imgEl.parentElement;
    if(!wrap) return;
    wrap.style.overflow = 'visible';
    wrap.style.position = 'relative';

    /* 移除舊觸發器 */
    var old = wrap.querySelector('.logo-v14-trigger');
    if(old) old.remove();

    var trigger = document.createElement('div');
    trigger.className = 'logo-v14-trigger';
    trigger.textContent = '✎';
    trigger.title = 'Logo 功能';
    wrap.appendChild(trigger);

    trigger.style.display = imgEl.getAttribute('src') ? 'flex' : 'none';

    trigger.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      document.addEventListener('click', closeMenu, { once:true });
      openMenu(wrap, imgEl, trigger, opts||{});
    }, true);

    /* src 變化時更新顯示 */
    var obs = new MutationObserver(function(){
      trigger.style.display = imgEl.getAttribute('src') ? 'flex' : 'none';
    });
    try { obs.observe(imgEl, { attributes:true, attributeFilter:['src'] }); } catch (_) {}
  }

  /* ── 關閉 menu 點外部 ── */
  document.addEventListener('click', function(e){
    var menu = document.getElementById('logoMenuV14');
    if(menu && !menu.contains(e.target)) closeMenu();
  });

  /* ── 公開 API ── */
  global.BNLogoMenu = {
    attach: attach,
    openCropEditor: openCropEditor
  };

}(window));
