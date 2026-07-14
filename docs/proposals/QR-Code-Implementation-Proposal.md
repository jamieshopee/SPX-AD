# QR Code — Implementation Proposal

Version: 2026-07-14-impl-02
狀態：Jamie 已確認整體無誤，僅要求修正 Library 共用方案（第 8、10、11 節），修正後即開始 Coding
依據：`docs/proposals/QR-Code-Product-Proposal.md`（Proposal Freeze Final，不可修改，本文件僅補充「怎麼做」，不重新定義「做什麼」）

本文件涵蓋範圍與 Product Proposal 完全一致，不新增功能、不擴大需求。若本文件與 Product Proposal 有任何不一致，以 Product Proposal 為準，本文件需修正。

---

## 1. 現況調查（Grounding，供對照）

- 現有「主標／副標／小字」三個文字欄位的完整資料流已存在，可作為 QRCode 欄位的實作模板：
  - DOM：`index.html` 第 216-221 行，`<section>` 內 `#field-headline`／`#field-subheadline`／`#field-disclaimer`，區塊結尾是「套用文字到模板」按鈕（`#apply-record`），緊接著就是 `#sidebar-scroll`（Logo／商品圖／1人+1品 由 `bn-editor-plugin.js` 動態注入的位置）。QRCode 區塊要插入在 `</section>`（第 221 行）之後、`#sidebar-scroll`（第 224 行）之前，順序上剛好落在「小字」與「Logo」之間，符合 Product Proposal 的順序規則。
  - CSV 欄位別名對照：`src/app.js` 第 794-798 行 `FIELD_ALIASES`（`headline`／`subheadline`／`disclaimer`）。
  - Job 物件欄位：`src/app.js` 第 2189 行 `createJob()`、第 2204-2206 行。
  - Project State 序列化：`src/app.js` 第 3556-3573 行 `serializeJobBase()`。
  - Project State 還原：`src/app.js` 第 3880-3990 行 `importState()`。
  - 文字套用（`sendRecord`，`src/app.js` 第 840-857 行）：這是「套用文字到模板」按鈕的實作，只處理 `headline`／`subheadline`／`disclaimer`。Product Proposal 已明確裁定 QRCode 不屬於這個按鈕的套用範圍，本文件不變動 `sendRecord()`。
- 現有「Logo」資料流是 QRCode 影像產生／套用到畫布這部分最接近的實作模板：
  - `src/app.js` 第 2456-2483 行 `applyLogosToCanvas()`：清空狀態 → 組出 payload → 送 `postMessage` 到 canvas iframe。
  - 差異：Logo 是從「使用者上傳的檔案」讀取＋trim；QRCode 是「用網址即時產生」，不需要 `getHandle`／檔案來源，改用 `tools/qrcode-demo/qrcode.js`（已驗證的 `soldair/node-qrcode`）的 `QRCode.toDataURL(url, options, callback)` 直接產生 data URL。
- 範本圖層與座標基準：
  - `templates/{size}/template.json` 內 `layerOrder` 物件（例如 `1080x1920/template.json` 第 226-236 行）目前定義：`background:1, smallText:13, subText:14, mainText:15, logo:18, singleProduct:21, person:22, products:23, info:47`。`info` 對應的就是 `canvas.infoStyle`（`js/canvas-entry.js` 第 76-79 行，`id="下方資訊"` 的 `<img>`，畫的是範本背景既有的靜態資訊圖，內含現有那張畫死的 QR 圖）。Product Proposal 規則「QRCode 圖層固定位於 Info 圖層上方」在數值上即為：QRCode 的 `zIndex` 必須大於 `47`（本文件建議訂為 `48`，各尺寸一致）。
  - Product Proposal 的 4 組 Visual Baseline（984×309／1080×1920／1599×1080／3189×3992）與現有 `templates/` 下實際存在的 4 個尺寸資料夾一致，可直接對應到各自 `template.json`。

---

## 2. Non-Goals（重申 Product Proposal，不重複列出全部，僅提醒實作時容易誤做的地方）

- 不做拖曳／縮放／旋轉、不做縮圖預覽、不做樣式設定——實作時 QRCode 的 DOM 節點**不掛任何 drag handler**，與商品圖／Logo 的做法（`setupProdDrag` 等）完全脫鉤。
- 不綁定「套用文字到模板」按鈕。
- 不限制網址格式（只做「合法 URL」層級的檢查），不做網域白名單、不做偵測是否為縮網址。
- 不因為網址長，就限制輸入或跳出額外警告——Product Proposal 已定案「不限制、只建議」，實作時**不得**額外加上字數限制或警告文案。

