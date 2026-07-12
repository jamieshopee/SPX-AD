# Photoshop Automation — Product Proposal

Version: 2026-07-11-freeze-01
Status: **Proposal Freeze.** Product Proposal / Proposal Audit complete. Not yet Implementation Proposal, not yet Coding.
Branch: `feature/photoshop-automation`
Depends on: `v0.4.5` (Review Workspace UI Upgrade, Locked Completed Phase)
Blocks: AI Workflow (`docs/proposals/AI-Workflow-Proposal.md`), which remains Draft / Paused pending this Phase.

This document is the frozen record of the Photoshop Automation Product Proposal, produced after Proposal Audit (two rounds) found no remaining Blocking Issues. It is a documentation artifact of decisions already made in conversation — it does not introduce, change, or reinterpret any decision. Implementation Proposal has not started.

---

## 1. Status

- Product Proposal: Complete.
- Proposal Audit: Complete (two rounds; all Blocking Issues from Round 1 resolved in Round 2).
- Proposal Freeze: **Done.**
- Proposal Revision: Complete（Revision 02）.
- Implementation Proposal: Not started.
- Coding: Not started.
- Current Active Phase per `docs/AI-HANDOFF.md`: Photoshop Automation (Proposal).

Follow-up not covered by this document: after Documentation Update for this Phase, the existing "Ready Check 未通過時才能顯示 Photoshop 名稱" wording in `docs/AI-HANDOFF.md`, `docs/Architecture.md`, `docs/SPX-AD-版型規格與操作說明.md`, and `docs/UI Design Guideline.md` needs to be reconciled with the Processing Notice decision in Section 15 (see note there). That reconciliation is out of scope for this file and is not performed here.

## 2. Background

Today, going from raw assets to processed assets is a fully manual, human-driven pipeline (confirmed by the Current Photoshop Pipeline Architecture Audit):

```text
Control Center builds photoshop-job-manifest.json (in-memory, download is just the last step)
  ↓ (user manually)
double-click tools/photoshop/run-photoshop-manifest.command
  ↓ (user manually picks 3 things: manifest / original folder / output folder)
run-photoshop-manifest.applescript
  ↓
tell application "Adobe Photoshop" ... do javascript
  ↓
remove-background.jsx (one-shot batch script, ends when the manifest's items are done)
  ↓
processed PNG + photoshop-run-report.json
  ↓ (user manually)
Control Center "匯入處理結果" → showDirectoryPicker() → importProcessedAssets()
```

There is no watcher, daemon, Node helper, native messaging host, Ready Check, heartbeat, or automatic trigger/detection anywhere in this pipeline today. AI Workflow (the next Planned Phase) depends on this manual handoff being automated first — that is the reason Photoshop Automation exists as its own, prerequisite Phase.

## 3. Goals

- Define a stable Ready / Execute / Status contract between the Control Center side (AI Workflow) and the Photoshop side (Photoshop Automation), so AI Workflow can later automate the handoff without needing to know how Photoshop Automation is implemented internally.
- Preserve the existing, already-Completed Manifest and Processed Folder Matching contracts exactly as they are (`{assetKey}__processed.png`, existing `buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest` / `importProcessedAssets`); Photoshop Automation must fit into these, not replace them.
- Let the user open Photoshop once, and after a Ready Check passes, not need to operate Photoshop again until told otherwise (e.g., unexpected close).
- Reuse the existing removal-background core (`remove-background.jsx`) rather than reimplementing it.

## 4. Non-Goals (this Phase)

- Not auto-installing, auto-launching, or auto-closing Photoshop.
- Not implementing Control Center UI, Processing Mode UI, the Manifest Builder, auto-import, auto-matching, or auto-opening Review Workspace — these belong to AI Workflow.
- Not redesigning Review Workspace, Navigator, Dynamic Inspector, Decision Area, Completion Screen, Crop, Eraser, Canvas, Thumbnail, Batch, Project State schema, Review Decision Model, or Approved Asset Resolver.
- Not deciding the concrete Runtime Health Detection mechanism (heartbeat, timeout, watcher, or otherwise) — that is deferred to Implementation Proposal.
- Not introducing a new "active asset folder" concept — this Proposal uses the existing project term "素材資料夾" throughout.

