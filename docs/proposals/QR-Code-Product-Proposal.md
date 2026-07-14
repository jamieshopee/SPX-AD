# QR Code Product Proposal（Proposal Freeze）

## 功能目的

每個 Job 擁有一組 QR Code。
QRCode 由 CSV 的 `QRCode` 網址自動產生。
使用者可於控制台修改網址。
系統依網址重新產生 QR Code。
不使用使用者自行準備的 QR Code 圖片。

---

## Library

使用：
- soldair/node-qrcode

授權：
- MIT License
- 免費
- 可商業使用
- Browser 原生支援

---

## CSV

新增固定欄位：
QRCode
內容為網址。
每個 Job 可不同。

---

## 控制台右側欄

順序固定：
1. 主標
2. 副標
3. 小字
4. QRCode
5. Logo
6. 素材（商品、人物等）

---

## QRCode 區塊

包含：
- QRCode 標題
- 網址輸入框
- 檢查網址連結
- 狀態訊息

不提供：
- QR Code 縮圖
- 位置資訊
- 尺寸資訊
- 比例資訊
- 拖曳
- 縮放
- 旋轉
- 樣式設定

---

## 檢查網址連結

合法網址：
- 可點擊。
- 使用預設瀏覽器開啟。

空值：
- 停用。

非法網址：
- 停用。

---

## 網址驗證

系統：
- 自動 Trim 前後空白。
- 若輸入未含 Protocol（例如 shopee.tw、www.shopee.tw），自動補上 https:// 後再驗證。
- 補完後同步更新輸入框內容。
- Project State 儲存補完後的網址。
- QRCode 與「檢查網址連結」皆使用補完後的網址。

不限制：
- 網域
- 是否縮網址
- 是否帶參數
- 網址類型

只需為合法網址即可。

建議優先使用縮網址，以提升 QR Code 掃描辨識率。
但不限制網址類型。

---

## 更新時機

以下皆會驗證：
- 貼上網址（自動套用）
- Enter
- 失焦

---

## 狀態訊息

成功更新（合法網址且與目前不同）：
✓ QR Code 已更新

網址未變更（網址相同）：
目前網址未變更

已移除（清空網址）：
✓ QR Code 已移除

無有效網址（空值或非法網址）：
⚠ 請輸入有效的網址（例如：https://example.com）

所有狀態訊息：
- 固定顯示於輸入框下方。
- 不使用 Toast。
- 不自動消失。
- 修改內容後重新判定。
- 狀態訊息區固定保留於輸入框下方（版面固定佔位）。
- 有狀態時顯示訊息。
- 沒有狀態時保持空白。

---

## CSV 初始載入

合法網址：
- 自動產生 QR Code。
- 不顯示狀態訊息。

空值：
- 不顯示 QR Code。
- 顯示：
  ⚠ 請輸入有效的網址（例如：https://example.com）

非法網址：
- 不顯示 QR Code。
- 顯示：
  ⚠ 請輸入有效的網址（例如：https://example.com）

---

## 匯入

合法：
- 正常產生 QR Code。

空值：
- 不顯示 QR Code。

非法：
- 僅影響該 Job。
- Banner 正常 Render。
- 不影響其他 Job。

---

## Template

每個尺寸固定：
- X
- Y
- Width
- Height

不可：
- 拖曳
- 縮放
- 旋轉

QRCode 圖層固定位於 Info 圖層上方。

---

## Visual Baseline（Locked）

984×309
X：880
Y：183
W：85
H：85

1080×1920
X：46
Y：1667
W：165
H：165

1599×1080
X：82
Y：808
W：175
H：175

3189×3992
X：151
Y：3213
W：500
H：500

以上尺寸皆包含：
- Quiet Zone
- 黑碼

不得重新調整。

---

## 外觀

固定：
- 黑碼
- 白底

QRCode 固定使用 Error Correction Level：M。
不提供使用者調整。

---

## Project State

保存：
- 每個 Job 最後修改後網址。

重新匯入暫存：
- 維持最後修改內容。

---

## Export

QR Code 與主標、副標、小字相同。

合法網址：
- 預覽顯示。
- 匯出顯示。

空值或非法網址：
- 不顯示 QR Code。