---

## 3. 資料模型

### 3.1 CSV 欄位

`src/app.js` 第 794-798 行 `FIELD_ALIASES` 新增一筆：

```js
qrCodeUrl: ['QRCode'],
```

固定只認 `QRCode` 這個欄名（Product Proposal 未提供其他別名，不自行擴充別名清單）。

### 3.2 Job 物件

`createJob()`（`src/app.js` 第 2189 行起）新增欄位：

```js
qrCodeUrl: data.qrCodeUrl || '',
```

### 3.3 Project State

- `serializeJobBase()`（第 3556-3573 行）新增：`qrCodeUrl: job.qrCodeUrl || ''`。
- `importState()`（第 3880 行起）還原 job 時新增：`qrCodeUrl: saved.qrCodeUrl || ''`。
- Schema version：Project State 目前為 `version: 5`（見 `buildProjectState`）。新增欄位屬於向下相容的擴充（舊檔案沒有這欄，`|| ''` 即為空值，等同「未輸入」），**不需要**升版號。

---

## 4. Template Schema 擴充

每個 `templates/{size}/template.json` 新增一個 `qrZone` 區塊（沿用 `logo`／`productZones` 的既有寫法慣例），並在 `layerOrder` 補上 `qrCode: 48`。

以 `1080x1920/template.json` 為例（依 Product Proposal Visual Baseline：X46 Y1667 W165 H165）：

```json
"qrZone": {
  "className": "QRCode範圍",
  "style": {
    "position": "absolute",
    "left": "46px",
    "top": "1667px",
    "width": "165px",
    "height": "165px",
    "zIndex": "48",
    "pointerEvents": "none"
  }
},
```

```json
"layerOrder": {
  ...既有欄位不動...,
  "qrCode": 48
}
```

四個尺寸依 Product Proposal 鎖定的座標分別填入：

| 尺寸 | X | Y | W | H |
|---|---|---|---|---|
| 984×309 | 880 | 183 | 85 | 85 |
| 1080×1920 | 46 | 1667 | 165 | 165 |
| 1599×1080 | 82 | 808 | 175 | 175 |
| 3189×3992 | 151 | 3213 | 500 | 500 |

`pointerEvents: none`：QRCode 不可拖曳/縮放/旋轉，比照 `person` 區塊（`js/canvas-entry.js` 第 88 行 `zone.style.pointerEvents = 'none'`）的做法，直接讓整個區域不接收滑鼠事件，不需要額外寫「禁止拖曳」的判斷邏輯。

---

## 5. Canvas 渲染（`js/canvas-entry.js` + `js/layout-runtime.js`）

`js/canvas-entry.js`（`buildBase()`，第 62-91 行）新增一個 QRCode 的 `<img>` 節點，比照 `下方資訊`／`bn-zone-person` 的建立方式：

```js
var qr = document.createElement('img');
qr.id = 'bn-qrcode';
qr.alt = '';
applyStyle(qr, (template.qrZone || {}).style || {});
qr.style.display = 'none';
canvas.appendChild(qr);
```

新增 `postMessage` 型別 `bn-qrcode-set`／`bn-qrcode-clear`，由 `js/layout-runtime.js`（比照現有 `bn-logos`／`bn-person-add` 等 message handler 的寫法）接收：

```js
if (e.data.type === 'bn-qrcode-set') {
  var qr = document.getElementById('bn-qrcode');
  if (qr) { qr.src = e.data.src; qr.style.display = 'block'; }
  return;
}
if (e.data.type === 'bn-qrcode-clear') {
  var qr = document.getElementById('bn-qrcode');
  if (qr) { qr.style.display = 'none'; qr.removeAttribute('src'); }
  return;
}
```

沒有位置/大小相關的訊息欄位（`position`／`sizeScale`／`ratio` 等一律不傳），因為位置與大小完全由 `template.json` 的 `qrZone.style` 固定，不接受動態覆蓋。

---

## 6. 網址驗證與正規化（新模組 `js/qrcode-url-utils.js`）

獨立成一個小工具模組（不寫進 `src/app.js` 主檔，維持既有專案「工具函式拆檔」的慣例，比照 `js/asset-classifier.js` 等），對外提供：

