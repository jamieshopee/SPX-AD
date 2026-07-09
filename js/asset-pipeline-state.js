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

  function normalizeDecision(decision) {
    var value = String(decision || '').trim();
    if (value === 'rejected') return 'needs_rerun';
    return /^(approved|needs_rerun)$/.test(value) ? value : '';
  }

  function normalizeStatus(status) {
    var value = String(status || 'pending').trim();
    if (value === 'rejected') return 'needs_rerun';
    return /^(pending|processed|approved|needs_rerun)$/.test(value) ? value : 'pending';
  }

  function setAssetReviewDecision(pipelineState, assetKey, decision, options) {
    options = options || {};
    var state = pipelineState || { assets: {} };
    state.assets = state.assets || {};
    var key = String(assetKey || '');
    var record = state.assets[key];
    var normalized = normalizeDecision(decision);
    if (!record || !normalized) {
      return {
        state: state,
        record: null,
        ok: false,
        reason: record ? 'invalid decision' : 'assetKey not found'
      };
    }
    var decidedAt = options.decidedAt || new Date().toISOString();
    record.status = normalized;
    record.review = {
      decision: normalized,
      decidedAt: decidedAt,
      note: options.note || ''
    };
    state.reviewUpdatedAt = decidedAt;
    return {
      state: state,
      record: record,
      ok: true
    };
  }

  function getReviewableAssets(pipelineState) {
    var assets = pipelineState && pipelineState.assets || {};
    return Object.keys(assets).map(function (assetKey) {
      return assets[assetKey];
    }).filter(function (record) {
      return !!(record && record.processedAsset);
    }).sort(function (a, b) {
      var aJob = (a.jobIds && a.jobIds[0]) || '';
      var bJob = (b.jobIds && b.jobIds[0]) || '';
      if (aJob !== bJob) return String(aJob).localeCompare(String(bJob), 'zh-Hant');
      if (a.role !== b.role) return String(a.role).localeCompare(String(b.role), 'en');
      var aSlot = a.slot == null ? 99 : Number(a.slot);
      var bSlot = b.slot == null ? 99 : Number(b.slot);
      if (aSlot !== bSlot) return aSlot - bSlot;
      return String(a.originalFilename || '').localeCompare(String(b.originalFilename || ''), 'zh-Hant');
    });
  }

  function getReviewSummary(pipelineState) {
    var assets = pipelineState && pipelineState.assets || {};
    var summary = {
      total: 0,
      reviewable: 0,
      pending: 0,
      processed: 0,
      approved: 0,
      needs_rerun: 0,
      missingProcessed: 0
    };
    Object.keys(assets).forEach(function (assetKey) {
      var record = assets[assetKey] || {};
      var status = normalizeStatus(record.status || 'pending');
      summary.total++;
      if (record.processedAsset) summary.reviewable++;
      else summary.missingProcessed++;
      if (summary[status] == null) summary[status] = 0;
      summary[status]++;
    });
    return summary;
  }


  function clonePlain(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function sanitizeOriginalAsset(asset) {
    if (!asset) return null;
    var result = {};
    ['filename', 'lookupKey', 'sourceFolderName', 'exists'].forEach(function (key) {
      if (asset[key] !== undefined) result[key] = asset[key];
    });
    return result;
  }

  function sanitizeProcessedAsset(asset) {
    if (!asset) return null;
    var result = {};
    ['filename', 'lookupKey', 'sourceFolderName', 'exists', 'importedAt'].forEach(function (key) {
      if (asset[key] !== undefined) result[key] = asset[key];
    });
    return result;
  }

  function sanitizeReview(review) {
    if (!review) return null;
    var decision = normalizeDecision(review.decision || '');
    var result = {};
    if (decision) result.decision = decision;
    ['decidedAt', 'note'].forEach(function (key) {
      if (review[key] !== undefined) result[key] = review[key];
    });
    return Object.keys(result).length ? result : null;
  }

  function sanitizePipelineRecord(record) {
    if (!record || !record.assetKey) return null;
    var result = {
      assetKey: record.assetKey,
      originalFilename: record.originalFilename || '',
      role: record.role || 'asset',
      mode: record.mode || '',
      slot: record.slot == null ? null : record.slot,
      jobIds: Array.isArray(record.jobIds) ? record.jobIds.slice() : [],
      status: normalizeStatus(record.status || 'pending')
    };
    var originalAsset = sanitizeOriginalAsset(record.originalAsset);
    var processedAsset = sanitizeProcessedAsset(record.processedAsset);
    var review = sanitizeReview(record.review);
    if (originalAsset) result.originalAsset = originalAsset;
    if (processedAsset) result.processedAsset = processedAsset;
    if (review) result.review = review;
    return result;
  }

  function assetBelongsToAnyJob(record, jobs) {
    if (!record || !Array.isArray(jobs) || !jobs.length) return false;
    var recordJobIds = (record.jobIds || []).map(function (value) { return String(value); });
    var filename = String(record.originalFilename || record.originalAsset && record.originalAsset.filename || '').trim().toLowerCase();
    return jobs.some(function (job) {
      var jobKeys = [job && job.jobId, job && job.id, job && job.outputFilename]
        .filter(function (value) { return value !== undefined && value !== null; })
        .map(function (value) { return String(value); });
      if (recordJobIds.some(function (jobId) { return jobKeys.indexOf(jobId) >= 0; })) return true;
      if (!filename) return false;
      var filenames = []
        .concat(job && job.logoFilenames || [])
        .concat(job && job.productFilenames || [])
        .map(function (value) { return String(value || '').trim().toLowerCase(); });
      return filenames.indexOf(filename) >= 0;
    });
  }

  function getNeedsRerunAssets(pipelineState) {
    var assets = pipelineState && pipelineState.assets || {};
    return Object.keys(assets).map(function (assetKey) {
      return assets[assetKey];
    }).filter(function (record) {
      return !!(record && normalizeStatus(record.status) === 'needs_rerun');
    }).sort(function (a, b) {
      var aJob = (a.jobIds && a.jobIds[0]) || '';
      var bJob = (b.jobIds && b.jobIds[0]) || '';
      if (aJob !== bJob) return String(aJob).localeCompare(String(bJob), 'zh-Hant');
      if (a.role !== b.role) return String(a.role).localeCompare(String(b.role), 'en');
      var aSlot = a.slot == null ? 99 : Number(a.slot);
      var bSlot = b.slot == null ? 99 : Number(b.slot);
      if (aSlot !== bSlot) return aSlot - bSlot;
      return String(a.originalFilename || '').localeCompare(String(b.originalFilename || ''), 'zh-Hant');
    });
  }

  function getNeedsRerunSummary(pipelineState) {
    var items = getNeedsRerunAssets(pipelineState);
    return { count: items.length, items: items };
  }

  function exportAssetPipelineMetadataForJobs(pipelineState, jobs, options) {
    options = options || {};
    if (!pipelineState) return null;
    var assets = pipelineState.assets || pipelineState.records || {};
    var records = {};
    Object.keys(assets).forEach(function (assetKey) {
      var record = assets[assetKey];
      if (!assetBelongsToAnyJob(record, jobs || [])) return;
      var sanitized = sanitizePipelineRecord(record);
      if (sanitized) records[sanitized.assetKey] = sanitized;
    });
    return {
      schema: 'spx-ad-asset-pipeline-state',
      version: 1,
      exportedAt: options.exportedAt || new Date().toISOString(),
      sourceFolderName: pipelineState.sourceFolderName || '',
      createdAt: pipelineState.createdAt || '',
      processedImportedAt: pipelineState.processedImportedAt || '',
      reviewUpdatedAt: pipelineState.reviewUpdatedAt || '',
      records: records,
      unmatchedProcessedAssets: clonePlain(pipelineState.unmatchedProcessedAssets || [])
    };
  }

  function importAssetPipelineMetadata(metadata) {
    if (!metadata || metadata.schema !== 'spx-ad-asset-pipeline-state') return null;
    var sourceRecords = metadata.records || metadata.assets || {};
    var assets = {};
    Object.keys(sourceRecords).forEach(function (assetKey) {
      var sanitized = sanitizePipelineRecord(sourceRecords[assetKey]);
      if (sanitized) assets[sanitized.assetKey] = sanitized;
    });
    return {
      schema: 'spx-ad-asset-pipeline-state',
      version: Number(metadata.version) || 1,
      sourceFolderName: metadata.sourceFolderName || '',
      createdAt: metadata.createdAt || metadata.exportedAt || new Date().toISOString(),
      processedImportedAt: metadata.processedImportedAt || '',
      reviewUpdatedAt: metadata.reviewUpdatedAt || '',
      assets: assets,
      unmatchedProcessedAssets: clonePlain(metadata.unmatchedProcessedAssets || [])
    };
  }

  global.BNAssetPipelineState = {
    buildAssetPipelineState: buildAssetPipelineState,
    makeAssetKey: makeAssetKey,
    extractAssetKeyFromProcessedFilename: extractAssetKeyFromProcessedFilename,
    importProcessedAssets: importProcessedAssets,
    setAssetReviewDecision: setAssetReviewDecision,
    getReviewableAssets: getReviewableAssets,
    getReviewSummary: getReviewSummary,
    getNeedsRerunAssets: getNeedsRerunAssets,
    getNeedsRerunSummary: getNeedsRerunSummary,
    exportAssetPipelineMetadataForJobs: exportAssetPipelineMetadataForJobs,
    importAssetPipelineMetadata: importAssetPipelineMetadata
  };
})(window);
