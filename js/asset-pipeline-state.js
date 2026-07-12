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

  // Naming Contract Consistency Fix（Locked by Jamie）：
  // 全域唯一命名規則是「原始素材 basename ＋ .png」（例如 商品A.jpg /
  // 商品A.webp 都對應 商品A.png），assetKey 只作為內部 State Identity，
  // 不會出現在 processed 圖片實體檔名裡，因此不可能、也不應該再從
  // processed filename 反解 assetKey。舊的 extractAssetKeyFromProcessedFilename()
  // （把檔名去掉 __processed 尾綴後直接當 assetKey 查表）已與現行 Manifest
  // Contract 不相容而移除；人工「匯入處理結果」流程改為以 processed 檔名的
  // basename，對照每筆 record 的 originalAsset 基本檔名（basename）查找，
  // 同一個原始素材被多個 assetKey 引用時，一份 processed PNG 會回填全部
  // 相關 assetKey（與 importProcessedAssetsByManifestItems() 對 assetKeys[]
  // 的回填規則一致）。

  function normalizeBasenameKey(filename) {
    return filenameBase(filename).trim().toLowerCase();
  }

  // 依每筆 record 的 originalAsset.filename（找不到時 fallback
  // originalFilename）basename，建立 basename → assetKey[] 索引，供人工
  // 「匯入處理結果」比對 processed 檔名使用。只依 basename，不含副檔名，
  // 因為原始素材可能是 .jpg／.webp，processed 一律是 .png。
  function buildOriginalBasenameIndex(assets) {
    var index = {};
    Object.keys(assets || {}).forEach(function (assetKey) {
      var record = assets[assetKey];
      if (!record) return;
      var originalFilename = (record.originalAsset && record.originalAsset.filename) || record.originalFilename || '';
      var key = normalizeBasenameKey(originalFilename);
      if (!key) return;
      if (!index[key]) index[key] = [];
      if (index[key].indexOf(assetKey) < 0) index[key].push(assetKey);
    });
    return index;
  }

  function importProcessedAssets(pipelineState, files, options) {
    options = options || {};
    var state = pipelineState || { assets: {} };
    state.assets = state.assets || {};
    var sourceFolderName = options.sourceFolderName || '';
    var matched = 0;
    var unmatched = [];
    var importedAt = new Date().toISOString();
    var basenameIndex = buildOriginalBasenameIndex(state.assets);

    (files || []).forEach(function (file) {
      var filename = file && (file.name || file.filename) || '';
      if (!filename) return;
      var basenameKey = normalizeBasenameKey(filename);
      var assetKeys = basenameIndex[basenameKey] || [];
      if (!assetKeys.length) {
        unmatched.push({
          filename: filename,
          assetKey: '',
          reason: 'original asset basename not found'
        });
        return;
      }

      assetKeys.forEach(function (assetKey) {
        var record = state.assets[assetKey];
        if (!record) {
          unmatched.push({
            filename: filename,
            assetKey: assetKey,
            reason: 'assetKey not found'
          });
          return;
        }
        var existingDecision = normalizeDecision(record.review && record.review.decision || '');
        var existingStatus = normalizeStatus(record.status || 'pending');
        record.processedAsset = {
          filename: filename,
          lookupKey: String(filename).trim().toLowerCase(),
          sourceFolderName: sourceFolderName,
          exists: true,
          importedAt: importedAt
        };
        if (existingDecision) {
          record.status = existingDecision;
        } else if (existingStatus === 'approved' || existingStatus === 'needs_rerun') {
          record.status = existingStatus;
        } else {
          record.status = 'processed';
        }
        matched++;
      });
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

  // AI Workflow Phase 3 Correction — Naming／Matching Contract（Locked）：
  // 自動化流程的 Processed 檔名是「原始 basename ＋ .png」（見
  // js/asset-pipeline-manifest.js）。AI Workflow 的 Auto Import 直接使用
  // Manifest item 本身已經帶著的 assetKeys[]（同一個原始檔案對應的全部
  // assetKey）逐一回填多筆 record——這是與 importProcessedAssets()（人工
  // 「匯入處理結果」流程使用，見上方 Naming Contract Consistency Fix）
  // 平行、各自獨立的函式，兩者現在共用同一套 basename＋.png 命名規則，
  // 差別只在於比對依據（Manifest 的 assetKeys[] vs. originalAsset basename
  // 索引），沒有第二套架構。
  //
  // manifestItems：Manifest 的 items 陣列（每個 item 至少要有
  // output.filename 與 assetKeys，或至少 assetKey 其中之一）。
  function importProcessedAssetsByManifestItems(pipelineState, manifestItems, options) {
    options = options || {};
    var state = pipelineState || { assets: {} };
    state.assets = state.assets || {};
    var sourceFolderName = options.sourceFolderName || '';
    var matched = 0;
    var unmatched = [];
    var importedAt = new Date().toISOString();

    (manifestItems || []).forEach(function (item) {
      var filename = item && item.output && item.output.filename;
      var assetKeys = (item && Array.isArray(item.assetKeys) && item.assetKeys.length)
        ? item.assetKeys
        : (item && item.assetKey ? [item.assetKey] : []);
      if (!filename || !assetKeys.length) return;

      assetKeys.forEach(function (assetKey) {
        var record = state.assets[assetKey];
        if (!record) {
          unmatched.push({
            filename: filename,
            assetKey: assetKey,
            reason: 'assetKey not found'
          });
          return;
        }
        var existingDecision = normalizeDecision(record.review && record.review.decision || '');
        var existingStatus = normalizeStatus(record.status || 'pending');
        record.processedAsset = {
          filename: filename,
          lookupKey: String(filename).trim().toLowerCase(),
          sourceFolderName: sourceFolderName,
          exists: true,
          importedAt: importedAt
        };
        if (existingDecision) {
          record.status = existingDecision;
        } else if (existingStatus === 'approved' || existingStatus === 'needs_rerun') {
          record.status = existingStatus;
        } else {
          record.status = 'processed';
        }
        matched++;
      });
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

  // AI Workflow Phase 2 Correction — Naming／Matching Contract（Locked）：
  // 原始 basename＋.png 命名，同一個 originalAsset.lookupKey 被多個
  // assetKey 引用時，只建立一個 Manifest item、只上傳一次、只處理一次。
  // 本函式是新增的純函式（不修改任何既有函式），依 lookupKey 把一組
  // asset record 分組，回傳陣列，每組包含：
  //   { lookupKey, filename, assetKeys: [...], records: [...] }
  // assetKey 仍是每筆 record 自己的 State Identity，完全不受影響——本函式
  // 只是為了讓 Manifest Builder 知道「這些 assetKey 該共用同一個 Manifest
  // item／同一次處理結果」，不改變 assetKey 本身的產生方式或用途。
  function groupAssetRecordsByLookupKey(records) {
    var groups = {};
    var order = [];
    (records || []).forEach(function (record) {
      if (!record) return;
      var originalAsset = record.originalAsset || {};
      var lookupKey = originalAsset.lookupKey
        || String(record.originalFilename || '').trim().toLowerCase();
      if (!lookupKey) return;
      if (!groups[lookupKey]) {
        groups[lookupKey] = {
          lookupKey: lookupKey,
          filename: originalAsset.filename || record.originalFilename || '',
          assetKeys: [],
          records: []
        };
        order.push(lookupKey);
      }
      groups[lookupKey].assetKeys.push(record.assetKey);
      groups[lookupKey].records.push(record);
    });
    return order.map(function (key) { return groups[key]; });
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
    importProcessedAssets: importProcessedAssets,
    importProcessedAssetsByManifestItems: importProcessedAssetsByManifestItems,
    setAssetReviewDecision: setAssetReviewDecision,
    getReviewableAssets: getReviewableAssets,
    getReviewSummary: getReviewSummary,
    getNeedsRerunAssets: getNeedsRerunAssets,
    getNeedsRerunSummary: getNeedsRerunSummary,
    exportAssetPipelineMetadataForJobs: exportAssetPipelineMetadataForJobs,
    importAssetPipelineMetadata: importAssetPipelineMetadata,
    groupAssetRecordsByLookupKey: groupAssetRecordsByLookupKey
  };
})(window);
