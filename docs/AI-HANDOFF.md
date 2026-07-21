# AI-HANDOFF.md

此文件是給 ChatGPT、Claude、Codex 或其他 AI 接手本專案前閱讀的交接文件。它不是 README、Architecture 或 CHANGELOG 的替代品，而是協助 AI 在修改程式前快速理解目前穩定邊界與協作規則。

任何 AI 開始修改程式前，請先閱讀本文件，再搭配 README、Architecture、控制台開發指引、CHANGELOG 與 Photoshop Asset Pipeline 文件確認目前狀態。

## 1. 專案目的

本專案是 SPX AD 電子版位管理器，用於從 CSV 與素材資料夾產生多尺寸、多版型的 Banner / AD 視覺稿。

主要工作流程：

```text
CSV / Project State
  ↓
選擇素材資料夾
  ↓
控制台分類與管理素材
  ↓
Canvas Render
  ↓
Preview / Thumbnail / PNG / ZIP
```

控制台角色：

- 管理 CSV jobs、素材、style、template、thumbnail、下載與暫存。
- 保存與恢復 Project State。
- 接收 Canvas 回傳的 layoutStates。
- 呼叫 Asset Pipeline、Review Workspace 與 Photoshop manifest export。

Template 系統：

- Template 保存排版結構、區域、尺寸、初始 layout 與 transform 預設。
- Style 保存背景、資訊圖與文字色。
- 使用者調整後的版面不寫回 Template，而是保存於 job 的 layoutStates。

Photoshop Pipeline 角色：

- Photoshop Pipeline 只負責素材處理。
- Photoshop Adapter 可依 manifest 批次輸出 processed assets。
- Review Workspace 可檢視 processed assets 並標記 decision。
- Photoshop Pipeline 不直接控制 Canvas、不寫 layoutStates、不改 Render Engine。

AI Workflow 角色（已完成，macOS 與 Windows Development Validated；見下方 Current Status／Locked Completed Phases）：

- AI Workflow 是 Control Center 與 Photoshop Automation Runtime 之間的自動化 Orchestration 層。
- 使用者只需先自行開啟 Photoshop，匯入 CSV、選一次素材資料夾；Ready Check 通過後不需要再操作 Photoshop，也不需要理解 Manifest、Runtime、Processed Folder 等技術細節。
- 自動建立並送出 Manifest、鎖定 Control Center（Processing Mode）、輪詢狀態、自動寫回 Processed／ 並 Import、自動開啟既有 Review Workspace；Rerun 使用同一套資料流。
- 失敗時提供對應復原流程（Ready Check 失敗、Execute 失敗、上傳失敗、Status Polling 失敗、寫入失敗、Matching 失敗、Review 開啟失敗），不假裝成功、不重跑已成功的部分。
- AI Workflow 不直接控制 Canvas、不寫 layoutStates、不改 Render Engine，不重新設計 Review Workspace UI、Navigator、Dynamic Inspector、Decision Area 或 Completion Screen。

## 2. 目前完成度（Current Status）

目前最新穩定 Git Tag：

```text
v0.5.5
```

目前分支：

```text
main
```

已完成：

