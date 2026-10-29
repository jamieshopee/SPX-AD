(function (global) {
  if (global.BNAssetClassifier && global.BNAssetClassifier.classifyProducts) return;

  var MAX_PRODUCTS = 3;

  function sortLogos(filenames) {
    return (filenames || []).slice().sort(function (a, b) {
      var na = parseInt((String(a || '').match(/LOGO_0*(\d+)/i) || [])[1] || '99', 10);
      var nb = parseInt((String(b || '').match(/LOGO_0*(\d+)/i) || [])[1] || '99', 10);
      return na - nb;
    });
  }

  function orderProductsByEditorSlots(filenames) {
    var slotted = {};
    var unslotted = [];
    var slotUtils = global.BNProductSlotUtils || {};

    (filenames || []).forEach(function (filename) {
      var position = typeof slotUtils.detectProductPosition === 'function'
        ? slotUtils.detectProductPosition(filename)
        : null;
      var item = { filename: filename, _slot: position };
      if (position !== null) slotted[position] = item;
      else unslotted.push(item);
    });

    var byPosition = new Array(MAX_PRODUCTS).fill(null);
    [0, 1, 2].forEach(function (position) {
      if (slotted[position]) byPosition[position] = Object.assign({}, slotted[position], { position: position });
    });

    var unslottedIndex = 0;
    for (var position = 0; position < MAX_PRODUCTS && unslottedIndex < unslotted.length; position++) {
      if (!byPosition[position]) {
        byPosition[position] = Object.assign({}, unslotted[unslottedIndex], { position: position });
        unslottedIndex++;
      }
    }

    return byPosition.filter(Boolean);
  }

  function classifyPersonProductFiles(filenames) {
    var result = { person: null, singles: [], matched: 0, ignored: [] };
    (filenames || []).forEach(function (filename) {
      var fname = String(filename || '');
      var isPerson = fname.indexOf('_人') >= 0;
      var isProduct = fname.indexOf('_品') >= 0;
      if (!isPerson && !isProduct) {
        result.ignored.push(filename);
        return;
      }
      result.matched++;
      if (isPerson) result.person = filename;
      else if (isProduct) result.singles = [filename];
    });
    return result;
  }

  function classifyProducts(filenames) {
    var sourceFiles = (filenames || []).slice();
    var leftName = null;
    var rightName = null;
    var leftCount = 0;
    var rightCount = 0;
    var hasTwoPersonMarker = false;
    sourceFiles.forEach(function (filename) {
      var name = String(filename || '');
      if (/_PRODUCT_0[12]_.*\(人\)/u.test(name) ||
          /_PRODUCT_01_左配品(?:\(人\))?/u.test(name) ||
          /_PRODUCT_02_右配品(?:\(人\))?/u.test(name)) {
        hasTwoPersonMarker = true;
      }
      if (/_PRODUCT_01_左配品\(人\)\.(?:png|webp)$/iu.test(name)) { leftName = filename; leftCount++; }
      if (/_PRODUCT_02_右配品\(人\)\.(?:png|webp)$/iu.test(name)) { rightName = filename; rightCount++; }
    });

    if (hasTwoPersonMarker) {
      var validSingleOrPair = sourceFiles.length >= 1 && sourceFiles.length <= 2 &&
        leftCount <= 1 && rightCount <= 1 && (leftCount + rightCount) === sourceFiles.length &&
        (leftCount === 1 || rightCount === 1);
      return validSingleOrPair
        ? { type: 'two_persons', left: leftName, right: rightName, products: [], person: null, singles: [], ignored: [] }
        : { type: 'invalid_two_persons', left: leftName, right: rightName, products: [], person: null, singles: [], ignored: sourceFiles };
    }

    var pp = classifyPersonProductFiles(filenames);
    if (pp.matched) {
      return { type: 'person_product', person: pp.person, singles: pp.singles, products: [], ignored: pp.ignored };
    }
    return {
      type: 'three_products',
      person: null,
      singles: [],
      products: orderProductsByEditorSlots(filenames),
      ignored: pp.ignored
    };
  }

  global.BNAssetClassifier = {
    sortLogos: sortLogos,
    orderProductsByEditorSlots: orderProductsByEditorSlots,
    classifyPersonProductFiles: classifyPersonProductFiles,
    classifyProducts: classifyProducts
  };
})(window);
