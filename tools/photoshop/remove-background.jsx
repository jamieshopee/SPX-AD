/*
 * SPX AD Photoshop Adapter MVP
 * Phase 2B-2 Remove Background Prototype
 *
 * It reads photoshop-job-manifest.json, opens each source image, saves a PNG
 * using item.output.filename, and writes photoshop-run-report.json.
 *
 * Background removal is attempted for product / person / singleProduct.
 * Logo assets are copied to processed PNG without background removal.
 */

(function () {
  // Windows DoJavaScript Phase Checkpoints (Proposal Freeze
  // 2026-07-15-freeze-02), temporary diagnostic only: this must remain the
  // very first executable statement in this file. It marks that
  // $.evalFile() has truly begun executing this file's content (Phase C),
  // as opposed to having failed to load/parse the file at all (Phase B).
  // Does not affect any existing logic below -- to be removed once the
  // Windows DoJavaScript Bug Fix Investigation no longer needs it.
  $.global.__SPX_PS_DEBUG_PHASE__ = 'C';
  var args = $.global.__SPX_PS_ADAPTER_ARGS__ || {};
  var startedAt = nowIso();
  var manifest = null;
  var report = {
    schema: 'spx-ad-photoshop-run-report',
    version: 1,
    runId: '',
    startedAt: startedAt,
    finishedAt: '',
    summary: {
      total: 0,
      success: 0,
      error: 0
    },
    items: []
  };

  app.displayDialogs = DialogModes.NO;

  try {
    manifest = readJsonFile(args.manifestPath);
    report.runId = manifest.runId || '';
    var items = manifest.items || [];
    report.summary.total = items.length;

    var originalFolder = new Folder(args.originalFolder);
    var outputFolder = new Folder(args.outputFolder);
    if (!outputFolder.exists) outputFolder.create();

    for (var i = 0; i < items.length; i++) {
      processItem(items[i], originalFolder, outputFolder, report);
    }
  } catch (error) {
    report.items.push({
      assetKey: '',
      status: 'error',
      error: String(error && error.message ? error.message : error)
    });
    report.summary.error++;
  }

  report.finishedAt = nowIso();
  writeTextFile(new File(joinPath(args.outputFolder, 'photoshop-run-report.json')), stringifyJson(report, 0));
})();

function processItem(item, originalFolder, outputFolder, report) {
  var assetKey = item.assetKey || '';
  var sourceFilename = getSourceFilename(item);
  var outputFilename = getOutputFilename(item);
  var doc = null;

  try {
    if (!sourceFilename) throw new Error('missing source filename');
    if (!outputFilename) throw new Error('missing output filename');

    var sourceFile = new File(joinPath(originalFolder.fsName, sourceFilename));
    if (!sourceFile.exists) throw new Error('source file not found: ' + sourceFilename);

    doc = app.open(sourceFile);
    var backgroundResult = { attempted: false, removed: false, method: 'copy', error: '' };
    if (shouldRemoveBackground(item)) {
      backgroundResult = removeBackgroundForDocument(doc);
      if (!backgroundResult.removed) {
        throw new Error('remove background failed: ' + backgroundResult.error);
      }
    }

    var outputFile = new File(joinPath(outputFolder.fsName, outputFilename));
    saveDocumentAsPng(doc, outputFile);

    report.items.push({
      assetKey: assetKey,
      status: 'success',
      role: item.role || '',
      mode: item.mode || '',
      sourceFilename: sourceFilename,
      outputFilename: outputFilename,
      background: backgroundResult
    });
    report.summary.success++;
  } catch (error) {
    report.items.push({
      assetKey: assetKey,
      status: 'error',
      role: item.role || '',
      mode: item.mode || '',
      sourceFilename: sourceFilename,
      outputFilename: outputFilename,
      error: String(error && error.message ? error.message : error)
    });
    report.summary.error++;
  } finally {
    if (doc) {
      try {
        doc.close(SaveOptions.DONOTSAVECHANGES);
      } catch (_) {}
    }
  }
}

function shouldRemoveBackground(item) {
  if (!item) return false;
  if (item.role === 'logo') return false;
  if (item.operations && item.operations.removeBackground === false) return false;
  return item.role === 'product' || item.role === 'person' || item.role === 'singleProduct';
}

function removeBackgroundForDocument(doc) {
  try {
    prepareActiveLayerForTransparency(doc);
    tryRemoveBackgroundQuickAction();
    return { attempted: true, removed: true, method: 'removeBackground', error: '' };
  } catch (quickActionError) {
    try {
      prepareActiveLayerForTransparency(doc);
      trySelectSubjectLayerMask();
      return { attempted: true, removed: true, method: 'selectSubjectLayerMask', error: '' };
    } catch (maskError) {
      return {
        attempted: true,
        removed: false,
        method: 'none',
        error: String(maskError && maskError.message ? maskError.message : maskError) +
          ' | quickAction: ' + String(quickActionError && quickActionError.message ? quickActionError.message : quickActionError)
      };
    }
  }
}