## 5. Product Flow

This is the user-visible flow this Phase's Contract must support once AI Workflow (a separate, dependent Phase) wires it in. Photoshop Automation itself has no UI; this flow is shown for context only.

```text
使用者先自行開啟 Photoshop
  ↓
匯入 CSV
  ↓
選擇素材資料夾
  ↓
Ready Check
  ├─ Not Ready → 顯示「請先開啟 Photoshop」/「重新檢查」（保留 CSV / 素材資料夾 / 目前設定）
  └─ Ready → Execution Accepted → Running（Processing Mode，Control Center 鎖定）
       ↓
     ├─ Completed
     │    ↓
     │  AI Workflow：Auto Import Processed Assets
     │    ↓
     │  Auto Open Review Workspace
     │
     └─ Partial Failure / Failure
          ↓
        AI Workflow：依 Failure Result 決定 Recovery / Retry / 下一步 Workflow
```

使用者不需要：匯出 Manifest、執行 Runner、選擇輸出資料夾、匯入 Processed Folder、點擊「開啟素材審核」、或在完成後再按下一步（此描述僅適用 Completed 路徑）。

Photoshop Automation 只 Detect / Report；AI Workflow 負責 UI、Recovery、Retry 與下一步 Workflow。Failure / Partial Failure 不得被視為必定 Auto Import 或必定 Auto Open Review Workspace。Partial Failure 的實際 UX（例如是否局部帶入已成功素材）本 Proposal 尚未決定，留待 Implementation Proposal。

## 6. Architecture

```text
AI Workflow（Control Center 端 Orchestration，另一個 Phase，依賴此 Phase）
  │  Manifest Builder → 決定 output.filename（既有 assetKey-based 契約）
  ▼
Photoshop Automation ↔ AI Workflow Interface（Ready / Execute / Status）
  ▼
Photoshop Automation（本 Phase）
  │  Ready Contract → Execution Contract → Status Contract
  ▼
既有 remove-background.jsx 去背核心（沿用，不重寫）
  ▼
Processed Assets（素材資料夾/Processed/）+ Run Report
```

Photoshop Automation 是一個獨立、只透過三個 Interface（Ready / Execute / Status）對外溝通的能力單元；它不知道也不需要知道呼叫它的是誰。AI Workflow 是唯一的呼叫方，但這個 Contract 本身不假設呼叫方是誰。

## 7. Responsibility Boundary

Photoshop Automation 只負責：

- Ready Contract
- Execution Contract
- Status Contract

Photoshop Automation 不負責：Control Center UI、Processing Mode UI、Manifest Builder、Auto Import、Auto Matching、Auto Open Review Workspace（詳見第 23 節 Out of Scope 完整清單）。

AI Workflow 負責建立 Manifest；Photoshop Automation 只接收 Manifest 並執行，不建立、不修改 Manifest 內容。

## 8. Photoshop Automation ↔ AI Workflow Interface

Photoshop Automation 只對外提供：

- `Ready`
- `Execute`
- `Status`

AI Workflow 只依賴這三個 Interface，不依賴 Photoshop Automation 的內部實作方式。

## 9. Runtime Boundary

Photoshop Automation 只知道：

- Manifest
- Original Assets
- Processed Assets
- Progress
- Status
- Run Report

Photoshop Automation 不得知道：

- Control Center
- Project State
- Asset Pipeline State
- Review Workspace
- Review Decision
- Approved Asset Resolver
- Canvas
- Thumbnail
- Batch
- `layoutState`
- `layoutStates`
- Template
- Style
- Render Context

## 10. Ready Contract

Photoshop Automation 提供 `Ready` 查詢，回報已由使用者開啟的 Photoshop 是否已準備好接收工作。觸發時機見第 18 節；失敗時的復原流程見第 20 節。

## 11. Execution Contract

