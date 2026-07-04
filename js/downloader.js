(function (global) {
  'use strict';

  function clickUrl(url, fileName, revoke) {
    var link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      if (revoke) URL.revokeObjectURL(url);
      link.remove();
    }, 2000);
  }

  function downloadBlob(blob, fileName) {
    clickUrl(URL.createObjectURL(blob), fileName, true);
  }

  function downloadJson(data, fileName) {
    var json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    downloadBlob(new Blob([json], {type: 'application/json;charset=utf-8'}), fileName);
  }

  function dataUrlToBlob(dataUrl) {
    var parts = String(dataUrl || '').split(',');
    var mime = ((parts[0] || '').match(/^data:([^;]+)/) || [])[1] || 'application/octet-stream';
    var raw = atob(parts[1] || '');
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], {type: mime});
  }

  global.ADDownloader = {
    downloadBlob: downloadBlob,
    downloadJson: downloadJson,
    dataUrlToBlob: dataUrlToBlob
  };
})(window);
