(function (global) {
  if (global.BNAssetResolver && global.BNAssetResolver.resolveApprovedAsset) return;

  function normalizeKey(value) {
    return String(value || '').trim().toLowerCase();
  }

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getAssets(pipelineState) {
    return pipelineState && pipelineState.assets || {};
  }

  function getJobId(job, fallback) {
    return String(job && (job.jobId || job.id || job.outputFilename) || fallback || '');
  }

  function sameSlot(a, b) {
    if (a == null || b == null) return true;
    return Number(a) === Number(b);
  }

  function recordHasJob(record, jobId) {
    if (!jobId) return true;
    return asArray(record && record.jobIds).map(String).indexOf(String(jobId)) >= 0;
  }

  function recordMatchesFilename(record, filename) {
    if (!filename) return true;
    var key = normalizeKey(filename);
    return normalizeKey(record && record.originalFilename) === key ||
      normalizeKey(record && record.originalAsset && record.originalAsset.filename) === key ||
      normalizeKey(record && record.originalAsset && record.originalAsset.lookupKey) === key;
  }

  function findRecord(pipelineState, query) {
    query = query || {};
    var assets = getAssets(pipelineState);
    var assetKey = query.assetKey || '';
    if (assetKey && assets[assetKey]) return assets[assetKey];

    var keys = Object.keys(assets);
    for (var i = 0; i < keys.length; i++) {
      var record = assets[keys[i]] || {};
      if (query.role && record.role !== query.role) continue;
      if (!sameSlot(record.slot, query.slot)) continue;
      if (!recordHasJob(record, query.jobId)) continue;
      if (!recordMatchesFilename(record, query.filename)) continue;
      return record;
    }
    return null;
  }

  function reviewDecision(record) {
    return record && record.review && record.review.decision || '';
  }

  function isApproved(record) {
    return !!record && (record.status === 'approved' || reviewDecision(record) === 'approved');
  }

  function statusOf(record) {
    return record && record.status || 'missing';
  }

  function resultFromRecord(record, query) {
    query = query || {};
    var approved = isApproved(record);
    var processed = record && record.processedAsset || null;
    var original = record && record.originalAsset || null;
    var source = 'missing';
    var filename = query.filename || '';
    var reason = '';

    if (!record) {
      reason = 'asset not found';
    } else if (approved && processed) {
      source = 'processed';
      filename = processed.filename || record.originalFilename || filename;
    } else if (approved && !processed) {
      source = 'original';
      filename = record.originalFilename || original && original.filename || filename;
      reason = 'approved asset missing processed file';
    } else {
      source = 'original';
      filename = record.originalFilename || original && original.filename || filename;
      reason = 'asset is not approved';
    }

    return {
      assetKey: record && record.assetKey || query.assetKey || '',
      role: record && record.role || query.role || '',
      mode: record && record.mode || query.mode || '',
      slot: record && record.slot != null ? record.slot : (query.slot == null ? null : query.slot),
      status: statusOf(record),
      reviewDecision: reviewDecision(record),
      approved: approved,
      source: source,
      filename: filename,
      originalFilename: record && record.originalFilename || query.filename || '',
      processedFilename: processed && processed.filename || '',
      originalAsset: clone(original),
      processedAsset: clone(processed),
      record: clone(record),
      reason: reason
    };
  }

  function resolveApprovedAsset(pipelineState, query) {
    var record = findRecord(pipelineState, query || {});
    return resultFromRecord(record, query || {});
  }

  function classifyJobProducts(job, options) {
    options = options || {};
    var classifier = options.classifier || global.BNAssetClassifier || {};
    var filenames = asArray(job && job.productFilenames);
    if (classifier.classifyProducts) return classifier.classifyProducts(filenames);

    var person = null;
    var singles = [];
    filenames.forEach(function (filename) {
      var text = String(filename || '');
      if (text.indexOf('_人') >= 0) person = filename;
      else if (text.indexOf('_品') >= 0) singles = [filename];
    });
    if (person || singles.length) {
      return { type: 'person_product', person: person, singles: singles, products: [] };
    }
    return {
      type: 'three_products',
      person: null,
      singles: [],
      products: filenames.map(function (filename, index) {
        return { filename: filename, position: index };
      })
    };
  }

  function sortJobLogos(job, options) {
    options = options || {};
    var classifier = options.classifier || global.BNAssetClassifier || {};
    var filenames = asArray(job && job.logoFilenames);
    return classifier.sortLogos ? classifier.sortLogos(filenames) : filenames.slice();
  }

  function pushResolved(list, groups, groupName, result) {
    list.push(result);
    if (Array.isArray(groups[groupName])) groups[groupName].push(result);
    else groups[groupName] = result;
  }

  function resolveJobAssets(pipelineState, job, options) {
    options = options || {};
    var jobId = getJobId(job, options.jobId);
    var items = [];
    var groups = {
      logos: [],
      products: [],
      person: null,
      singleProducts: []
    };

    sortJobLogos(job, options).forEach(function (filename, index) {
      pushResolved(items, groups, 'logos', resolveApprovedAsset(pipelineState, {
        jobId: jobId,
        role: 'logo',
        mode: 'logo',
        slot: index,
        filename: filename
      }));
    });

    var productInfo = classifyJobProducts(job, options);
    var mode = productInfo.type || 'three_products';
    if (mode === 'person_product') {
      if (productInfo.person) {
        pushResolved(items, groups, 'person', resolveApprovedAsset(pipelineState, {
          jobId: jobId,
          role: 'person',
          mode: mode,
          filename: productInfo.person
        }));
      }
      asArray(productInfo.singles).forEach(function (filename) {
        pushResolved(items, groups, 'singleProducts', resolveApprovedAsset(pipelineState, {
          jobId: jobId,
          role: 'singleProduct',
          mode: mode,
          filename: filename
        }));
      });
    } else {
      asArray(productInfo.products).forEach(function (item) {
        var filename = item && item.filename || item;
        var slot = item && item.position != null ? item.position : null;
        pushResolved(items, groups, 'products', resolveApprovedAsset(pipelineState, {
          jobId: jobId,
          role: 'product',
          mode: 'three_products',
          slot: slot,
          filename: filename
        }));
      });
    }

    var summary = { total: items.length, approved: 0, processed: 0, original: 0, missing: 0 };
    items.forEach(function (item) {
      if (item.approved) summary.approved++;
      if (item.source === 'processed') summary.processed++;
      else if (item.source === 'original') summary.original++;
      else summary.missing++;
    });

    return {
      jobId: jobId,
      mode: mode,
      items: items,
      assets: groups,
      summary: summary
    };
  }

  function createResolver(options) {
    options = options || {};
    var approvedMap = options.approvedMap || {};
    var lookupOriginal = typeof options.lookupOriginal === 'function'
      ? options.lookupOriginal
      : function () { return null; };

    return {
      resolve: function (filename) {
        var approved = approvedMap[filename] || approvedMap[normalizeKey(filename)] || null;
        return approved || lookupOriginal(filename);
      },
      hasApproved: function (filename) {
        return !!(approvedMap[filename] || approvedMap[normalizeKey(filename)]);
      }
    };
  }

  global.BNAssetResolver = {
    createResolver: createResolver,
    resolveApprovedAsset: resolveApprovedAsset,
    resolveJobAssets: resolveJobAssets
  };
})(window);