- Core Editor：控制台、Canvas preview、CSV jobs、素材帶入、下載 PNG / ZIP。
- Template System：Template 與 Style 分離，Template 作為排版結構來源。
- Asset Pipeline Phase 2A：assetPipeline state、assetKey、manifest export、processed folder import。
- Photoshop Adapter Phase 2B：Photoshop manifest runner、remove background prototype、run report。
- Review Workspace Phase 2C：processed assets 檢視與 approved / needs_rerun decision。
- Review Workspace UX Polish：Auto Next、Multi-pass Review、Review Progress Header、Smart Entry、Keyboard Shortcuts、Decision Guard、Remove Drag Tool。
- Batch ZIP：下載完整專案逐 Job 輸出同 basename 的 PNG／version 5 single-state JSON 配對；不再輸出單一 Project JSON 或素材子資料夾。
- Phase 2D-2C：Batch Approved Assets，Batch ZIP export 已使用 approved processed assets。
- Project State：single-state.json / project-state.json 的既有 schema 與匯入相容保留；目前下載完整專案只輸出逐 Job single-state JSON。
- Project State Phase：Completed。Project State v4 保存 Asset Pipeline metadata 與 Review decision，已達成可恢復工作區核心目標。
- Project Persistence：Project State v5、single-state restore 與既有 legacy project.zip import 相容已完成。Download Complete Project 目前將每個成功 Job 輸出為 PNG／single-state JSON 配對，每份 JSON 可由既有「匯入暫存」獨立還原，不需要另外保存素材資料夾或 processed folder。
- Control Center UI Upgrade：Header 已簡化為一般使用者入口，隱藏 Photoshop / Manifest / Processed Folder 等技術術語，版位下拉只調整 display order。
- Thumbnail Boundary：左側 Job List 已移除縮圖 UI，且一般操作不再排程或生成只供該列表使用的 quickThumbnail／active thumbnail／hidden iframe thumbnail；Project State thumbnail 欄位與 import 相容仍保留，不得誤認為整套 Thumbnail 系統已刪除。功能 Commit `b67604b`，Browser Validation 與 Jamie Manual Validation PASS。下載單張暫存及目前下載完整專案內逐 Job single-state JSON 均不輸出 `jobs[].thumbnail`。
- Download Complete Project：功能 Commit `d16ffaa64d1bdae98bf76972de4077e0d2e92375`（`feat: export per-job state in project zip`）。ZIP 根目錄只包含每個成功 Job 同 basename 的 PNG／version 5 single-state JSON 配對；不再輸出單一 Project JSON，亦不建立 Assets、Processed、Thumbnail、Hidden、Manifest 或其他子資料夾。PNG／JSON 取自同一次 Canvas transaction；單一 Job 失敗不留下殘缺配對，完成或取消後恢復原 active Job。Browser Validation 與 Jamie Manual Validation PASS。
- Single-state export：Bug Fix Commit `2c7dca06146b414ec23f29df94d190d8d09d457d`（`fix: remove thumbnail from single state export`）。`exportSingleState()` 的 JSON 不含 `jobs[].thumbnail`，檔名與單張 PNG 使用相同 basename 並改為 `.json`；`assets.*[].dataUrl`、processed asset data、`layoutState`／`layoutStates`、手動換圖、Crop、Eraser、Shadow 及其他還原資料不變。只修改 single-state 最終輸出，未修改共用 serializer、Project State schema、匯入、完整專案、Batch 或單張 PNG。Browser Validation 與 Jamie Manual Validation PASS，Browser Console errors 0。
- Job List 鍵盤導航：功能 Commit `b6d2b8f41015d56f1fd207dcba1145b40ede96ca`（`feat: add keyboard job navigation`）。一般控制台以 `ArrowUp`／`ArrowDown` 依 `jobs` array 順序呼叫既有 `selectJob()`，首尾不循環；active Card 只調整 `el.jobList.scrollTop`。輸入控制項、Main Canvas iframe、Modal、Editor、Review Workspace、Crop／Eraser等模式均保留 guard；素材審核選單開啟時仍可導航，按鈕取得焦點時則由 button guard 阻止。原有 Escape 與其他快捷鍵不變。Browser Console errors 0，Browser Validation、`node --check`、`git diff --check` 與 Jamie Manual Validation PASS。不得擴大為快捷鍵系統或新增快捷鍵設定。
- LayoutState Restore：依 `placementId|templateId` 保存與恢復 transform。
- Product identity restore by filename：三商品 restore 使用 `id → filename → position`。
- Approved Asset Resolver：Main Canvas / Thumbnail / Batch 共用 `BNAssetResolver` 與 Render Context。
- 手動換圖跨 Job 保留：Bug Fix Commit `4ff252f`。Products／Person／Single Product 同檔名手動換圖會寫入該 Job 的 runtime-only `_manualRenderState`；切回 Job 時先完成既有 Approved processed → original asset payload，再 overlay 手動 render source，最後照原順序套用 `layoutStates`。三商品 `applyProductsToCanvas()` 固定綁定 `job`／`loadSeq`／`frameWindow`，stale render 不得寫入 `_bnProducts` 或送 `bn-product-add`。Browser Validation 與 Jamie Manual Validation PASS；不得把此 state 擴大成 Project Persistence schema、source manager 或第二套 layout state。
- Upload Panel stale hint rendering：UI Bug Fix Commit `e44f65879e3140ba87ecb4c49f5171d291d5e98d`。Products／1人＋1品提示文字容器移除後，`updateMutualExclusion()` 的舊 `nextElementSibling` lookup 曾分別命中 `#bn-prod-list` 與 Reset button，令 `textContent` 覆寫商品排序 UI 與「恢復預設位置」文字。修正只刪除失效的 `prodHint`／`ppHint` lookup、文字與顏色寫入；商品排序、角色判斷、Upload、Reset、雙向互斥與 Architecture 均不變。Browser Validation 與 Jamie Manual Validation PASS；不得重新加入依 sibling 位置推定提示容器的寫入。
- Review Workspace UI Upgrade：Navigator 只顯示檔名、Review Status、Dirty Status；Review Summary 與 Filter（全部素材／待重新去背／去背失敗）移至 Navigator 上方；Workspace 預設 Navigator + Workspace，Inspector 預設收合，點選裁切或橡皮擦才展開 Dynamic Inspector，儲存或取消後收合；Header 僅保留素材審閱／關閉；底部 Decision Area 三顆按鈕同列（核准 / 重新去背 / 撤回上一個決策），去背失敗素材則以提示文字取代三顆按鈕；新增 Completion Screen 與 Completion Recovery；Review Workspace 正式 UI 中文化。詳見 CHANGELOG v0.4.5 與去背失敗獨立分類 Bug Fix（詳見 CHANGELOG）。
- Photoshop Automation：完成 SPX AD Runtime（`tools/photoshop-automation/spx_ad_runtime.py`，Python stdlib-only）、Platform Adapter Architecture、macOS Adapter（AppleScript／osascript，以 bundle id `com.adobe.Photoshop` 判斷 Ready，不依賴易變動的 process 名稱）與 Windows Adapter（pywin32／`win32com.client`，已完成實作與 Windows 實機驗證，見下方 Validation Status）。Ready / Execution / Status / Results Contract 已定案並實作，Runtime Workspace 隱藏、自動管理、具備 Pending Execution Timeout 與 stale Workspace 清理。
- AI Workflow：完成 Ready Check、Manifest Send + Processing Mode、Status Polling + Auto Import、Auto Open Review Workspace、Rerun Workflow、Error / Recovery Hardening。macOS Development End-to-End Manual Validation 全數 18 項 PASS（見下方 Validation Status）；Windows Development Validation 與 Jamie Manual Validation 亦已 PASS。
- SPX Helper Core：完成正式 localhost 邊界（`127.0.0.1:8901`）、正式 GitHub Pages Origin Validation、CORS／OPTIONS、固定 port 單一實例邊界與既有 RuntimeCore Integration，功能 Commit `9a71794`。macOS／Windows Jamie Manual Validation 已完成；其外層 Product Host lifecycle 已由下列 Phase 1 Foundation 完成。
- SPX Helper Runtime Productization — Phase 1 Foundation：完成正式 Product Host、Running／Working／Attention、單一 Helper Instance、固定 Tray／Menu Bar、Open SPX BN Generator、About、Version、Restart 與 Quit，功能 Commit `51c4828`（`feat: add SPX Helper product foundation`）。Browser／Platform Validation 與 Jamie Manual Validation 均 PASS。Phase 1 未修改 SPX Helper Core、Runtime Contract、Browser API 或 Frontend；Windows Installer／Startup 與 macOS Packaging 已分別由 Phase 2、Phase 3 完成。
- SPX Helper Runtime Productization — Phase 2 Windows Packaging：完成 PyInstaller executable bundle 與 WiX Toolset SDK 5.0.2 per-machine MSI，包含 Fresh Install、安裝後立即啟動、Login Startup、Start Menu、Apps & Features 與 Windows validation，功能 Commit `9240504`（`feat: add Phase 2 Windows packaging`）。Windows Packaging configuration、Product Foundation 與 Jamie Manual Validation 均 PASS；正式流程 GitHub Pages → SPX Helper → Photoshop → Processed PNG 已於 Windows 實機完成。未修改 Helper Core、Runtime Contract、Browser API、Frontend 或 Photoshop Automation。
- SPX Helper Runtime Productization — Phase 3 macOS Packaging：**Completed**。功能 Commit `ee55dd527a00361f1155ba45713ff2ce3957b06c`（`feat: add Phase 3 macOS packaging`）新增 PyInstaller `SPX Helper.app` 與正式 macOS PKG build pipeline，安裝到 `/Applications/SPX Helper.app`，並以 `/Library/LaunchAgents/com.spxad.helper.plist` 提供 `RunAtLoad = true`、不使用 `KeepAlive` 的 Login Startup。macOS Packaging Static Validation、local app／PKG Build Validation、Install Validation 與 Jamie Manual Validation 均 PASS；Developer ID Application signing、Developer ID Installer signing 與 Apple Notarization 因缺少有效 signing identities／notary credentials，仍是 Credential-dependent validation，不得宣稱 PASS。Product Host version 維持 `0.5.4`。
- Phase 3 macOS Packaging Bug Fix：Code Commit `781df79c232a9644cc0bd69653e390ef70d12964`（`fix: launch macOS helper through LaunchAgent`）。Root Cause 是 PKG `postinstall` 直接以 `/usr/bin/open` 啟動 Helper，令 Python `tempfile` cache PackageKit 的短生命週期 `PKInstallSandbox` temp path；Installer 清除 sandbox 後，`POST /execute` 於 `_create_workspace()`／`tempfile.mkdtemp()` 拋出 `FileNotFoundError` 並回傳 HTTP 400 `manifest_invalid`。修正後由既有 LaunchAgent bootstrap + 非強制 `kickstart` 啟動，不使用 `kickstart -k`，`RunAtLoad = true`、無 `KeepAlive`、Quit 與 Login Startup 行為不變。Clean Install 後 environment 不含 installer variables，正式 GitHub Pages → Helper → Photoshop → Processed PNG 與 Jamie Manual Validation 均 PASS。未修改 Windows Packaging 或任何 Helper Core／Runtime／Browser／Photoshop scope。
- QR Code：完成 Coding、Browser Validation 與 Jamie Manual Validation，功能 Commit `79de045`、Tag `v0.5.2`。每個 Job 依 CSV 的 `QRcode` 欄位網址自動產生 QR Code，並可於控制台右側欄手動修改；四個尺寸皆有 Locked Visual Baseline 固定座標，位置／大小不可調整。詳見下方「QR Code」章節與 `docs/Architecture.md`。

## Locked Completed Phases

以下 Phase 已正式完成，除非修正 Bug、使用者要求或 Architecture 明確改版，不得重新 Proposal、重新設計、重新命名或推翻既有架構。

Completed：

