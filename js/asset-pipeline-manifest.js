(function (global) {
  if (global.BNAssetPipelineManifest && global.BNAssetPipelineManifest.buildPhotoshopJobManifest) return;

  function safeFilename(value) {
    return String(value || 'asset')
      .trim()
      .replace(/[\\/:*?"<>|\s]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120) || 'asset';
  }

  function operationForRole(role) {
    return {
      removeBackground: role !== 'logo',
      trim: false,
      normalize: false
    };
  }

  // AI Workflow Phase 2 Correction — Naming／Matching Contract（Locked by
  // Jamie）：輸出檔名改為「原始 basename ＋ .png」，不再使用
  // {assetKey}__processed.png，不新增 __processed／jobId／role／slot 等後綴。
  // safeFilename() 沿用既有的路徑安全字元過濾（既有做法就已用於 assetKey），
  // 正常情況下（不含檔案系統不安全字元的檔名）結果就是原始 basename 本身。
  function outputBasename(filename) {
    var base = String(filename || 'asset').replace(/\.[^.]+$/, '');
    return safeFilename(base);
  }

  function operationsEqual(a, b) {
    return !!a && !!b
      && a.removeBackground === b.removeBackground
      && a.trim === b.trim
      && a.normalize === b.normalize;
  }

  // 依 assetKey 字串排序（非陣列到達順序／插入順序）挑選「代表」record，
  // 提供給 role／mode／slot 這類與 Photoshop 實際處理結果無關的描述性欄位
  // 使用——這是一個確定性、可重現的規則，不是「依陣列順序猜測」。
  function sortedByAssetKey(records) {
    return (records || []).slice().sort(function (a, b) {
      return String(a && a.assetKey || '').localeCompare(String(b && b.assetKey || ''));
    });
  }

  // 依 js/asset-pipeline-state.js 的 groupAssetRecordsByLookupKey() 分組結果
  // 建立一個 Manifest item——同一個原始檔案（lookupKey）只建立一個 item，
  // 即使有多個 assetKey 引用它。item.assetKeys 帶著這個 item 對應的「全部」
  // assetKey，供未來 Phase 3 Correction 的 Matching 邏輯一次回填多筆 state
  // record（本檔案本身不做 Matching，只準備這個資訊）。
  //
  // Correction（Locked by Jamie）：是否能安全共用同一份 Processed 輸出，
  // 取決於這個群組內「每一筆 record 實際會產生的 Photoshop processing
  // operations」是否完全一致——不得依陣列順序猜測、不得默默選擇
  // removeBackground=true 或 false、也不得為了解決衝突而輸出多份檔案
  // （Jamie 已鎖定同一 original file 只處理一次）。若不一致，回傳
  // { conflict: {...} }，由呼叫方（manifestFromItems）拒絕建立整份
  // Manifest，並回報明確、可指出衝突檔案的錯誤。
  function itemForGroup(group, outputFolder) {
    var records = group.records || [];
    var sortedRecords = sortedByAssetKey(records);
    var representative = sortedRecords[0] || {};

    var referenceOperations = operationForRole(sortedRecords[0] ? sortedRecords[0].role : undefined);
    var hasConflict = sortedRecords.some(function (record) {
      return !operationsEqual(operationForRole(record.role), referenceOperations);
    });

    if (hasConflict) {
      return {
        conflict: {
          code: 'operations_conflict',
          lookupKey: group.lookupKey,
          filename: group.filename,
          assetKeys: (group.assetKeys || []).slice(),
          message: '同一素材「' + group.filename + '」被多個工單／角色引用，'
            + '但實際 Photoshop 處理方式（是否去背等 operations）不一致，'
            + '無法安全共用同一份 Processed 輸出。'
        }
      };
    }

    var outputFilename = outputBasename(group.filename) + '.png';
    var jobIds = [];
    records.forEach(function (record) {
      (record.jobIds || []).forEach(function (jobId) {
        if (jobId && jobIds.indexOf(jobId) < 0) jobIds.push(jobId);
      });
    });

    return {
      item: {
        assetKey: representative.assetKey,
        assetKeys: (group.assetKeys || []).slice(),
        originalFilename: representative.originalFilename,
        role: representative.role,
        mode: representative.mode,
        slot: representative.slot,
        jobIds: jobIds,
        status: representative.status || 'pending',
        source: {
          filename: group.filename,
          lookupKey: group.lookupKey,
          sourceFolderName: representative.originalAsset && representative.originalAsset.sourceFolderName,
          exists: !!(representative.originalAsset && representative.originalAsset.exists)
        },
        output: {
          folder: outputFolder,
          filename: outputFilename
        },
        operations: referenceOperations
      }
    };
  }

  // 回傳形狀：成功時是完整的 Manifest 物件（既有形狀，含 items[]）；若任一
  // 群組發現 operations 衝突，回傳 { error: { code, lookupKey, filename,
  // assetKeys, message } }，整份 Manifest 建立失敗，不會只跳過衝突的那一項
  // 而部分成功——避免使用者在不知情下漏掉某些素材。呼叫方（Manifest Build
  // Orchestrator／Workflow State Machine）需要檢查回傳值是否帶有 .error。
  function manifestFromItems(pipelineState, records, options) {
    options = options || {};
    var runId = options.runId || ('psrun_' + new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14));
    var outputFolder = options.outputFolder || ('asset-pipeline/processed/' + runId);

    var groups = global.BNAssetPipelineState && global.BNAssetPipelineState.groupAssetRecordsByLookupKey
      ? global.BNAssetPipelineState.groupAssetRecordsByLookupKey(records)
      : [];

    var manifestItems = [];
    for (var i = 0; i < groups.length; i++) {
      var built = itemForGroup(groups[i], outputFolder);
      if (built.conflict) {
        return { error: built.conflict };
      }
      manifestItems.push(built.item);
    }

    return {
      schema: 'spx-ad-photoshop-job-manifest',
      version: 1,
      runId: runId,
      createdAt: new Date().toISOString(),
      sourceFolderName: pipelineState ? pipelineState.sourceFolderName || '' : '',
      outputFolder: outputFolder,
      itemCount: manifestItems.length,
      items: manifestItems
    };
  }

  function buildPhotoshopJobManifest(pipelineState, options) {
    var assets = pipelineState && pipelineState.assets ? pipelineState.assets : {};
    var items = Object.keys(assets).sort().map(function (assetKey) { return assets[assetKey]; });
    return manifestFromItems(pipelineState, items, options);
  }

  function buildPhotoshopRerunManifest(pipelineState, options) {
    var items = global.BNAssetPipelineState && global.BNAssetPipelineState.getNeedsRerunAssets
      ? global.BNAssetPipelineState.getNeedsRerunAssets(pipelineState)
      : [];
    return manifestFromItems(pipelineState, items, options);
  }

  global.BNAssetPipelineManifest = {
    buildPhotoshopJobManifest: buildPhotoshopJobManifest,
    buildPhotoshopRerunManifest: buildPhotoshopRerunManifest
  };
})(window);
