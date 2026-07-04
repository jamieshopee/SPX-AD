(function (global) {
  'use strict';

  function normalize(path) {
    return String(path || '')
      .replace(/\\/g, '/')
      .replace(/^(\.\/)+/, '')
      .replace(/^(\.\.\/)+/, '');
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function fromRegistry(path) {
    var key = normalize(path);
    var registry = global.AD_TEMPLATE_REGISTRY || {};
    return registry[key] ? clone(registry[key]) : null;
  }

  function deriveStylePath(templatePath, styleId) {
    var id = String(styleId || '01').replace(/[^\d]/g, '').padStart(2, '0').slice(-2);
    var base = normalize(templatePath).replace(/\/template\.json(?:\?.*)?$/, '');
    return base + '/styles/' + id + '.json';
  }

  function loadJson(path, label) {
    var embedded = fromRegistry(path);
    if (location.protocol === 'file:') {
      if (embedded) return Promise.resolve(embedded);
      return Promise.reject(new Error('離線' + (label || 'JSON') + '登錄中找不到：' + normalize(path)));
    }
    return fetch(path, {cache: 'no-store'}).then(function (response) {
      if (!response.ok) throw new Error((label || 'JSON') + '讀取失敗：HTTP ' + response.status);
      return response.json();
    }).catch(function (error) {
      if (embedded) {
        console.warn('[TemplateLoader] ' + (label || 'JSON') + '讀取失敗，改用離線登錄。', error);
        return embedded;
      }
      throw error;
    });
  }

  function applyStyle(template, style) {
    var merged = clone(template || {});
    var selected = clone(style || {});
    merged.style = selected;
    merged.styleId = selected.id || merged.defaultStyleId || '01';
    merged.visual = {
      background: selected.background || '',
      infoGraphic: selected.infoGraphic || '',
      headlineColor: selected.headlineColor || '',
      subHeadlineColor: selected.subHeadlineColor || '',
      smallTextColor: selected.smallTextColor || ''
    };
    var fields = merged.textFields || {};
    if (fields.main && fields.main.style && selected.headlineColor) fields.main.style.color = selected.headlineColor;
    if (fields.sub && fields.sub.style && selected.subHeadlineColor) fields.sub.style.color = selected.subHeadlineColor;
    if (fields.small && fields.small.style && selected.smallTextColor) fields.small.style.color = selected.smallTextColor;
    return merged;
  }

  function load(path, styleId) {
    return loadJson(path, '模板設定').then(function (template) {
      var id = styleId || template.defaultStyleId || '01';
      var stylePath = deriveStylePath(path, id);
      return loadJson(stylePath, '樣式設定').then(function (style) {
        return applyStyle(template, style);
      });
    });
  }

  function loadStyle(templatePath, styleId) {
    return loadJson(deriveStylePath(templatePath, styleId), '樣式設定');
  }

  function loadSync(path, styleId) {
    var template = fromRegistry(path);
    if (!template) return null;
    var style = fromRegistry(deriveStylePath(path, styleId || template.defaultStyleId || '01'));
    return style ? applyStyle(template, style) : template;
  }

  global.ADTemplateLoader = {
    normalize: normalize,
    clone: clone,
    deriveStylePath: deriveStylePath,
    applyStyle: applyStyle,
    loadSync: loadSync,
    loadStyle: loadStyle,
    load: load
  };
})(window);