- CSV
- Photoshop Pipeline
- Review Workspace
- Approved Asset Resolver
- Main Canvas & Thumbnail use processed asset
- Batch Approved Assets
- Render Context
- Master + Style
- Project State
- Smart Layout Propagation
- Review Workspace（Crop / Eraser）
- Photoshop Rerun Automation
- Review Workspace UX Polish
- Project Persistence
- UI Upgrade（Control Center UI Upgrade + Review Workspace UI Upgrade）
- Photoshop Automation（Runtime／Platform Adapter／macOS Adapter／Windows Adapter；macOS 與 Windows Development Validated）
- AI Workflow（Control Center Orchestration；macOS Development Manual Validation 18/18 PASS）
- Render Context & Export Workflow（Batch Render 輸出 placement／template 統一改用控制台目前選擇的 `activePlacement`／`activeTemplate`，並修正對應 layoutKey 計算；功能 Commit `2ac6546`、Tag `v0.5.1`。注意命名：此 Phase 與 Phase 2D-2B-2 已完成的「Render Context」（Thumbnail 共用 Render Context 概念）是兩個不同、皆已完成的項目，不得混用。）
- QR Code（每個 Job 依 CSV 的 `QRcode` 欄位網址自動產生 QR Code，可於控制台右側欄手動修改，四個尺寸皆有 Locked Visual Baseline 固定座標；功能 Commit `79de045`、Tag `v0.5.2`）
- SPX Helper Core（正式 localhost 邊界、Origin / CORS、單一實例邊界與既有 RuntimeCore Integration；功能 Commit `9a71794`；完整 Production Deployment lifecycle 不在此完成範圍）
- SPX Helper Runtime Productization — Phase 1 Foundation（Product Host、Running / Working / Attention、單一 Helper Instance、Tray / Menu Bar、Quit、Restart；功能 Commit `51c4828`）
- SPX Helper Runtime Productization — Phase 2 Windows Packaging（PyInstaller、WiX Toolset SDK 5.0.2 MSI、Fresh Install、Startup、Start Menu、Apps & Features、Windows Validation；功能 Commit `9240504`）
- SPX Helper Runtime Productization — Phase 3 macOS Packaging（PyInstaller `SPX Helper.app`、macOS PKG、Applications、LaunchAgent、Login Startup、Menu Bar、macOS Validation；功能 Commit `ee55dd527a00361f1155ba45713ff2ce3957b06c`；Developer ID／Notarization 為 Credential-dependent validation）

目前 Active Phase：

```text
Phase 4 — Update + Uninstall（Next；Not Started）
```

Photoshop Automation、AI Workflow、Render Context & Export Workflow、QR Code、SPX Helper Core，以及 Runtime Productization Phase 1 Foundation、Phase 2 Windows Packaging、Phase 3 macOS Packaging 均已完成。Phase 3 功能 Commit 為 `ee55dd527a00361f1155ba45713ff2ce3957b06c`；macOS local app／PKG build、Fresh Install、安裝後立即啟動、Menu Bar、Applications 手動啟動、Restart、Quit、Login Startup，以及 GitHub Pages → Helper → Photoshop → Processed PNG 均已實機 PASS。Branch 為 `main`，最新正式 Git Tag 為 `v0.5.5`，Product Host version 維持 `0.5.4`。下一步是 **Phase 4 — Update + Uninstall（Not Started）**；Phase 5 Final Validation 尚未開始。目前不宣稱支援所有 Photoshop 版本，也不宣稱 Developer ID／Notarization PASS。

### Phase 3 macOS Packaging Validation Status

- 正式產品資訊：Product Name `SPX Helper`、Bundle Identifier `com.spxad.helper`、Package Identifier `com.spxad.helper.pkg`、Product Version `0.5.4`、安裝位置 `/Applications/SPX Helper.app`。
- Login Startup：`/Library/LaunchAgents/com.spxad.helper.plist`，`RunAtLoad = true`，不使用 `KeepAlive`；Quit 後不在同一登入 Session 自動重啟。
- Static／Build／Install Validation：macOS Packaging Static Validation、local PyInstaller app build、local PKG build 與 local installation validation 全部 PASS。
- Jamie Manual Validation：Fresh Install、安裝後立即啟動、LaunchAgent、Package Receipt、Menu Bar、Running、Open SPX BN Generator、About、Version `0.5.4`、無 Dock Icon、無 Terminal Window、正式 GitHub Pages → Helper → Photoshop → Processed PNG、Restart、Quit、Login Startup 全部 PASS。Restart 與 Login 後均只有一個 Helper process 與一個 listener；Quit 後兩者均為 0。
- 安裝完成啟動 Bug Fix：Commit `781df79c232a9644cc0bd69653e390ef70d12964` 移除 `postinstall` 的 `/usr/bin/open`，改由 GUI user domain 的 LaunchAgent job `kickstart`。Clean Install 後 LaunchAgent 為 running、Helper process／listener 各一、`/ready` 200；Helper 使用存在的正常使用者 `TMPDIR`，不含 `PKInstallSandbox`、`INSTALLER_TEMP`、`INSTALLER_PAYLOAD_DIR`、`SCRIPT_NAME=postinstall` 或 installer `PWD`。Jamie 以 5 筆工單、22 個素材重新完成正式去背流程並產生 Processed PNG，結果 PASS。
- PKG relocation 修正：初次 Fresh Install 發現 PackageKit 將 App relocation 回 build staging；根因為 bundle relocation。component plist 改為 `RootRelativeBundlePath = Applications/SPX Helper.app` 與 `BundleIsRelocatable = false`，並在 staging App 保留的情況下重新驗證。最終 App 正確安裝至 `/Applications/SPX Helper.app`，relocation 不再發生，Fresh Install PASS。
- Credential-dependent validation：Developer ID Application signing、Developer ID Installer signing、Apple Notarization 尚未驗證，原因是目前機器沒有有效 signing identities／notary credentials。不得寫成正式簽署或 Notarization PASS。
- Scope Boundary：未修改 SPX Helper Core、Runtime Contract、HTTP API、Browser API、Frontend、GitHub Pages、Photoshop Automation、AI Workflow 或 Windows Packaging。

## AI Workflow / Photoshop Automation Validation Status

本節記錄目前的驗證範圍，避免與「Completed = 已通過完整驗收」混淆。

- **Unit Validation**：Runtime（`spx_ad_runtime.py`）、macOS Adapter、Windows Adapter、各 `js/ai-workflow-*.js` 模組、Review Workspace 修正，皆有對應的自動化單元測試（Node.js / Python，含真實模組整合測試），已於 Coding 過程中執行並全數 PASS。
- **Integration Validation**：Ready Check → Manifest → Execute → Status Polling → Auto Import → Auto Open Review、Rerun Workflow、Error / Recovery 各分支，皆以真實模組（非純 mock）串接驗證，已於 Coding 過程中執行並全數 PASS。
- **macOS Development Manual Validation（Jamie 實機驗收，Photoshop 2025）**：18 項全數 PASS。

  | Stage | 項目 | 結果 |
  |---|---|---|
  | 1 | Environment Validation | PASS |
  | 1 | Ready Check | PASS |
  | 1 | Photoshop 2025 實機辨識 | PASS |
  | 2 | First Run Happy Path | PASS |
  | 2 | Processing Notice（完整四行提示） | PASS |
  | 2 | Processed/ 寫入 | PASS |
  | 2 | basename + .png 命名 | PASS |
  | 2 | Auto Import | PASS |
  | 2 | Auto Open Review Workspace | PASS |
  | 2 | Review 圖片顯示 | PASS |
  | 3 | Rerun Happy Path | PASS |
  | 3 | Rerun Processing Notice | PASS |
  | 3 | 自動進入「待重新去背」 | PASS |
  | 3 | 自動顯示下一張素材 | PASS |
  | 3 | 不 Auto Approve | PASS |
  | 4 | Photoshop 未開啟 Recovery | PASS |
  | 4 | Photoshop 處理中關閉 Recovery | PASS |
  | 4 | Recovery 後重新處理與圖片恢復 | PASS |

  此驗證範圍明確限定為 **Development Validation**（本機 Development Runtime + 本機 Control Center，非 Production 打包版本）。已驗證 Photoshop 版本：**Photoshop 2025**。其他 Photoshop 版本尚未驗證，不得宣稱「不限版本」。