function prepareActiveLayerForTransparency(doc) {
  app.activeDocument = doc;
  try {
    if (doc.activeLayer && doc.activeLayer.isBackgroundLayer) {
      doc.activeLayer.isBackgroundLayer = false;
    }
  } catch (_) {}
}

function tryRemoveBackgroundQuickAction() {
  var desc = new ActionDescriptor();
  executeAction(stringIDToTypeID('removeBackground'), desc, DialogModes.NO);
}

function trySelectSubjectLayerMask() {
  selectSubject();
  makeLayerMaskFromSelection();
}

function selectSubject() {
  var desc = new ActionDescriptor();
  try {
    desc.putBoolean(stringIDToTypeID('sampleAllLayers'), false);
  } catch (_) {}
  executeAction(stringIDToTypeID('autoCutout'), desc, DialogModes.NO);
}

function makeLayerMaskFromSelection() {
  var desc = new ActionDescriptor();
  var ref = new ActionReference();
  desc.putClass(charIDToTypeID('Nw  '), charIDToTypeID('Chnl'));
  ref.putEnumerated(charIDToTypeID('Chnl'), charIDToTypeID('Chnl'), charIDToTypeID('Msk '));
  desc.putReference(charIDToTypeID('At  '), ref);
  desc.putEnumerated(charIDToTypeID('Usng'), charIDToTypeID('UsrM'), charIDToTypeID('RvlS'));
  executeAction(charIDToTypeID('Mk  '), desc, DialogModes.NO);
}

function getSourceFilename(item) {
  if (item && item.source && item.source.filename) return item.source.filename;
  return item ? item.originalFilename || '' : '';
}

function getOutputFilename(item) {
  if (item && item.output && item.output.filename) return item.output.filename;
  // Naming Contract Consistency Fix（Locked by Jamie）：Manifest 缺少
  // output.filename 時，fallback 必須沿用同一套「原始 basename ＋ .png」
  // 規則，改用 item.source.filename 取得原始 basename，不得再組出
  // assetKey + "__processed.png"（assetKey 只是內部 State Identity，
  // 不得進入 processed 圖片實體檔名）。
  var sourceFilename = getSourceFilename(item);
  if (sourceFilename) return basenameOf(sourceFilename) + '.png';
  return '';
}

function basenameOf(filename) {
  return String(filename || '').replace(/\.[^.]+$/, '');
}

function saveDocumentAsPng(doc, outputFile) {
  var options = new PNGSaveOptions();
  doc.saveAs(outputFile, options, true, Extension.LOWERCASE);
}

function readJsonFile(path) {
  var file = new File(path);
  if (!file.exists) throw new Error('manifest not found: ' + path);
  file.encoding = 'UTF-8';
  if (!file.open('r')) throw new Error('cannot open manifest: ' + path);
  var text = file.read();
  file.close();
  return eval('(' + text + ')');
}

function writeTextFile(file, text) {
  file.encoding = 'UTF-8';
  if (!file.open('w')) throw new Error('cannot write file: ' + file.fsName);
  file.write(text);
  file.close();
}

function joinPath(folderPath, filename) {
  var path = String(folderPath || '');
  if (!path.length) return filename;
  if (path.charAt(path.length - 1) === '/' || path.charAt(path.length - 1) === '\\') return path + filename;
  return path + '/' + filename;
}

function nowIso() {
  var d = new Date();
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function stringifyJson(value, depth) {
  if (value === null) return 'null';
  var type = typeof value;
  if (type === 'string') return quoteJson(value);
  if (type === 'number' || type === 'boolean') return String(value);
  if (value instanceof Array) return stringifyArray(value, depth || 0);
  return stringifyObject(value, depth || 0);
}

function stringifyArray(array, depth) {
  if (!array.length) return '[]';
  var pad = indent(depth);
  var childPad = indent(depth + 1);
  var parts = [];
  for (var i = 0; i < array.length; i++) {
    parts.push(childPad + stringifyJson(array[i], depth + 1));
  }
  return '[\n' + parts.join(',\n') + '\n' + pad + ']';
}

function stringifyObject(object, depth) {
  var keys = [];
  for (var key in object) {
    if (object.hasOwnProperty(key)) keys.push(key);
  }
  if (!keys.length) return '{}';
  var pad = indent(depth);
  var childPad = indent(depth + 1);
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    parts.push(childPad + quoteJson(keys[i]) + ': ' + stringifyJson(object[keys[i]], depth + 1));
  }
  return '{\n' + parts.join(',\n') + '\n' + pad + '}';
}

function quoteJson(text) {
  return '"' + String(text)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t') + '"';
}

function indent(depth) {
  var text = '';
  for (var i = 0; i < depth; i++) text += '  ';
  return text;
}
