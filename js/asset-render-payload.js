(function (global) {
  if (global.BNAssetRenderPayload && global.BNAssetRenderPayload.buildProductPayloads) return;

  function defaultCreateId(prefix, index) {
    return prefix + Date.now() + '_' + index;
  }

  function filenameBase(filename) {
    return String(filename || '').replace(/\.[^.]+$/, '');
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
        var handle = getHandle(item.filename);
        if (!handle) {
          missing.push(item.filename);
          continue;
        }
        try {
          var rawUrl = await handleToDataUrl(handle);
          var trimmed = await trim(rawUrl);
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
        var personHandle = getHandle(info.person);
        if (personHandle) {
          try {
            var personRaw = await handleToDataUrl(personHandle);
            var trimmedPerson = await trim(personRaw);
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
          } catch (error) {
            errors.push({ filename: info.person, error: error });
          }
        } else {
          missing.push(info.person);
        }
      }

      for (var j = 0; j < info.singles.length; j++) {
        var singleFile = info.singles[j];
        var singleHandle = getHandle(singleFile);
        if (!singleHandle) {
          missing.push(singleFile);
          continue;
        }
        try {
          var singleRaw = await handleToDataUrl(singleHandle);
          var trimmedSingle = await trim(singleRaw);
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