- **Windows Development Validation（Photoshop 2025）**：**PASS**。Jamie Manual Validation：**PASS**。Runtime 以 UTF-8 讀取共用 `remove-background.jsx`，以 `json.dumps()` 注入三個路徑參數，透過 `app.DoJavaScript(full_script)` 執行，並成功產生 `photoshop-run-report.json` 與 Processed PNG。`DoJavaScriptFile()` 已實機驗證失敗，不再採用。此驗證不包含 Production Launcher／PyInstaller／Cloud Deployment。

- **SPX Helper Manual Validation**：macOS 完成 Helper 啟動、Browser 通訊、Ready、Execute、`photoshop-run-report.json`、Processed PNG 與 Helper 重啟後再次 Execute，全部 PASS。Windows 完成 Helper 啟動、Browser 通訊、Ready、Execute、RuntimeCore、Windows Adapter、Runtime Contract 與 `photoshop-run-report.json`，全部 PASS。Windows 該次筆電的 Remove Background／Select Subject 失敗已定位於 Photoshop API 執行階段，非 Helper、RuntimeCore、Windows Adapter 或共用 JSX regression，另案處理。

- **SPX Helper Product Foundation Validation**：Browser／Platform Validation 與 Jamie Manual Validation 均 **PASS**。macOS Menu Bar、Running → Working → Running、正式 GitHub Pages、About、Version `0.5.4`、Working 警告、Restart、Quit 與既有 Photoshop Happy Path 全數通過。Restart 前 PID `6818`、Restart 後 PID `9905`，舊 Process 已停止，且只保留一個產品 Process 與一個 `127.0.0.1:8901` listener。

- **SPX Helper Phase 2 Windows Packaging Validation**：**PASS**。PyInstaller EXE、WiX Toolset SDK 5.0.2 MSI Build、MSI Install、背景常駐、System Tray、Running 狀態、正式 GitHub Pages → installed Helper → Photoshop → Processed PNG 全數通過。WiX v7 因 OSMF 不符合本專案不需額外付費的 Packaging 要求而未採用。

- **Known Issue — Windows Dialog 關閉事件異常**：Windows Information Dialog（Version／About）的 OK、Esc、X 無法完成關閉；同一 Windows 環境的 Installer Dialog 亦出現相同行為。目前不認定為 Packaging regression，不影響 Runtime、Browser API、Photoshop Automation 或正式去背流程，另案處理。未驗證的 MessageBox daemon-thread 修改已撤回，不包含於 Phase 2 Code Commit。


## Formal Development SOP

以下流程適用所有後續 Phase，不只單一特定 Phase：

```text
Product Proposal（ChatGPT）
↓
Proposal Freeze
↓
Proposal Audit（Codex / Claude）
↓
Proposal Revision（ChatGPT）
↓
Implementation Proposal（Codex）
↓
Coding（Codex）
↓
Browser Validation（Codex）
↓
Jamie Manual Validation
↓
Code Commit
↓
Documentation Update
↓
Documentation Validation
↓
Docs Commit
↓
Git Tag
↓
Next Phase / Next Branch / New ChatGPT Conversation
```

Proposal Audit 不是 Coding。Audit 階段只做技術可行性、Architecture / State Boundary、Locked Completed Phases 影響、Scope creep，以及 edge cases / Browser Validation risk 檢查。

在 Proposal Freeze 前，不得進入 Implementation Proposal。在 Proposal Audit PASS 或 Proposal Revision 完成前，不得 Coding。

角色分工：

- ChatGPT：Product Proposal、UX、Workflow、Information Architecture、Proposal Revision。
- Codex / Claude：Proposal Audit、Implementation Proposal、Coding、Browser Validation。
- Jamie：產品決策、Manual Validation、是否進入 commit / tag。

Browser Validation（Codex / Claude）不得只回覆 `PASS`。Report 至少必須包含 Test Environment、Test Scope、Test Cases（操作步驟 / 預期結果 / 實際結果 / PASS 或 FAIL）、Regression Validation、Known Issues 與 Final Result。若沒有已知問題，必須明確寫 `No Known Issues`。

Codex / Claude 不得要求 Jamie 協助完成 Browser Validation。Browser Validation 完成並提交 Report 後，才能交由 Jamie Manual Validation。

Jamie Manual Validation 是產品驗收，不是 Browser Validation。Jamie 驗收需回覆驗收項目、PASS / FAIL；若 FAIL，需描述 Issue 與重現方式。Jamie Manual Validation PASS 後，才能進入 Code Commit。

若 Proposal Audit 發現會影響 Locked Completed Phases，必須停止並回報，不得自行修改。


Before proposing any implementation：

AI 必須先確認：

1. 是否屬於目前 Active Phase。
2. 是否會修改 Locked Completed Phases。
3. 是否超出目前 Proposal 範圍。

若會影響 Locked Completed Phases：

- 停止 Proposal。
- 先向使用者說明原因。

## 3. 專案架構

主要入口與模組責任：

- `index.html`：控制台主入口，載入控制台 UI 與 app scripts。
- `src/app.js`：控制台 orchestration，管理 jobs、Project State、素材、thumbnail、download、pipeline UI 事件。
- `templates/`：Template 與 Style JSON，保存排版結構與視覺樣式。
- `js/layout-runtime.js`：Canvas runtime，負責素材 DOM、transform、layoutState collect / apply、capture。
- `js/asset-pipeline-state.js`：Asset Pipeline runtime state、assetKey、processed import、review decision。
- `js/asset-review-workspace.js`：Review Workspace modal，檢視 original / processed 並標記 decision。
- `tools/photoshop/`：Photoshop Adapter、AppleScript runner、ExtendScript、manifest contract test 與去背 prototype。
- `docs/`：專案架構、操作規格、開發規則、Pipeline 文件、CHANGELOG 與 AI handoff。

詳細架構請閱讀 `docs/Architecture.md`。本文件只保留 AI 接手需要的高層脈絡與邊界提醒。

## 4. State Boundary（非常重要）

State Boundary 是本專案最重要的穩定性規則。新增功能前，必須先確認不會跨界污染既有 state。

### Asset Pipeline

Asset Pipeline 只管理素材生命週期：

- original asset
- processed asset metadata
- review decision
- future approved asset mapping

Asset Pipeline 不管理 Canvas transform，不寫 layoutStates。

### Review Workspace

Review Workspace 只管理 processed result review decision：

- `approved`
- `needs_rerun`

Review Workspace 不接 Canvas、不改 Asset Payload、不寫 layoutStates、不觸發 Batch Render。Legacy `rejected` Project State 匯入時會 migration 為 `needs_rerun`。

### Photoshop Adapter

Photoshop Adapter 只讀 manifest 與原始素材，輸出 processed assets 與 run report。

Photoshop Adapter 不能：

- 讀寫 Project State
- 讀寫 layoutStates
- 操作 Canvas
- 決定 thumbnail 或 batch render 行為

### Canvas

Canvas 只負責 render、transform interaction、layoutState collect / apply 與 capture。

Canvas 不應理解 Photoshop 執行細節，也不應直接讀 processed folder 或 FileSystemHandle。

### layoutStates

layoutStates 只保存版面資訊：

- product / singleProduct 的位置
- 大小
- 旋轉
- zIndex / order
- per `placementId|templateId`

layoutStates 不保存 Photoshop job、review decision 或 processed asset runtime cache。

### Thumbnail

Thumbnail 是 render projection。

Thumbnail 可以讀指定 job 的素材、template、style、layoutStates，但不可污染或回寫 layoutStates。

