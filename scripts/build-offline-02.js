const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputRoot = path.join(root, 'TVBN-智取店_1080x1920');
const templatePath = 'templates/1080x1920/template.json';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, contents) {
  const target = path.join(outputRoot, relativePath);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, contents);
}

function copy(sourcePath, outputPath = sourcePath) {
  const target = path.join(outputRoot, outputPath);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, sourcePath), target);
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`找不到要替換的 ${label}`);
  return source.replace(search, replacement);
}

const template = JSON.parse(read(templatePath));
template.fonts = template.fonts.map((font) => ({
  ...font,
  src: `fonts/${path.basename(font.src)}`
}));
template.guides = {
  threeProducts: 'assets/overlays/對位_品.png',
  personProduct: 'assets/overlays/對位_1人1品.png'
};

const registry = [
  '/* 自動生成：template 離線包專用；資料來源仍是根目錄 templates/1080x1920/template.json。 */',
  '(function (global) {',
  `  global.AD_TEMPLATE_REGISTRY = ${JSON.stringify({[templatePath]: template}, null, 2)};`,
  '})(window);',
  ''
].join('\n');

let editorCore = read('js/editor-core.js');
editorCore = replaceOnce(
  editorCore,
  "global.AD_COMMON_BASE = '../';",
  "global.AD_COMMON_BASE = '';",
  '離線包共用基底路徑'
);
editorCore = replaceOnce(
  editorCore,
  "frame.src = location.protocol === 'file:'\n      ? '../canvas.html#template=' + encodeURIComponent(templatePath)\n      : '../canvas.html?template=' + encodeURIComponent(templatePath);",
  "frame.src = location.protocol === 'file:'\n      ? './canvas.html#template=' + encodeURIComponent(templatePath)\n      : './canvas.html?template=' + encodeURIComponent(templatePath);",
  '同目錄畫布路徑'
);
editorCore = replaceOnce(
  editorCore,
  "global.ADTemplateLoader.load('../' + path)",
  "global.ADTemplateLoader.load('./' + path)",
  '同目錄 HTTP 模板路徑'
);

const templateControls = read('js/template-controls.js');

const html = [
  '<!doctype html>',
  '<html lang="zh-TW">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <meta name="viewport" content="width=device-width,initial-scale=1">',
  '  <title>TVBN 智取店 02編輯器</title>',
  '  <!-- 自動生成的同目錄離線成品；主要開發來源仍位於專案根目錄。 -->',
  '  <link rel="stylesheet" href="./css/editor.css">',
  '  <link rel="stylesheet" href="./css/cropper.min.css">',
  '</head>',
  '<body>',
  '  <div id="app"></div>',
  '  <script>',
  '    window.AD_OFFLINE_BUILD = "2026-06-25-single-drag-parent-overlay-2";',
  '    window.AD_EDITOR_ENTRY = {templatePath: "templates/1080x1920/template.json", styleId: "01"};',
  '    console.log("[single-product drag] offline build", window.AD_OFFLINE_BUILD);',
  '  </script>',
  '  <script src="./templates/template-registry.js"></script>',
  '  <script src="./js/template-loader.js"></script>',
  '  <script src="./js/uploader.js"></script>',
  '  <script src="./js/downloader.js"></script>',
  '  <script src="./js/template-controls.js"></script>',
  '  <script src="./js/editor-core.js"></script>',
  '  <script src="./js/cropper.min.js"></script>',
  '  <script src="./js/banwords-engine-hbn.js"></script>',
  '  <script src="./js/banwords-data.js"></script>',
  '  <script src="./js/logo-editor-plugin.js"></script>',
  '  <script src="./js/editor-plugin.js"></script>',
  '  <script src="./js/bn-editor-plugin.js"></script>',
  '  <script src="./js/bn-state-plugin.js"></script>',
  '  <script src="./js/project-json.js"></script>',
  '</body>',
  '</html>',
  ''
].join('\n');

const canvasHtml = [
  '<!doctype html>',
  '<html lang="zh-TW">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <title>AD 電子版位共用畫布</title>',
  '  <link rel="stylesheet" href="./css/canvas.css">',
  '  <script src="./templates/template-registry.js"></script>',
  '  <script src="./js/template-loader.js"></script>',
  '</head>',
  '<body>',
  '  <div id="css-err"></div>',
  '  <div id="stage"><div id="canvas"></div></div>',
  '  <script src="./js/canvas-entry.js"></script>',
  '</body>',
  '</html>',
  ''
].join('\n');

const cssFiles = ['editor.css', 'canvas.css', 'cropper.min.css'];
const jsFiles = [
  'template-loader.js',
  'uploader.js',
  'downloader.js',
  'template-controls.js',
  'editor-core.js',
  'cropper.min.js',
  'banwords-engine-hbn.js',
  'banwords-data.js',
  'logo-editor-plugin.js',
  'editor-plugin.js',
  'bn-editor-plugin.js',
  'bn-state-plugin.js',
  'project-json.js',
  'canvas-entry.js',
  'layout-runtime.js',
  'html2canvas.min.js'
];

write('02.html', html);
write('canvas.html', canvasHtml);
write('templates/1080x1920/template.json', JSON.stringify(template, null, 2) + '\n');
write('templates/template-registry.js', registry);
write('js/editor-core.js', editorCore);
write('js/template-controls.js', templateControls);

cssFiles.forEach((file) => copy(`css/${file}`, `css/${file}`));
jsFiles
  .filter((file) => file !== 'editor-core.js' && file !== 'template-controls.js')
  .forEach((file) => copy(`js/${file}`, `js/${file}`));

copy('assets/templates/1080x1920/02-assets.js', 'assets/templates/1080x1920/02-assets.js');
copy('TVBN-智取店_1080x1920/img/對位_品.png', 'assets/overlays/對位_品.png');
copy('TVBN-智取店_1080x1920/img/對位_1人1品.png', 'assets/overlays/對位_1人1品.png');

template.fonts.forEach((font, index) => {
  copy(
    JSON.parse(read(templatePath)).fonts[index].src,
    font.src
  );
});

const size = fs.statSync(path.join(outputRoot, '02.html')).size;
console.log(`已產生同目錄離線包；02.html ${(size / 1024).toFixed(1)} KB`);
