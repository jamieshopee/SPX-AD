(function (global) {
  'use strict';

  function toRecordMap(input) {
    if (!input) return {};
    if (input.records && typeof input.records === 'object') return input.records;
    if (input.assets && typeof input.assets === 'object') return input.assets;
    if (typeof input === 'object') return input;
    return {};
  }

  function normalizeLookupKey(value) {
    return String(value || '').trim().toLowerCase();
  }

  function processedLookupKeys(processedAsset) {
    var keys = [];
    if (!processedAsset) return keys;
    [processedAsset.lookupKey, processedAsset.filename].forEach(function (value) {
      var key = normalizeLookupKey(value);
      if (key && keys.indexOf(key) < 0) keys.push(key);
    });
    return keys;
  }

  function readEntryDataUrl(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    if (entry.dataUrl) return entry.dataUrl;
    return '';
  }

  function findProcessedEntry(processedAsset, processedAssetIndex) {
    var index = processedAssetIndex || {};
    var keys = processedLookupKeys(processedAsset);
    for (var i = 0; i < keys.length; i += 1) {
      if (index[keys[i]]) return index[keys[i]];
    }
    return null;
  }

  function serializeProcessedAsset(record, entry) {
    if (!record || !record.assetKey || !record.processedAsset) return null;
    var filename = record.processedAsset.filename || '';
    var dataUrl = readEntryDataUrl(entry);
    if (!filename || !dataUrl) return null;
    return {
      filename: filename,
      dataUrl: dataUrl
    };
  }

  function normalizeProcessedAsset(record, processedAssetIndex) {
    var entry = findProcessedEntry(record && record.processedAsset, processedAssetIndex);
    return serializeProcessedAsset(record, entry);
  }

  function collectProcessedAssets(pipelineMetadataOrRecords, processedAssetIndex) {
    var records = toRecordMap(pipelineMetadataOrRecords);
    var payload = {};
    Object.keys(records).forEach(function (assetKey) {
      var record = records[assetKey];
      var normalized = normalizeProcessedAsset(record, processedAssetIndex);
      if (!normalized) return;
      payload[record.assetKey || assetKey] = normalized;
    });
    return payload;
  }

  function buildProcessedAssetsPayload(pipelineMetadataOrRecords, processedAssetIndex) {
    return collectProcessedAssets(pipelineMetadataOrRecords, processedAssetIndex);
  }

  async function buildProcessedAssetsPayloadAsync(pipelineMetadataOrRecords, processedAssetIndex, options) {
    options = options || {};
    var readDataUrl = typeof options.readEntryDataUrl === 'function' ? options.readEntryDataUrl : readEntryDataUrl;
    var records = toRecordMap(pipelineMetadataOrRecords);
    var payload = {};
    var assetKeys = Object.keys(records);
    for (var i = 0; i < assetKeys.length; i += 1) {
      var assetKey = assetKeys[i];
      var record = records[assetKey];
      if (!record || !record.assetKey || !record.processedAsset) continue;
      var entry = findProcessedEntry(record.processedAsset, processedAssetIndex);
      if (!entry) continue;
      var dataUrl = await readDataUrl(entry);
      var normalized = serializeProcessedAsset(record, { dataUrl: dataUrl });
      if (!normalized) continue;
      payload[record.assetKey || assetKey] = normalized;
    }
    return payload;
  }

  function buildProcessedAssetIndex(processedAssets) {
    var index = {};
    var assets = processedAssets && typeof processedAssets === 'object' ? processedAssets : {};
    Object.keys(assets).forEach(function (assetKey) {
      var item = assets[assetKey];
      if (!item || !item.filename || !item.dataUrl) return;
      var filenameKey = normalizeLookupKey(item.filename);
      if (!filenameKey) return;
      index[filenameKey] = {
        dataUrl: item.dataUrl,
        filename: item.filename,
        lookupKey: filenameKey,
        assetKey: assetKey,
        restoredFromProjectState: true
      };
    });
    return index;
  }

  function clonePlain(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function prepareProjectZipState(state) {
    var zipState = clonePlain(state || {});
    var processedEntries = [];
    var processedAssets = zipState.processedAssets || {};
    Object.keys(processedAssets).forEach(function (assetKey) {
      var item = processedAssets[assetKey];
      if (!item || !item.filename || !item.dataUrl) {
        delete processedAssets[assetKey];
        return;
      }
      processedEntries.push({
        assetKey: assetKey,
        filename: item.filename,
        dataUrl: item.dataUrl
      });
      processedAssets[assetKey] = { filename: item.filename };
    });
    if (!Object.keys(processedAssets).length) delete zipState.processedAssets;
    return { state: zipState, processedEntries: processedEntries };
  }

  function dataUrlFromBase64(base64, filename) {
    var lower = String(filename || '').toLowerCase();
    var mime = 'image/png';
    if (/\.jpe?g$/.test(lower)) mime = 'image/jpeg';
    else if (/\.webp$/.test(lower)) mime = 'image/webp';
    else if (/\.gif$/.test(lower)) mime = 'image/gif';
    return 'data:' + mime + ';base64,' + base64;
  }

  async function extractProjectZipState(file, JSZipCtor) {
    if (!file) throw new Error('缺少 project.zip 檔案');
    var Zip = JSZipCtor || global.JSZip;
    if (!Zip) throw new Error('JSZip 未載入，無法匯入 project.zip');
    var zip = await Zip.loadAsync(await file.arrayBuffer());
    var stateFile = zip.file('project-state.json');
    if (!stateFile) throw new Error('project.zip 缺少 project-state.json');
    var state = JSON.parse(await stateFile.async('string'));
    if (!state || state.schema !== 'spx-ad-project-state') throw new Error('project-state.json 格式不支援');
    if (Number(state.version) !== 5) throw new Error('project-state.json 必須是 version 5');
    if (state.type !== 'project') throw new Error('project-state.json 必須是 project type');
    var processedAssets = state.processedAssets || {};
    var restored = {};
    var assetKeys = Object.keys(processedAssets);
    for (var i = 0; i < assetKeys.length; i += 1) {
      var assetKey = assetKeys[i];
      var item = processedAssets[assetKey];
      if (!item || !item.filename) continue;
      var processedFile = zip.file('processed/' + item.filename) || zip.file('assets/processed/' + item.filename);
      if (!processedFile) continue;
      var base64 = await processedFile.async('base64');
      if (!base64) continue;
      restored[assetKey] = {
        filename: item.filename,
        dataUrl: dataUrlFromBase64(base64, item.filename)
      };
    }
    if (Object.keys(restored).length) state.processedAssets = restored;
    else delete state.processedAssets;
    return state;
  }

  global.BNProjectPersistence = {
    collectProcessedAssets: collectProcessedAssets,
    buildProcessedAssetsPayload: buildProcessedAssetsPayload,
    buildProcessedAssetsPayloadAsync: buildProcessedAssetsPayloadAsync,
    buildProcessedAssetIndex: buildProcessedAssetIndex,
    prepareProjectZipState: prepareProjectZipState,
    extractProjectZipState: extractProjectZipState,
    normalizeProcessedAsset: normalizeProcessedAsset,
    serializeProcessedAsset: serializeProcessedAsset
  };
})(window);
