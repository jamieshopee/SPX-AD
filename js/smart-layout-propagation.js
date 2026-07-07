(function(global) {
  'use strict';

  function parseLength(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value !== 'string') return 0;
    var match = value.trim().match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function toPx(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = 0;
    return (Math.round(number * 1000) / 1000) + 'px';
  }

  function clone(value) {
    return value ? JSON.parse(JSON.stringify(value)) : null;
  }

  function normalizeProduct(product, index) {
    return {
      id: product.id || '',
      filename: product.filename || '',
      position: Number.isFinite(Number(product.position)) ? Number(product.position) : index,
      left: parseLength(product.left),
      top: parseLength(product.top),
      width: parseLength(product.width),
      height: parseLength(product.height),
      rotation: Number(product.rotation) || 0,
      zIndex: product.zIndex || '',
      userAdjusted: true,
    };
  }

  function hasProductsLayout(layoutState) {
    return Array.isArray(layoutState && layoutState.products) && layoutState.products.length >= 3;
  }

  function boundsForProducts(products) {
    var minLeft = Infinity;
    var minTop = Infinity;
    var maxRight = -Infinity;
    var maxBottom = -Infinity;
    products.forEach(function(product) {
      minLeft = Math.min(minLeft, product.left);
      minTop = Math.min(minTop, product.top);
      maxRight = Math.max(maxRight, product.left + product.width);
      maxBottom = Math.max(maxBottom, product.top + product.height);
    });
    return {
      left: minLeft,
      top: minTop,
      width: Math.max(1, maxRight - minLeft),
      height: Math.max(1, maxBottom - minTop),
    };
  }

  function productsZoneFromTemplate(templateJson) {
    var style = templateJson && templateJson.productZones && templateJson.productZones.threeProducts && templateJson.productZones.threeProducts.style;
    if (!style) return null;
    return {
      left: parseLength(style.left),
      top: parseLength(style.top),
      width: parseLength(style.width),
      height: parseLength(style.height),
    };
  }

  function captureProductMasterLayout(layoutState, options) {
    if (!hasProductsLayout(layoutState)) return null;
    var products = layoutState.products.map(normalizeProduct);
    var group = boundsForProducts(products);
    return {
      kind: 'three_products_master_layout',
      version: 1,
      sourceLayoutKey: options && options.sourceLayoutKey || '',
      sourcePlacementId: options && options.sourcePlacementId || '',
      sourceTemplateId: options && options.sourceTemplateId || '',
      sourceProductsZone: clone(options && options.sourceProductsZone) || null,
      group: group,
      products: products.map(function(product) {
        return {
          id: product.id,
          filename: product.filename,
          position: product.position,
          relativeLeft: product.left - group.left,
          relativeTop: product.top - group.top,
          width: product.width,
          height: product.height,
          rotation: product.rotation,
          zIndex: product.zIndex,
          userAdjusted: true,
        };
      }),
      updatedAt: new Date().toISOString(),
    };
  }

  function propagateProductMasterLayout(masterLayout, targetProductsZone) {
    if (!masterLayout || !Array.isArray(masterLayout.products) || !targetProductsZone) return null;
    var groupWidth = Math.max(1, parseLength(masterLayout.group && masterLayout.group.width));
    var groupHeight = Math.max(1, parseLength(masterLayout.group && masterLayout.group.height));
    var targetWidth = Math.max(1, parseLength(targetProductsZone.width));
    var targetHeight = Math.max(1, parseLength(targetProductsZone.height));
    var scale = Math.min(targetWidth / groupWidth, targetHeight / groupHeight);
    var fittedWidth = groupWidth * scale;
    var fittedHeight = groupHeight * scale;
    /* Product boxes live inside the products zone, so left/top are zone-relative. */
    var offsetLeft = (targetWidth - fittedWidth) / 2;
    var offsetTop = (targetHeight - fittedHeight) / 2;

    return {
      products: masterLayout.products.map(function(product, index) {
        return {
          id: product.id || '',
          filename: product.filename || '',
          position: Number.isFinite(Number(product.position)) ? Number(product.position) : index,
          left: toPx(offsetLeft + parseLength(product.relativeLeft) * scale),
          top: toPx(offsetTop + parseLength(product.relativeTop) * scale),
          width: toPx(parseLength(product.width) * scale),
          height: toPx(parseLength(product.height) * scale),
          rotation: Number(product.rotation) || 0,
          zIndex: product.zIndex || '',
          userAdjusted: true,
        };
      }),
    };
  }

  global.BNSmartLayoutPropagation = {
    parseLength: parseLength,
    productsZoneFromTemplate: productsZoneFromTemplate,
    hasProductsLayout: hasProductsLayout,
    captureProductMasterLayout: captureProductMasterLayout,
    propagateProductMasterLayout: propagateProductMasterLayout,
  };
})(window);
