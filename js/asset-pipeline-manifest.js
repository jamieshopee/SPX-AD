(function (global) {
  if (global.BNAssetPipelineManifest && global.BNAssetPipelineManifest.buildPhotoshopJobManifest) return;

  function safeFilename(value) {
    return String(value || 'asset')
      .trim()
      .replace(/[\\/:*?"<>|\s]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120) || 'asset';
  }

  function extensionForRole(role) {
    return role === 'logo' ? 'png' : 'png';
  }

  function operationForRole(role) {
    return {
      removeBackground: role !== 'logo',
      trim: false,
      normalize: false
    };
  }

  function buildPhotoshopJobManifest(pipelineState, options) {
    options = options || {};
    var runId = options.runId || ('psrun_' + new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14));
    var assets = pipelineState && pipelineState.assets ? pipelineState.assets : {};
    var outputFolder = options.outputFolder || ('asset-pipeline/processed/' + runId);
    var items = Object.keys(assets).sort().map(function (assetKey) {
      var asset = assets[assetKey];
      var outputFilename = safeFilename(asset.assetKey) + '__processed.' + extensionForRole(asset.role);
      return {
        assetKey: asset.assetKey,
        originalFilename: asset.originalFilename,
        role: asset.role,
        mode: asset.mode,
        slot: asset.slot,
        jobIds: asset.jobIds || [],
        status: asset.status || 'pending',
        source: {
          filename: asset.originalAsset && asset.originalAsset.filename,
          lookupKey: asset.originalAsset && asset.originalAsset.lookupKey,
          sourceFolderName: asset.originalAsset && asset.originalAsset.sourceFolderName,
          exists: !!(asset.originalAsset && asset.originalAsset.exists)
        },
        output: {
          folder: outputFolder,
          filename: outputFilename
        },
        operations: operationForRole(asset.role)
      };
    });

    return {
      schema: 'spx-ad-photoshop-job-manifest',
      version: 1,
      runId: runId,
      createdAt: new Date().toISOString(),
      sourceFolderName: pipelineState ? pipelineState.sourceFolderName || '' : '',
      outputFolder: outputFolder,
      itemCount: items.length,
      items: items
    };
  }

  global.BNAssetPipelineManifest = {
    buildPhotoshopJobManifest: buildPhotoshopJobManifest
  };
})(window);