```js
window.BNQrCodeUrl = {
  normalize(raw)   // trim → 補 protocol（若缺）→ 回傳補完後字串；若補完後仍非合法 URL，回傳 null
  validate(raw)    // 回傳 normalize() 後是否為合法 http/https URL（boolean）
};
```

`normalize()` 邏輯（對應 Product Proposal「網址驗證」章節）：

1. `trim()` 前後空白。
2. 空字串 → 回傳 `null`（視為「未輸入」，非「非法」）。
3. 若字串不含 `://`，補上 `https://` 再嘗試 `new URL()`。
4. `new URL()` 失敗，或 protocol 不是 `http:`／`https:` → 回傳 `null`（非法）。
5. 成功 → 回傳補完後的完整字串（供輸入框回寫、QRCode 產生、Project State 儲存、檢查網址連結四處共用同一個值，滿足 Product Proposal 「一致性」規則）。

---

## 7. 右側欄 UI（`index.html` + `src/app.js`）

### 7.1 HTML（插入於 `index.html` 第 221 行 `</section>` 之後、第 224 行 `#sidebar-scroll` 之前）

```html
<section class="ctrl-section" id="qrcode-section">
  <label class="ctrl-label">
    <span class="ctrl-label-text">QRCode</span>
    <input id="field-qrcode-url" type="text" placeholder="https://example.com">
  </label>
  <a id="qrcode-check-link" href="#" target="_blank" rel="noopener" class="qrcode-check-link">檢查網址連結</a>
  <div id="qrcode-status" class="qrcode-status" aria-live="polite"></div>
</section>
```

- `qrcode-status` 常駐於輸入框下方（對應 Product Proposal 補充規則：狀態訊息區固定佔位、無狀態時留空），不用 Toast、不用計時自動消失的元件。
- `qrcode-check-link` 平時渲染成 `<a>` 但用 `pointer-events:none` + `aria-disabled` 表示停用狀態（空值／非法網址時），避免用 `disabled` 屬性（`<a>` 標籤沒有原生 `disabled`）。

### 7.2 JS（`src/app.js`）

新增：

```js
el.qrCodeUrlInput = document.querySelector('#field-qrcode-url');
el.qrCodeCheckLink = document.querySelector('#qrcode-check-link');
el.qrCodeStatus = document.querySelector('#qrcode-status');
```

新增函式 `handleQrCodeUrlCommit(rawValue)`（由 `paste`／`keydown Enter`／`blur` 三個事件呼叫，對應 Product Proposal「更新時機」）：

1. 取得目前 job 的 `job.qrCodeUrl`（比對用的「目前值」）。
2. `BNQrCodeUrl.normalize(rawValue)`。
3. 依結果分四種狀態，對照 Product Proposal「狀態訊息」章節逐一比對文案：
   - 合法且與 `job.qrCodeUrl` 不同 → 更新 `job.qrCodeUrl`、輸入框回寫正規化後的值、產生 QRCode、`檢查網址連結` 啟用並指向正規化後的網址、狀態文字「✓ QR Code 已更新」。
   - 合法且與 `job.qrCodeUrl` 相同 → 不重新產生 QRCode（已經是目前內容）、狀態文字「目前網址未變更」。
   - 空值（原本 `job.qrCodeUrl` 非空） → 清空 `job.qrCodeUrl`、移除畫布 QRCode（送 `bn-qrcode-clear`）、`檢查網址連結` 停用、狀態文字「✓ QR Code 已移除」。
   - 非法（含空值但原本就是空值的情況，例如 CSV 載入時就是空值） → 不產生 QRCode、`檢查網址連結` 停用、狀態文字「⚠ 請輸入有效的網址（例如：https://example.com）」。

`fillFields()`／`selectJob()` 切換工單時，需要同步呼叫一次「依目前 `job.qrCodeUrl` 更新畫面」的邏輯（輸入框內容、狀態文字、檢查連結），對應 Product Proposal「CSV 初始載入」規則：合法靜默套用、空值或非法顯示提示文字，但**這個顯示動作本身不算使用者操作**，不觸發「✓ 已更新」這類只在使用者主動編輯後才出現的文案。

---

## 8. 匯入（CSV）與畫布套用

`applyProductsToCanvas`／`applyLogosToCanvas` 之外，新增 `applyQrCodeToCanvas(job)`：

