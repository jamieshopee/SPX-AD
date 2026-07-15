/*!
 * BN Editor Plugin v4
 * Logo 上傳 + 商品圖上傳（兩步驟視窗：選圖→排大小）+ 下載
 */
(function () {
  if (window.__BN_EDITOR_PLUGIN__) return;
  window.__BN_EDITOR_PLUGIN__ = true;

  /* 影子圖 base64 — 直接嵌入避免依賴 editor-plugin.js 的執行時機 */
  var _BN_SHADOW_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAwkAAABzCAYAAADTyk62AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA0JpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDEwLjAtYzAwMCA3OS5kMjBlNDY2MzAsIDIwMjUvMTIvMDktMDI6MTE6MjMgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNy41ICgyMDI2MDMwMS5tLjM0MzggZWFhYWI2NikgIChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozRkQ2QUJBMTE4NjYxMUYxOTgxREI2QTVGRDIzMUIxQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDozRkQ2QUJBMjE4NjYxMUYxOTgxREI2QTVGRDIzMUIxQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjNGRDZBQjlGMTg2NjExRjE5ODFEQjZBNUZEMjMxQjFBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjNGRDZBQkEwMTg2NjExRjE5ODFEQjZBNUZEMjMxQjFBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNr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';


  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    /* ══ CSS ══ */
    var style = document.createElement('style');
    style.textContent = `
.bn-section{padding:4px 14px 10px}
.bn-accordion{border-top:1px solid rgba(255,255,255,.04);padding-top:4px;margin-top:8px}
.bn-accordion-title{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;user-select:none}
.bn-accordion-title .bn-acc-arrow{width:18px;height:18px;border:1px solid var(--border,#30363d);border-radius:999px;display:flex;align-items:center;justify-content:center;color:var(--text3,#687090);font-size:10px;line-height:1;transition:transform .15s,border-color .15s,color .15s;flex-shrink:0}
.bn-accordion-title:hover .bn-acc-arrow{border-color:var(--accent,#1f6feb);color:var(--accent,#1f6feb)}
.bn-accordion.is-collapsed .bn-section{display:none}
.bn-accordion.is-collapsed .bn-acc-arrow{transform:rotate(-90deg)}
.bn-drop{border:1.5px dashed var(--border,#30363d);border-radius:7px;padding:9px 10px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;color:var(--text3,#6e7681);font-size:11px;position:relative}
.bn-drop:hover,.bn-drop.drag{border-color:var(--accent,#1f6feb);background:rgba(31,111,235,.06);color:var(--accent,#1f6feb)}
.bn-drop input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.bn-prev{width:100%;margin-top:6px;border-radius:5px;border:1px solid var(--border,#30363d);display:none;object-fit:contain;max-height:60px;background:rgba(255,255,255,.05)}
.bn-prev.show{display:block}
.bn-clr{margin-top:4px;width:100%;background:transparent;border:1px solid var(--border,#30363d);border-radius:5px;color:var(--text2,#8b949e);font-size:11px;padding:3px;cursor:pointer;transition:.12s;display:none}
.bn-clr.show{display:block}
.bn-clr:hover{border-color:var(--red,#da3633);color:var(--red,#da3633)}
.bn-prod-list{margin-top:6px;display:flex;flex-direction:column;gap:4px}
.bn-prod-item{display:flex;align-items:center;gap:6px;background:var(--bg2,#1c2333);border-radius:5px;padding:4px 7px;font-size:11px;color:var(--text2,#8b949e)}
.bn-prod-item img{width:32px;height:32px;object-fit:contain;border-radius:3px;background:rgba(255,255,255,.05)}
.bn-prod-item span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bn-prod-item button{background:transparent;border:1px solid var(--border,#30363d);border-radius:4px;color:var(--text3,#6e7681);font-size:10px;padding:2px 6px;cursor:pointer}
.bn-prod-item button:hover{border-color:var(--accent,#1f6feb);color:var(--accent,#1f6feb)}
.bn-prod-item button.rm:hover{border-color:var(--red,#da3633);color:var(--red,#da3633)}
.bn-prod-move{display:flex;flex-direction:column;gap:2px;flex-shrink:0}
.bn-prod-move button{padding:1px 5px;font-size:10px;line-height:1.2}
.bn-reset-transform-btn{margin-top:6px;width:100%;background:transparent;border:1px solid var(--border,#30363d);border-radius:7px;color:var(--text2,#8b949e);font-size:11px;padding:7px 8px;cursor:pointer;transition:.12s}
.bn-reset-transform-btn:hover{border-color:var(--accent,#1f6feb);color:var(--accent,#1f6feb)}
.bn-reset-transform-btn:disabled{opacity:.35;cursor:not-allowed;border-color:var(--border,#30363d);color:var(--text3,#687090)}
#bn-prod-open-btn{display:block;width:100%;padding:8px;background:var(--bg2,#1c2333);border:1.5px dashed var(--border,#30363d);border-radius:7px;color:var(--text2,#8b949e);font-size:11px;cursor:pointer;text-align:center;transition:.15s;margin-bottom:2px}
#bn-prod-open-btn:hover{border-color:var(--accent,#1f6feb);color:var(--accent,#1f6feb)}
#bn-download-bar{padding:10px 14px;border-top:1px solid var(--border,#30363d);flex-shrink:0}
.bn-dl-btn{display:block;width:100%;padding:9px;background:linear-gradient(135deg,#1d4ed8,#0d47a1);border:none;border-radius:7px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:opacity .12s}
.bn-dl-btn:hover{opacity:.88}
.bn-dl-btn:disabled{opacity:.35;cursor:not-allowed}
.bn-dl-progress{font-size:10px;color:var(--text3,#6e7681);text-align:center;margin-top:5px;min-height:14px}

/* ── 背景上傳 Modal ── */
#bn-bg-open-btn{display:block;width:100%;padding:8px;background:var(--bg2,#1c2333);border:1.5px dashed var(--border,#30363d);border-radius:7px;color:var(--text2,#8b949e);font-size:11px;cursor:pointer;text-align:center;transition:.15s;box-sizing:border-box}
#bn-bg-open-btn:hover{border-color:var(--accent,#1f6feb);color:var(--accent,#1f6feb)}
#bn-bg-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
#bn-bg-modal.show{display:flex}
.bn-bg-modal-box{background:#13161f;border:1px solid #252b3d;border-radius:14px;width:min(720px,94vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}
.bn-bg-pair-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bn-bg-drop-card{border:1.5px dashed #252b3d;border-radius:12px;padding:14px;text-align:center;cursor:pointer;color:#687090;font-size:12px;position:relative;transition:.15s;min-height:190px;display:flex;flex-direction:column;justify-content:center;background:#0d1018}
.bn-bg-drop-card:hover,.bn-bg-drop-card.over{border-color:#4a90e2;background:rgba(74,144,226,.06);color:#4a90e2}
.bn-bg-drop-card input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.bn-bg-drop-card img{display:none;width:100%;height:120px;object-fit:contain;border-radius:8px;margin:8px 0;background:rgba(255,255,255,.04)}
.bn-bg-drop-card.has-img img{display:block}
.bn-bg-drop-title{font-size:14px;font-weight:700;color:#dde3f0;margin-bottom:4px}
.bn-bg-drop-desc{font-size:11px;line-height:1.6;color:#687090}
.bn-bg-drop-name{font-size:10px;color:#8b9dbf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}
.bn-bg-hint{font-size:12px;color:#8b9dbf;background:rgba(74,144,226,.08);border:1px solid rgba(74,144,226,.2);border-radius:10px;padding:9px 12px;margin-bottom:14px;line-height:1.7}
@media(max-width:640px){.bn-bg-pair-grid{grid-template-columns:1fr}.bn-bg-modal-box{width:94vw}}

/* ── 商品上傳 Modal ── */
#bn-prod-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
#bn-prod-modal.show{display:flex}
.bn-modal-box{background:#13161f;border:1px solid #252b3d;border-radius:14px;width:min(520px,94vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}
.bn-modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #252b3d}
.bn-modal-head h3{font-size:14px;font-weight:700;color:#dde3f0;margin:0}
.bn-modal-close{background:transparent;border:none;color:#687090;font-size:20px;cursor:pointer;line-height:1;padding:0}
.bn-modal-close:hover{color:#dde3f0}
.bn-modal-body{flex:1;overflow-y:auto;padding:16px 18px}
.bn-modal-foot{padding:12px 18px;border-top:1px solid #252b3d;display:flex;gap:8px;justify-content:flex-end;align-items:center}
.bn-step-tabs{display:flex;gap:8px;margin-bottom:14px}
.bn-step-tab{padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid #252b3d;color:#687090;background:transparent;cursor:pointer}
.bn-step-tab.on{background:#1a1e2b;color:#4a90e2;border-color:#4a90e2}
.bn-modal-drop{border:1.5px dashed #252b3d;border-radius:10px;padding:18px;text-align:center;cursor:pointer;color:#687090;font-size:12px;position:relative;transition:.15s;margin-bottom:12px}
.bn-modal-drop:hover,.bn-modal-drop.over{border-color:#4a90e2;background:rgba(74,144,226,.06);color:#4a90e2}
.bn-modal-drop input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.bn-preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px}
.bn-preview-cell{position:relative;border:1.5px solid #252b3d;border-radius:10px;overflow:hidden;background:#0d1018;cursor:pointer;transition:.15s}
.bn-preview-cell.is-hero{border-color:#4a90e2;box-shadow:0 0 0 2px rgba(74,144,226,.2)}
.bn-preview-cell img{width:100%;height:88px;object-fit:contain;padding:6px;display:block}
.bn-preview-cell .pc-name{font-size:10px;color:#687090;padding:0 6px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
.bn-preview-cell .pc-hero{position:absolute;top:5px;left:5px;background:#4a90e2;color:#fff;border-radius:999px;font-size:9px;font-weight:900;padding:2px 6px}
.bn-preview-cell .pc-rm{position:absolute;top:5px;right:5px;width:20px;height:20px;border-radius:50%;background:rgba(13,16,24,.85);border:1px solid rgba(255,255,255,.15);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;z-index:2}
.bn-limit-msg{font-size:11px;text-align:center;padding:4px 0;color:#687090;margin-bottom:4px}
/* step2 rank */
.bn-rank-row{display:flex;gap:12px;align-items:flex-end;justify-content:center;min-height:140px;position:relative;padding:8px 0}
.bn-rank-card{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:grab;user-select:none;position:relative;transition:opacity .15s}
.bn-rank-card.dragging{opacity:.4}
.bn-rank-img-wrap{display:flex;align-items:flex-end;justify-content:center;position:relative}
.bn-rank-img-wrap img{object-fit:contain;width:auto;display:block}
.bn-rank-arrow{background:rgba(255,255,255,.08);border:1px solid #252b3d;color:#687090;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;position:absolute;bottom:2px;transition:.12s;z-index:2}
.bn-rank-arrow:hover{background:#1a1e2b;color:#4a90e2;border-color:#4a90e2}
.bn-rank-arrow.left-arr{left:-26px}
.bn-rank-arrow.right-arr{right:-26px}
.bn-rank-name{font-size:10px;color:#687090;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
.bn-rank-tag{font-size:10px;font-weight:700;border-radius:999px;padding:2px 8px}
.bn-rank-tag.hero{background:#4a90e2;color:#fff}
.bn-rank-tag.left{background:#1a1e2b;color:#687090;border:1px solid #252b3d}
.bn-rank-tag.right{background:#1a1e2b;color:#687090;border:1px solid #252b3d}
.bn-rank-hint{font-size:11px;color:#687090;text-align:center;margin-top:6px}
.bn-drop-line{position:absolute;top:4px;bottom:4px;width:3px;background:#4a90e2;border-radius:3px;box-shadow:0 0 8px rgba(74,144,226,.7);pointer-events:none;display:none;z-index:10}
.bn-btn-skip{background:transparent;border:1px solid #252b3d;color:#687090;font-size:12px;padding:7px 14px;border-radius:7px;cursor:pointer;transition:.12s}
.bn-btn-skip:hover{border-color:#4a90e2;color:#4a90e2}
.bn-btn-confirm{background:linear-gradient(135deg,#1d4ed8,#0d47a1);border:none;color:#fff;font-size:12px;font-weight:700;padding:7px 18px;border-radius:7px;cursor:pointer;transition:opacity .12s}
.bn-btn-confirm:hover{opacity:.88}
.bn-btn-confirm:disabled{opacity:.35;cursor:not-allowed}
`;
    document.head.appendChild(style);

    /* ── 狀態 ── */
    /* logo 支援最多3張 */
    window._bnLogos = window._bnLogos || [];   /* [{id,src}] */
    window._bnLogoDataUrl = window._bnLogoDataUrl || null;  /* 向下相容：第一張 */
    var MAX_LOGOS = 3;
    window._bnProducts    = window._bnProducts    || [];
    var MAX_PROD = 3;

    /* ── 工具 ── */
    function readFile(file){ return new Promise(function(res,rej){var r=new FileReader();r.onload=function(e){res(e.target.result);};r.onerror=rej;r.readAsDataURL(file);}); }
    function loadImg(src){ return new Promise(function(res,rej){var i=new Image();i.onload=function(){res(i);};i.onerror=rej;i.src=src;}); }
    function sampleCorner(d,w,h){function px(x,y){var i=(y*w+x)*4;return{r:d[i],g:d[i+1],b:d[i+2],a:d[i+3]};}var c=[px(0,0),px(w-1,0),px(0,h-1),px(w-1,h-1)].filter(function(p){return p.a>200;});if(!c.length)return{r:255,g:255,b:255};var r=0,g=0,b=0;c.forEach(function(p){r+=p.r;g+=p.g;b+=p.b;});return{r:r/c.length,g:g/c.length,b:b/c.length};}
    function autoTrim(img){var max=1200,sc=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));var w=Math.max(1,Math.round(img.naturalWidth*sc)),h=Math.max(1,Math.round(img.naturalHeight*sc));var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);var id=ctx.getImageData(0,0,w,h),d=id.data,bg=sampleCorner(d,w,h);var x0=w,y0=h,x1=-1,y1=-1;for(var y=0;y<h;y++)for(var x=0;x<w;x++){var i=(y*w+x)*4,a=d[i+3];if(a>18&&(a<245||Math.abs(d[i]-bg.r)+Math.abs(d[i+1]-bg.g)+Math.abs(d[i+2]-bg.b)>46)&&!(d[i]>246&&d[i+1]>246&&d[i+2]>246)){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}}if(x1<0)return{src:img.src,ratio:img.naturalWidth/img.naturalHeight};var pad=Math.round(Math.max(w,h)*.015);x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);var tw=x1-x0+1,th=y1-y0+1;var o=document.createElement('canvas');o.width=tw;o.height=th;o.getContext('2d').drawImage(c,x0,y0,tw,th,0,0,tw,th);return{src:o.toDataURL('image/png'),ratio:tw/th};}

    /* ── 廣播 ── */
    function broadcast(msg){document.querySelectorAll('.preview-block iframe').forEach(function(f){try{f.contentWindow.postMessage(msg,'*');}catch(e){}});}
    function broadcastTo(id,msg){var f=document.getElementById('iframe-'+id);if(f)try{f.contentWindow.postMessage(msg,'*');}catch(e){}}
    function requestProductLayouts(){ broadcast({type:'bn-product-layout-request'}); }
    function markStateDirty(){ try{ document.dispatchEvent(new CustomEvent('bn-state-dirty')); }catch(_){ } }

    var _accordionManual = {};
    function accordionEl(key){ return document.querySelector('.bn-accordion[data-acc="'+key+'"]'); }
    function setAccordionOpen(key, open, manual){
      var acc = accordionEl(key);
      if(!acc) return;
      acc.classList.toggle('is-collapsed', !open);
      acc.dataset.open = open ? '1' : '0';
      var title = acc.querySelector('.bn-accordion-title');
      if(title) title.setAttribute('aria-expanded', open ? 'true' : 'false');
      if(manual) _accordionManual[key] = true;
    }
    function setupAccordion(key){
      var acc = accordionEl(key);
      if(!acc || acc.dataset.bound === '1') return;
      acc.dataset.bound = '1';
      var title = acc.querySelector('.bn-accordion-title');
      if(!title) return;
      title.setAttribute('role','button');
      title.setAttribute('tabindex','0');
      title.addEventListener('click', function(){
        setAccordionOpen(key, acc.classList.contains('is-collapsed'), true);
      });
      title.addEventListener('keydown', function(e){
        if(e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        setAccordionOpen(key, acc.classList.contains('is-collapsed'), true);
      });
    }
    function setupAccordions(){
      ['logo','products','personProduct'].forEach(setupAccordion);
    }
    function currentAccordionMode(){
      if(window._bnPerson || window._bnSingleProd) return 'person_product';
      if(window._bnProducts && window._bnProducts.length) return 'three_products';
      return null;
    }
    function applyAccordionDefaults(mode, force){
      if(force) _accordionManual = {};
      var resolved = mode || null;
      var defaults = {
        logo:true,
        products: resolved !== 'person_product',
        personProduct: resolved === 'person_product'
      };
      Object.keys(defaults).forEach(function(key){
        if(!force && _accordionManual[key]) return;
        setAccordionOpen(key, defaults[key], false);
      });
    }
    window._bnApplyMaterialAccordions = applyAccordionDefaults;

    /* 方版 / 橫版排品連動：同一版位只差「方 / 橫」時，共用商品位置比例。 */
    function normalizePairName(name){
      return String(name || '')
        .replace(/\.html$/i, '')
        .replace(/#U65b9|#U6a6b/gi, '')
        .replace(/[方橫横]/g, '')
        .replace(/(square|vertical|portrait|horizontal|landscape)/gi, '')
        .replace(/[\s_\-()（）]+/g, '')
        .toLowerCase();
    }
    function getLayoutById(id){
      if(typeof window.loadLayouts !== 'function') return null;
      var layouts = window.loadLayouts() || [];
      return layouts.find(function(l){ return String(l.id) === String(id); }) || null;
    }
    function getPairedLayoutIds(sourceId){
      if(typeof window.loadLayouts !== 'function') return [];
      var layouts = window.loadLayouts() || [];
      var src = layouts.find(function(l){ return String(l.id) === String(sourceId); });
      if(!src) return [];
      var key = normalizePairName(src.name || src.file);
      if(!key) return [];
      return layouts.filter(function(l){
        return l.enabled !== false && String(l.id) !== String(sourceId) && normalizePairName(l.name || l.file) === key;
      }).map(function(l){ return String(l.id); });
    }
    function syncProductLayoutToPairs(product, sourceBnid, layout){
      var pairIds = getPairedLayoutIds(sourceBnid);
      if(!pairIds.length || !product || !layout) return;
      if(!product.layouts) product.layouts = {};
      pairIds.forEach(function(tid){
        var cloned = JSON.parse(JSON.stringify(layout));
        product.layouts[tid] = cloned;
        broadcastTo(tid, {type:'bn-product-layout-apply', id:product.id, layout:cloned});
      });
    }
    window.addEventListener('message', function(ev){
      var d = ev.data || {};
      if(d.type !== 'bn-product-layout-update' || !d.id || !d.layout) return;
      /* 下載圖片/同步 iframe 期間，iframe 可能因重送商品而回傳 layout-update。
         這些不是使用者拖曳，不能寫回 _bnProducts，也不能觸發本機暫存，
         否則下載會反過來覆蓋背景色、底圖或商品排版。 */
      if(window._bnSuppressProductLayoutWrite || window._bnExporting) return;
      var p = (window._bnProducts || []).find(function(x){ return x.id === d.id; });
      if(!p) return;
      if(!p.layouts) p.layouts = {};
      var key = d.bnid ? String(d.bnid) : 'default';
      p.layouts[key] = d.layout;
      syncProductLayoutToPairs(p, key, d.layout);
      /* 也保留最後一次實際畫布座標，方便舊版 JSON 或單版位還原 */
      p.x = d.layout.left; p.y = d.layout.top; p.width = d.layout.width; p.height = d.layout.height;
      p.layout = d.layout;
      markStateDirty();
    });

    /* ══ Logo 上傳 ══ */
    function insertLogoUI(){
      var scroll=document.getElementById('sidebar-scroll');
      if(!scroll||document.getElementById('bn-logo-drop'))return;
      var target=null;
      scroll.querySelectorAll('.s-section').forEach(function(el){if(el.textContent.trim()==='排版選擇')target=el;});
      var sec=document.createElement('div');
      sec.innerHTML=[
        '<div class="bn-accordion" data-acc="logo">',
        '<div class="s-section bn-accordion-title" style="margin-top:14px"><span>LOGO 上傳（最多3張）</span><span class="bn-acc-arrow">⌄</span></div>',
        '<div class="bn-section">',
        '  <div class="bn-drop" id="bn-logo-drop">',
        '    <input type="file" accept="image/*" multiple id="bn-logo-inp">',
        '    ＋ 點擊或拖曳上傳 Logo（依 LOGO_01 / 02 / 03 排序）',
        '  </div>',
        '  <div style="font-size:10px;color:var(--text3,#687090);margin-top:4px">可一次多選或逐張追加；同編號會替換。</div>',
        '  <div class="bn-prod-list" id="bn-logo-list"></div>',
        '</div>',
        '</div>',
      ].join('');
      if(target)scroll.insertBefore(sec,target);else scroll.appendChild(sec);
      setupAccordions();
      applyAccordionDefaults(currentAccordionMode(), false);
      var inp=document.getElementById('bn-logo-inp');
      var drop=document.getElementById('bn-logo-drop');
      inp.addEventListener('change',function(){
        Array.from(this.files).forEach(function(f){doLoadLogo(f);});
        inp.value='';
      });
      var _logoDragN = 0; /* dragenter counter — 防子元素 dragleave 誤觸 */
      drop.addEventListener('dragenter', function(e){ e.preventDefault(); _logoDragN++; this.classList.add('drag'); });
      drop.addEventListener('dragover',  function(e){ e.preventDefault(); });
      drop.addEventListener('dragleave', function(){ _logoDragN--; if(_logoDragN<=0){ _logoDragN=0; this.classList.remove('drag'); } });
      drop.addEventListener('drop',function(e){
        e.preventDefault(); _logoDragN=0; this.classList.remove('drag');
        Array.from(e.dataTransfer.files).filter(function(f){return f.type.startsWith('image/');})
          .forEach(function(f){doLoadLogo(f);});
      });
    }

    function renderLogoList(){
      var list=document.getElementById('bn-logo-list');
      if(!list)return;
      list.innerHTML='';
      window._bnLogos.forEach(function(lg,i){
        var row=document.createElement('div');row.className='bn-prod-item';
        var img=document.createElement('img');img.src=lg.src;
        var name=document.createElement('span');name.textContent='Logo '+(i+1);
        /* 恢復圓邊狀態 */
        if(lg.round){ img.dataset.bnLogoRound='1'; img.style.borderRadius='50%'; }

        /* 編輯按鈕：點了彈出四個選項 */
        /* ◀ ▶ 換位置箭頭 */
        var moveWrap=document.createElement('div');
        moveWrap.style.cssText='display:flex;flex-direction:column;gap:2px;flex-shrink:0;';

        var upLogo=document.createElement('button');upLogo.textContent='▲';upLogo.title='往前';
        var dnLogo=document.createElement('button');dnLogo.textContent='▼';dnLogo.title='往後';
        var logoIdx = window._bnLogos.indexOf(lg);
        upLogo.disabled = logoIdx === 0;
        dnLogo.disabled = logoIdx === window._bnLogos.length - 1;
        upLogo.style.opacity = upLogo.disabled ? '0.3' : '1';
        dnLogo.style.opacity = dnLogo.disabled ? '0.3' : '1';

        upLogo.addEventListener('click',(function(lid){return function(){
          var idx=window._bnLogos.findIndex(function(x){return x.id===lid;});
          if(idx<=0)return;
          var tmp=window._bnLogos[idx]; window._bnLogos[idx]=window._bnLogos[idx-1]; window._bnLogos[idx-1]=tmp;
          window._bnLogoDataUrl=window._bnLogos[0].src;
          renderLogoList(); broadcast({type:'bn-logos',logos:window._bnLogos});
        };})(lg.id));

        dnLogo.addEventListener('click',(function(lid){return function(){
          var idx=window._bnLogos.findIndex(function(x){return x.id===lid;});
          if(idx<0||idx>=window._bnLogos.length-1)return;
          var tmp=window._bnLogos[idx]; window._bnLogos[idx]=window._bnLogos[idx+1]; window._bnLogos[idx+1]=tmp;
          window._bnLogoDataUrl=window._bnLogos[0].src;
          renderLogoList(); broadcast({type:'bn-logos',logos:window._bnLogos});
        };})(lg.id));

        moveWrap.appendChild(upLogo); moveWrap.appendChild(dnLogo);

        var editBtn=document.createElement('button');editBtn.textContent='編輯';
        editBtn.addEventListener('click',(function(lid, imgRef){return function(e){
          e.stopPropagation();
          showLogoMenu(lid, imgRef, editBtn);
        };})(lg.id, img));

        var btn=document.createElement('button');btn.textContent='移除';
        btn.addEventListener('click',(function(lid){return function(){
          window._bnLogos=window._bnLogos.filter(function(x){return x.id!==lid;});
          window._bnLogoDataUrl=window._bnLogos.length?window._bnLogos[0].src:null;
          renderLogoList();
          broadcast({type:'bn-logo-remove',id:lid});
          broadcast({type:'bn-logos',logos:window._bnLogos});
        };})(lg.id));
        row.appendChild(img);row.appendChild(name);row.appendChild(moveWrap);row.appendChild(editBtn);row.appendChild(btn);
        list.appendChild(row);
      });
      /* drop 按鈕狀態 */
      var drop=document.getElementById('bn-logo-drop');
      if(drop) drop.style.opacity=window._bnLogos.length>=MAX_LOGOS?'0.4':'1';
    }


    /* 工具列「編輯」按鈕的選單 */
    function showLogoMenu(lid, imgEl, anchorEl){
      function doShow(){
        if(!window.BNLogoMenu){ return; }
        var n = window._bnLogos.length;
        var idx = window._bnLogos.findIndex(function(x){return x.id===lid;});
        /* 建選單 */
        var menu = document.getElementById('_bn_logo_inline_menu');
        if(!menu){
          menu = document.createElement('div');
          menu.id = '_bn_logo_inline_menu';
          menu.style.cssText = [
            'position:fixed;z-index:999999;',
            'background:#111;color:#fff;',
            'border-radius:10px;',
            'box-shadow:0 8px 24px rgba(0,0,0,.4);',
            'padding:6px 0;min-width:120px;',
          ].join('');
          document.body.appendChild(menu);
          document.addEventListener('click', function(){
            menu.style.display='none';
          });
        }

        var items = [
          { label:'裁切', action:'crop' },
          { label:'加圓邊', action:'round' },
        ];

        menu.innerHTML = '';
        items.forEach(function(item){
          if(item.hidden) return;
          var b = document.createElement('button');
          b.textContent = item.action === 'round'
            ? (imgEl.dataset.bnLogoRound === '1' ? '取消圓邊' : '加圓邊')
            : item.label;
          b.style.cssText = 'display:block;width:100%;border:0;background:transparent;color:#fff;text-align:left;padding:7px 14px;font-size:13px;cursor:pointer;';
          b.addEventListener('mouseover', function(){ this.style.background='#2b2b2b'; });
          b.addEventListener('mouseout',  function(){ this.style.background='transparent'; });
          b.addEventListener('click', function(e){
            e.stopPropagation();
            menu.style.display = 'none';
            handleLogoAction(item.action, lid, imgEl);
          });
          menu.appendChild(b);
        });

        /* 定位到按鈕旁邊 */
        var rect = anchorEl.getBoundingClientRect();
        var left = rect.left;
        var top  = rect.bottom + 4;
        if(left + 130 > window.innerWidth) left = window.innerWidth - 134;
        menu.style.left = left + 'px';
        menu.style.top  = top  + 'px';
        menu.style.display = 'block';
      }

      if(window.BNLogoMenu){ doShow(); }
      else {
        var s=document.createElement('script');
        s.src='js/logo-editor-plugin.js';
        s.onload=doShow;
        document.head.appendChild(s);
      }
    }

    function handleLogoAction(action, lid, imgEl){
      if(action === 'crop'){
        window.BNLogoMenu.openCropEditor(imgEl.src, function(newSrc){
          if(!newSrc) return;
          var lo = window._bnLogos.find(function(x){return x.id===lid;});
          if(lo){
            lo.src = newSrc;
            imgEl.src = newSrc;
            window._bnLogoDataUrl = window._bnLogos[0].src;
            broadcast({type:'bn-logos', logos:window._bnLogos});
          }
        });
      } else if(action === 'swap'){
        var idx = window._bnLogos.findIndex(function(x){return x.id===lid;});
        if(idx >= 0){
          var next = (idx + 1) % window._bnLogos.length;
          var tmp = window._bnLogos[idx];
          window._bnLogos[idx] = window._bnLogos[next];
          window._bnLogos[next] = tmp;
          window._bnLogoDataUrl = window._bnLogos[0].src;
          renderLogoList();
          broadcast({type:'bn-logos', logos:window._bnLogos});
        }
      } else if(action === 'round'){
        var isOn = imgEl.dataset.bnLogoRound === '1';
        imgEl.dataset.bnLogoRound = isOn ? '' : '1';
        imgEl.style.borderRadius  = isOn ? '' : '10px';
        /* 把 round 狀態存進 _bnLogos */
        var lo = window._bnLogos.find(function(x){return x.id===lid;});
        if(lo) lo.round = !isOn;
        broadcast({type:'bn-logos', logos:window._bnLogos});
        renderLogoList();
      } else if(action === 'delete'){
        window._bnLogos = window._bnLogos.filter(function(x){return x.id!==lid;});
        window._bnLogoDataUrl = window._bnLogos.length ? window._bnLogos[0].src : null;
        renderLogoList();
        broadcast({type:'bn-logo-remove', id:lid});
        broadcast({type:'bn-logos', logos:window._bnLogos});
      }
    }

    /* ══ Logo Menu（logo-editor-plugin.js 的 BNLogoMenu） ══ */
    function attachLogoMenu(lid, imgEl){
      function doAttach(){
        if(!window.BNLogoMenu){ return; }
        var n = window._bnLogos.length;
        window.BNLogoMenu.attach(imgEl, {
          showSwap: n > 1,
          onEdit: function(el, newSrc){
            var lo = window._bnLogos.find(function(x){return x.id===lid;});
            if(lo){
              lo.src = newSrc;
              el.src = newSrc;
              window._bnLogoDataUrl = window._bnLogos[0].src;
              broadcast({type:'bn-logos', logos:window._bnLogos});
            }
          },
          onSwap: function(){
            /* 往右移：把此 logo 往後排一位 */
            var idx = window._bnLogos.findIndex(function(x){return x.id===lid;});
            if(idx < 0) return;
            var next = (idx + 1) % window._bnLogos.length;
            var tmp = window._bnLogos[idx];
            window._bnLogos[idx] = window._bnLogos[next];
            window._bnLogos[next] = tmp;
            window._bnLogoDataUrl = window._bnLogos[0].src;
            renderLogoList();
            broadcast({type:'bn-logos', logos:window._bnLogos});
          },
          onDelete: function(){
            window._bnLogos = window._bnLogos.filter(function(x){return x.id!==lid;});
            window._bnLogoDataUrl = window._bnLogos.length ? window._bnLogos[0].src : null;
            renderLogoList();
            broadcast({type:'bn-logo-remove', id:lid});
            broadcast({type:'bn-logos', logos:window._bnLogos});
          },
          onRound: function(el, isOn){
            broadcast({type:'bn-logos', logos:window._bnLogos});
          }
        });
      }
      if(window.BNLogoMenu){
        doAttach();
      } else {
        var s=document.createElement('script');
        s.src='js/logo-editor-plugin.js';
        s.onload=doAttach;
        document.head.appendChild(s);
      }
    }

    /* 從檔名抽取 1–3 的位置編號（LOGO_01 / 02 / 03 或純數字 1–3） */
    function detectLogoSlot(filename){
      var base = filename.replace(/\.[^.]+$/, '').toUpperCase();
      /* 優先比對 LOGO_01 / LOGO01 / LOGO-01；其次比對明確尾碼 _01 / _02 / _03 */
      var m = base.match(/LOGO[_\-\s]?0?([123])/) || base.match(/_0?([123])$/);
      return m ? parseInt(m[1], 10) : null; /* 1, 2, or 3 */
    }

    /* ── Logo 自動裁切：去除白底與透明邊框 ── */
    function trimLogoSrc(src){
      return new Promise(function(resolve){
        var img = new Image();
        img.onload = function(){
          var w = img.naturalWidth, h = img.naturalHeight;
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          var data = ctx.getImageData(0, 0, w, h).data;

          var top = h, bottom = -1, left = w, right = -1;
          for(var y = 0; y < h; y++){
            for(var x = 0; x < w; x++){
              var i = (y * w + x) * 4;
              var r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
              /* 跳過：完全透明（a<10）或近白色（RGB>240 且不透明）*/
              if(a < 10) continue;
              if(a > 200 && r > 240 && g > 240 && b > 240) continue;
              /* 有效像素 → 更新邊界 */
              if(y < top)    top    = y;
              if(y > bottom) bottom = y;
              if(x < left)   left   = x;
              if(x > right)  right  = x;
            }
          }

          /* 全部都是白/透明 → 原圖不動 */
          if(bottom < 0 || right < 0){ resolve(src); return; }

          var cw = right - left + 1, ch = bottom - top + 1;
          var out = document.createElement('canvas');
          out.width = cw; out.height = ch;
          out.getContext('2d').drawImage(img, left, top, cw, ch, 0, 0, cw, ch);
          console.log('[bn-logo-trim] ' + w + 'x' + h + ' → ' + cw + 'x' + ch);
          resolve(out.toDataURL('image/png'));
        };
        img.onerror = function(){ resolve(src); };
        img.src = src;
      });
    }

    function doLoadLogo(file){
      readFile(file).then(function(s){
        trimLogoSrc(s).then(function(trimmed){
          var slot = detectLogoSlot(file.name); /* 1–3 or null */
          var slotIdx = slot !== null ? slot - 1 : null; /* 0–2 */
          var id = 'logo_' + Date.now();
          var newLogo = {id:id, src:trimmed};

          if(slotIdx !== null){
            /* 同編號替換，否則插入到對應位置 */
            var replaced = false;
            if(window._bnLogos[slotIdx]){
              window._bnLogos[slotIdx] = newLogo;
              replaced = true;
            }
            if(!replaced){
              if(window._bnLogos.length < MAX_LOGOS){
                window._bnLogos.splice(slotIdx, 0, newLogo);
              }
            }
          } else {
            /* 無編號：追加，不超過上限 */
            if(window._bnLogos.length < MAX_LOGOS) window._bnLogos.push(newLogo);
          }

          window._bnLogoDataUrl = window._bnLogos[0] ? window._bnLogos[0].src : null;
          renderLogoList();
          broadcast({type:'bn-logos', logos:window._bnLogos});
          markStateDirty();
        });
      });
    }

    /* ── slot 追蹤（insertProductUI + renderProdList 共用，必須在外層）── */
    var _slotted   = {};  /* {0:item, 1:item, 2:item} */
    var _unslotted = [];  /* 無編號的商品 */

    /* ── 商品上傳（直接帶入，不彈跳視窗）── */
    function insertProductUI(){
      var scroll = document.getElementById('sidebar-scroll');
      if(!scroll || document.getElementById('bn-prod-inp')) return;
      var target = null;
      scroll.querySelectorAll('.s-section').forEach(function(el){
        if(el.textContent.trim() === '排版選擇') target = el;
      });
      var sec = document.createElement('div');
      sec.innerHTML = [
        '<div class="bn-accordion" data-acc="products">',
        '<div class="s-section bn-accordion-title" style="margin-top:8px"><span>商品圖（最多3張）</span><span class="bn-acc-arrow">⌄</span></div>',
        '<div class="bn-section">',
        '  <div id="bn-prod-drop" style="cursor:pointer;border:1.5px dashed var(--border,#30363d);border-radius:8px;padding:10px;text-align:center;font-size:12px;color:var(--text3,#687090)">',
        '    ＋ 點擊或拖曳上傳商品圖（依 01 / 02 / 03 自動排版）',
        '    <input type="file" id="bn-prod-inp" accept="image/*" multiple style="display:none">',
        '  </div>',
        '  <div style="font-size:10px;color:var(--text3,#687090);margin-top:4px">01 主品置中最大；02 左側配品；03 右側配品。未編號時依上傳順序。</div>',
        '  <div class="bn-prod-list" id="bn-prod-list"></div>',
        '  <button type="button" class="bn-reset-transform-btn" id="bn-prod-reset-btn" disabled>恢復預設位置</button>',
        '</div>',
        '</div>',
        '<div class="bn-accordion" data-acc="personProduct">',
        '<div class="s-section bn-accordion-title" style="margin-top:8px"><span>1人 +1品</span><span class="bn-acc-arrow">⌄</span></div>',
        '<div class="bn-section">',
        '  <div id="bn-pp-drop" style="cursor:pointer;border:1.5px dashed var(--border,#30363d);border-radius:8px;padding:10px;text-align:center;font-size:12px;color:var(--text3,#687090)">',
        '    ＋ 點擊或拖曳上傳（依檔名 _人 / _品 自動辨識）',
        '    <input type="file" id="bn-pp-inp" accept="image/*" multiple style="display:none">',
        '  </div>',
        '  <div style="font-size:10px;color:var(--text3,#687090);margin-top:4px">檔名需包含「_人」或「_品」；同角色會替換。</div>',
        '  <button type="button" class="bn-reset-transform-btn" id="bn-pp-reset-btn" disabled>恢復預設位置</button>',
        '</div>',
        '</div>',
      ].join('');
      if(target) scroll.insertBefore(sec, target); else scroll.appendChild(sec);
      setupAccordions();
      applyAccordionDefaults(currentAccordionMode(), false);

      /* ── 商品圖：直接帶入（slot 追蹤支援逐張追加＋同號替換）── */
      var prodDrop = document.getElementById('bn-prod-drop');
      var prodInp  = document.getElementById('bn-prod-inp');
      var prodResetBtn = document.getElementById('bn-prod-reset-btn');
      var _prodDragN = 0; /* dragenter counter — 防子元素 dragleave 誤觸 */
      prodDrop.addEventListener('click', function(e){ if(e.target !== prodInp) prodInp.click(); });
      prodDrop.addEventListener('dragenter', function(e){ e.preventDefault(); _prodDragN++; this.style.borderColor='#4a90e2'; });
      prodDrop.addEventListener('dragover',  function(e){ e.preventDefault(); });
      prodDrop.addEventListener('dragleave', function(){ _prodDragN--; if(_prodDragN<=0){ _prodDragN=0; this.style.borderColor=''; } });
      prodDrop.addEventListener('drop', function(e){
        e.preventDefault(); _prodDragN=0; this.style.borderColor='';
        handleDirectProdFiles(Array.from(e.dataTransfer.files));
      });
      prodInp.addEventListener('change', function(){
        handleDirectProdFiles(Array.from(this.files)); this.value='';
      });
      if(prodResetBtn){
        prodResetBtn.addEventListener('click', function(){
          if(!(window._bnProducts && window._bnProducts.length)) return;
          console.log('[reset] button clicked products');
          window._bnProducts.forEach(function(p){
            delete p.layout;
            delete p.layouts;
            p.x = p.y = p.width = p.height = undefined;
            p.rotation = 0;
            p.userAdjusted = false;
          });
          if(typeof window._bnResetCurrentLayoutState === 'function') window._bnResetCurrentLayoutState('products');
          broadcast({type:'bn-reset-products'});
          markStateDirty();
          setTimeout(function(){ broadcast({type:'bn-layout-state-request'}); }, 80);
        });
      }

      /* 手動換圖 Bug Fix（Bug #2A/#2B）：完整檔名（含副檔名，大小寫正規化）
         比對既有商品，找到相符者視為「取代既有商品」，不得只比對去除副檔名
         後的 basename（避免「商品.jpg」與「商品.png」被誤判為同一個既有商品）。*/
      function findExistingProductByFilename(filename){
        var key = String(filename || '').trim().toLowerCase();
        if(!key) return null;
        var found = null;
        window._bnProducts.forEach(function(p){
          if(found) return;
          var existingKey = String(p.filename || '').trim().toLowerCase();
          if(existingKey && existingKey === key) found = p;
        });
        return found;
      }

      /* 手動換圖 Bug Fix：原地更新既有商品的圖片來源與 filename identity，
         不 remove、不 re-add、不建立新 id；position／zOrder（JS 端欄位）
         不動（本函式完全不觸碰這兩個欄位）。
         整組排版修正（Bug #2 追加）：新圖片 ratio／baselineRatio 送到
         Canvas 端後，Canvas 會清除三張商品的 userAdjusted 並呼叫既有
         layoutProducts() 整組重新排版（見 js/layout-runtime.js 的
         bn-product-image-update handler），這會暫時把 zIndex 依 position
         順序覆寫；因此這裡送完訊息後，緊接著呼叫既有的 broadcastZOrder()
         （不修改其邏輯），依目前 zOrder 重新校正 zIndex，確保最終畫面的
         前後順序與換圖前一致。
         Template 來源修正（Bug #2 追加）：判斷 autoShadow 改用
         window._bnGetActiveTemplateJson()（src/app.js 提供，直接回傳目前
         activeTemplate._json 的即時參照），與 applyProductsToCanvas()／
         buildProductPayloads() 判斷 autoShadow 用的是同一份 Template JSON
         來源，不再讀取 window.__BN_TEMPLATE__，不建立第二套判斷。
         匯出來源修正（Bug #2 追加）：額外把換圖當下、autoTrim／autoShadow
         處理「之前」的原始 dataURL 存進 existing.manualReplaceRawSrc——
         這是一個獨立命名、僅供本流程使用的 runtime-only 屬性，不讀寫
         existing.baseSrc（Crop/Eraser/Shadow Editor 專用，語意不同、不得
         混用），也不寫入 Project State schema，只供 src/app.js 的
         cloneJobForExport() 匯出 _embeddedAssets 時讀取，避免匯出「已處理
         過的 render 圖」被 buildProductPayloads() 在重新匯入時誤當原始
         素材、再處理一次造成陰影疊加與整組尺寸跑掉。*/
      async function replaceExistingProductImage(existing, file){
        var rawSrc = await readFile(file);
        var src = rawSrc;
        var tpl = typeof window._bnGetActiveTemplateJson === 'function' ? window._bnGetActiveTemplateJson() : null;
        var useAutoShadow = !!(tpl && tpl.productZones && tpl.productZones.threeProducts &&
                               tpl.productZones.threeProducts.defaultLayout &&
                               tpl.productZones.threeProducts.defaultLayout.autoShadow);
        var img = await loadImg(src);
        var trimmed = autoTrim(img);
        src = trimmed.src;
        var ratio = trimmed.ratio;
        var baselineRatio = existing.baselineRatio || 1;
        if(useAutoShadow){
          var shadowed = await autoApplyShadow(src, ratio);
          src = shadowed.src;
          ratio = shadowed.ratio;
          baselineRatio = shadowed.baselineRatio || 1;
        }
        existing.src = src;
        existing.manualReplaceRawSrc = rawSrc;
        existing.filename = file.name;
        existing.name = file.name.replace(/\.[^.]+$/, '');
        existing.ratio = ratio || 1;
        existing.baselineRatio = baselineRatio;
        broadcast({type:'bn-product-image-update', id:existing.id, src:src, filename:existing.filename, ratio:existing.ratio, baselineRatio:existing.baselineRatio});
        broadcastZOrder();
        if(typeof window._bnInvalidateApprovedAssetForManualReplace === 'function'){
          window._bnInvalidateApprovedAssetForManualReplace(existing.filename, existing.position);
        }
      }

      async function handleDirectProdFiles(files){
        var imgs = files.filter(function(f){ return f.type.startsWith('image/'); });
        if(!imgs.length) return;
        /* 同檔名取代與全新上傳為兩條明確分支：完整檔名比對到既有商品者走
           原地取代，其餘維持既有 _slotted/_unslotted 全新上傳流程不變。*/
        var toReplace = [];
        var toUpload = [];
        imgs.forEach(function(f){
          var existing = findExistingProductByFilename(f.name);
          if(existing) toReplace.push({file:f, existing:existing});
          else toUpload.push(f);
        });
        for(var r=0; r<toReplace.length; r++){
          await replaceExistingProductImage(toReplace[r].existing, toReplace[r].file);
        }
        if(toReplace.length){
          renderProdList();
          markStateDirty();
        }
        if(!toUpload.length){ updateMutualExclusion(); return; }
        var newItems = await Promise.all(toUpload.map(function(f){
          return readFile(f).then(function(src){
            var position = window.BNProductSlotUtils.detectProductPosition(f.name);
            return {src:src, name:f.name.replace(/\.[^.]+$/,''), filename:f.name, ratio:1, _slot:position};
          });
        }));
        newItems.forEach(function(r){
          if(r._slot !== null){ _slotted[r._slot] = r; }
          else { _unslotted.push(r); }
        });
        var byPosition = new Array(MAX_PROD).fill(null);
        [0,1,2].forEach(function(pos){
          if(_slotted[pos]) byPosition[pos] = Object.assign({}, _slotted[pos], {position:pos});
        });
        var unslottedIndex = 0;
        for(var pos=0; pos<MAX_PROD && unslottedIndex<_unslotted.length; pos++){
          if(!byPosition[pos]){
            byPosition[pos] = Object.assign({}, _unslotted[unslottedIndex], {position:pos});
            unslottedIndex++;
          }
        }
        var ordered = byPosition.filter(Boolean);
        await applyWithOrder(ordered, false);
        updateMutualExclusion();
      }

      window._bnResetProdSlots = function(){ _slotted = {}; _unslotted = []; };

      /* ── 互鎖：商品圖有圖 → 1人+1品 反灰；反之亦然 ── */
      function updateMutualExclusion(){
        var hasProd = !!(window._bnProducts && window._bnProducts.length > 0);
        var hasPP   = !!(window._bnPerson || window._bnSingleProd);

        var ppDrop  = document.getElementById('bn-pp-drop');
        var ppInp   = document.getElementById('bn-pp-inp');
        var ppHint  = ppDrop ? ppDrop.nextElementSibling : null;
        var ppReset = document.getElementById('bn-pp-reset-btn');
        if(ppDrop){
          ppDrop.style.opacity       = hasProd ? '0.35' : '1';
          ppDrop.style.pointerEvents = hasProd ? 'none'  : '';
          ppDrop.style.cursor        = hasProd ? 'not-allowed' : 'pointer';
          if(ppHint) ppHint.textContent = hasProd
            ? '⚠ 已使用商品圖模式，移除商品後才可使用'
            : '檔名需包含「_人」或「_品」；同角色會替換。';
          if(ppHint) ppHint.style.color = hasProd ? '#f5a623' : '';
        }
        if(ppReset) ppReset.disabled = !window._bnSingleProd;

        var prodDrop = document.getElementById('bn-prod-drop');
        var prodHint = prodDrop ? prodDrop.nextElementSibling : null;
        var prodReset = document.getElementById('bn-prod-reset-btn');
        if(prodDrop){
          prodDrop.style.opacity       = hasPP ? '0.35' : '1';
          prodDrop.style.pointerEvents = hasPP ? 'none'  : '';
          prodDrop.style.cursor        = hasPP ? 'not-allowed' : 'pointer';
          if(prodHint) prodHint.style.color = hasPP ? '#f5a623' : '';
          if(prodHint) prodHint.textContent = hasPP
            ? '⚠ 已使用1人+1品模式，清除後才可使用'
            : '01 主品置中最大；02 左側配品；03 右側配品。未編號時依上傳順序。';
        }
        if(prodReset) prodReset.disabled = !(window._bnProducts && window._bnProducts.length);
      }
      window._bnUpdateMutualExclusion = updateMutualExclusion;
      function updateTemplateModeLabel(mode){
        if(typeof window._bnUpdateTemplateModeLabel === 'function') window._bnUpdateTemplateModeLabel(mode);
        applyAccordionDefaults(mode, false);
      }

      /* ── 1人+1品 上傳 ── */
      var ppDrop = document.getElementById('bn-pp-drop');
      var ppInp  = document.getElementById('bn-pp-inp');
      var ppResetBtn = document.getElementById('bn-pp-reset-btn');

      var _ppDragN = 0; /* dragenter counter — 防子元素 dragleave 誤觸 */
      ppDrop.addEventListener('click', function(e){ if(e.target !== ppInp) ppInp.click(); });
      ppDrop.addEventListener('dragenter', function(e){ e.preventDefault(); _ppDragN++; this.style.borderColor='#4a90e2'; });
      ppDrop.addEventListener('dragover',  function(e){ e.preventDefault(); });
      ppDrop.addEventListener('dragleave', function(){ _ppDragN--; if(_ppDragN<=0){ _ppDragN=0; this.style.borderColor=''; } });
      ppDrop.addEventListener('drop', function(e){
        e.preventDefault(); _ppDragN=0; this.style.borderColor='';
        handlePersonProductFiles(Array.from(e.dataTransfer.files));
      });
      ppInp.addEventListener('change', function(){
        handlePersonProductFiles(Array.from(this.files)); this.value='';
      });
      if(ppResetBtn){
        ppResetBtn.addEventListener('click', function(){
          if(!window._bnSingleProd) return;
          console.log('[reset] button clicked singleProduct');
          window._bnSingleProd.offsetX = 0;
          window._bnSingleProd.offsetY = 0;
          window._bnSingleProd.transform = null;
          if(typeof window._bnResetCurrentLayoutState === 'function') window._bnResetCurrentLayoutState('singleProduct');
          broadcast({type:'bn-reset-single-product'});
          markStateDirty();
          setTimeout(function(){ broadcast({type:'bn-layout-state-request'}); }, 80);
        });
      }

      async function handlePersonProductFiles(files){
        var tpl = window.__BN_TEMPLATE__ || {};
        var personDefaults = (((tpl.productZones||{}).person)||{}).defaultLayout || {};
        var singleDefaults = (((tpl.productZones||{}).singleProduct)||{}).defaultLayout || {};
        var matched = 0;
        if(files.some(function(file){
          var fname = file && file.name || '';
          return file && file.type && file.type.startsWith('image/') && (fname.indexOf('_人') >= 0 || fname.indexOf('_品') >= 0);
        })) updateTemplateModeLabel('person_product');
        for(var i=0;i<files.length;i++){
          var file = files[i];
          if(!file.type.startsWith('image/')) continue;
          var fname = file.name;
          var isPerson  = fname.indexOf('_人') >= 0;
          var isProduct = fname.indexOf('_品') >= 0;
          if(!isPerson && !isProduct) continue; /* 檔名未含 _人 / _品，跳過 */
          matched++;
          var dataUrl = await readFile(file);
          var img     = await loadImg(dataUrl);
          var trimmed = autoTrim(img);
          var src = trimmed.src, ratio = trimmed.ratio;
          if(isPerson){
            var fitW = personDefaults.fitWidth;
            window._bnPerson = {src:src, displayWidth:fitW, objectFit:'contain'};
            broadcast({type:'bn-person-add', src:src, displayWidth:fitW, objectFit:'contain'});
            /* 一人一品 Bug Fix：手動換圖後沿用三商品既有的 Asset Pipeline
               record 失效化機制（window._bnInvalidateApprovedAssetForManualReplace，
               不新增第二套邏輯），避免下載單張暫存並重新匯入後，Approved
               Asset Resolver 命中換圖前仍標示 approved 的舊 record，蓋過剛
               內嵌的新圖。Person 無 slot 概念，帶 null。 */
            if(typeof window._bnInvalidateApprovedAssetForManualReplace === 'function'){
              window._bnInvalidateApprovedAssetForManualReplace(fname, null, 'person');
            }
          } else {
            /* Single Product Shadow Bug Fix：換圖當下改用既有、可靠的
               window._bnGetActiveTemplateJson()（直接回傳 activeTemplate._json
               即時參照，src/app.js 提供，三商品 replaceExistingProductImage()
               已使用同一個函式）重新取得 singleProduct 設定，取代原本讀取、
               透過 selectJob()/selectStyle() 內未 await 的 .then() 非同步指派、
               換圖當下可能仍是 null／不完整的 window.__BN_TEMPLATE__。只影響
               這個分支內 autoShadow／maxWidth／maxHeight 的判斷來源，不影響
               函式頂端的 tpl／personDefaults，Person 分支行為不變。 */
            var reliableTpl = typeof window._bnGetActiveTemplateJson === 'function' ? window._bnGetActiveTemplateJson() : null;
            var singleDefaultsReliable = (((reliableTpl || {}).productZones || {}).singleProduct || {}).defaultLayout || singleDefaults;
            if(singleDefaultsReliable.autoShadow){
              var shadowed = await autoApplyShadow(src, ratio);
              src = shadowed.src; ratio = shadowed.ratio;
            }
            var maxW = singleDefaultsReliable.maxWidth, maxH = singleDefaultsReliable.maxHeight;
            window._bnSingleProd = {src:src, ratio:ratio, displayW:maxW, displayH:maxH, zoneHeight:maxH, objectFit:'contain'};
            broadcast({type:'bn-single-product-add', src:src, ratio:ratio, displayW:maxW, displayH:maxH, zoneHeight:maxH, objectFit:'contain'});
            /* 一人一品 Bug Fix：同上，Single Product 帶 role:'singleProduct'，
               無 slot 概念，帶 null。 */
            if(typeof window._bnInvalidateApprovedAssetForManualReplace === 'function'){
              window._bnInvalidateApprovedAssetForManualReplace(fname, null, 'singleProduct');
            }
          }
        }
        /* 若所有圖片都未含 _人/_品，顯示提示 */
        if(matched === 0 && files.length > 0){
          var hint = document.getElementById('bn-pp-drop') && document.getElementById('bn-pp-drop').nextElementSibling;
          if(hint){
            var orig = hint.textContent;
            hint.textContent = '⚠ 未找到含「_人」或「_品」的檔名，請重新命名後再上傳';
            hint.style.color = '#e05c5c';
            setTimeout(function(){ hint.textContent = orig; hint.style.color = ''; }, 3000);
          }
        }
        updateMutualExclusion();
        updateTemplateModeLabel();
        markStateDirty();
      }

      window._bnRenderPersonProduct = function(){
        if(window._bnPerson){
          broadcast({type:'bn-person-add', src:window._bnPerson.src,
            displayWidth:window._bnPerson.displayWidth, objectFit:window._bnPerson.objectFit||'contain'});
        }
        if(window._bnSingleProd){
          var p = window._bnSingleProd;
          broadcast({type:'bn-single-product-add', src:p.src, ratio:p.ratio,
            displayW:p.displayW, displayH:p.displayH, zoneHeight:p.zoneHeight, objectFit:p.objectFit||'contain',
            offsetX:p.offsetX || 0, offsetY:p.offsetY || 0,
            transform:p.transform || null});
        }
      };
    }

    var autoApplyShadow = window.BNImageUtils.autoApplyShadow;

    /* ── 套用 ── */
      async function applyWithOrder(orderedItems,skipRatio){
      if(!orderedItems.length)return;
      updateTemplateModeLabel('three_products');
      /* 三品覆蓋 Bug Fix（v2）：只清除這次清單裡有對應到的格子，其他既有商品的
         DOM box／id 完全不動，比照既有「移除」按鈕只針對單一商品操作的做法
         （見 renderProdList 內 rmBtn 的 click handler，約 944-951 行）。 */
      var replacedPositions = {};
      orderedItems.forEach(function(item){
        var pos = item.position !== undefined ? item.position : null;
        if(pos !== null) replacedPositions[pos] = true;
      });
      var oldIdsToRemove = window._bnProducts
        .filter(function(p){ return replacedPositions[p.position !== undefined ? p.position : 0]; })
        .map(function(p){ return p.id; });
      oldIdsToRemove.forEach(function(id){broadcast({type:'bn-product-remove',id:id});});
      window._bnProducts = window._bnProducts.filter(function(p){
        return !replacedPositions[p.position !== undefined ? p.position : 0];
      });

      /* 檢查 template 是否啟用 autoShadow */
      var tpl = window.__BN_TEMPLATE__;
      var useAutoShadow = !!(tpl && tpl.productZones && tpl.productZones.threeProducts &&
                             tpl.productZones.threeProducts.defaultLayout &&
                             tpl.productZones.threeProducts.defaultLayout.autoShadow);

      var threeProductDefaults = (((tpl || {}).productZones || {}).threeProducts || {}).defaultLayout || {};
      var templateSizeRatios = (tpl && tpl.sizeRatios) || threeProductDefaults.sizeRatios;
      var sizeRatios=skipRatio?null:(templateSizeRatios || [1,0.85,0.72]);
      for(var i=0;i<orderedItems.length;i++){
        var item=orderedItems[i];
        var src=item.src;
        /* 如果是已有的商品直接用，否則先 autoTrim */
        if(!item.fromExisting){
          var img=await loadImg(src);
          var trimmed=autoTrim(img);
          src=trimmed.src;
          item.ratio=trimmed.ratio;
          /* autoShadow：bake 影子進商品 PNG */
          if(useAutoShadow){
            var shadowed=await autoApplyShadow(src, item.ratio);
            src=shadowed.src;
            item.ratio=shadowed.ratio;
            item.baselineRatio=shadowed.baselineRatio||1;
          }
        }
        var id='p'+Date.now()+'_'+i;
        /* position: 0=主品(中), 1=左配, 2=右配 */
        var pos = item.position !== undefined ? item.position : i;
        /* 三品覆蓋 Bug Fix（v2）：sizeScale／zOrder 改用這一格實際的位置編號 pos，
           不再用迴圈索引 i——只處理被替換的格子時，i 不再等於 pos，用 i 對應
           會套錯大小比例。 */
        var sizeScale=sizeRatios?sizeRatios[pos]||0.72:1;
        var baselineRatio = item.baselineRatio || 1;
        var prod = {id:id,src:src,ratio:item.ratio||1,baselineRatio:baselineRatio,name:item.name,filename:item.filename||'',sizeScale:sizeScale,position:pos,zOrder:pos,_slot:item._slot!==undefined?item._slot:null};
        if(item.baseSrc) prod.baseSrc = item.baseSrc;
        if(item.meta) prod.meta = JSON.parse(JSON.stringify(item.meta));
        window._bnProducts.push(prod);
        broadcast({type:'bn-product-add',id:id,src:src,ratio:item.ratio||1,baselineRatio:baselineRatio,name:item.name,index:i,sizeScale:sizeScale,position:pos,layoutById:item.layouts||null,layout:item.layout||null});
        await new Promise(function(r){setTimeout(r,50);});
      }
      renderProdList();
      updateTemplateModeLabel();
      markStateDirty();
    }

    /* 大中小位置標籤 */
    var POS_LABELS = ['主品（中）', '左配品', '右配品'];
    var POS_COLORS = ['#4a90e2', '#687090', '#687090'];

    function renderProdList(){
      var list=document.getElementById('bn-prod-list');
      if(!list)return;
      list.innerHTML='';
      /* 依 position 排序顯示：主品第一 */
      var sorted = window._bnProducts.slice().sort(function(a,b){
        var pa = a.position !== undefined ? a.position : 99;
        var pb = b.position !== undefined ? b.position : 99;
        return pa - pb;
      });
      /* 初始化 zOrder（若未設定，依目前 sorted 順序） */
      sorted.forEach(function(p, i){
        if(p.zOrder === undefined) p.zOrder = i;
      });
      /* z-index 排序：zOrder 小的在上面（蓋住其他）。清單顯示順序依此排序
         （UX 決定：清單跟著 Layer／堆疊順序走，最上層排最上面），每一列的
         角色標籤仍固定依 .position 顯示，不受排序影響（角色身份與堆疊順序
         互相獨立，Bug Fix：z-order／角色身份解耦） */
      var zSorted = window._bnProducts.slice().sort(function(a,b){
        return (a.zOrder||0) - (b.zOrder||0);
      });
      zSorted.forEach(function(p){
        var row=document.createElement('div');row.className='bn-prod-item';
        row.style.flexWrap='wrap';row.style.gap='4px';

        var img=document.createElement('img');img.src=p.src;

        var infoWrap=document.createElement('div');
        infoWrap.style.cssText='flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;';

        var name=document.createElement('span');
        name.textContent=p.name;
        name.style.cssText='overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;';

        var posLabel=document.createElement('span');
        var posIdx = p.position !== undefined ? p.position : 0;
        posLabel.textContent = POS_LABELS[posIdx] || '';
        posLabel.style.cssText='font-size:9px;font-weight:700;color:'+( POS_COLORS[posIdx]||'#687090')+';';

        infoWrap.appendChild(name);
        infoWrap.appendChild(posLabel);

        var editBtn=document.createElement('button');editBtn.textContent='編輯';
        editBtn.title='裁切・去背・擦除・影子';
        editBtn.addEventListener('click',(function(pid){return function(){
          openProductEditor(pid);
        };})(p.id));

        var rmBtn=document.createElement('button');rmBtn.textContent='移除';rmBtn.className='rm';
        rmBtn.addEventListener('click',function(){
          /* 同步清除 _slotted / _unslotted，避免重新上傳同名檔時舊圖殘留 */
          var slot=p._slot;
          if(slot!==null&&slot!==undefined){ delete _slotted[slot]; }
          else{ _unslotted=_unslotted.filter(function(u){return u.name!==p.name;}); }
          window._bnProducts=window._bnProducts.filter(function(x){return x.id!==p.id;});
          renderProdList();updateTemplateModeLabel(window._bnProducts.length ? undefined : null);broadcast({type:'bn-product-remove',id:p.id});markStateDirty();
        });

        /* 上移/下移：只調整 zOrder（視覺堆疊／誰蓋住誰），不得調整 position
           （商品角色身份：主品／左配品／右配品）。Bug Fix：z-order 與角色身份解耦，
           兩者過去被誤綁在一起互換，導致調整前後順序會連帶改掉商品角色與
           layoutProducts() 依角色重算的預設大小/位置。 */
        var moveWrap=document.createElement('div');moveWrap.className='bn-prod-move';

        var upBtn=document.createElement('button');upBtn.textContent='▲';upBtn.title='往前';
        var downBtn=document.createElement('button');downBtn.textContent='▼';downBtn.title='往後';

        /* 依目前 zOrder 順序（z 軸鄰居）決定能否移動，與清單顯示順序（position）無關 */
        var zIdx = zSorted.indexOf(p);
        upBtn.disabled   = zIdx === 0;
        downBtn.disabled = zIdx === zSorted.length - 1;
        upBtn.style.opacity   = upBtn.disabled   ? '0.3' : '1';
        downBtn.style.opacity = downBtn.disabled ? '0.3' : '1';

        upBtn.addEventListener('click',(function(pid, zi){ return function(){
          /* 往上 = z-index 升高（蓋在前面），純視覺堆疊調整，不動角色身份、不觸發重新排版 */
          var a = window._bnProducts.find(function(x){return x.id===pid;});
          var b = zSorted[zi-1];
          if(!a||!b) return;
          var tmp = a.zOrder; a.zOrder = b.zOrder; b.zOrder = tmp;
          renderProdList();
          broadcastZOrder();
          markStateDirty();
        };})(p.id, zIdx));

        downBtn.addEventListener('click',(function(pid, zi){ return function(){
          /* 往下 = z-index 降低（被蓋在後面），純視覺堆疊調整，不動角色身份、不觸發重新排版 */
          var a = window._bnProducts.find(function(x){return x.id===pid;});
          var b = zSorted[zi+1];
          if(!a||!b) return;
          var tmp = a.zOrder; a.zOrder = b.zOrder; b.zOrder = tmp;
          renderProdList();
          broadcastZOrder();
          markStateDirty();
        };})(p.id, zIdx));

        moveWrap.appendChild(upBtn);
        moveWrap.appendChild(downBtn);

        row.appendChild(img);row.appendChild(infoWrap);row.appendChild(moveWrap);row.appendChild(editBtn);row.appendChild(rmBtn);
        list.appendChild(row);
      });
      /* 商品清單更新後同步互鎖狀態 */
      if(typeof window._bnUpdateMutualExclusion === 'function') window._bnUpdateMutualExclusion();
    }


    /* 廣播 z-index 更新 */
    function broadcastZOrder(){
      /* zOrder：依工具列順序，index 0 = 最上層（z-index 最高） */
      var order = window._bnProducts.slice().sort(function(a,b){
        return (a.zOrder||0) - (b.zOrder||0);
      }).map(function(p){ return p.id; });
      broadcast({type:'bn-product-zorder', order: order});
    }
    /* 廣播空間位置更新（換排序後讓 canvas 重新 layout） */
    function broadcastPositions(){
      var positions = window._bnProducts.map(function(p){
        return {id:p.id, position:p.position!==undefined?p.position:0};
      });
      broadcast({type:'bn-product-reposition', positions:positions});
    }
    /* 開啟 editor-plugin 編輯器（裁切/去背/擦除/影子） */
    function openProductEditor(pid){
      var p=window._bnProducts.find(function(x){return x.id===pid;});
      if(!p)return;

      /* 確保 editor-plugin.js 已載入 */
      if(!window.HBNProductEditorPlugin){
        var s=document.createElement('script');
        s.src='js/editor-plugin.js';
        s.onload=function(){ doOpenEditor(pid); };
        document.head.appendChild(s);
        return;
      }
      doOpenEditor(pid);
    }

    function doOpenEditor(pid){
      if(!window.HBNProductEditorPlugin){ alert('editor-plugin.js 未載入'); return; }
      var p=window._bnProducts.find(function(x){return x.id===pid;});
      if(!p)return;

      /* 建一個暫存的 .editor-item 結構讓 plugin 使用 */
      var wrap=document.getElementById('bn-edit-wrap');
      if(!wrap){
        wrap=document.createElement('div');
        wrap.id='bn-edit-wrap';
        wrap.style.cssText='position:fixed;left:-9999px;top:-9999px;width:400px;height:400px;';
        document.body.appendChild(wrap);
      }
      wrap.innerHTML='';
      var box=document.createElement('div');
      box.className='editor-item';
      var editMeta = p.meta || {};
      var shadowMeta = editMeta.shadow || null;
      var baseSrc = p.baseSrc || editMeta.baseSrc || p.src;
      box.dataset.baseSrc = baseSrc;
      if(shadowMeta && shadowMeta.enabled){
        box.dataset.shadowEnabled = '1';
        box.dataset.pluginShadowX = String(shadowMeta.x || 0);
        box.dataset.pluginShadowY = String(shadowMeta.y || 0);
        box.dataset.pluginShadowW = String(shadowMeta.w || 0);
        box.dataset.pluginShadowH = String(shadowMeta.h || 0);
      }
      box.style.cssText='position:relative;width:400px;height:400px;';
      var img=document.createElement('img');
      img.src=p.src;
      img.style.cssText='width:100%;height:100%;object-fit:contain;display:block;';
      box.appendChild(img);
      wrap.appendChild(box);

      /* 覆寫 imgRef.src 後同步回 _bnProducts 和 iframe */
      var origOnload=img.onload;
      var observer=new MutationObserver(function(){
        if(img.src && img.src!==p.src && img.src.startsWith('data:')){
          observer.disconnect();
          /* 更新狀態 */
          p.src=img.src;
          p.baseSrc = (box.dataset && box.dataset.baseSrc) ? box.dataset.baseSrc : p.src;
          p.meta = p.meta || {};
          p.meta.baseSrc = p.baseSrc;
          p.meta.productOnlyRatio = box.dataset && box.dataset.productOnlyRatio ? parseFloat(box.dataset.productOnlyRatio) : undefined;
          if(box.dataset && box.dataset.shadowEnabled === '1'){
            p.meta.shadow = {
              enabled:true,
              x:parseFloat(box.dataset.pluginShadowX || '0'),
              y:parseFloat(box.dataset.pluginShadowY || '0'),
              w:parseFloat(box.dataset.pluginShadowW || '0'),
              h:parseFloat(box.dataset.pluginShadowH || '0')
            };
          } else {
            p.meta.shadow = {enabled:false};
          }
          var editedRatio = box.dataset && box.dataset.outputRatio ? parseFloat(box.dataset.outputRatio) : NaN;
          if(isFinite(editedRatio) && editedRatio > 0){
            p.ratio = editedRatio;
          } else if(img.naturalWidth && img.naturalHeight){
            p.ratio = img.naturalWidth / img.naturalHeight;
          }
          if(p.layout){ delete p.layout; }
          if(p.layouts){ delete p.layouts; }
          p.width = p.height = p.x = p.y = undefined;
          markStateDirty();
          /* 更新左側預覽縮圖 */
          var listImg=document.querySelector('#bn-prod-list .bn-prod-item img[src]');
          document.querySelectorAll('#bn-prod-list .bn-prod-item').forEach(function(row){
            var rowImg=row.querySelector('img');
            /* 找對應的 product */
          });
          renderProdList();
          /* 廣播更新 */
          broadcast({type:'bn-product-remove',id:p.id});
          setTimeout(function(){
            var idx = window._bnProducts.indexOf(p);
            broadcast({type:'bn-product-add',id:p.id,src:p.src,ratio:p.ratio,baselineRatio:p.baselineRatio||1,name:p.name,index:idx,sizeScale:p.sizeScale||1,position:p.position||0,layoutById:p.layouts||null,layout:p.layout||null});
          },50);
        }
      });
      observer.observe(img,{attributes:true,attributeFilter:['src']});

      window.HBNProductEditorPlugin.open(img);
    }

    /* ══ 下載 ══ */
    function insertDownloadBar(){
      var sidebar=document.getElementById('sidebar');
      if(!sidebar||document.getElementById('bn-download-bar'))return;
      var bar=document.createElement('div');bar.id='bn-download-bar';
      bar.innerHTML='<button class="bn-dl-btn" id="bn-dl-all">⬇ 下載全部勾選畫版</button><div class="bn-dl-progress" id="bn-dl-progress"></div>';
      /* 加到 sidebar 最底部（sidebar-scroll 下方）*/
      var scroll=document.getElementById('sidebar-scroll');
      if(scroll && scroll.nextSibling) sidebar.insertBefore(bar, scroll.nextSibling);
      else sidebar.appendChild(bar);
      document.getElementById('bn-dl-all').addEventListener('click',downloadAll);
    }

    function _bnClone(obj){
      try { return JSON.parse(JSON.stringify(obj)); }
      catch(_) { return obj; }
    }

    function _bnIsUsableColor(v){
      return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim());
    }

    var BN_DEFAULT_CANVAS_BG = '#6bc0ec';
    function _bnIsDefaultCanvasBg(v){ return _bnIsUsableColor(v) && String(v).toLowerCase() === BN_DEFAULT_CANVAS_BG; }
    function _bnIsUserCanvasBg(v){ return _bnIsUsableColor(v) && (window._bnUserCanvasBgLocked || !_bnIsDefaultCanvasBg(v)); }

    function _bnGetAuthoritativeCanvasBg(){
      /* 關鍵：多圖 ZIP 前，以父層 colorState 的目前值為最高優先。
         舊版會先吃 _bnCanvasBgHardLock/_bnPersistentCanvasBg；若它們仍是初始化預設藍，
         就會把使用者吸色後的背景覆蓋回藍色。 */
      if(window.colorState && _bnIsUserCanvasBg(window.colorState.canvasBg)) return window.colorState.canvasBg;
      if(_bnIsUserCanvasBg(window._bnCanvasBgHardLock)) return window._bnCanvasBgHardLock;
      if(_bnIsUserCanvasBg(window._bnPersistentCanvasBg)) return window._bnPersistentCanvasBg;
      if(window._bnLastUserColorState && _bnIsUserCanvasBg(window._bnLastUserColorState.canvasBg)) return window._bnLastUserColorState.canvasBg;
      if(window.colorState && _bnIsUsableColor(window.colorState.canvasBg)) return window.colorState.canvasBg;
      return null;
    }

    function _bnLockCanvasBg(hex){
      if(!_bnIsUsableColor(hex)) return;
      window._bnCanvasBgHardLock = hex;
      window._bnPersistentCanvasBg = hex;
      window._bnUserCanvasBgLocked = true;
      window._bnBgColorExportGuardUntil = Date.now() + 30000;
      if(window.colorState) window.colorState.canvasBg = hex;
      if(window._bnLastUserColorState) window._bnLastUserColorState.canvasBg = hex;
    }

    function _bnRgbToHex(rgb){
      if(!rgb || rgb === 'transparent') return null;
      var m = String(rgb).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
      if(!m) return null;
      if(m[4] !== undefined && parseFloat(m[4]) === 0) return null;
      function h(n){ n=Math.max(0,Math.min(255,parseInt(n,10)||0)); return n.toString(16).padStart(2,'0'); }
      return '#'+h(m[1])+h(m[2])+h(m[3]);
    }

    function _bnGetLiveCanvasBgColor(){
      var found = null;
      document.querySelectorAll('.preview-block iframe').forEach(function(ifr){
        if(found) return;
        try{
          var doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
          if(!doc) return;
          var candidates = [
            doc.querySelector('.背景色'),
            doc.querySelector('.bg'),
            doc.getElementById('canvas'),
            doc.body
          ];
          candidates.forEach(function(el){
            if(found || !el) return;
            var cs = doc.defaultView.getComputedStyle(el);
            var hex = _bnRgbToHex(cs.backgroundColor);
            if(hex) found = hex;
          });
        }catch(_){ }
      });
      return found;
    }

    function _bnBuildExportColorData(){
      var data = (typeof window.getColorData === 'function')
        ? window.getColorData()
        : (window.colorState ? _bnClone(window.colorState) : null);
      data = data ? _bnClone(data) : {};

      /* 多張 ZIP 匯出時，iframe 可能還沒同步完而回報預設藍。
         因此背景色一律以父層最後一次使用者設定值為最高優先，
         不再讓 iframe 的 live background 反向覆蓋父層狀態。 */
      var authoritativeBg = _bnGetAuthoritativeCanvasBg();
      if(_bnIsUsableColor(authoritativeBg)) data.canvasBg = authoritativeBg;
      else {
        var liveBg = _bnGetLiveCanvasBgColor();
        if(_bnIsUsableColor(liveBg)) data.canvasBg = liveBg;
      }
      return data;
    }

    function _bnFreezeExportColors(colorData){
      if(!colorData) return;
      var frozen = _bnClone(colorData);
      if(_bnIsUsableColor(frozen.canvasBg)) _bnLockCanvasBg(frozen.canvasBg);
      window._bnFrozenColorData = frozen;
      window._bnLastUserColorState = _bnClone(frozen);
      window._bnBgColorExportGuardUntil = Date.now() + 30000;
      if(window.colorState){ try{ Object.assign(window.colorState, frozen); }catch(_){} }
      if(_bnIsUsableColor(window._bnCanvasBgHardLock) && window.colorState) window.colorState.canvasBg = window._bnCanvasBgHardLock;
      if(typeof window.renderColorPickers === 'function') window.renderColorPickers();
      if(typeof window.broadcastColors === 'function') window.broadcastColors();
    }

    function downloadAll(){
      /* 單張編輯器模式：直接對 iframe 現有狀態截圖，不重新 sync（避免 bn-product-add 重複產生 DOM）*/
      var iframes=Array.from(document.querySelectorAll('.preview-block iframe'));
      if(!iframes.length){setProgress('沒有版位可下載');return;}

      var btn=document.getElementById('bn-dl-all');
      btn.disabled=true;

      var total=iframes.length;
      var done=0, ok=0, fail=0;
      var files=[];
      window._bnExporting = true;
      window._bnSuppressProductLayoutWrite = true;

      setProgress(total===1 ? '準備下載…' : '準備打包 '+total+' 個版位…');

      /* iframe 已是最新狀態，不需要 re-sync，直接截圖 */
      function syncIframeForExport(iframeEl, cb){
        setTimeout(function(){ cb && cb(); }, 80);
      }

      function finishExport(){
        window._bnExporting = false;
        window._bnSuppressProductLayoutWrite = false;
      }

      function safeName(name){
        return String(name||'layout').trim().replace(/[\/\\:*?"<>|]/g,'_') || 'layout';
      }

      function loadJSZip(cb){
        if(window.JSZip){ cb(); return; }

        var existed=document.querySelector('script[data-bn-jszip="1"]');
        if(existed){
          existed.addEventListener('load', cb, {once:true});
          existed.addEventListener('error', function(){ cb(new Error('JSZip 載入失敗')); }, {once:true});
          return;
        }

        var s=document.createElement('script');
        s.dataset.bnJszip='1';
        s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload=function(){ cb(); };
        s.onerror=function(){ cb(new Error('JSZip 載入失敗')); };
        document.head.appendChild(s);
      }

      function dataUrlToBase64(dataUrl){
        return String(dataUrl||'').split(',')[1] || '';
      }

      /* finishExport 已在 downloadAll 頂部定義（輕量版），此處佔位保持 makeZip 引用不出錯 */

      function makeZip(){
        if(total===1){
          btn.disabled=false;
          finishExport();
          if(ok){ setTimeout(function(){setProgress('');},2500); }
          else { setProgress('下載失敗：截圖逾時或回傳空白'); }
          return;
        }

        if(!files.length){
          btn.disabled=false;
          finishExport();
          setProgress('ZIP 未產生：全部截圖都失敗或逾時');
          return;
        }

        setProgress('正在產生 ZIP（成功 '+ok+'，失敗 '+fail+'）…');

        loadJSZip(function(err){
          if(err || !window.JSZip){
            btn.disabled=false;
            finishExport();
            setProgress('ZIP 失敗：JSZip 載入失敗');
            return;
          }

          try{
            var zip=new JSZip();
            files.forEach(function(f){
              zip.file(f.name, dataUrlToBase64(f.dataUrl), {base64:true});
            });
            zip.generateAsync({type:'blob'}).then(function(blob){
              triggerBlobDownload(blob,'BN_Export.zip');
              btn.disabled=false;
              finishExport();
              setProgress('ZIP下載完成：成功 '+ok+' / '+total+(fail ? '，失敗 '+fail+' 個已跳過' : '')); 
            }).catch(function(){
              btn.disabled=false;
              finishExport();
              setProgress('ZIP 產生失敗');
            });
          }catch(e){
            btn.disabled=false;
            finishExport();
            setProgress('ZIP 產生失敗：'+e.message);
          }
        });
      }

      function captureOne(iframeEl, fileName, cb){
        var msgId='dl_'+Date.now()+'_'+Math.random().toString(36).slice(2);
        var settled=false;
        var timer;

        function settle(dataUrl){
          if(settled) return;
          settled=true;
          clearTimeout(timer);
          window.removeEventListener('message',onMsg);
          cb(dataUrl||null);
        }

        function onMsg(e){
          if(!e.data || e.data.type!=='bn-snapshot' || e.data.msgId!==msgId) return;
          settle(e.data.dataUrl || null);
        }

        window.addEventListener('message',onMsg);

        try{
          iframeEl.contentWindow.postMessage({type:'bn-capture',msgId:msgId},'*');
        }catch(e){
          settle(null);
          return;
        }

        /* 單一版位最多等 12 秒；失敗就跳過，整包繼續 */
        timer=setTimeout(function(){ settle(null); },12000);
      }

      function next(idx){
        if(idx>=total){
          makeZip();
          return;
        }

        var iframe=iframes[idx];
        var blockEl=iframe.closest('.preview-block');
        var baseName=safeName(blockEl ? ((blockEl.querySelector('.pname')||{}).textContent||'layout') : 'layout');

        syncIframeForExport(iframe, function(){
          captureOne(iframe, baseName+'.png', function(dataUrl){
            done++;

            if(dataUrl){
              ok++;
              if(total===1){
                triggerDownload(dataUrl, baseName+'.png');
              }else{
                files.push({name:baseName+'.png', dataUrl:dataUrl});
              }
            }else{
              fail++;
            }

            if(total===1){
              setProgress(dataUrl ? '已下載 1 / 1' : '下載失敗：截圖逾時或回傳空白');
            }else{
              setProgress('打包中 '+done+' / '+total+'（成功 '+ok+'，失敗 '+fail+'）');
            }

            /* 稍微讓瀏覽器釋放資源，避免連續截圖卡住 */
            setTimeout(function(){ next(idx+1); },250);
          });
        });
      }

      next(0);
    }
    function setProgress(msg){var el=document.getElementById('bn-dl-progress');if(el)el.textContent=msg;}
    function triggerDownload(dataUrl,filename){var a=document.createElement('a');a.href=dataUrl;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},1000);}
    function triggerBlobDownload(blob,filename){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},2000);}

    /* ── iframe ready 推送 ── */
    var origOnReady=window._bnOnIframeReady;
    window._bnOnIframeReady=function(id){
      if(origOnReady)origOnReady(id);
      setTimeout(function(){
        if(window._bnLogos&&window._bnLogos.length){
          broadcastTo(id,{type:'bn-logos',logos:window._bnLogos});
        } else if(window._bnLogoDataUrl){
          broadcastTo(id,{type:'bn-logo',dataUrl:window._bnLogoDataUrl});
        }
        /* 先送 product-add，再送 zorder */
        window._bnProducts.forEach(function(p,idx){broadcastTo(id,{type:'bn-product-add',id:p.id,src:p.src,ratio:p.ratio,baselineRatio:p.baselineRatio||1,name:p.name,index:idx,sizeScale:p.sizeScale,position:p.position||0,zOrder:p.zOrder||0,layoutById:p.layouts||null,layout:p.layout||null});});
        setTimeout(function(){
          var order=window._bnProducts.slice().sort(function(a,b){return (a.zOrder||0)-(b.zOrder||0);}).map(function(p){return p.id;});
          broadcastTo(id,{type:'bn-product-zorder',order:order});
        },100);
      },200);
    };

    /* ── init ── */
    function init(){
      if(document.getElementById('sidebar-scroll')){insertLogoUI();insertProductUI();insertDownloadBar();}
      else setTimeout(init,200);
    }
    init();

    /* 暴露給 bn-state-plugin 使用 */
    window._bnRenderLogoList = function(){ renderLogoList(); };
    window._bnBroadcastLogos = function(){
      if(window._bnLogos && window._bnLogos.length){
        broadcast({type:'bn-logos', logos:window._bnLogos});
      }
    };
    window._bnRenderProdList = function(){ renderProdList(); };
    window._bnRequestProductLayouts = requestProductLayouts;
    window._bnRebroadcastProducts = function(){
      var ids = (window._bnProducts||[]).map(function(p){ return p.id; });
      ids.forEach(function(id){ broadcast({type:'bn-product-remove', id:id}); });
      var reordered = (window._bnProducts||[]).slice().sort(function(a,b){
        return (a.position||0)-(b.position||0);
      });
      setTimeout(function(){
        reordered.forEach(function(p, idx){
          broadcast({type:'bn-product-add', id:p.id, src:p.src, ratio:p.ratio,
            name:p.name, index:idx, sizeScale:p.sizeScale||1,
            position:p.position||0, zOrder:p.zOrder||0, layoutById:p.layouts||null, layout:p.layout||null});
        });
        /* z-index */
        var order = (window._bnProducts||[]).slice().sort(function(a,b){
          return (a.zOrder||0)-(b.zOrder||0);
        }).map(function(p){ return p.id; });
        setTimeout(function(){ broadcast({type:'bn-product-zorder', order:order}); }, 100);
      }, 60);
    };
  });
})();
