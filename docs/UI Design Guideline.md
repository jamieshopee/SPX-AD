# UI Design Guideline

Version: 2026.07.01-s  
Last Updated: 2026-07-01  
Scope: 控制台 UI、互動、視覺語言與 Template / Style 命名規範。

## What's New

- 控制台 UI 文件同步 Template + Style 架構。
- 新增目前控制台架構圖。
- 明確定義 Template = 排版，Style = 背景 / 資訊圖 / 文字顏色。
- 補上 `template.json`、`styles/`、`backgrounds/`、`info/` 命名規範。
- 初始狀態、匯入 CSV、匯入暫存與重設工作區 UI 狀態需保持一致。

## Table of Contents

1. [控制台架構圖](#控制台架構圖)
2. [Template / Style UI 原則](#template--style-ui-原則)
3. [命名規範](#命名規範)
4. [Header](#header)
5. [Left Panel](#left-panel)
6. [Canvas](#canvas)
7. [Right Panel](#right-panel)
8. [Dialog](#dialog)
9. [Button](#button)
10. [Typography](#typography)
11. [Spacing](#spacing)
12. [Color](#color)
13. [Interaction](#interaction)
14. [Empty State](#empty-state)
15. [UI 原則](#ui-原則)

## 控制台架構圖

```text
Header
  ↓
Workspace
  ├─ Left Panel: jobs + thumbnails
  ├─ Canvas Panel: toolbar + preview iframe
  └─ Right Panel: text + assets + download actions
        ↓
Project State
        ↓
canvas.html Render Engine
```

## Template / Style UI 原則

```text
Template
  ↓
排版結構
  ↓
位置 / 尺寸 / 圖層 / Logo / 商品 / Person / SingleProduct

Style
  ↓
視覺樣式
  ↓
背景 / 資訊圖 / 文字顏色
```

UI 上 Template 與 Style 是兩個概念：

- Template 欄位顯示目前排版結構。
- Style 下拉顯示目前視覺樣式。
- 切換 Style 不應讓使用者誤以為換了排版。
- Style 切換不得清除素材、文字或 transform。

## 命名規範

Template：

```text
templates/{size}/template.json
```

Style：

```text
templates/{size}/styles/{styleId}.json
例如 styles/01.json 到 styles/16.json
```

背景：

```text
assets/source/{size}/backgrounds/bg_01.png
```

資訊圖：

```text
assets/source/{size}/info/info_01.png
```

UI 文案應使用「Template / Style / 樣式」，避免使用需要使用者理解內部編號的舊詞。

## Header

Header 放品牌、主要匯入操作與狀態 Badge。Badge 使用一致高度、圓角、字級、padding、間距與 status dot。

常駐 Badge 僅顯示必要狀態：

- 已套用文字
- 素材資料夾狀態
- CSV 工單狀態

匯入暫存是一次性動作，不顯示常駐 Badge，可用 toast 或短暫狀態提示。

## Left Panel

工單列表顯示 job 編號、主標、副標與 thumbnail。縮圖顯示優先序：

1. `job.thumbnail`
2. `job.quickThumbnail`
3. placeholder / loading

Active 狀態使用藍色外框與深色底。切換工單時不得造成 Canvas 閃爍。

## Canvas

Toolbar 顯示：

- 版位
- Template
- Style

尺寸 Badge 不顯示，避免與版位名稱重複。Canvas 實際輸出尺寸仍由 Template 控制。

## Right Panel

文字欄位固定在上方。Logo、商品圖、1人＋1品使用 Accordion。

Accordion 規則：

- 收合只影響 UI 顯示，不改變資料。
- 互鎖 disabled 狀態仍依素材模式判斷。
- 切換工單時依該工單模式套用預設展開。

恢復預設位置按鈕放在對應素材區塊內：

- 商品圖區塊：重設三商品。
- 1人＋1品區塊：只重設 SingleProduct。

## Dialog

Confirm、Success、Danger dialog 維持深色 Apple / Figma 風格。可關閉 dialog 應支援：

- 圓形 X icon
- ESC
- 必要時背景點擊

危險操作必須先確認，例如重設工作區。

## Button

- Primary：主要動作。
- Secondary：一般操作與下載。
- Danger：重設工作區。
- Disabled：降低對比並禁止互動。
- Icon Button：固定尺寸，需有 hover/focus 狀態。

按鈕成功後不應長期改文字；長期狀態應放 Badge 或狀態列。

## Typography

控制台全域 UI font-family：

```css
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
"PingFang TC",
"Microsoft JhengHei",
"Noto Sans TC",
system-ui,
sans-serif
```

Canvas Banner 成品字體不受控制台 UI 字體影響。Banner 文字字型依 Template / Canvas runtime 設定。

## Spacing

區塊間距以 8px 倍數為主。右側 Accordion 區塊間距需清楚，避免上傳區、列表與按鈕擠在一起。

## Color

- Primary：系統藍。
- Success：綠。
- Warning：黃橘。
- Danger：紅。
- Neutral：深色灰階。

避免增加多餘裝飾色。狀態色只用於可操作或可判讀的狀態。

## Interaction

Hover、Focus、Disabled、Loading 狀態需一致。

重要互動規則：

- CSV 匯入後 UI 進入全新工作區。
- 匯入暫存後立即顯示縮圖與已保存狀態。
- Style 切換不得造成 Canvas 閃爍或清除素材。
- Toast 用於一次性成功提示。

## Empty State

初始狀態：

- 不顯示已套用文字。
- 不顯示素材 Badge。
- 不顯示 CSV Badge。
- 版位顯示「請先匯入 CSV」。
- Template 與 Style 顯示 `—`。
- 左側無工單。
- Canvas 回到空白或初始提示。

## UI 原則

- 維持 Apple / Figma 風格。
- 減少重複資訊。
- 狀態要清楚，尤其是 CSV 新工作區與暫存恢復工作區。
- 操作流程保持簡潔。
- UI 不應暴露使用者不需要理解的內部架構。
- 控制台 UI 與 Canvas 成品視覺需分離。
