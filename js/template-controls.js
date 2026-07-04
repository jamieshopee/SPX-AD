(function (global) {
  'use strict';

  function init(template) {
    var canvasW = template.width;
    var canvasH = template.height;
    var frameReady = false;
    var pendingMessages = [];
    var frame = document.getElementById('canvas-frame');
    var overlay = document.getElementById('align-overlay');
    var overlayVisible = false;
    var previewScale = 1;
    var singleProductGeometry = null;
    var singleProductDrag = null;
    var fields = template.textFields;
    var limits = {};
    limits[fields.main.label] = fields.main.limit;
    limits[fields.sub.label] = fields.sub.limit;
    limits[fields.small.label] = fields.small.limit;

    function postToFrame(message) {
      if (frameReady) {
        try { frame.contentWindow.postMessage(message, '*'); } catch (error) {
          console.warn('[TemplateControls] 畫布訊息傳送失敗。', error);
        }
      } else {
        pendingMessages.push(message);
      }
    }

    function fitFrame() {
      var area = document.getElementById('preview-area');
      var wrap = document.getElementById('preview-wrap');
      var label = document.getElementById('prev-label');
      if (!area || !wrap || !frame) return;
      var scale = Math.min((area.clientWidth - 40) / canvasW, (area.clientHeight - 50) / canvasH, 1);
      previewScale = scale;
      frame.style.width = canvasW + 'px';
      frame.style.height = canvasH + 'px';
      frame.style.transform = 'scale(' + scale + ')';
      wrap.style.width = Math.round(canvasW * scale) + 'px';
      wrap.style.height = Math.round(canvasH * scale) + 'px';
      label.textContent = canvasW + ' × ' + canvasH + ' px（縮放 ' + Math.round(scale * 100) + '%）';
      overlay.style.width = canvasW + 'px';
      overlay.style.height = canvasH + 'px';
      overlay.style.transform = 'scale(' + scale + ')';
      updateSingleProductDragOverlay();
    }

    function getSingleProductDragOverlay() {
      var dragOverlay = document.getElementById('single-product-drag-overlay');
      if (dragOverlay) return dragOverlay;
      var wrap = document.getElementById('preview-wrap');
      if (!wrap) return null;
      dragOverlay = document.createElement('div');
      dragOverlay.id = 'single-product-drag-overlay';
      dragOverlay.style.cssText = [
        'position:absolute',
        'display:none',
        'z-index:12',
        'pointer-events:auto',
        'cursor:move',
        'touch-action:none',
        'background:transparent',
        'user-select:none'
      ].join(';');
      wrap.appendChild(dragOverlay);
      ['nw','ne','sw','se'].forEach(function(corner){
        var h=document.createElement('div');
        h.dataset.corner=corner;
        h.style.cssText=[
          'position:absolute',
          'width:14px',
          'height:14px',
          'border-radius:50%',
          'background:#4a90e2',
          'border:2px solid #fff',
          'z-index:2',
          corner.indexOf('n')>=0?'top:-7px':'bottom:-7px',
          corner.indexOf('w')>=0?'left:-7px':'right:-7px',
          'cursor:'+(corner==='nw'||corner==='se'?'nwse-resize':'nesw-resize')
        ].join(';');
        dragOverlay.appendChild(h);
      });
      var rot=document.createElement('div');
      rot.dataset.rotHandle='1';
      rot.textContent='R';
      rot.style.cssText='position:absolute;left:50%;top:6px;transform:translateX(-50%);width:22px;height:22px;border-radius:50%;background:#4a90e2;border:2px solid #fff;z-index:3;cursor:grab;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;line-height:1;box-shadow:0 2px 6px rgba(0,0,0,.35);';
      dragOverlay.appendChild(rot);

      function canvasPoint(event){
        var rect=wrap.getBoundingClientRect();
        return {x:(event.clientX-rect.left)/previewScale,y:(event.clientY-rect.top)/previewScale};
      }
      function sendSingleProductTransform(next){
        singleProductGeometry=Object.assign({},singleProductGeometry,next);
        updateSingleProductDragOverlay();
        postToFrame({
          type:'bn-single-product-transform',
          canvasLeft:next.left,
          canvasTop:next.top,
          width:next.width,
          height:next.height,
          rotation:next.rotation||0
        });
      }

      dragOverlay.addEventListener('pointerdown', function (event) {
        if (!singleProductGeometry) return;
        event.preventDefault();
        event.stopPropagation();
        var pt=canvasPoint(event);
        var left=Number(singleProductGeometry.left)||0;
        var top=Number(singleProductGeometry.top)||0;
        var width=Number(singleProductGeometry.width)||1;
        var height=Number(singleProductGeometry.height)||1;
        var rotation=Number(singleProductGeometry.rotation)||0;
        singleProductDrag = {
          startX:event.clientX,
          startY:event.clientY,
          type:event.target&&event.target.dataset&&event.target.dataset.rotHandle?'rotate':event.target&&event.target.dataset&&event.target.dataset.corner?'resize':'move',
          corner:event.target&&event.target.dataset&&event.target.dataset.corner||'',
          left:left,
          top:top,
          width:width,
          height:height,
          rotation:rotation,
          angle:Math.atan2(pt.y-(top+height/2),pt.x-(left+width/2))*180/Math.PI,
          pointerId:event.pointerId
        };
        try { dragOverlay.setPointerCapture(event.pointerId); } catch (_) {}
      });
      dragOverlay.addEventListener('pointermove', function (event) {
        if (!singleProductDrag || event.pointerId !== singleProductDrag.pointerId) return;
        event.preventDefault();
        var dx=(event.clientX-singleProductDrag.startX)/previewScale;
        var dy=(event.clientY-singleProductDrag.startY)/previewScale;
        var ratio=singleProductDrag.width/Math.max(1,singleProductDrag.height);
        var next={left:singleProductDrag.left,top:singleProductDrag.top,width:singleProductDrag.width,height:singleProductDrag.height,rotation:singleProductDrag.rotation};
        if(singleProductDrag.type==='move'){
          next.left+=dx; next.top+=dy;
        }else if(singleProductDrag.type==='resize'){
          var c=singleProductDrag.corner;
          var signX=c.indexOf('w')>=0?-1:1;
          var signY=c.indexOf('n')>=0?-1:1;
          var delta=Math.abs(dx)>Math.abs(dy)?dx*signX:dy*signY*ratio;
          next.width=Math.max(20,singleProductDrag.width+delta);
          next.height=Math.max(20,next.width/ratio);
          if(c.indexOf('w')>=0) next.left=singleProductDrag.left+(singleProductDrag.width-next.width);
          if(c.indexOf('n')>=0) next.top=singleProductDrag.top+(singleProductDrag.height-next.height);
        }else if(singleProductDrag.type==='rotate'){
          var pt=canvasPoint(event);
          var cx=singleProductDrag.left+singleProductDrag.width/2;
          var cy=singleProductDrag.top+singleProductDrag.height/2;
          var angle=Math.atan2(pt.y-cy,pt.x-cx)*180/Math.PI;
          next.rotation=singleProductDrag.rotation+(angle-singleProductDrag.angle);
        }
        sendSingleProductTransform(next);
      });
      function finishSingleProductDrag(event) {
        if (!singleProductDrag) return;
        try { dragOverlay.releasePointerCapture(singleProductDrag.pointerId); } catch (_) {}
        singleProductDrag=null;
      }
      dragOverlay.addEventListener('pointerup',finishSingleProductDrag);
      dragOverlay.addEventListener('pointercancel',finishSingleProductDrag);
      return dragOverlay;
    }

    function updateSingleProductDragOverlay() {
      var dragOverlay = getSingleProductDragOverlay();
      if (!dragOverlay) return;
      if (!singleProductGeometry || singleProductGeometry.visible === false) {
        dragOverlay.style.display='none';
        return;
      }
      dragOverlay.style.display='block';
      dragOverlay.style.left=(singleProductGeometry.left*previewScale)+'px';
      dragOverlay.style.top=(singleProductGeometry.top*previewScale)+'px';
      dragOverlay.style.width=(singleProductGeometry.width*previewScale)+'px';
      dragOverlay.style.height=(singleProductGeometry.height*previewScale)+'px';
      dragOverlay.style.transform='rotate('+(Number(singleProductGeometry.rotation)||0)+'deg)';
    }

    function calcUnits(text) {
      var units = 0;
      for (var i = 0; i < text.length; i++) units += text.charCodeAt(i) > 0x2E7F ? 1 : 0.5;
      return Math.round(units * 10) / 10;
    }

    function updateBadge(label, value) {
      var badge = document.getElementById('badge-' + label);
      var limit = limits[label];
      if (!badge || !limit) return;
      var used = calcUnits(value);
      badge.textContent = used.toFixed(1) + ' / ' + limit + ' 字';
      badge.className = 'char-badge' + (used > limit ? ' over' : used > limit * 0.85 ? ' warn' : '');
    }

    function broadcastText() {
      var main = document.getElementById('txt-main').value;
      var sub = document.getElementById('txt-sub').value;
      var small = document.getElementById('txt-date').value;
      updateBadge(fields.main.label, main);
      updateBadge(fields.sub.label, sub);
      updateBadge(fields.small.label, small);
      var data = {};
      data[fields.main.label] = main;
      data[fields.main.className] = main;
      data[fields.sub.label] = sub;
      data[fields.sub.className] = sub;
      data[fields.small.label] = small;
      data[fields.small.className] = small;
      postToFrame({type: 'bn-text', data: data});
    }

    function updateOverlay() {
      var button = document.getElementById('overlay-toggle');
      var hasProducts = global._bnProducts && global._bnProducts.length > 0;
      var hasPersonProduct = !!(global._bnPerson || global._bnSingleProd);
      var guides = template.guides || {};
      var guidePath = hasProducts ? guides.threeProducts : (hasPersonProduct ? guides.personProduct : '');
      if (guidePath && !/^(?:data:|blob:|https?:|file:|\/)/i.test(guidePath)) {
        var commonBase = global.AD_COMMON_BASE !== undefined ? global.AD_COMMON_BASE : '../';
        guidePath = commonBase + guidePath;
      }
      overlay.src = guidePath || '';
      overlay.style.display = overlayVisible && overlay.src ? 'block' : 'none';
      if (button) {
        button.textContent = overlayVisible ? '關閉版位' : '檢查版位';
        button.className = overlayVisible ? 'on' : '';
        button.disabled = false;
      }
    }

    function insertOverlayToggle() {
      if (document.getElementById('overlay-toggle')) return;
      var bar = document.getElementById('bn-download-bar');
      if (!bar) return;
      var button = document.createElement('button');
      button.id = 'overlay-toggle';
      button.textContent = '檢查版位';
      button.disabled = true;
      button.addEventListener('click', function () {
        overlayVisible = !overlayVisible;
        updateOverlay();
      });
      bar.insertBefore(button, bar.firstChild);
      updateOverlay();
    }

    var BANWORD_FIELD_MAP = {
      'txt-main': '主標',
      'txt-sub':  '副標',
      'txt-date': 'date'
    };


    function runBanwordCheck(id, el) {
      var engine = global.banwordEngine;
      if (!engine) return;
      var role = BANWORD_FIELD_MAP[id] || '';
      var shadowId = '_bw_shadow_' + id;
      var shadow = document.getElementById(shadowId);
      if (!shadow) {
        shadow = document.createElement('div');
        shadow.id = shadowId;
        shadow.setAttribute('contenteditable', 'true');
        shadow.dataset.role = role;
        shadow.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(shadow);
      }
      shadow.textContent = el.value;
      var result = engine.applyToElement(shadow, { role: role, force: true, getText: function (e) { return e.textContent; } });
      if (result && result.text !== undefined && result.text !== el.value) {
        el.value = result.text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (result && result.message) {
        var existing = document.getElementById('_bw_toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.id = '_bw_toast';
        toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#7f1d1d;color:#fca5a5;padding:8px 20px;border-radius:10px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.5);z-index:99999;white-space:nowrap;max-width:90vw;';
        toast.textContent = result.message;
        document.body.appendChild(toast);
        setTimeout(function () { toast.remove(); }, result.duration || 4000);
      }
    }

    ['txt-main', 'txt-sub', 'txt-date'].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('input', broadcastText);
      el.addEventListener('blur', function () { runBanwordCheck(id, el); });
    });

    window.addEventListener('resize', fitFrame);
    window.addEventListener('message', function (event) {
      if (!event.data) return;
      if (event.data.type === 'bn-iframe-ready') {
        canvasW = event.data.w || template.width;
        canvasH = event.data.h || template.height;
        frameReady = true;
        fitFrame();
        pendingMessages.forEach(function (message) { postToFrame(message); });
        pendingMessages = [];
        broadcastText();
        if (global._bnOnIframeReady) global._bnOnIframeReady(event.data.bnid || '1');
        if (global.parent !== global) {
          global.parent.postMessage({type:'ad-generator:template-ready',templateId:template.templateId}, '*');
        }
        return;
      }
      if (event.data.type === 'bn-text-update') {
        var classToInput = {};
        classToInput[fields.main.label] = classToInput[fields.main.className] = 'txt-main';
        classToInput[fields.sub.label] = classToInput[fields.sub.className] = 'txt-sub';
        classToInput[fields.small.label] = classToInput[fields.small.className] = 'txt-date';
        var input = document.getElementById(classToInput[event.data.field]);
        if (input) {
          input.value = event.data.value || '';
          input.dispatchEvent(new Event('input', {bubbles:true}));
        }
        return;
      }
      if (event.data.type === 'bn-layout-state') {
        global._bnCanvasLayoutState = event.data.state || {};
        var singleState = global._bnCanvasLayoutState.singleProduct;
        if (singleState && global._bnSingleProd) {
          global._bnSingleProd.offsetX = Number(singleState.offsetX) || 0;
          global._bnSingleProd.offsetY = Number(singleState.offsetY) || 0;
          global._bnSingleProd.transform = {
            left: singleState.left || '',
            top: singleState.top || '',
            width: singleState.width || '',
            height: singleState.height || '',
            rotation: Number(singleState.rotation) || 0,
            zIndex: singleState.zIndex || '',
            userAdjusted: !!singleState.userAdjusted
          };
          if (global._bnUpdateSingleProductPositionUI) {
            global._bnUpdateSingleProductPositionUI(
              global._bnSingleProd.offsetX,
              global._bnSingleProd.offsetY
            );
          }
        }
        return;
      }
      if (event.data.type === 'bn-single-product-geometry') {
        singleProductGeometry=event.data.visible === false ? null : event.data;
        updateSingleProductDragOverlay();
        return;
      }
      if (event.data.type === 'bn-single-product-position' && global._bnSingleProd) {
        global._bnSingleProd.offsetX = Number(event.data.offsetX) || 0;
        global._bnSingleProd.offsetY = Number(event.data.offsetY) || 0;
        if (global._bnUpdateSingleProductPositionUI) {
          global._bnUpdateSingleProductPositionUI(
            global._bnSingleProd.offsetX,
            global._bnSingleProd.offsetY
          );
        }
      }
    });

    window.addEventListener('message', function (event) {
      if (!event.data || event.data.type !== 'ad-generator:set-record') return;
      var record = event.data.record || {};
      var values = {'txt-main':record.headline,'txt-sub':record.subheadline,'txt-date':record.disclaimer};
      Object.keys(values).forEach(function (id) {
        if (values[id] != null) document.getElementById(id).value = String(values[id]);
      });
      broadcastText();
    });

    var observer = new MutationObserver(function () {
      if (document.getElementById('bn-download-bar')) {
        insertOverlayToggle();
        observer.disconnect();
      }
    });
    var sidebar=document.getElementById('sidebar');
    if(sidebar) observer.observe(sidebar, {childList:true,subtree:true});
    else console.warn('[TemplateControls] 找不到 sidebar，略過版位檢查按鈕監聽。');

    document.addEventListener('click', function (event) {
      var button = event.target && event.target.closest && event.target.closest('#bn-dl-all');
      if (!button || overlay.style.display === 'none') return;
      overlay.style.display = 'none';
      var restore = function () { updateOverlay(); };
      window.addEventListener('message', function onSnapshot(message) {
        if (message.data && message.data.type === 'bn-snapshot') {
          window.removeEventListener('message', onSnapshot);
          restore();
        }
      });
      setTimeout(restore, 35000);
    }, true);

    global.postToFrame = postToFrame;
    global.fitFrame = fitFrame;
    global.broadcastText = broadcastText;
    global.updateOverlay = updateOverlay;
    fitFrame();
  }

  global.ADTemplateControls = {init: init};
})(window);