左側 Job List 不顯示 thumbnail、placeholder、loading shimmer 或 thumbnail 內 validation dot，一般操作也不再執行只服務該列表的 Quick Thumbnail、Active Job Thumbnail capture、Hidden iframe Thumbnail Queue 或 Thumbnail DOM 更新。缺少素材的 validation panel 仍保留。完整專案／Batch 的正式 PNG thumbnail、Project State thumbnail 欄位與 import 相容仍是既有流程；下載單張暫存已停止 on-demand thumbnail capture，且 JSON 不再包含 `jobs[].thumbnail`，但真正的暫存與還原資料完整保留。鍵盤上下鍵切換 Job 已由獨立功能 Commit `b6d2b8f` 完成，並不依賴 Thumbnail 系統。

### Batch Render

Batch Render 讀取：

- 每筆 render job 自己的文字。
- 每筆 render job 自己的素材。
- 每筆 render job 自己的 approved processed assets。
- 每筆 render job 自己的 `styleId`（Style 不受 `activePlacement`／`activeTemplate` 影響）。
- 每筆 render job 自己的 `layoutStates` map。
- 控制台目前選擇的 `activePlacement`／`activeTemplate`，作為本次整批共用的輸出 placement／template（不讀各工單自己保存、可能已過期的 `job.placementId`／`job.template`）。
- 以 `activePlacement`／`activeTemplate` 計算的 layoutKey，從每筆 job 自己的 `layoutStates` 讀取對應的 layoutState。

（Bug Fix，2026-07-12，見 `docs/CHANGELOG.md`：下載完整專案 PNG 尺寸與 Project State / layoutState 不一致的修正；產品規格為一次生成器工作流程只有一種輸出尺寸，批次內所有工單共用控制台最後選擇的輸出 placement／template。）

Batch ZIP export 已使用 approved processed assets。Main Canvas / Thumbnail / Batch 共用 `BNAssetResolver` 與 Render Context。

Batch Render 是 read-only projection，不是 state owner。Batch 不可回寫 `layoutStates`、不可修改 Project State schema、不可覆蓋使用者 layoutState、不可因 iframe 重建改變商品身份，也不可修改 Main Canvas / Thumbnail 穩定邏輯。Batch 不得把 active job 的內容、素材或 transform 當成其他工單的來源；只有專案共用的 `activePlacement`／`activeTemplate` 可以作為整批輸出 placement／template。

三商品身份 restore 必須依：

```text
id
↓
filename
↓
position（最後 fallback）
```

### Project State

Project State 保存可恢復工作區所需資料。

Project State v4 可保存 Asset Pipeline metadata 與 Review decision，並已達成可恢復工作區核心目標，但不可保存 processed image dataUrl、FileSystemHandle、object URL、processedAssetIndex 或 runtime cache。FileSystemHandle、object URL、runtime image index、processed folder runtime cache 都只能存在 runtime。

匯入 v4 後若尚未重新 Import Processed Folder，approved processed asset 必須 fallback original；重新 Import Processed Folder 後，Main Canvas 可恢復 approved processed assets。Thumbnail refresh UX 為 Backlog，不阻擋下一階段。

### runtime cache

runtime cache 可用於目前 session 顯示或加速，但不可寫入 project-state。

例如：

- processed folder file handles
- object URLs
- hidden iframe runtime state
- thumbnail queue transient state

## Implementation Guardrails

### Preserve Existing State

若需求只是更新素材來源（例如 approved processed image）：

優先更新既有 Canvas DOM 的圖片來源（`img.src`）。

不要：

- 重建 Product DOM
- 重新 `applyProductsToCanvas()`
- 重新依 template 排版
- 重跑 template fit
- 重設 transform

所有圖片來源更新都應 Preserve：

- layoutState
- width / height
- position
- rotation
- zIndex
- filename identity

原則：

```text
Preserve Existing State > Rebuild DOM
```

若需要跨越此 Boundary，必須先提出 Proposal，不可直接修改。

### Minimal Change Principle

若需求可以透過局部更新完成，不得改用重建整個模組、DOM 或 Render Flow 的方式實作。

## 5. 開發原則（Development Rules）

- 小步修改，每次只處理一個明確問題。
- 一次只改一個功能，不把不同 Phase 混在同一輪。
- 不做大規模重構，除非使用者明確同意。
- 不修改已穩定功能，除非該功能就是本輪修正目標。
- 保持低耦合：Pipeline、Canvas、Project State、Thumbnail、Batch Render 分層清楚。
- 完成後更新 CHANGELOG。
- 重大版本或穩定節點才建立 Git Tag。
- 每完成一個功能先驗證，再進下一階段。
- 發現需要跨 Phase 修改時，先停止並回報原因。
- 優先保護 Main Canvas、layoutStates、Batch ZIP、Project State 匯入 / 匯出。

## 6. Git Version History

```text
v0.2-pipeline-contract
```

Initial Photoshop Pipeline Contract。建立 Asset Pipeline / Photoshop manifest 的基本契約，確認 manifest 不包含 layoutStates、transform、thumbnail 或 Canvas coordinates。

```text
v0.3.0
```

Photoshop Remove Background Prototype。Photoshop Adapter 可依 manifest 批次處理 product / person / singleProduct 去背，logo 複製輸出，processed folder 可匯入。

```text
v0.3.1
```

Batch product layout restore by filename。修正 Batch Render iframe 重建後三商品身份對應錯誤，三商品 restore 改為 `id → filename → position`，Batch PNG 與 Project State restore 與主 Canvas 一致。

```text
v0.3.4
```

Phase 2D-2C Batch Approved Assets。Batch ZIP export 使用 approved processed assets；Main Canvas / Thumbnail / Batch 共用 `BNAssetResolver` 與 Render Context；Batch 維持 read-only projection，不修改 `layoutStates` schema、Project State schema 或 Photoshop Pipeline。

```text
v0.4.1
```

Photoshop Rerun Automation。完成 Needs Rerun Collection、`photoshop-rerun-manifest.json`、Latest Processed overwrite 與 Review return loop；Import Processed Folder 後回到 Review Workspace，不直接更新 Main Canvas / Thumbnail / Batch。

```text
v0.4.2
```

Review Workspace UX Polish。完成 Auto Next、Multi-pass Review、Review Progress Header、Smart Entry、Keyboard Shortcuts、Decision Guard 與 Remove Drag Tool；Review Workspace UX Polish 已列入 Locked Completed Phases。

```text
v0.4.3
```

Project Persistence。完成 Project State v5、Persistence Layer、single-state processed image restore 與既有 project.zip restore 相容；Download Complete Project 現輸出逐 Job PNG／single-state JSON 配對，latest processed image 可隨各 Job JSON 恢復。

```text
v0.4.4
```

Control Center UI Upgrade。控制台 Header 改為 `SPX BN生成器`，固定一般使用者入口為匯入CSV、匯入暫存、選擇素材資料夾、素材審核；一般 UI 隱藏 Photoshop / Manifest / Processed Folder 等技術術語；素材審核入口整合處理結果匯入、重新處理素材與開啟審核；中央版位下拉僅調整 display order，不修改 placementId、templateId、layoutState key 或 schema。

```text
v0.4.5
```

Review Workspace UI Upgrade。Navigator Information Architecture 簡化為檔名、Review Status、Dirty Status，移除 Role / Job ID / Slot / Asset Key / Processed Filename / Mode 等技術 Metadata；Review Summary 與 Filter（全部素材／待重新去背）移至 Navigator 上方；Workspace Layout 預設 Navigator + Workspace，Inspector 預設收合，選取裁切或橡皮擦時展開 Dynamic Inspector，儲存或取消後收合；Header 僅保留素材審閱／關閉；底部 Decision Area 三顆按鈕同列（核准 Primary、重新去背 Warning/Danger、撤回上一個決策灰階 Outline）；新增 Completion Screen（依全域 Reviewable Assets 判斷，區分 Needs Rerun = 0 / > 0）；新增 Completion Recovery（Completion Screen 可撤回上一個決策，使用者可重新進入任一已完成素材繼續編輯）；Review Workspace 正式 UI 中文化，internal values（`approved` / `needs_rerun` / `pending` / `processed` / `all` / `crop` / `eraser`）不變；「重新去背素材（N）」目前僅呼叫既有 `exportPhotoshopRerunManifest` callback，未包含 Background Runner、Photoshop 自動啟動、自動 Import 或自動第二輪 Review。未修改 Crop / Eraser Core Logic、Undo Stack、Save Runtime Processed Asset Flow、Keyboard Shortcut 底層邏輯、Photoshop Pipeline 或 Rerun Architecture。


