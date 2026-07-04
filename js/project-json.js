(function (global) {
  'use strict';

  var PROJECT_VERSION = '1.0.0';
  var projectCreatedAt = null;

  function toast(message, type) {
    if (global._bnStatePlugin && global._bnStatePlugin.toast) {
      global._bnStatePlugin.toast(message, type === 'error' ? 'err' : type === 'ok' ? 'ok' : '');
    } else {
      console[type === 'error' ? 'warn' : 'log']('[ProjectJSON]', message);
    }
  }

  function setStatus(message) {
    var status = document.getElementById('bn-project-status');
    if (status) status.textContent = message || '';
  }

  function requestCanvasState() {
    return new Promise(function (resolve) {
      global._bnCanvasLayoutState = null;
      if (typeof global.postToFrame === 'function') {
        global.postToFrame({type: 'bn-layout-state-request'});
      }
      var started = Date.now();
      (function poll() {
        if (global._bnCanvasLayoutState || Date.now() - started > 1200) {
          resolve(global._bnCanvasLayoutState || {});
          return;
        }
        setTimeout(poll, 40);
      })();
    });
  }

  function collectProject() {
    var template = global.__AD_TEMPLATE__;
    if (!template) return Promise.reject(new Error('找不到目前模板設定'));
    if (!global._bnStatePlugin || !global._bnStatePlugin.collect) {
      return Promise.reject(new Error('編輯狀態尚未就緒'));
    }
    return requestCanvasState().then(function (layoutState) {
      var now = new Date().toISOString();
      if (!projectCreatedAt) projectCreatedAt = now;
      var editorState = global._bnStatePlugin.collect();
      editorState.logoMode = global._bnLogoMode || null;
      editorState.logoShape = global._bnLogoShape || null;
      editorState.layout = layoutState;
      return {
        version: PROJECT_VERSION,
        templateId: template.templateId,
        templateName: template.templateName,
        templatePath: global.__AD_TEMPLATE_PATH__,
        canvasSize: {width: template.width, height: template.height},
        createdAt: projectCreatedAt,
        updatedAt: now,
        templateSettings: global.ADTemplateLoader.clone(template),
        state: editorState
      };
    });
  }

  function downloadProject() {
    var button = document.getElementById('bn-project-download');
    if (button) button.disabled = true;
    setStatus('正在整理專案資料…');
    collectProject().then(function (project) {
      var name = (global.__AD_TEMPLATE__.output || {}).projectFileName || (project.templateId + '.project.json');
      global.ADDownloader.downloadJson(project, name);
      setStatus('專案 JSON 已下載');
      toast('專案 JSON 已下載', 'ok');
    }).catch(function (error) {
      console.warn('[ProjectJSON] 匯出失敗。', error);
      setStatus('下載失敗：' + error.message);
      toast('下載專案 JSON 失敗：' + error.message, 'error');
    }).then(function () {
      if (button) button.disabled = false;
    });
  }

  function validateProject(project) {
    var template = global.__AD_TEMPLATE__;
    if (!project || typeof project !== 'object') throw new Error('JSON 格式不是專案物件');
    if (!project.version) throw new Error('缺少 version');
    if (String(project.version).split('.')[0] !== PROJECT_VERSION.split('.')[0]) {
      throw new Error('版本不相容：目前支援 ' + PROJECT_VERSION + '，檔案為 ' + project.version);
    }
    if (project.templateId !== template.templateId) {
      throw new Error('模板不相容：需要 ' + template.templateId + '，檔案為 ' + (project.templateId || '未指定'));
    }
    if (!project.canvasSize ||
        Number(project.canvasSize.width) !== Number(template.width) ||
        Number(project.canvasSize.height) !== Number(template.height)) {
      throw new Error('畫布尺寸不相容：需要 ' + template.width + '×' + template.height);
    }
    if (!project.state) throw new Error('缺少 state 編輯狀態');
  }

  function applyProject(project) {
    validateProject(project);
    projectCreatedAt = project.createdAt || new Date().toISOString();
    global._bnLogoMode = project.state.logoMode || null;
    global._bnLogoShape = project.state.logoShape || null;
    global._bnStatePlugin.apply(project.state);
    setTimeout(function () {
      if (typeof global.postToFrame === 'function') {
        global.postToFrame({type:'bn-layout-state-apply',state:project.state.layout || {}});
      }
    }, 700);
  }

  function uploadProject(file) {
    setStatus('正在讀取專案 JSON…');
    global.ADUploader.readAsText(file).then(function (text) {
      var project;
      try { project = JSON.parse(text); }
      catch (error) { throw new Error('JSON 解析失敗：' + error.message); }
      applyProject(project);
      setStatus('專案 JSON 已完整還原');
      toast('專案 JSON 已完整還原', 'ok');
    }).catch(function (error) {
      console.warn('[ProjectJSON] 匯入失敗。', error);
      setStatus('上傳失敗：' + error.message);
      toast('上傳專案 JSON 失敗：' + error.message, 'error');
    });
  }

  function insertControls() {
    if (document.getElementById('bn-project-controls')) return true;
    var bar = document.getElementById('bn-download-bar');
    if (!bar) return false;

    var controls = document.createElement('div');
    controls.id = 'bn-project-controls';
    controls.innerHTML = [
      '<button type="button" class="bn-project-btn" id="bn-project-download">下載專案 json</button>',
      '<button type="button" class="bn-project-btn" id="bn-project-upload">上傳專案 json</button>',
      '<input type="file" id="bn-project-file" accept=".json,application/json" hidden>',
      '<div id="bn-project-status" class="bn-project-status" aria-live="polite"></div>'
    ].join('');
    bar.appendChild(controls);

    var fileInput = document.getElementById('bn-project-file');
    document.getElementById('bn-project-download').addEventListener('click', downloadProject);
    document.getElementById('bn-project-upload').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) uploadProject(file);
      this.value = '';
    });
    return true;
  }

  function ready() {
    if (insertControls()) return;
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (insertControls() || attempts > 60) clearInterval(timer);
    }, 100);
  }

  if (document.readyState !== 'loading') ready();
  else document.addEventListener('DOMContentLoaded', ready);

  global.ADProjectJSON = {
    version: PROJECT_VERSION,
    collect: collectProject,
    apply: applyProject,
    validate: validateProject
  };
})(window);