1. `BNQrCodeUrl.normalize(job.qrCodeUrl)`。
2. 合法 → `QRCode.toDataURL(url, { errorCorrectionLevel: 'M', color: { dark: '#000000ff', light: '#ffffffff' } })` 產生 data URL → `postMessage({type:'bn-qrcode-set', src})`。
3. 空值或非法 → `postMessage({type:'bn-qrcode-clear'})`。

呼叫時機比照 `applyLogosToCanvas`／`applyProductsToCanvas`：`selectJob()`／`selectTemplate()`／`selectPlacement()` 內的畫布重建流程，以及 CSV 匯入完成、專案暫存匯入完成之後。

Library 檔案：**不複製**，正式程式與 `tools/qrcode-demo/` 共用同一份已驗證的 `soldair/node-qrcode`（`tools/qrcode-demo/qrcode.js` ＋ `tools/qrcode-demo/LICENSE`），避免兩份檔案版本不同步。`index.html` 直接以現有相對路徑引入：

```html
<script src="tools/qrcode-demo/qrcode.js"></script>
```

`tools/qrcode-demo/` 本身維持原樣（demo 頁面、`main.js`、`style.css` 不變），只是這份 `qrcode.js`／`LICENSE` 從「demo 專用」變成「demo 與正式程式共用」，日後若要升級/替換 library 版本，只需要改這一份檔案。

---

## 9. 匯出（`renderSingleJob` / 批次下載 / 下載單張暫存）

- `renderSingleJob()`（`src/app.js` 第 3350 行起）目前的載入順序是：Logo → 商品圖 → `layoutState` 套用 → 截圖。新增一步：商品圖之後、截圖之前，呼叫 `applyQrCodeToCanvas(job)`（用被 render 的那個 `job`，不是 `activeJob()`，比照現有商品圖/Logo 呼叫方式）。
- `cloneJobForExport()`（本輪 Bug Fix B 剛修好的函式）不需要改動：QRCode 不透過 `_embeddedAssets` 機制，而是直接存在 `job.qrCodeUrl` 這個字串欄位裡，本來就會被 `{...job}` 展開帶走，匯出/暫存下載天生正確，沒有「即時畫布 vs 工單資料」不同步的問題（這正是 Product Proposal 選擇「網址驅動、即時產生」而非「使用者準備好的圖片」的好處，不會重蹈 Bug Fix B/C 的覆轍）。
- 下載單張圖檔（`downloadCurrentBanner()`，直接截圖）：不需要改動，QRCode 只要正確畫到 canvas 上，截圖自然正確。

---

## 10. 待確認事項（技術命名/實作細節，非產品規則，僅供你過目）

以下是我在寫本文件時做的**命名/實作選擇**，不影響 Product Proposal 已鎖定的任何規則，但列出來讓你知道，如果有更想要的命名可以在 Coding 前告訴我，否則我會照本文件的寫法實作：

- 新工具模組檔名：`js/qrcode-url-utils.js`（放驗證/正規化邏輯）。
- Library 檔案路徑：正式程式與 `tools/qrcode-demo/` 共用同一份 `tools/qrcode-demo/qrcode.js`（＋`LICENSE`），不複製、不另存一份。
- `postMessage` 訊息型別命名：`bn-qrcode-set` / `bn-qrcode-clear`。
- 畫布 DOM id：`bn-qrcode`。
- `layerOrder.qrCode` 數值：`48`（僅需大於現有最大值 `info: 47`，沒有其他限制）。

---

## 11. 下一步

待你確認本文件（含第 10 節的命名選擇）無誤後，才會開始 Coding。Coding 順序建議：
1. Template Schema（4 個 `template.json` 加 `qrZone` + `layerOrder`）。
2. `js/qrcode-url-utils.js`（驗證邏輯，可獨立寫單元測試）。
3. `index.html` 掛上 `tools/qrcode-demo/qrcode.js`（共用既有檔案，不新增/複製檔案）。
4. `js/canvas-entry.js` + `js/layout-runtime.js`（畫布端 DOM + message handler）。
5. `src/app.js`（CSV 欄位、Job 欄位、Project State、右側欄 UI 邏輯、`applyQrCodeToCanvas`、`renderSingleJob` 掛載點）。
6. `index.html`（右側欄 HTML）。
7. 逐步 Browser Validation（CSV 載入、手動編輯四種狀態、切換工單、下載單張暫存、下載完整專案、四個尺寸座標比對）。
