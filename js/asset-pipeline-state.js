(function (global) {
  if (global.BNAssetPipelineState && global.BNAssetPipelineState.buildAssetPipelineState) return;

  function safeIdPart(value) {
    return String(value || 'asset')
      .trim()
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|\s]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'asset';
  }

  function normalizeJobId(job, index) {
    return safeIdPart(job && (job.jobId || job.outputFilename || job.id || ('job_' + (index + 1))));
  }

  function makeAssetKey(parts) {
    return parts.map(safeIdPart).join('__');
  }

  function filenameBase(filename) {
    return String(filename || '').replace(/\.[^.]+$/, '');
  }

  function createRecord(options) {
    var filename = options.filename || '';
    var assetKey = makeAssetKey([
      options.jobKey || 'shared',
      options.role || 'asset',
      options.slot == null ? options.kind || 'main' : 'slot' + options.slot,
      filenameBase(filename)
    ]);
    return {
      assetKey: assetKey,
      originalFilename: filename,
      role: options.role || 'asset',
      mode: options.mode || '',
      slot: options.slot == null ? null : options.slot,
      jobIds: options.jobId ? [options.jobId] : [],
      status: 'pending',
      originalAsset: {
        filename: filename,
        lookupKey: String(filename || '').trim().toLowerCase(),
        sourceFolderName: options.sourceFolderName || '',
        exists: !!options.exists
      }
    };
  }

  function addRecord(records, record) {
    if (!record || !record.assetKey) return;
    if (!records[record.assetKey]) {
      records[record.assetKey] = record;
      return;
    }
    var existing = records[record.assetKey];
    (record.jobIds || []).forEach(function (jobId) {
      if (jobId && existing.jobIds.indexOf(jobId) < 0) existing.jobIds.push(jobId);
    });
  }

  function buildAssetPipelineState(options) {
    options = options || {};
    var jobs = options.jobs || [];
    var sourceFolderName = options.sourceFolderName || '';
    var hasAsset = typeof options.hasAsset === 'function' ? options.hasAsset : function () { return false; };
    var classifier = global.BNAssetClassifier || {};
    var records = {};

    jobs.forEach(function (job, jobIndex) {
      var jobId = job && (job.jobId || String(job.id || jobIndex + 1));
      var jobKey = normalizeJobId(job, jobIndex);
      var logoFiles = classifier.sortLogos
        ? classifier.sortLogos(job.logoFilenames || [])
        : (job.logoFilenames || []).slice();
      var productInfo = classifier.classifyProducts
        ? classifier.classifyProducts(job.productFilenames || [])
        : { type: 'three_products', products: [] };
      var mode = productInfo.type || 'three_products';

      logoFiles.forEach(function (filename, index) {
        addRecord(records, createRecord({
          jobId: jobId,
          jobKey: jobKey,
          filename: filename,
          role: 'logo',
          mode: 'logo',
          slot: index,
          sourceFolderName: sourceFolderName,
          exists: hasAsset(filename)
        }));
      });

      if (mode === 'person_product') {
        if (productInfo.person) {
          addRecord(records, createRecord({
            jobId: jobId,
            jobKey: jobKey,
            filename: productInfo.person,
            role: 'person',
            mode: mode,
            kind: 'person',
            sourceFolderName: sourceFolderName,
            exists: hasAsset(productInfo.person)
          }));
        }
        (productInfo.singles || []).forEach(function (filename) {
          addRecord(records, createRecord({
            jobId: jobId,
            jobKey: jobKey,
            filename: filename,
            role: 'singleProduct',
            mode: mode,
            kind: 'singleProduct',
            sourceFolderName: sourceFolderName,
            exists: hasAsset(filename)
          }));
        });
      } else {
        (productInfo.products || []).forEach(function (item) {
          var filename = item.filename || item;
          var slot = item.position == null ? null : item.position;
          addRecord(records, createRecord({
            jobId: jobId,
            jobKey: jobKey,
            filename: filename,
            role: 'product',
            mode: 'three_products',
            slot: slot,
            sourceFolderName: sourceFolderName,
            exists: hasAsset(filename)
          }));
        });
      }
    });

    return {
      schema: 'spx-ad-asset-pipeline-state',
      version: 1,
      sourceFolderName: sourceFolderName,
      createdAt: new Date().toISOString(),
      assets: records
    };
  }

  function extractAssetKeyFromProcessedFilename(filename) {
    var base = filenameBase(filename);
    return base.replace(/__processed$/i, '');
  }

  function importProcessedAssets(pipelineState, files, options) {
    options = options || {};
    var state = pipelineState || { assets: {} };
    state.assets = state.assets || {};
    var sourceFolderName = options.sourceFolderName || '';
    var matched = 0;
    var unmatched = [];
    var importedAt = new Date().toISOString();

    (files || []).forEach(function (file) {
      var filename = file && (file.name || file.filename) || '';
      if (!filename) return;
      var assetKey = extractAssetKeyFromProcessedFilename(filename);
      var record = state.assets[assetKey];
      if (!record) {
        unmatched.push({
          filename: filename,
          assetKey: assetKey,
          reason: 'assetKey not found'
        });
        return;
      }
      record.status = 'processed';
      record.processedAsset = {
        filename: filename,
        lookupKey: String(filename).trim().toLowerCase(),
        sourceFolderName: sourceFolderName,
        exists: true,
        importedAt: importedAt
      };
      matched++;
    });

    state.processedImportedAt = importedAt;
    state.unmatchedProcessedAssets = unmatched;
    return {
      state: state,
      matched: matched,
      unmatched: unmatched.length,
      unmatchedProcessedAssets: unmatched
    };
  }

  global.BNAssetPipelineState = {
    buildAssetPipelineState: buildAssetPipelineState,
    makeAssetKey: makeAssetKey,
    extractAssetKeyFromProcessedFilename: extractAssetKeyFromProcessedFilename,
    importProcessedAssets: importProcessedAssets
  };
})(window);
