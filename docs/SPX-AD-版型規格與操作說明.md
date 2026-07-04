# SPX AD 版型規格與操作說明

Version: 2026.07.01-s  
Last Updated: 2026-07-01  
Scope: Banner 版型結構、Style 視覺樣式、素材命名與 Template 參數規格。

## What's New

- 四個尺寸皆採用 `template.json` + `styles/01.json`～`styles/16.json`。
- Template 只保存排版結構。
- Style 只保存背景、資訊圖與文字顏色。
- Source assets 統一放在 `backgrounds/` 與 `info/`。
- 商品角色命名支援 `_主品/_左配品/_右配品`，並相容 `_01/_02/_03`。

## Table of Contents

1. [四個尺寸](#四個尺寸)
2. [Template](#template)
3. [Style](#style)
4. [Style JSON 格式](#style-json-格式)
5. [素材路徑](#素材路徑)
6. [Logo](#logo)
7. [文字](#文字)
8. [三商品](#三商品)
9. [1人＋1品](#1人1品)
10. [商品角色命名](#商品角色命名)
11. [Template 參數](#template-參數)
12. [新增 Style](#新增-style)

## 四個尺寸

| 尺寸 | Template | Style |
|---|---|---|
| `984x309` | `templates/984x309/template.json` | `templates/984x309/styles/` |
| `1080x1920` | `templates/1080x1920/template.json` | `templates/1080x1920/styles/` |
| `1599x1080` | `templates/1599x1080/template.json` | `templates/1599x1080/styles/` |
| `3189x3992` | `templates/3189x3992/template.json` | `templates/3189x3992/styles/` |

## Template

Template 是排版結構，固定檔名：

```text
templates/{size}/template.json
```

Template 負責：

- Canvas 寬高
- 文字位置與尺寸
- Logo 區域
- 三商品區域
- Person 區域
- SingleProduct 區域
- 圖層順序
- `sizeRatios`
- `layoutMode`
- `autoShadow`
- baseline / transform 初始排版設定

Template 不負責背景圖、資訊圖、文字顏色，也不保存使用者手動拖曳、縮放、旋轉後的狀態。

## Style

Style 是視覺樣式，固定路徑：

```text
templates/{size}/styles/{styleId}.json
```

Style 負責：

- 背景圖
- 資訊圖
- 主標顏色
- 副標顏色
- 小字顏色

Style 不可覆寫座標、尺寸、Logo、商品、Person、SingleProduct 或 transform。

## Style JSON 格式

```json
{
  "id": "01",
  "name": "樣式 01",
  "background": "assets/source/1599x1080/backgrounds/bg_01.png",
  "infoGraphic": "assets/source/1599x1080/info/info_01.png",
  "headlineColor": "#ffffff",
  "subHeadlineColor": "#ffffff",
  "smallTextColor": "#ffffff"
}
```

目前欄位對應：

- 主標：`headlineColor`
- 副標：`subHeadlineColor`
- 小字：`smallTextColor`

若未來改為 `colors` 物件，對應為：

- `colors.headline`
- `colors.subHeadline`
- `colors.smallText`

## 素材路徑

背景：

```text
assets/source/{size}/backgrounds/bg_01.png
...
assets/source/{size}/backgrounds/bg_16.png
```

資訊圖：

```text
assets/source/{size}/info/info_01.png
...
assets/source/{size}/info/info_16.png
```

對位參考圖：

```text
assets/source/{size}/guide_品.png
assets/source/{size}/guide_1人1品.png
```

## Logo

Logo 最多 3 張，依 `LOGO_01 / LOGO_02 / LOGO_03` 排序。上傳後會做白底裁切，實際位置與尺寸由 Template 的 Logo 區域控制。

## 文字

主標、小字使用 `ShopeeNotoSans(content)-Medium.ttf`，`fontWeight: 400`。副標依 Template 設定。文字位置、尺寸與行高由 Template 控制；文字顏色由 Style 控制。

## 三商品

三商品 position 定義固定：

- position 0：主品，中間最大
- position 1：左配品
- position 2：右配品

視覺排列由 `layout-runtime.js` 依 Template 控制。使用者可拖曳、縮放、旋轉，也可以恢復預設位置。恢復預設位置會清除 user transform，重新套用 Template 初始排版。

## 1人＋1品

Person：

- 由 Template 的 `person.fitWidth` 控制。
- 不支援手動 transform。

SingleProduct：

- 初始尺寸由 `singleProduct.maxWidth / maxHeight` 控制。
- 是否加陰影由 `singleProduct.autoShadow` 控制。
- 支援拖曳、縮放、旋轉與恢復預設位置。

## 商品角色命名

商品角色判斷只由 `js/product-slot-utils.js` 處理。

優先語意命名：

- `_主品` → position 0
- `_左配品` → position 1
- `_右配品` → position 2

相容命名：

- `_01 / _1` → position 0
- `_02 / _2` → position 1
- `_03 / _3` → position 2

無指定商品依上傳順序補剩餘空位。

## Template 參數

- `width / height`：Canvas 實際輸出尺寸。
- `logo`：Logo 區域與排列設定。
- `text`：主標、副標、小字區域。
- `products`：三商品區域。
- `person.fitWidth`：人物初始寬度。
- `singleProduct.maxWidth / maxHeight`：單品初始最大尺寸。
- `singleProduct.autoShadow`：單品是否套陰影。
- `sizeRatios`：三商品比例，例如 `[1, 0.85, 0.72]`。
- `autoShadow`：三商品是否自動套陰影。
- `baselineRatio`：商品陰影與底部基準。
- `layoutMode`：商品排列模式。
- `sourceAssets`：對位參考圖路徑。

## 新增 Style

新增第 17 個 Style 時，需新增：

```text
assets/source/{size}/backgrounds/bg_17.png
assets/source/{size}/info/info_17.png
templates/{size}/styles/17.json
```

新增 Style 不需要修改 Template。若 Style 清單來自 config，需同步更新 config 或產生器，讓控制台知道新增的 style id。
