(function (global) {
  if (global.BNAssetRenderPayload && global.BNAssetRenderPayload.buildProductPayloads) return;

  function defaultCreateId(prefix, index) {
    return prefix + Date.now() + '_' + index;
  }

  function filenameBase(filename) {
    return String(filename || '').replace(/\.[^.]+$/, '');
  }

  function findResolvedAsset(resolvedAssets, role, filename, slot) {
    var assets = resolvedAssets || {};
    var groups = [];
    if (role === 'product') groups.push(assets.products || []);
    else if (role === 'person') groups.push(assets.person ? [assets.person] : []);
    else if (role === 'singleProduct') groups.push(assets.singleProducts || []);
    groups.push(assets.items || []);

    var lookup = String(filename || '').trim().toLowerCase();
    for (var g = 0; g < groups.length; g++) {
      var list = groups[g] || [];
      for (var i = 0; i < list.length; i++) {
        var item = list[i] || {};
        var itemFilename = String(item.originalFilename || item.filename || '').trim().toLowerCase();
        if (item.role && item.role !== role) continue;
        if (slot != null && item.slot != null && Number(item.slot) !== Number(slot)) continue;
        if (lookup && itemFilename && itemFilename !== lookup) continue;
        if (item.source === 'processed' && item.dataUrl) return item;
      }
    }
    return null;
  }

  async function readSourceDataUrl(options) {
    var resolved = findResolvedAsset(options.resolvedAssets, options.role, options.filename, options.slot);
    if (resolved && resolved.dataUrl) {
      return {
        src: resolved.dataUrl,
        source: 'processed',
        resolved: resolved
      };
    }
    var handle = options.getHandle(options.filename);
    if (!handle) return null;
    return {
      src: await options.handleToDataUrl(handle),
      source: 'original',
      resolved: null
    };
  }

  async function buildLogoPayload(options) {
    var filenames = options.filenames || [];
    var getHandle = options.getHandle;
    var handleToDataUrl = options.handleToDataUrl;
    var trim = options.trim || (global.BNAssetProcessing && global.BNAssetProcessing.autoTrim);
    var idPrefix = options.idPrefix || 'asset_logo_';
    var sorted = global.BNAssetClassifier.sortLogos(filenames);
    var logos = [];
    var missing = [];
    var errors = [];

    for (var i = 0; i < sorted.length; i++) {
      var handle = getHandle(sorted[i]);
      if (!handle) {
        missing.push(sorted[i]);
        continue;
      }
      try {
        var rawUrl = await handleToDataUrl(handle);
        var trimmed = await trim(rawUrl);
        logos.push({ id: idPrefix + i, src: trimmed.src, ratio: trimmed.ratio, filename: sorted[i] });
      } catch (error) {
        errors.push({ filename: sorted[i], error: error });
      }
    }

    return {
      type: 'logos',
      logos: logos,
      missing: missing,
      errors: errors,
      message: logos.length ? { type: 'bn-logos', logos: logos.map(function (logo) {
        return { id: logo.id, src: logo.src };
      }) } : null
    };
  }

  async function buildProductPayloads(options) {
    var filenames = options.filenames || [];
    var templateJson = options.templateJson || {};
    var getHandle = options.getHandle;
    var handleToDataUrl = options.handleToDataUrl;
    var trim = options.trim || (global.BNAssetProcessing && global.BNAssetProcessing.autoTrim);
    var imageUtils = options.imageUtils || global.BNImageUtils || {};
    var resolvedAssets = options.resolvedAssets || null;
    var idPrefix = options.idPrefix || 'asset_p';
    var createId = options.createId || function (kind, index) { return defaultCreateId(idPrefix, index); };
    var info = global.BNAssetClassifier.classifyProducts(filenames);
    var missing = [];
    var messages = [];
    var products = [];
    var person = null;
    var singleProduct = null;
    var errors = [];

    if (info.type === 'three_products') {
      var layout = (((templateJson.productZones || {}).threeProducts || {}).defaultLayout) || {};
      var sizeRatios = layout.sizeRatios || templateJson.sizeRatios || [1, 0.85, 0.72];
      var useAutoShadow = !!layout.autoShadow;

      for (var i = 0; i < info.products.length; i++) {
        var item = info.products[i];
        try {
          var source = await readSourceDataUrl({
            resolvedAssets: resolvedAssets,
            role: 'product',
            filename: item.filename,
            slot: item.position,
            getHandle: getHandle,
            handleToDataUrl: handleToDataUrl
          });
          if (!source) {
            missing.push(item.filename);
            continue;
          }
          var trimmed = await trim(source.src);
          var processed = useAutoShadow && typeof imageUtils.autoApplyShadow === 'function'
            ? await imageUtils.autoApplyShadow(trimmed.src, trimmed.ratio)
            : { src: trimmed.src, ratio: trimmed.ratio, baselineRatio: 1 };
          var position = item.position != null ? item.position : i;
          var id = createId('product', i);
          var product = {
            id: id,
            src: processed.src,
            ratio: processed.ratio,
            baselineRatio: processed.baselineRatio,
            name: filenameBase(item.filename),
            sizeScale: sizeRatios[position] != null ? sizeRatios[position] : 0.72,
            position: position,
            zOrder: i,
            _slot: item._slot,
            filename: item.filename
          };
          products.push(product);
          messages.push({
            type: 'bn-product-add',
            id: id,
            src: processed.src,
            ratio: processed.ratio,
            baselineRatio: processed.baselineRatio,
            name: product.name,
            filename: item.filename,
            index: i,
            sizeScale: product.sizeScale,
            position: position,
            zOrder: i
          });
        } catch (error) {
          errors.push({ filename: item.filename, error: error });
        }
      }
    } else {
      var personCfg = (((templateJson.productZones || {}).person || {}).defaultLayout) || {};
      var singleCfg = (((templateJson.productZones || {}).singleProduct || {}).defaultLayout) || {};

      if (info.person) {
        try {
          var personSource = await readSourceDataUrl({
            resolvedAssets: resolvedAssets,
            role: 'person',
            filename: info.person,
            getHandle: getHandle,
            handleToDataUrl: handleToDataUrl
          });
          if (personSource) {
            var trimmedPerson = await trim(personSource.src);
            person = {
              src: trimmedPerson.src,
              displayWidth: personCfg.fitWidth,
              objectFit: 'contain',
              filename: info.person
            };
            messages.push({
              type: 'bn-person-add',
              src: trimmedPerson.src,
              displayWidth: personCfg.fitWidth,
              objectFit: 'contain'
            });
          } else {
            missing.push(info.person);
          }
        } catch (error) {
          errors.push({ filename: info.person, error: error });
        }
      }

      for (var j = 0; j < info.singles.length; j++) {
        var singleFile = info.singles[j];
        try {
          var singleSource = await readSourceDataUrl({
            resolvedAssets: resolvedAssets,
            role: 'singleProduct',
            filename: singleFile,
            getHandle: getHandle,
            handleToDataUrl: handleToDataUrl
          });
          if (!singleSource) {
            missing.push(singleFile);
            continue;
          }
          var trimmedSingle = await trim(singleSource.src);
          var finalSrc = trimmedSingle.src;
          var finalRatio = trimmedSingle.ratio;
          if (singleCfg.autoShadow && typeof imageUtils.autoApplyShadow === 'function') {
            var shadowed = await imageUtils.autoApplyShadow(trimmedSingle.src, trimmedSingle.ratio);
            finalSrc = shadowed.src;
            finalRatio = shadowed.ratio;
          }
          var maxWidth = Number(singleCfg.maxWidth) || 0;
          var maxHeight = Number(singleCfg.maxHeight) || 0;
          var displayW = maxWidth;
          var displayH = maxHeight;
          if (finalRatio > 0 && maxWidth > 0 && maxHeight > 0) {
            if (maxWidth / maxHeight > finalRatio) {
              displayH = maxHeight;
              displayW = Math.round(maxHeight * finalRatio);
            } else {
              displayW = maxWidth;
              displayH = Math.round(maxWidth / finalRatio);
            }
          }
          singleProduct = {
            src: finalSrc,
            ratio: finalRatio,
            displayW: displayW,
            displayH: displayH,
            zoneHeight: singleCfg.maxHeight,
            objectFit: 'contain',
            filename: singleFile
          };
          messages.push({
            type: 'bn-single-product-add',
            src: finalSrc,
            ratio: finalRatio,
            displayW: displayW,
            displayH: displayH,
            zoneHeight: singleCfg.maxHeight,
            objectFit: 'contain'
          });
        } catch (error) {
          errors.push({ filename: singleFile, error: error });
        }
      }
    }

    return {
      type: info.type,
      info: info,
      products: products,
      person: person,
      singleProduct: singleProduct,
      messages: messages,
      missing: missing,
      errors: errors,
      ignored: info.ignored || []
    };
  }

  global.BNAssetRenderPayload = {
    buildLogoPayload: buildLogoPayload,
    buildProductPayloads: buildProductPayloads
  };
})(window);