```text
AI Workflow
  ↓
Manifest Builder（既有 buildPhotoshopJobManifest / buildPhotoshopRerunManifest）
  ↓
決定 output.filename（沿用既有 assetKey-based 命名契約：{assetKey}__processed.png）
  ↓
Photoshop Automation
  ↓
依 Manifest 指定的 output.filename 輸出
```

- 最終輸出檔名由 Manifest 的 `output.filename` 決定，沿用既有 assetKey-based 命名契約，不是原始檔名換副檔名。
- Photoshop Automation 不負責命名，也不自行產生任何命名規則；它只讀 Manifest、依 Manifest 指定的檔名輸出。
- 這個決定明確保留現有已完成的 Processed Folder Matching Contract（`extractAssetKeyFromProcessedFilename` / `importProcessedAssets`）不被推翻。

## 12. Status Contract

Photoshop Automation 回報以下四種狀態：

- `Running` — 必須附帶 Progress：`{ current, total }`（例如 18 / 63，不顯示百分比）。
- `Completed`
- `Partial Failure`
- `Failure` — 必須附帶 Reason。

## 13. Runtime Health Detection

Running 期間必須具備偵測 Photoshop 是否仍存活的能力，作為觸發第 19 節「Photoshop Unexpected Close」提示的依據。

具體實作機制（Watcher、Heartbeat、Timeout 或其他方式）留待 Implementation Proposal 決定，本 Proposal 不先指定方案（見第 22 節）。

**Runtime Health Detection 僅負責偵測與回報，不負責自動重新啟動 Photoshop。**

## 14. Execution Lifecycle

```text
Idle
  ↓
Ready Check
  ├─ Not Ready → 回到 Idle，等待重新檢查
  └─ Ready
       ↓
     Execution Accepted
       ↓
     Running（期間收到新的 Execute → 一律 Reject，不排隊、不取代目前 Execution）
       ├─ Completed → Release → Idle
       ├─ Partial Failure → Release → Idle
       └─ Failure → Release → Idle
```

### Release Contract

Release 只代表：

- 結束本次 Execution。
- 釋放目前 Execution 的佔用狀態。
- 回到可接受下一次 `Execute` 的 Idle 狀態。

Release 不代表：

- 關閉 Photoshop。
- 保留 Project State。
- 保留上一份 Manifest。
- 保留上一個 Workflow。

## 15. Processing Mode

Processing Mode 期間，Control Center 完全鎖定。使用者不得：

- 匯入 CSV
- 匯入暫存
- 選擇或更換素材資料夾
- 切換工單
- 修改文字
- 更換素材
- 切換 Style
- 下載
- 開啟素材審閱
- 開始新的 Workflow
- 關閉 Processing Mode

目前不提供取消功能。

Processing Notice（維持不變）：

```text
素材處理中
請勿操作 Photoshop，
系統將自動完成背景處理。
完成後將自動帶入素材審閱。
```

Progress 顯示「18 / 63」，不顯示百分比；更新頻率由 Implementation Proposal 依效能決定。

> 註：Processing Notice 中顯示 Photoshop 名稱，是 Jamie 已確認的新產品決策。目前既有文件中「只有 Ready Check 未通過時才能顯示 Photoshop 名稱」的描述，將在之後正式 Documentation Update 階段一併同步修正；本文件不修改其他文件。

## 16. Asset Contract

### Original Asset

接受：PNG、JPG / JPEG、WEBP。

### Processed Asset

全部輸出 PNG。

### Naming Contract

見第 11 節 Execution Contract：Photoshop Automation 不負責命名，最終輸出檔名由 Manifest 的 `output.filename` 決定，沿用既有 assetKey-based 命名契約。

### Processed Folder Contract

固定為：

```text
素材資料夾/
└── Processed/
```

`Processed/` 由 Photoshop Automation 自動建立。

### Cleanup Strategy

- `Processed/` 不清空。
- 同名 PNG 直接覆蓋。
- 不同檔案保留。
- 不建立 Run001、Run002 等版本資料夾。
- 不自動清理。

### Processed Folder Scope

每一個素材資料夾都有自己的 `Processed/`。不同素材資料夾之間不共用 `Processed/`。

### Asset Folder Lock