## Smart Layout Propagation

Status：Completed。

Smart Layout Propagation 已完成並列入 Locked Completed Phases。每個 Job 擁有自己的 runtime-only Master Layout；Propagation 完成後只建立 target size 自己的 `layoutState`，各尺寸永久獨立。Master Layout 不寫入 Project State、不寫入 `layoutStates`、不 Export、不 Import。

## 7. 下一步建議（Roadmap）

Completed：

- CSV
- Photoshop Pipeline
- Review Workspace
- Approved Asset Resolver
- Main Canvas & Thumbnail use processed asset
- Batch Approved Assets
- Render Context
- Master + Style
- Project State
- Smart Layout Propagation
- Review Workspace（Crop / Eraser）
- Photoshop Rerun Automation
- Review Workspace UX Polish
- Project Persistence
- UI Upgrade（Control Center UI Upgrade + Review Workspace UI Upgrade）
- Photoshop Automation（macOS 與 Windows Development Validated）
- AI Workflow（macOS 與 Windows Development Validated）
- Render Context & Export Workflow（Batch Render 輸出 placement／template Bug Fix；Tag `v0.5.1`）
- QR Code（CSV `QRcode` 欄位網址自動產生、控制台右側欄手動修改、四尺寸 Locked Visual Baseline；功能 Commit `79de045`、Tag `v0.5.2`）
- SPX Helper Core（正式 localhost 邊界、Origin / CORS、單一實例邊界、既有 RuntimeCore Integration；功能 Commit `9a71794`）
- SPX Helper Runtime Productization — Phase 1 Foundation（Product Host、Running / Working / Attention、單一 Helper Instance、Tray / Menu Bar、Quit、Restart；功能 Commit `51c4828`）
- SPX Helper Runtime Productization — Phase 2 Windows Packaging（PyInstaller、WiX Toolset SDK 5.0.2 MSI、Fresh Install、Startup、Start Menu、Apps & Features、Windows Validation；功能 Commit `9240504`）
- SPX Helper Runtime Productization — Phase 3 macOS Packaging（PyInstaller `SPX Helper.app`、macOS PKG、Applications、LaunchAgent、Login Startup、Menu Bar、macOS Validation；功能 Commit `ee55dd527a00361f1155ba45713ff2ce3957b06c`）

Current：

- SPX Helper Runtime Productization — Phase 3 macOS Packaging（Completed）

Next：

- Phase 4 — Update + Uninstall（Not Started）。本文件只記錄 Roadmap 狀態；尚未開始設計或實作。

Photoshop Rerun Automation（Completed，人工匯出流程，仍保留作為既有備援入口）：

- Needs Rerun Collection 由 `status === needs_rerun` 派生，不建立 queue array。
- `重新去背素材（N）`（Control Center 選單）匯出 `photoshop-rerun-manifest.json`，沿用現有 Photoshop Runner；此人工匯出入口與 AI Workflow 的自動化 Rerun 並存，未被取代。
- Import Processed Folder 後回到 Review Workspace，不 Auto Approve、不 Auto Update Main Canvas / Thumbnail / Batch。
- 只有 `approved` 才進入 Approved Asset Resolver 與 Render Pipeline。
- Latest Processed 覆蓋 Previous Processed；不保存 v1 / v2 / v3。

Windows Development Validation：

- Windows Validation 與 Jamie Manual Validation：**PASS**（Photoshop 2025）。此既有 Photoshop Automation 驗證不等同於完整 Production Deployment；SPX Helper Core 已另行完成，其他 deployment lifecycle 項目仍待後續 Proposal。

Production Deployment：

- SPX Helper Core：**Completed**（功能 Commit `9a71794`；macOS／Windows Jamie Manual Validation PASS）。
- SPX Helper Runtime Productization Phase 1 Foundation：**Completed**（功能 Commit `51c4828`；Browser／Platform Validation 與 Jamie Manual Validation PASS）。
- SPX Helper Runtime Productization Phase 2 Windows Packaging：**Completed**（功能 Commit `9240504`；MSI Build／Install 與 Windows 正式流程 Jamie Manual Validation PASS）。
- SPX Helper Runtime Productization Phase 3 macOS Packaging：**Completed**（功能 Commit `ee55dd527a00361f1155ba45713ff2ce3957b06c`；local app／PKG build、Install Validation 與 Jamie Manual Validation PASS；Developer ID／Notarization 為 Credential-dependent validation）。
- 尚未完成：Phase 4 Update + Uninstall、Phase 5 Final Validation。第一版不包含 Browser Version Check、Version Compatibility UI、Auto Update 或自動 recovery。
- 未完成項目不得描述為已由 Helper Core 一併完成；每一主題都需依 SOP 另行提出 Proposal。

Extension System 已從 Roadmap 移除（不在 Completed / Current / Next 中）。目前沒有新增素材審閱工具的產品需求，Review Workspace 現有的核准、重新去背、裁切、橡皮擦已足夠目前使用。未來若出現明確產品需求，再由 Jamie 另外提出新的 Proposal，不預留 Phase 位置。

## Next Planned Phase Order（Locked）

The following roadmap order has been decided by the product owner.

1. Photoshop Automation（Completed — macOS and Windows Development Validated）
2. AI Workflow（Completed — macOS and Windows Development Validated）
3. Render Context & Export Workflow（Completed — Batch Render placement/template Bug Fix, Tag `v0.5.1`）
4. QR Code（Completed — 功能 Commit `79de045`、Tag `v0.5.2`）

以上 4 項與 SPX Helper Core 均已完成。SPX Helper Runtime Productization 另依已通過的五階段 Implementation Proposal 推進：Phase 1 Foundation、Phase 2 Windows Packaging 與 Phase 3 macOS Packaging 已完成，下一步為 **Phase 4 — Update + Uninstall（Not Started）**；Phase 5 Final Validation 尚未開始。

Rules：

- Follow this order by default.
- Do not propose other roadmap phases unless explicitly requested by the product owner.
- Review Workspace UI Upgrade is Completed and locked; do not reopen, redesign, or re-Proposal it.
- Photoshop Automation and AI Workflow are Completed for macOS and Windows Development on Photoshop 2025. Windows Validation and Jamie Manual Validation passed; do not generalize this result to unvalidated Photoshop versions or Production Deployment.
- Render Context & Export Workflow is Completed and locked (Batch Render placement/template Bug Fix, Tag `v0.5.1`); do not reopen, redesign, or re-Proposal it except for Bug Fix, User Request, or an explicit Architecture change.
- Locked Completed Phases must not be redesigned.
- Photoshop Automation and AI Workflow must not redesign Review Workspace UI, Navigator, Dynamic Inspector, Decision Area, Completion Screen, Crop, Eraser, Canvas, Thumbnail, Batch, `layoutStates`, Approved Asset Resolver, Project State schema, or Review Decision Model.
- SPX Helper Core and Productization Phase 1 Foundation, Phase 2 Windows Packaging, and Phase 3 macOS Packaging are Completed. Phase 4 Update + Uninstall and Phase 5 Final Validation must not be described as completed.
- Phase 3 did not modify SPX Helper Core, Runtime Contract, HTTP／Browser API, Frontend, GitHub Pages, Photoshop Automation, AI Workflow, or Windows Packaging. Developer ID signing and Apple Notarization remain credential-dependent and unverified.
- Extension System is not part of the roadmap unless and until the product owner opens a new Proposal for it.
- QR Code is Completed and locked (functional Commit `79de045`, Tag `v0.5.2`); do not reopen, redesign, or re-Proposal it except for Bug Fix, User Request, or an explicit Architecture change.

