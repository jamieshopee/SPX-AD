(function (global) {
  if (global.BNAssetResolver && global.BNAssetResolver.createResolver) return;

  function createResolver(options) {
    options = options || {};
    var approvedMap = options.approvedMap || {};
    var lookupOriginal = typeof options.lookupOriginal === 'function'
      ? options.lookupOriginal
      : function () { return null; };

    return {
      resolve: function (filename) {
        var approved = approvedMap[filename] || approvedMap[String(filename || '').trim().toLowerCase()] || null;
        return approved || lookupOriginal(filename);
      },
      hasApproved: function (filename) {
        return !!(approvedMap[filename] || approvedMap[String(filename || '').trim().toLowerCase()]);
      }
    };
  }

  global.BNAssetResolver = {
    createResolver: createResolver
  };
})(window);