Processing Mode 期間，素材資料夾不得更動，包括：

- 不新增素材
- 不刪除素材
- 不重新命名素材
- 不移動素材
- 不更換素材資料夾
- 不修改 `Processed/` 內容

## 17. Asset Replacement Boundary

Photoshop Automation 只處理：

- 第一批素材
- Needs Rerun

如果使用者之後需要更換素材：

- 使用者自行完成去背。
- 使用控制台右側既有素材欄置換。

**置換後不重新觸發 Photoshop Automation，也不改變目前 Workflow。**

## 18. Ready Check Timing

Ready Check 只在以下時機執行：

- 第一次素材處理
- Needs Rerun

每一次新的 Execution 都必須重新 Ready Check。

Ready Check 不在開啟 SPX AD 時檢查。流程固定為：

```text
匯入 CSV
  ↓
選擇素材資料夾
  ↓
Ready Check
```

## 19. Photoshop Unexpected Close

如果 Photoshop 未開啟、執行中被關閉或當掉，顯示：

```text
Photoshop 已關閉。
請重新開啟 Photoshop。
開啟後按「重新檢查」即可繼續。
```

由第 13 節 Runtime Health Detection 觸發判斷。

## 20. Ready Check Recovery

Ready Check Failure 時保留：

- CSV
- 素材資料夾
- 目前所有設定

使用者只需：

- 開啟或重新開啟 Photoshop
- 按「重新檢查」

即可繼續，不需要重新選擇 CSV 或素材資料夾。

## 21. Failure Boundary

Photoshop Automation：

- Detect
- Report
- 回報 Failure Reason

AI Workflow：

- UI
- Recovery
- Retry
- 下一步 Workflow

Photoshop Automation 不負責：

- Retry 次數
- Retry UI
- Error Dialog
- Navigation
- 自動重新啟動 Photoshop

## 22. Runtime Components（Proposal Only / 尚未 Freeze 技術方案）

以下目前只屬於 Proposal 討論方向，**尚未 Freeze**，不得寫成已確定實作：

- Watcher
- Heartbeat
- Runtime Folder（固定路徑以外的其他實作細節）
- Ready Contract Runtime

實際採用哪一種（或哪一種組合）留待 Implementation Proposal 決定。

## 23. Out of Scope

Photoshop Automation 不負責：

- 自動安裝 Photoshop
- 自動開啟 Photoshop
- 自動關閉 Photoshop
- Control Center UI
- Processing Mode UI 實作
- Manifest Builder
- Auto Import
- Auto Matching
- Auto Open Review Workspace
- Review Workspace UI
- Navigator
- Dynamic Inspector
- Decision Area
- Completion Screen
- Crop
- Eraser
- Canvas
- Thumbnail
- Batch
- Project State schema
- Review Decision Model
- Approved Asset Resolver
- `layoutState`
- `layoutStates`

---

## Boundaries Reaffirmed

Per `docs/AI-HANDOFF.md` and `docs/DOCUMENTATION.md`:

- Locked Completed Phases (CSV, Photoshop Pipeline, Review Workspace, Review Workspace（Crop / Eraser）, Review Workspace UX Polish, Control Center UI Upgrade, Photoshop Rerun Automation, Approved Asset Resolver, Main Canvas / Thumbnail use processed asset, Batch Approved Assets, Render Context, Master + Style, Project State, Project Persistence, Smart Layout Propagation, Review Workspace UI Upgrade) are not redesigned by this Proposal.
- The existing Manifest schema, Photoshop Adapter Boundary, and Processed Folder Matching contract (`{assetKey}__processed.png`) are preserved unchanged, per Section 11.
- Any future extension touching the existing "控制台不新增 native bridge、local helper 或 protocol handler" boundary text still requires explicit Jamie approval at Implementation Proposal time; this Proposal does not resolve that boundary, it only defines the Contract that any eventual mechanism must satisfy.
- AI Workflow remains Draft / Paused pending this Phase's completion (Coding + Browser Validation + Jamie Manual Validation), per `docs/proposals/AI-Workflow-Proposal.md`.