Photoshop Automation、AI Workflow、Render Context & Export Workflow 與 QR Code 已完成並列入 Locked Completed Phases（Photoshop Automation／AI Workflow：macOS 與 Windows Development Validated，Photoshop 2025。Render Context & Export Workflow：Tag `v0.5.1`。QR Code：功能 Commit `79de045`、Tag `v0.5.2`）。Project Persistence、Control Center UI Upgrade 與 Review Workspace UI Upgrade 同樣已完成並列入 Locked Completed Phases。

注意命名：「Photoshop Automation」（已完成的 Photoshop 端 Runtime／Adapter 能力）與「Photoshop Rerun Automation」（已完成的 Needs Rerun Collection / Rerun Manifest 人工匯出能力）是兩個不同、皆已完成的 Phase，不得混用。另外，「Render Context」（Phase 2D-2B-2，Thumbnail 共用 Render Context 概念，已完成）與「Render Context & Export Workflow」（本節剛完成的 Phase，Batch Render 輸出 placement／template Bug Fix）也是兩個不同、皆已完成的 Phase，不得混用。

以上 Roadmap 順序已由 Product Owner 決定並鎖定。

## Photoshop Automation（Completed — macOS and Windows Development Validated）

Photoshop Automation 已完成 Coding 與 macOS Development Manual Validation（Photoshop 2025）。前提維持：使用者已安裝 Adobe Photoshop，並在開始使用 SPX AD 生成器前自行開啟 Photoshop；本 Phase 不負責自動安裝、自動啟動或自動關閉 Photoshop。

已完成能力：

- **SPX AD Runtime**（`tools/photoshop-automation/spx_ad_runtime.py`）：Python stdlib-only 的本機 HTTP Runtime，實作 Ready Contract（`GET /ready`）、兩段式 Execution Contract（`POST /execute` 建立 executionId → 逐一上傳素材 binary）、Status Contract（`GET /status/{executionId}`）與 Result Contract（`GET /executions/{executionId}/results/{assetId}` 回傳原始 `image/png` binary，不使用 base64）。
- **Platform Adapter Architecture**：`platform_adapter.py` 依作業系統選擇對應 Adapter，Runtime 本身不知道 AppleScript 或 Windows COM 細節。
- **macOS Adapter**（`macos_adapter.py`）：沿用既有 AppleScript／`remove-background.jsx`（去背核心不變）；Ready Check 改用 bundle id `com.adobe.Photoshop` 判斷是否已開啟（`application id "com.adobe.Photoshop" is running`），不再依賴容易因版本不同而變動的 process 名稱；已完成 macOS 實機驗證（Photoshop 2025）。
- **Windows Adapter**（`windows_adapter.py`）：使用 pywin32／`win32com.client`（`GetActiveObject` 判斷 Ready、不自動啟動 Photoshop）。Execute 以 UTF-8 讀取單一共用 `remove-background.jsx`，以 `json.dumps()` 注入 `manifestPath`、`originalFolder`、`outputFolder`，再以 `DoJavaScript(full_script)` 執行。Windows Validation 與 Jamie Manual Validation 已 PASS，成功產生 `photoshop-run-report.json` 與 Processed PNG；`DoJavaScriptFile()` 失敗方案不再採用。macOS 流程不變。
- **Naming Contract Consistency Fix**：processed 圖片實體檔名全域唯一規則為「原始素材 basename + `.png`」（例如 `商品A.jpg` / `商品A.webp` → `商品A.png`），不使用 `{assetKey}__processed.png` 或任何 jobId／role／slot 後綴；`assetKey` 只作為內部 State Identity／metadata／Manifest `assetKeys[]`，不進入實體檔名。`remove-background.jsx` 唯一被修改之處是 `getOutputFilename()` 缺少 `output.filename` 時的 fallback（改為 source basename + `.png`），去背核心、Logo copy、Run Report 邏輯未受影響。人工「匯入處理結果」的比對邏輯也已同步改為 basename 比對（見 `docs/Photoshop Asset Pipeline.md`）。
- Runtime Workspace（暫存輸入／輸出）完全隱藏、自動管理，不建立使用者可見的 Run 資料夾；具備 Pending Execution Timeout（逾時自動釋放，避免永久 busy）與啟動時 stale Workspace 清理。

Photoshop Automation **不負責** Control Center 的 Processing Mode UI、自動 Import Processed Result、自動開啟 Review Workspace——這些屬於 AI Workflow（見下一節）。

詳細架構見 `docs/Architecture.md`（Photoshop Automation Architecture）。

## AI Workflow（Completed — macOS and Windows Development Validated）

AI Workflow 已完成 Coding 與 macOS Development Manual Validation（Photoshop 2025，Stage 1–4 共 18 項 PASS，見上方 Validation Status）。以下描述目前已實作的實際行為。

### 核心產品原則（已實作）

使用者只需在開始前自行開啟 Photoshop；通過 Photoshop Ready Check 後，不需要再操作 Photoshop，也不需要理解 Manifest、Runtime、Processed Folder 或其他技術流程。Photoshop 是系統背景素材處理引擎，不是使用者日常操作介面。

使用者只需要：

1. 在開始使用 SPX AD 生成器前，自行開啟 Photoshop（一次性前置動作）。
2. 提供素材（匯入 CSV、選擇素材資料夾——選擇時會一併取得後續寫入 Processed／ 所需的 readwrite 權限，只需選一次）。
3. 審閱素材。

Ready Check 通過後，使用者不需要：操作 Photoshop、匯出 Manifest、選擇 Processed Folder、手動匯入處理結果、理解 Photoshop Pipeline 技術細節。

一般使用者 UI 不暴露 Manifest、Runtime、Processed Folder、executionId 等技術術語。「Photoshop」名稱允許出現在兩種情況：(1) Ready Check 未通過或 Recovery 提示，例如「Photoshop 已關閉。請重新開啟 Photoshop。開啟後按「重新檢查」即可繼續。」；(2) Processing Mode 固定顯示的 Processing Notice 文案「請勿操作 Photoshop，系統將自動完成背景處理。」（見下方「最終使用者流程」步驟 7）。除上述兩種情況外，其餘一般使用者 UI 不直接出現 Photoshop 技術詞彙。

### 最終使用者流程（First Run，已實作）

```text
1. 使用者先自行開啟 Photoshop。
2. 使用者開啟 SPX AD 生成器（Control Center）。
3. 匯入 CSV。
4. 選擇素材資料夾（一次）。
5. 系統執行 Photoshop Ready Check。
6. 若未通過，顯示「Photoshop 已關閉。請重新開啟 Photoshop。開啟後按「重新檢查」即可繼續。」，不需要重新選擇 CSV / 素材資料夾。
7. Ready Check 通過後，系統進入 Processing Mode，鎖定 Control Center：
   素材處理中
   請勿操作 Photoshop，
   系統將自動完成背景處理。
   完成後將自動帶入素材審閱。
8. 進度更新為「素材處理中（N / M）」。
9. 完成後顯示「素材處理完成」（停留約 0.8 秒 UI 轉場，非完成判定依據）。
10. 系統自動開啟素材審閱（Review Workspace），並自動選取第一筆素材顯示圖片，使用者不需要再手動點選。
11. Needs Rerun = 0 → 返回控制台；Needs Rerun > 0 → 顯示「重新去背素材（N）」。
12. 若有素材去背失敗（Photoshop 確認處理失敗，從未成功過），完成畫面另外顯示「X 個素材去背失敗，請回控制台手動更換圖片」，此提示不影響「全部素材已完成審閱」的判定，也不計入「重新去背素材（N）」的 N（去背失敗素材不提供核准／重新去背／撤回按鈕，只能手動更換圖片後由使用者自行重新走一次流程）。
```

