const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8'));
const registry = {};

index.templates.filter((item) => item.implemented).forEach((item) => {
  registry[item.path] = JSON.parse(fs.readFileSync(path.join(root, item.path), 'utf8'));
  const count = Number(item.styleCount || 16);
  for (let i = 1; i <= count; i++) {
    const id = String(i).padStart(2, '0');
    const stylePath = `${item.stylesPath}/${id}.json`;
    registry[stylePath] = JSON.parse(fs.readFileSync(path.join(root, stylePath), 'utf8'));
  }
});

const output = [
  '/* 自動生成：供 file:// 離線模式讀取；資料來源仍是 templates 目錄內的 JSON。 */',
  '(function (global) {',
  '  global.AD_TEMPLATE_REGISTRY = ' + JSON.stringify(registry, null, 2) + ';',
  '})(window);',
  ''
].join('\n');

fs.writeFileSync(path.join(root, 'templates/template-registry.js'), output);
