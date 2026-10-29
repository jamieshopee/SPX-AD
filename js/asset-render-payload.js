(function (global) {
  if (global.BNAssetRenderPayload && global.BNAssetRenderPayload.buildProductPayloads) return;

  function defaultCreateId(prefix, index) {
    return prefix + Date.now() + '_' + index;
  }

  function filenameBase(filename) {
    return String(filename || '').replace(/\.[^.]+$/, '');
  }

  function slotsMatch(a, b) {
    if (a == null || b == null) return true;
    if (String(a) === String(b)) return true;
    return Number(a) === Number(b);
  }

  function shadowSettingsFor(settings, role, filename, position) {
    var root = settings || {};
    var group = role === 'singleProduct' ? (root.singleProduct || {}) : (root.products || {});
    var filenameKey = String(filename || '');
    return group[filenameKey] || group[String(position)] || group.default || null;
  }

  function findResolvedAsset(resolvedAssets, role, filename, slot) {
    var assets = resolvedAssets || {};
    var groups = [];
    if (role === 'product') groups.push(assets.products || []);
    else if (role === 'person') {
      if (slot != null && assets.twoPersons && assets.twoPersons[slot]) {
        groups.push([assets.twoPersons[slot]]);
      }
      groups.push(assets.person ? [assets.person] : []);
    }
    else if (role === 'singleProduct') groups.push(assets.singleProducts || []);
    groups.push(assets.items || []);

    var lookup = String(filename || '').trim().toLowerCase();
    for (var g = 0; g < groups.length; g++) {
      var list = groups[g] || [];
      for (var i = 0; i < list.length; i++) {
        var item = list[i] || {};
        var itemFilename = String(item.originalFilename || item.filename || '').trim().toLowerCase();
        if (item.role && item.role !== role) continue;
        if (!slotsMatch(item.slot, slot)) continue;
        if (lookup && itemFilename && itemFilename !== lookup) continue;
        if (item.source === 'processed' && item.dataUrl) return item;
      }
    }
    return null;
  }

  function singleProductInitialTarget(templateJson, hasPerson, singleCount) {
    if (hasPerson || singleCount !== 1) return null;
    var size = String(templateJson.width || '') + 'x' + String(templateJson.height || '');
    var targets = {
      '984x309': { x: 488, y: 24, width: 370, height: 285 },
      '1080x1920': { x: 50, y: 720, width: 1025, height: 1200 },
      '1599x1080': { x: 771, y: 100, width: 800, height: 980 },
      '3189x3992': { x: 145, y: 1669, width: 2900, height: 2323 }
    };
    return targets[size] || null;
  }

  function personProductUnionTarget(templateJson) {
    var size = String(templateJson.width || '') + 'x' + String(templateJson.height || '');
    var targets = {
      '984x309': { x: 488, y: 24, width: 370, height: 285 },
      '1080x1920': { x: 50, y: 720, width: 1025, height: 1200 },
      '1599x1080': { x: 771, y: 100, width: 800, height: 980 },
      '3189x3992': { x: 145, y: 1669, width: 2900, height: 2323 }
    };
    return targets[size] || null;
  }

  async function readSourceDataUrl(options) {
    var manualSources = options.manualSources || {};
    var manualKey = String(options.slot || '') + '|' + String(options.filename || '').trim().toLowerCase();
    if (options.mode !== 'two_persons' && manualSources[manualKey]) {
      return { src: manualSources[manualKey], source: 'manual', resolved: null };
    }
    var resolved = findResolvedAsset(options.resolvedAssets, options.role, options.filename, options.slot);
    if (resolved && resolved.dataUrl) {
      return {
        src: resolved.dataUrl,
        source: 'processed',
        resolved: resolved
      };
    }
    if (options.mode === 'two_persons' && manualSources[manualKey]) {
      return { src: manualSources[manualKey], source: 'manual', resolved: null };
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
    var productShadowEnabled = options.productShadowEnabled !== false;
    var productShadowSettings = options.productShadowSettings || {};
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

    if (info.type === 'invalid_two_persons') {
      return {
        type: info.type,
        info: info,
        products: [],
        person: null,
        singleProduct: null,
        twoPersons: null,
        messages: [],
        missing: [],
        errors: [{ code: 'invalid_two_persons', filenames: info.ignored || [] }],
        ignored: info.ignored || []
      };
    }

    if (info.type === 'two_persons') {
      var twoCfg = (((templateJson.productZones || {}).twoPersons) || {});
      var twoSlots = twoCfg.slots || {};
      var alphaBounds = global.BNAssetProcessing && global.BNAssetProcessing.analyzeAlphaBounds;
      var twoPersons = { left: null, right: null, front: twoCfg.defaultFront === 'right' ? 'right' : 'left' };
      var singlePerson = !!(info.left || info.right) && !(info.left && info.right);
      var slotNames = ['left', 'right'];

      if (typeof alphaBounds !== 'function') {
        errors.push({ code: 'two_person_alpha_bounds_unavailable' });
      } else {
        for (var slotIndex = 0; slotIndex < slotNames.length; slotIndex++) {
          var slotName = slotNames[slotIndex];
          var slotFilename = info[slotName];
          if (!slotFilename) continue;
          var slotCfg = twoSlots[slotName] || {};
          try {
            var source = await readSourceDataUrl({
              resolvedAssets: resolvedAssets,
              role: 'person',
              filename: slotFilename,
              slot: slotName,
              mode: 'two_persons',
              getHandle: getHandle,
              handleToDataUrl: handleToDataUrl
              , manualSources: options.manualSources
            });
            if (!source) {
              missing.push(slotFilename);
              continue;
            }
            var twoPersonAlphaThreshold = Number(global.BNAssetProcessing &&
              global.BNAssetProcessing.TWO_PERSON_VISIBLE_ALPHA_THRESHOLD);
            var alpha = await alphaBounds(source.src, twoPersonAlphaThreshold);
            var visible = alpha.visible;
            var targetRect = singlePerson ? (twoCfg.operationRect || {}) : slotCfg;
            var targetWidth = Number(targetRect.width);
            var targetX = Number(targetRect.x);
            var targetY = Number(targetRect.y);
            if (!visible || !Number.isFinite(targetWidth) || targetWidth <= 0) {
              errors.push({ filename: slotFilename, code: 'two_person_visible_bounds_invalid' });
              continue;
            }
            var scale = targetWidth / visible.width;
            var imageWidth = alpha.sourceWidth * scale;
            var imageHeight = alpha.sourceHeight * scale;
            var visibleHeight = visible.height * scale;
            if (![scale, imageWidth, imageHeight, visibleHeight, targetX, targetY].every(Number.isFinite) ||
                scale <= 0 || imageWidth <= 0 || imageHeight <= 0 || visibleHeight <= 0) {
              errors.push({ filename: slotFilename, code: 'two_person_transform_invalid' });
              continue;
            }
            var item = {
              filename: slotFilename,
              source: source.source,
              src: source.src,
              sourceWidth: alpha.sourceWidth,
              sourceHeight: alpha.sourceHeight,
              visible: visible,
              target: { x: targetX, y: targetY, width: targetWidth, height: visibleHeight },
              image: {
                left: targetX - visible.x * scale,
                top: targetY - visible.y * scale,
                width: imageWidth,
                height: imageHeight
              },
              operationRect: twoCfg.operationRect || null,
              zIndex: Number(slotCfg.zIndex) || (slotName === 'left' ? 22 : 21)
            };
            twoPersons[slotName] = item;
            messages.push({ type: 'bn-two-person-add', slot: slotName, item: item, front: twoPersons.front });
          } catch (error) {
            errors.push({ filename: slotFilename, error: error });
          }
        }
      }

      return {
        type: info.type,
        info: info,
        products: [],
        person: null,
        singleProduct: null,
        twoPersons: twoPersons,
        messages: messages,
        missing: missing,
        errors: errors,
        ignored: info.ignored || []
      };
    }

    if (info.type === 'three_products') {
      var layout = (((templateJson.productZones || {}).threeProducts || {}).defaultLayout) || {};
      var sizeRatios = layout.sizeRatios || templateJson.sizeRatios || [1, 0.85, 0.72];
      var useAutoShadow = false;

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
          var processed = { src: trimmed.src, ratio: trimmed.ratio, baselineRatio: 1 };
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
            filename: item.filename,
            shadowSettings: shadowSettingsFor(productShadowSettings, 'product', item.filename, position)
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
            zOrder: i,
            shadowSettings: product.shadowSettings,
            shadowEnabled: productShadowEnabled
          });
        } catch (error) {
          errors.push({ filename: item.filename, error: error });
        }
      }
    } else {
      var personCfg = (((templateJson.productZones || {}).person || {}).defaultLayout) || {};
      var singleCfg = (((templateJson.productZones || {}).singleProduct || {}).defaultLayout) || {};
      var singleInitialTarget = singleProductInitialTarget(templateJson, !!info.person, info.singles.length);
      var personProductUnion = personProductUnionTarget(templateJson);

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
              ratio: trimmedPerson.ratio,
              objectFit: 'contain',
              filename: info.person
            };
            messages.push({
              type: 'bn-person-add',
              src: trimmedPerson.src,
              displayWidth: personCfg.fitWidth,
              ratio: trimmedPerson.ratio,
              personProductUnion: personProductUnion,
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
          var maxWidth = singleInitialTarget
            ? singleInitialTarget.width
            : (Number(singleCfg.maxWidth) || 0);
          var maxHeight = singleInitialTarget
            ? singleInitialTarget.height
            : (Number(singleCfg.maxHeight) || 0);
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
            initialTarget: singleInitialTarget,
            objectFit: 'contain',
            filename: singleFile,
            shadowSettings: shadowSettingsFor(productShadowSettings, 'singleProduct', singleFile, j)
          };
          messages.push({
            type: 'bn-single-product-add',
            src: finalSrc,
            ratio: finalRatio,
            displayW: displayW,
            displayH: displayH,
            zoneHeight: singleCfg.maxHeight,
            initialTarget: singleInitialTarget,
            objectFit: 'contain',
            shadowSettings: singleProduct.shadowSettings,
            shadowEnabled: productShadowEnabled
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