### Rerun 流程（已實作）

```text
1. 使用者點擊「重新去背素材（N）」。
2. 系統重新執行一次 Ready Check（不跳過）。
3. 系統再次進入相同的 Processing Mode（不重新啟動 Photoshop，Photoshop 全程保持開啟），顯示相同的完整提示文案。
4. 沿用同一個已保留的素材資料夾 FileSystemDirectoryHandle，不要求重新選擇。
5. 完成後自動回到素材審閱，Filter 自動切到「待重新去背」，只顯示本輪重新處理的素材子集；核准第一筆後自動顯示下一筆，不會誤跳回完成畫面。
6. Processed／ 內同名 PNG 被正確覆蓋；本輪素材不會被 Auto Approve。
7. 重複至 Needs Rerun = 0。
```

使用者可見 UI 只使用工作語言：素材處理中、素材處理完成、素材審閱、核准、重新去背、待重新去背、重新去背素材（N）、去背失敗、請回控制台手動更換圖片，以及 Ready Check 未通過或處理失敗時的「Photoshop 已關閉」「重新檢查」「無法寫入處理結果」「重新授權」「無法開啟素材審閱」「重試」等復原提示。不暴露 Manifest、Runtime、Processed Folder、executionId 等技術詞彙。「素材處理完成」後直接自動進入素材審閱，不存在獨立的「等待審閱」中繼狀態。

### Error / Recovery（已實作）

Ready Check 失敗、Execute 失敗（含 Manifest 衝突）、素材上傳失敗、Status Polling 失敗（含 Runtime 暫時無回應與 executionId 遺失兩種情況）、全部素材皆處理失敗、寫入 Processed 失敗（含 readwrite 權限被拒絕，提供「重新授權」）、Matching 失敗、Review Workspace 開啟失敗，皆有對應復原提示與動作；Global Interaction Lock 在復原期間持續維持，只開放對應的復原按鈕；復原成功後才解除鎖定並進入 Review。Retry 不會重複觸發 Photoshop，也不會遺漏已成功寫入的部分。

**部分素材去背失敗（去背失敗獨立分類，Bug Fix）**：只要至少一張素材成功，就不再顯示整批 Recovery Banner、也不再需要整批重新開始。系統直接把成功的素材帶入素材審閱；從未成功過的素材標記為「去背失敗」，於素材審閱顯示原圖與提示文字「此素材去背失敗，請回控制台手動更換圖片。」，不提供核准／重新去背／撤回按鈕；已成功過但 Rerun 又失敗的素材維持原本的 `needs_rerun`，沿用上一次成功的處理結果，不新增額外狀態。

### Photoshop Automation 與 AI Workflow 責任切分（已實作，Locked）

Photoshop Automation 與 AI Workflow 責任不重疊：

- **Photoshop Automation** 負責 Photoshop 端能力：Ready Contract、接收 Manifest / Rerun Manifest、呼叫既有去背核心批次處理、輸出 processed assets、回報 Progress / Completion / Partial Failure / Failure 與 Run Report / Status Contract；Run Report 與 Status Contract 現在額外提供逐筆（per-asset）成功／失敗明細（`itemResults`），供 AI Workflow 判斷個別素材是否成功，而不再只依賴整批 summary。
- **AI Workflow** 負責 Control Center 端 Orchestration：使用既有 `buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest` 建立 Manifest、透過 Photoshop Automation 的 Contract 送出工作、執行 Ready Check 的 Control Center 端流程、顯示 Processing Mode 並鎖定操作、讀取 Photoshop Automation 回報的狀態、沿用既有 Matching 函式自動 Import、自動開啟既有 Review Workspace、串接第一輪與 Rerun 第二輪審閱、提供 Error / Recovery。

AI Workflow 未重新設計 Review Workspace UI、Navigator、Dynamic Inspector、Decision Area 或 Completion Screen 的架構；已修正兩個既有 UX Bug：(1) 開啟時／決策後的完成畫面判斷邏輯（見 CHANGELOG）；(2) 去背失敗獨立分類（Bug Fix）——新增「去背失敗」狀態值、Filter 分頁與 Navigator 標籤，Decision Area 對去背失敗素材改顯示提示文字，Completion Screen 新增去背失敗計數，皆為既有元件內的新增顯示內容，非重新設計（見 CHANGELOG）。原本人工匯出流程（`重新去背素材（N）` 選單項目呼叫 `exportPhotoshopRerunManifest`）仍保留作為既有備援入口，未被移除。

## QR Code（Completed）

QR Code 已完成 Coding、Browser Validation 與 Jamie Manual Validation（功能 Commit `79de045`、Tag `v0.5.2`）。

核心行為：

- 每個 Job 擁有一組 QR Code，由 CSV 的 `QRcode` 欄位網址自動產生；使用者可於控制台右側欄修改網址，系統依網址重新產生 QR Code。不使用使用者自行準備的 QR Code 圖片。
- CSV 欄位比對：找到清理後（移除欄名換行後的第一行）**剛好等於** `QRcode`（不分大小寫）的欄位。真實入稿表同一列裡還有「QRcode統一導shop...」「QRcode雲端(SPX填寫)」等 SPX 內部後續流程欄位，同樣含 QRcode 字樣但通常是空的；比對邏輯必須精準排除這些欄位，不能用「只要含 QRcode 字樣」的寬鬆比對，否則會被覆蓋成空值。
- 網址驗證：自動 trim、未含 Protocol 自動補上 `https://`、含空白字元一律視為非法；輸入框、Project State、QR Code 產生與檢查網址連結四處皆使用補完 Protocol 後的同一個值。
- 控制台右側欄固定順序：主標／副標／小字之後、Logo 之前；不提供拖曳、縮放、旋轉或縮圖預覽，獨立於「套用文字到模板」按鈕之外。
- Template 新增 `qrZone`（四個尺寸皆有 Locked Visual Baseline 固定座標，不可調整）與 `layerOrder.qrCode = 48`（固定位於既有 `info` 圖層之上）。
- Library：`soldair/node-qrcode`，與 `tools/qrcode-demo/`（技術驗證 demo）共用同一份 vendored 檔案。固定 ECC Level `M`、黑碼白底。
- `job.qrCodeUrl` 為字串欄位，直接隨 Project State 保存與還原，不透過 `_embeddedAssets` 或 processed asset 機制。

詳見 `docs/Architecture.md`「QR Code Architecture」、`docs/CHANGELOG.md`「QR Code」與 `docs/proposals/QR-Code-Product-Proposal.md`、`docs/proposals/QR-Code-Implementation-Proposal.md`。

## 8. AI 接手規則

文件維護請遵循 `docs/DOCUMENTATION.md`。AI 不可自行猜測需要更新哪些文件。

任何 AI 修改前必須先閱讀：

- `docs/AI-HANDOFF.md`
- `docs/Architecture.md`
- `docs/CHANGELOG.md`
- `docs/控制台開發指引.md`

必要時再補讀：

- `README.md`
- `docs/SPX-AD-版型規格與操作說明.md`
- `docs/Photoshop Asset Pipeline.md`

開始修改前必須：

- 先理解目前架構。
- 先提出修改方案。
- 確認後再開始實作。
- 不得一次大規模重構。
- 維持 State Boundary。
- 修改完成後同步更新 CHANGELOG。

若使用者明確要求「先不要修改程式」，AI 只能分析、規劃或更新文件，不得碰 JS / HTML / CSS。
