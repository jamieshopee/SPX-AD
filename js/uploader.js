(function (global) {
  'use strict';

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('沒有選取檔案'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (event) { resolve(event.target.result); };
      reader.onerror = function () { reject(reader.error || new Error('圖片讀取失敗')); };
      reader.readAsDataURL(file);
    });
  }

  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('沒有選取檔案'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (event) { resolve(event.target.result); };
      reader.onerror = function () { reject(reader.error || new Error('檔案讀取失敗')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  global.ADUploader = {
    readAsDataURL: readAsDataURL,
    readAsText: readAsText
  };
})(window);
