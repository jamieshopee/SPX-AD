/*!
 * BN State Plugin
 * 1. banwords：用 applyToElement（同 sba.html），含 toast + 手動選 xlsx fallback
 * 2. 本機暫存（localStorage）
 * 3. 下載暫存 / 上傳暫存按鈕
 *
 * 依賴：js/banwords-engine-hbn.js（自動載入）
 */
(function(global){
  'use strict';
  if(global.__BN_STATE_PLUGIN__) return;
  global.__BN_STATE_PLUGIN__ = true;

  var STORAGE_KEY = 'bn_editor_state_v1';

  function ready(fn){
    if(document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function loadScript(src, cb){
    if(document.querySelector('script[src="'+src+'"]')){
      if(cb) cb(); return;
    }
    var s = document.createElement('script');
    s.src = src; s.onload = cb||function(){}; s.onerror = function(){ if(cb) cb(); };
    document.head.appendChild(s);
  }

  /* ── Toast（同 sba.html 風格） ── */
  function showToast(msg, type, duration){
    var t = document.createElement('div');
    var bg = type === 'err' ? '#7f1d1d' : type === 'ok' ? '#14532d' : '#1a1d2a';
    var color = type === 'err' ? '#fca5a5' : type === 'ok' ? '#86efac' : '#dde3f0';
    t.style.cssText=[
      'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);',
      'background:'+bg+';color:'+color+';',
      'padding:8px 20px;border-radius:10px;font-size:13px;',
      'box-shadow:0 8px 24px rgba(0,0,0,.5);z-index:99999;',
      'white-space:nowrap;max-width:90vw;',
    ].join('');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, duration||2500);
  }

  /* ══════════════════════════════════════
     1. Banwords 橋接（applyToElement）
  ══════════════════════════════════════ */

  /* 各欄位對應的 data-role（banwords-engine 用這個查規則） */
  var FIELD_MAP = {
    'txt-brand': { role:'品牌名', label:'品牌名' },
    'txt-main':  { role:'主標',   label:'主標'   },
    'txt-sub':   { role:'副標',   label:'副標'   },
    'txt-date':  { role:'date',   label:'日期'   },
  };

  /* applyToElement 需要 contenteditable 元素
     <input> 不是，所以用 shadow div 橋接 */
  function applyBanwordToInput(inp, fieldCfg, opts){
    if(!global.banwordEngine) return null;

    /* 建（或重用）橋接用的 shadow div */
    var shadowId = '_bn_bw_shadow_' + inp.id;
    var shadow = document.getElementById(shadowId);
    if(!shadow){
      shadow = document.createElement('div');
      shadow.id = shadowId;
      shadow.setAttribute('contenteditable', 'true');
      shadow.dataset.role = fieldCfg.role;
      shadow.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
      document.body.appendChild(shadow);
    }

    /* 把 input 值寫進 shadow，套 dollarExempt */
    shadow.textContent = inp.value;
    if(opts && opts.dollarExempt){
      shadow.dataset.dollarExempt = JSON.stringify(opts.dollarExempt);
    } else {
      shadow.dataset.dollarExempt = '';
    }

    var result = global.banwordEngine.applyToElement(shadow, {
      role: fieldCfg.role,
      force: true,
      getText: function(el){ return el.textContent; }
    });

    if(result && result.text !== undefined && result.text !== inp.value){
      inp.value = result.text;
      inp.dispatchEvent(new Event('input', {bubbles:true}));
    }

    /* Toast 提示 */
    if(result && result.message){
      showToast(result.message, 'err', result.duration||4000);
    }

    return result;
  }

  function bridgeInputs(){
    Object.keys(FIELD_MAP).forEach(function(id){
      var inp = document.getElementById(id);
      if(!inp || inp.dataset.bnBanwordBound === '1') return;
      inp.dataset.bnBanwordBound = '1';
      var cfg = FIELD_MAP[id];

      /* blur：跑 applyToElement */
      inp.addEventListener('blur', function(){
        var opts = {};
        if(inp.dataset.dollarExempt){
          try{ opts.dollarExempt = JSON.parse(inp.dataset.dollarExempt); }catch(_){}
        }
        applyBanwordToInput(inp, cfg, opts);
      });

      /* 右鍵：暫時不加$和千分位 */
      inp.addEventListener('contextmenu', function(e){
        e.preventDefault();
        showInputMenu(e, inp, cfg);
      });
    });
  }

  function showInputMenu(e, inp, cfg){
    var existing = document.getElementById('_bn_input_ctx');
    if(existing) existing.remove();

    var menu = document.createElement('div');
    menu.id = '_bn_input_ctx';
    menu.style.cssText=[
      'position:fixed;z-index:99999;',
      'background:#1a1d2a;border:1px solid #2e3347;',
      'border-radius:10px;padding:6px 0;',
      'box-shadow:0 8px 24px rgba(0,0,0,.5);min-width:200px;font-size:13px;',
    ].join('');

    var isBothExempt = inp.dataset.dollarExempt && inp.dataset.thousandsExempt === '1';

    [
      { label: isBothExempt ? '✓ 已豁免（點擊取消）' : '暫時不加$和千分位符號', action:'both' },
      { label: '重新檢查禁用語', action:'check' },
    ].forEach(function(item){
      var btn = document.createElement('div');
      btn.textContent = item.label;
      btn.style.cssText = 'padding:8px 16px;cursor:pointer;color:#dde3f0;white-space:nowrap;';
      btn.addEventListener('mouseenter', function(){ btn.style.background='#2b2f42'; });
      btn.addEventListener('mouseleave', function(){ btn.style.background=''; });
      btn.addEventListener('click', function(){
        menu.remove();
        if(item.action === 'both'){
          if(isBothExempt){
            inp.dataset.dollarExempt = '';
            inp.dataset.thousandsExempt = '';
          } else {
            var pos = [];
            for(var i=0;i<inp.value.length;i++){ if(inp.value[i]==='$') pos.push(i); }
            inp.dataset.dollarExempt = JSON.stringify(pos);
            inp.dataset.thousandsExempt = '1';
          }
        } else if(item.action === 'check'){
          applyBanwordToInput(inp, cfg, {});
        }
      });
      menu.appendChild(btn);
    });

    menu.style.left = Math.min(e.clientX, window.innerWidth-220)+'px';
    menu.style.top  = Math.min(e.clientY, window.innerHeight-100)+'px';
    document.body.appendChild(menu);
    setTimeout(function(){
      document.addEventListener('click', function rm(){ menu.remove(); document.removeEventListener('click',rm); });
    }, 10);
  }

  /* ── banwords.xlsx 載入（含 fallback 手動選取，同 sba.html） ── */
  function ensureExcelPicker(){
    var wrap = document.getElementById('_bn_excelManualLoader');
    if(wrap) return wrap;
    wrap = document.createElement('div');
    wrap.id = '_bn_excelManualLoader';
    wrap.style.cssText=[
      'position:fixed;right:20px;bottom:90px;z-index:100002;',
      'background:rgba(220,38,38,.96);color:#fff;',
      'padding:12px 14px;border-radius:12px;',
      'box-shadow:0 8px 24px rgba(0,0,0,.28);',
      'font-size:13px;line-height:1.5;max-width:320px;display:none;',
    ].join('');
    wrap.innerHTML=[
      '<div style="font-weight:700;margin-bottom:6px;">讀取 banwords.xlsx 失敗</div>',
      '<div style="margin-bottom:8px;">請手動選取同層的「banwords.xlsx」</div>',
      '<button id="_bn_excelManualBtn" style="border:0;background:#fff;color:#111;padding:6px 10px;border-radius:8px;cursor:pointer;">手動選取 banwords.xlsx</button>',
      '<input type="file" id="_bn_excelManualInput" accept=".xlsx" style="display:none">',
    ].join('');
    document.body.appendChild(wrap);

    wrap.querySelector('#_bn_excelManualBtn').addEventListener('click', function(){
      wrap.querySelector('#_bn_excelManualInput').click();
    });
    wrap.querySelector('#_bn_excelManualInput').addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      if(!file) return;
      file.arrayBuffer().then(function(buf){
        var rules = global.banwordEngine.loadRulesFromExcelArrayBuffer(buf);
        showToast('已手動載入 banwords.xlsx（'+( Array.isArray(rules)?rules.length:0 )+'條）','ok',2200);
        wrap.style.display = 'none';
        bridgeInputs();
      }).catch(function(err){
        showToast('手動載入失敗：'+err.message,'err',2200);
      });
    });
    return wrap;
  }

  function loadBanwordsExcel(){
    /* 等引擎就緒（最多重試 20 次，每次 100ms） */
    if(!global.banwordEngine){
      if((loadBanwordsExcel._retry = (loadBanwordsExcel._retry||0) + 1) < 20){
        setTimeout(loadBanwordsExcel, 100);
      } else {
        console.warn('[BNState] banwordEngine 未就緒，禁用語功能略過');
      }
      return;
    }

    /* 若 banwords-data.js 已預先載入規則，直接套用 */
    if(global._bnPendingRules){
      global.banwordEngine.setRules(global._bnPendingRules);
      console.log('[BNState] banwords loaded from banwords-data.js:', global._bnPendingRules.length, '條');
      global._bnPendingRules = null;
      bridgeInputs();
      return;
    }
    if(global.banwordEngine.getRules && global.banwordEngine.getRules().length > 0){
      console.log('[BNState] banwords already loaded:', global.banwordEngine.getRules().length, '條');
      bridgeInputs();
      return;
    }

    /* file:// 模式禁止 fetch 本機檔案，直接使用已載入的 banwords-data.js。 */
    if(location.protocol === 'file:'){
      console.info('[BNState] file:// 模式略過 banwords.xlsx fetch');
      bridgeInputs();
      return;
    }

    /* fallback：只在 HTTP(S) 環境嘗試 fetch banwords.xlsx */
    function doFetch(){
      fetch('banwords.xlsx', {cache:'no-store'})
      .then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status);
        return r.arrayBuffer();
      })
      .then(function(buf){
        var rules = global.banwordEngine.loadRulesFromExcelArrayBuffer(buf);
        console.log('[BNState] banwords loaded from xlsx:', Array.isArray(rules)?rules.length:0, '條');
        bridgeInputs();
      })
      .catch(function(err){
        /* file:// 或離線環境下靜默略過，不顯示錯誤提示 */
        console.info('[BNState] banwords.xlsx 無法載入（', err.message, '），禁用語檢查略過');
        bridgeInputs();
      });
    }
    if(global.XLSX){
      doFetch();
    } else {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
      s.onload = doFetch;
      s.onerror = function(){ doFetch(); };
      document.head.appendChild(s);
    }
  }

  function initBanwords(){
    if(global.banwordEngine){
      loadBanwordsExcel();
      return;
    }
    var base=global.AD_COMMON_BASE||'';
    loadScript(base+'js/banwords-engine-hbn.js', function(){ loadBanwordsExcel(); });
  }

  /* ══════════════════════════════════════
     2. 本機暫存
  ══════════════════════════════════════ */
  function collectState(){
    return {
      version: 1,
      ts: Date.now(),
      texts:{
        brand:(document.getElementById('txt-brand')||{}).value||'',
        main: (document.getElementById('txt-main') ||{}).value||'',
        sub:  (document.getElementById('txt-sub')  ||{}).value||'',
        date: (document.getElementById('txt-date') ||{}).value||'',
      },
      colors: global.colorState ? JSON.parse(JSON.stringify(global.colorState)) : {},
      logos: (global._bnLogos||[]).map(function(l){ return {id:l.id,src:l.src,round:l.round||false,slot:l.slot,name:l.name||''}; }),
      products:(global._bnProducts||[]).map(function(p){
        return {id:p.id,src:p.src,ratio:p.ratio,name:p.name,
          sizeScale:p.sizeScale||1,position:p.position||0,zOrder:p.zOrder||0,
          shadowApplied:!!p.shadowApplied,baselineRatio:p.baselineRatio||1};
      }),
      person: global._bnPerson ? JSON.parse(JSON.stringify(global._bnPerson)) : null,
      singleProduct: global._bnSingleProd ? JSON.parse(JSON.stringify(global._bnSingleProd)) : null,
      checked: global.loadChecked ? global.loadChecked() : {},
    };
  }

  function applyState(state){
    if(!state||state.version!==1) return;
    if(state.texts){
      ['brand','main','sub','date'].forEach(function(k){
        var el=document.getElementById('txt-'+k);
        if(el&&state.texts[k]!==undefined){ el.value=state.texts[k]; el.dispatchEvent(new Event('input',{bubbles:true})); }
      });
    }
    if(state.colors&&global.colorState){
      Object.assign(global.colorState,state.colors);
      if(typeof global.renderColorPickers==='function') global.renderColorPickers();
      if(typeof global.broadcastColors==='function') global.broadcastColors();
    }
    if(state.logos&&Array.isArray(state.logos)){
      global._bnLogos=state.logos;
      global._bnLogoDataUrl=state.logos.length?state.logos[0].src:null;
      if(typeof global._bnRenderLogoList==='function') global._bnRenderLogoList();
      if(typeof global._bnBroadcastLogos==='function') global._bnBroadcastLogos();
    }
    if(state.products&&Array.isArray(state.products)){
      global._bnProducts=state.products;
      if(typeof global._bnRenderProdList==='function') global._bnRenderProdList();
      if(typeof global._bnRebroadcastProducts==='function') global._bnRebroadcastProducts();
    }
    global._bnPerson=state.person||null;
    global._bnSingleProd=state.singleProduct||null;
    if(typeof global._bnRenderPersonProduct==='function') global._bnRenderPersonProduct();
    if(state.checked&&typeof global.saveChecked==='function'){
      global.saveChecked(state.checked);
      if(typeof global.renderChecks==='function') global.renderChecks();
      if(typeof global.renderPreviews==='function') global.renderPreviews();
    }
  }

  function autoSave(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState())); }
    catch(e){ console.warn('[BNState] autoSave 失敗',e); }
  }

  function autoLoad(){
    try{
      var raw=localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      var state=JSON.parse(raw);
      applyState(state);
      console.log('[BNState] 暫存載入完成，時間:',new Date(state.ts).toLocaleString());
    }catch(e){ console.warn('[BNState] autoLoad 失敗',e); }
  }

  function startAutoSave(){
    setInterval(autoSave,30000);
    window.addEventListener('beforeunload',autoSave);
    document.addEventListener('input',function(e){
      if(e.target&&e.target.closest&&e.target.closest('#sidebar-scroll')){
        clearTimeout(global._bnSaveTimer);
        global._bnSaveTimer=setTimeout(autoSave,1500);
      }
    },true);
  }

  /* ══════════════════════════════════════
     3. 下載 / 上傳 暫存按鈕
  ══════════════════════════════════════ */
  function insertSaveLoadBar(){
    var sidebar=document.getElementById('sidebar');
    if(!sidebar||document.getElementById('_bn_save_bar')) return;

    var clrBar=document.createElement('div');
    clrBar.id='_bn_save_bar';
    clrBar.style.cssText='padding:0 14px 10px;flex-shrink:0;';
    var clrBtn=document.createElement('button');
    clrBtn.textContent='🗑 清除本機暫存';
    clrBtn.style.cssText='width:100%;padding:7px 6px;background:transparent;border:1px solid var(--border,#30363d);border-radius:7px;color:#ef4444;font-size:11px;cursor:pointer;transition:.12s;text-align:center;';
    clrBtn.addEventListener('mouseenter',function(){ clrBtn.style.background='rgba(239,68,68,.08)'; });
    clrBtn.addEventListener('mouseleave',function(){ clrBtn.style.background='transparent'; });
    clrBtn.addEventListener('click',function(){
      if(!confirm('確定要清除本機暫存？畫面將回到預設值。')) return;
      try{
        /* 1. 清除 localStorage */
        Object.keys(localStorage).filter(function(k){ return k.startsWith('bn'); })
          .forEach(function(k){ localStorage.removeItem(k); });

        /* 2. 文字輸入框還原預設 value（取 HTML value 屬性原始值），觸發 broadcastText */
        ['txt-brand','txt-main','txt-sub','txt-date'].forEach(function(id){
          var el = document.getElementById(id);
          if(el){ el.value = el.defaultValue; el.dispatchEvent(new Event('input',{bubbles:true})); }
        });

        /* 3. 清除 Logo 和商品圖 */
        if(typeof global._bnClearMedia==='function') global._bnClearMedia();

        /* 4. 顏色還原預設 */
        if(global.colorState){
          Object.assign(global.colorState, {
            mainText:'#2b79c4', subText:'#2540b5', dateText:'#ffffff',
            brandText:'#ffffff', canvasBg:'#6bc0ec', ctaText:'#6bc0ec', ctaBg:'#ffffff'
          });
          if(typeof global.renderColorPickers==='function') global.renderColorPickers();
          if(typeof global.broadcastColors==='function') global.broadcastColors();
        }

        showToast('已還原為預設值','ok');
      }catch(e){ showToast('清除失敗：'+e.message,'err'); }
    });
    clrBar.appendChild(clrBtn);

    var dlBar=document.getElementById('bn-download-bar');
    if(dlBar&&dlBar.nextSibling) sidebar.insertBefore(clrBar,dlBar.nextSibling);
    else sidebar.appendChild(clrBar);
  }

  /* ══════════════════════════════════════
     初始化
  ══════════════════════════════════════ */

  /* MutationObserver：txt-main 一出現在 DOM 就立即綁定禁用語
     不依賴 DOMContentLoaded 時機，對 async 載入模板完全可靠 */
  (function watchForInputs(){
    if(document.getElementById('txt-main')){
      bridgeInputs();
      return;
    }
    var obs = new MutationObserver(function(mutations, observer){
      if(document.getElementById('txt-main')){
        observer.disconnect();
        bridgeInputs();
      }
    });
    var root = document.body || document.documentElement;
    obs.observe(root, {childList:true, subtree:true});
  })();

  ready(function(){
    global._bnStatePlugin = { save:autoSave, load:autoLoad, collect:collectState, apply:applyState, toast:showToast, bridgeInputs:bridgeInputs };

    /* banwords */
    initBanwords();

    /* 等 sidebar 出現：insertSaveLoadBar + autoLoad + startAutoSave */
    function tryInsert(){
      if(document.getElementById('sidebar')){
        insertSaveLoadBar();
        if(!global.__BN_STATE_NO_AUTOLOAD__) setTimeout(autoLoad, 800);
        startAutoSave();
      } else { setTimeout(tryInsert,300); }
    }
    tryInsert();
  });

})(window);
