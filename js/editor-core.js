(function (global) {
  'use strict';

  function fieldMarkup(id, field) {
    return [
      '<div class="s-field">',
      '  <label>' + field.label + '</label>',
      '  <input type="text" id="' + id + '" placeholder="' + field.label + '文字" value="' + field.defaultText.replace(/"/g, '&quot;') + '">',
      '  <span class="char-badge" id="badge-' + field.label + '"></span>',
      '</div>'
    ].join('');
  }

  function build(template, templatePath) {
    global.__AD_TEMPLATE__ = template;
    global.__AD_TEMPLATE_PATH__ = templatePath;
    global.__BN_TEMPLATE__ = template; /* 讓 bn-editor-plugin.js 可讀取 autoShadow 等設定 */
    global.__BN_STATE_NO_AUTOLOAD__ = true;
    global.AD_COMMON_BASE = '../';

    document.title = template.editorTitle;
    var fields = template.textFields;
    var app = document.getElementById('app');
    app.innerHTML = [
      '<div id="sidebar">',
      '  <div id="sidebar-head">🎛 ' + template.editorTitle + '</div>',
      '  <div id="sidebar-scroll">',
      '    <div class="s-section">文字內容</div>',
           fieldMarkup('txt-main', fields.main),
           fieldMarkup('txt-sub', fields.sub),
           fieldMarkup('txt-date', fields.small),
      '  </div>',
      '</div>',
      '<div id="preview-area">',
      '  <div id="preview-wrap" class="preview-block">',
      '    <iframe id="canvas-frame" title="' + template.templateName + ' Banner 畫布"></iframe>',
      '    <img id="align-overlay" alt="" style="display:none">',
      '    <div id="prev-label">—</div>',
      '  </div>',
      '</div>'
    ].join('');

    var frame = document.getElementById('canvas-frame');
    var styleId = (global.AD_EDITOR_ENTRY || {}).styleId || template.styleId || '01';
    frame.src = location.protocol === 'file:'
      ? '../canvas.html#template=' + encodeURIComponent(templatePath) + '&style=' + encodeURIComponent(styleId)
      : '../canvas.html?template=' + encodeURIComponent(templatePath) + '&style=' + encodeURIComponent(styleId);
    if (global.ADTemplateControls) global.ADTemplateControls.init(template);
  }

  var entry = global.AD_EDITOR_ENTRY || {};
  var path = entry.templatePath || 'templates/1080x1920/template.json';
  function fail() {
    document.getElementById('app').innerHTML = '<div class="editor-fatal">模板設定載入失敗：' + path + '</div>';
    console.warn('[EditorCore] 找不到離線模板設定：', path);
  }
  if (location.protocol === 'file:') {
    var template = global.ADTemplateLoader && global.ADTemplateLoader.loadSync(path, entry.styleId || '01');
    if (template) build(template, path);
    else fail();
  } else {
    global.ADTemplateLoader.load('../' + path, entry.styleId || '01').then(function (template) {
      build(template, path);
    }).catch(fail);
  }
})(window);
