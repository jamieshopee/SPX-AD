(function (global) {
  if (global.BNQrCodeUrl && global.BNQrCodeUrl.normalize) return;

  // QR Code 網址驗證／正規化。
  // 依據 docs/proposals/QR-Code-Product-Proposal.md「網址驗證」章節：
  //   - 自動 Trim 前後空白。
  //   - 若輸入未含 Protocol，自動補上 https:// 後再驗證。
  //   - 不限制網域／是否縮網址／是否帶參數／網址類型，只需為合法網址即可。
  // normalize() 回傳補完後的完整字串（輸入框回寫、QRCode 產生、Project State
  // 儲存、檢查網址連結四處都共用這個回傳值，確保一致）；
  // 空字串回傳 null（視為「未輸入」）；非法網址回傳 null（視為「非法」）。
  // 呼叫端需自行分辨「原始輸入是否為空」來區分「空值」與「非法」兩種狀態
  // （Product Proposal 對這兩種狀態的訊息文案雖然相同，但語意不同）。

  function normalize(raw) {
    var trimmed = String(raw == null ? '' : raw).trim();
    if (!trimmed) return null;
    // 內部仍含空白字元（例如「not a valid url」）一律視為非法：合法網址不會
    // 含未編碼的空白，但部分瀏覽器的 URL 建構子會把空白靜默轉成 %20，
    // 導致明顯不是網址的文字被誤判為合法，這裡先擋掉。
    if (/\s/.test(trimmed)) return null;
    var candidate = trimmed;
    if (!/:\/\//.test(candidate)) candidate = 'https://' + candidate;
    var url;
    try {
      url = new URL(candidate);
    } catch (error) {
      return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  }

  function validate(raw) {
    return normalize(raw) !== null;
  }

  function isEmpty(raw) {
    return String(raw == null ? '' : raw).trim() === '';
  }

  global.BNQrCodeUrl = {
    normalize: normalize,
    validate: validate,
    isEmpty: isEmpty
  };
})(window);
