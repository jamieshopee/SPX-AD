(function (global) {
  if (global.BNProductSlotUtils && global.BNProductSlotUtils.detectProductPosition) return;

  var ROLE_PATTERNS = [
    { pattern: '_主品', position: 0 },
    { pattern: '_左配品', position: 1 },
    { pattern: '_右配品', position: 2 },
  ];

  function stripExtension(filename) {
    return String(filename || '').replace(/\.[^.]+$/, '');
  }

  function detectProductPosition(filename) {
    var base = stripExtension(filename);
    for (var i = 0; i < ROLE_PATTERNS.length; i++) {
      if (base.indexOf(ROLE_PATTERNS[i].pattern) >= 0) return ROLE_PATTERNS[i].position;
    }
    var match = base.match(/_0?([123])$/);
    return match ? parseInt(match[1], 10) - 1 : null;
  }

  global.BNProductSlotUtils = global.BNProductSlotUtils || {};
  global.BNProductSlotUtils.detectProductPosition = detectProductPosition;
})(window);
