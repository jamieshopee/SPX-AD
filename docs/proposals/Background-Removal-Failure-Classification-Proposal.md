# 去背失敗獨立分類 — Product Proposal

Version: 2026-07-13-freeze-02
Status: **Implementation Proposal Complete.** Product Proposal、Proposal Audit、Implementation Proposal 均已完成（本文件為對話中已做決定的紀錄，不引入新決定）。尚未 Coding。
性質：Bug Fix / User Request，重新開啟 Locked Completed Phases（Photoshop Automation、AI Workflow）中與「批次去背失敗回報」相關的部分。
Depends on：Photoshop Automation（Completed）、AI Workflow（Completed），皆為 `docs/AI-HANDOFF.md` 的 Locked Completed Phases。

---

## 1. Status

- Product Proposal：Complete（本輪對話逐步確認）。
- Proposal Audit：Complete（技術可行性、Locked Completed Phases 影響、Scope creep、Edge cases 已檢查，見第 9 節）。
- Proposal Freeze：**Done.**
- Implementation Proposal：**Done**（見第 11–15 節）。
- Coding：Not started.
- Current Active Phase per `docs/AI-HANDOFF.md`：None（Waiting for next Proposal）。本提案不佔用、也不改變該 Active Phase 狀態，是獨立的 Bug Fix Proposal。

## 2. Background（現況與根本原因）

目前批次去背流程：Control Center 建立 Manifest → SPX AD Runtime（`tools/photoshop-automation/spx_ad_runtime.py`）→ macOS Adapter（`macos_adapter.py`）→ `tools/photoshop/run-photoshop-manifest.applescript` → `tools/photoshop/remove-background.jsx`，由 Photoshop 對每張圖依序呼叫「移除背景」／「選取主體」等 AI 動作（Adobe Sensei）。每張圖的成功/失敗與原因，`remove-background.jsx` 都會寫進 `photoshop-run-report.json` 的 `items[]`（`assetKey`／`sourceFilename`／`status`／`error`）。

現況問題：這份逐張明細從未往上傳。`spx_ad_runtime.py` 的 `_resolve_outcome()` 只讀 `report.summary` 的成功/失敗總數；`get_result()` 更進一步規定「整批結果必須等於 `Completed` 才能取回任何一張」，導致只要有一張失敗，其餘已成功的圖也一起被擋住。往上到 `js/ai-workflow-orchestrator.js`，`PartialFailure` 只會對應到一個固定原因字串 `some_items_failed`；`js/ai-workflow-recovery.js` 只顯示「部分素材處理失敗」＋唯一的「重試」按鈕，且該按鈕是整批（含已成功項目）重新開始。使用者因此完全不知道是哪一張圖失敗、為什麼失敗，只能重複觸發整批重跑。

## 3. Goals

- 第一次去背從未成功過的素材：直接顯示原圖，並標記為新分類「去背失敗」，讓使用者知道要回控制台手動置換該圖片。
- 不影響其餘素材：一批裡有素材去背失敗，不阻擋其他已成功的素材正常進入審閱流程。
- 不誤導使用者去做沒有意義的動作：「去背失敗」不提供核准／重新去背／撤回決策按鈕（重跑對這張圖沒有幫助）。
- 「重新去背素材（N）」整批重跑，只重跑真正需要且可能有效的「待重新去背」，不含「去背失敗」。
- Completion Screen 讓使用者知道有幾張「去背失敗」需要事後處理，但不因此卡住「全部素材已完成審閱」的判斷。

## 4. Non-Goals / Out of Scope（本輪不動）

- 不修改 `remove-background.jsx`、`run-photoshop-manifest.applescript` 的去背核心邏輯本身。
- 不修改 Manifest schema、Approved Asset Resolver API、Canvas、Thumbnail、Batch Render、Project State schema、CSV、Control Center 主要入口。
- 不重新設計 Review Workspace 既有的 Navigator／Dynamic Inspector／Decision Area／Completion Screen 架構，只在既有架構上新增一個平行分類（見第 6 節）。
- 不處理「Rerun（第二輪去背）失敗」的獨立狀態或文案（見第 7 節，已決定沿用既有「待重新去背」行為，不新增狀態）。
- 不在本輪解決「下載/寫入失敗」與「Photoshop 去背失敗」以外的其他既有 Recovery 情境（Ready Check 失敗、Execute 被拒絕、Manifest 衝突等維持現有行為）。

## 5. 確認的行為（Locked，本輪對話定案）

1. **首次去背從未成功**的素材，歸類為新狀態「去背失敗」：
   - 畫面顯示原圖（沿用既有「無 processed 結果時 fallback 原圖」的 Resolver 規則，不修改 Resolver）。
   - Review Workspace 底部**不顯示**核准／重新去背／撤回三顆決策按鈕，改顯示提示文字，告知使用者需回控制台手動置換該圖片。
2. Review Workspace 的 Filter 由兩顆（全部素材／待重新去背）新增第三顆「去背失敗」。
3. 「重新去背素材（N）」整批重跑按鈕，明確排除「去背失敗」，只計入真正的「待重新去背（`needs_rerun`）」。
4. Completion Screen 額外顯示「去背失敗（M）」數量提醒，但「去背失敗」**完全不列入**「是否已完成審閱」的判斷——即使有去背失敗的項目，只要其餘可審閱素材都已核准或標記重新去背，仍正常顯示「全部素材已完成審閱」／「返回控制台」。
5. **Rerun（第二輪去背）如果同一張圖又失敗**：不新增任何狀態或標記，直接維持既有「待重新去背」狀態，畫面繼續顯示上一次成功的處理結果（既有「僅在成功時才覆蓋舊 processed 結果」的行為本來就會保留舊圖，不需要新程式碼）。使用者如果不滿意，一樣走既有的「回控制台手動換圖」路徑。「去背失敗」這個新分類因此只適用於「從未成功處理過」的素材，範圍最小化。
6. **整批全部失敗**（沒有任何一張成功）：維持現有的整批失敗畫面與「重試」（整批重新開始），不套用「去背失敗」邏輯。

## 6. 資料模型與技術觸點（Implementation Proposal 前的範圍界定，細節留給下一階段）

- **新狀態值**：`js/asset-pipeline-state.js` 的 `normalizeStatus()`（目前白名單只允許 `pending|processed|approved|needs_rerun`）需要新增一個新狀態值（暫稱，正式命名於 Implementation Proposal 決定），否則會被靜默吃成 `pending`。
- **平行清單，不進入「必須決策」的完成度判斷**：`js/asset-review-workspace.js` 的 Navigator 清單與「是否完成審閱」判斷（`baseReviewAssets()` → `isCurrentFilterComplete()`）都是同一份「有 `processedAsset` 的項目都要決策完」的清單。若「去背失敗」項目走這條路，因為第 5 節第 1 點已確認不給決策按鈕，會永遠卡住 Completion Screen。解法：仿照現有 `getNeedsRerunAssets()` 的模式，新增一條**平行、獨立**的查詢（例如 `getBackgroundRemovalFailedAssets()`），只供 Navigator 新 Filter 分頁與 Completion Screen 的數量提醒使用，「是否完成審閱」的判斷邏輯完全不查這條清單，天生不受影響。
- **Runtime（`spx_ad_runtime.py`）**：`_resolve_outcome()` 與 `get_result()` 需要能依單一 assetId 查詢 `report.items[]` 裡「這一張」的成功/失敗，而不是只看整批 summary。
- **Auto Import（`js/ai-workflow-auto-import.js`）低風險做法（已確認，取代原本「讓下載迴圈本身容忍失敗」的方案）**：不修改現有 `fetchAndWriteAllResults()` 的下載/重試迴圈本身（該迴圈原本的「失敗就中斷、靠 `resumeFromIndex` 續傳」行為完全保留，適用於「Photoshop 已成功、但下載或寫入失敗」的既有 Recovery 情境 F／G，不變）。改成在迴圈之外，先把 Manifest 依 Runtime 回報的逐張結果分成兩組：Photoshop 成功的項目才進入這條既有下載迴圈；Photoshop 本身失敗（且從未成功過）的項目完全不下載、不寫檔、不進入重試機制，只單純把該素材的狀態標成「去背失敗」。兩條路徑彼此獨立，互不干擾，不需要重新設計既有的重試語意。

## 7. Locked Completed Phases 影響

會重新開啟 **Photoshop Automation**（Runtime 的 Result Contract 判斷邏輯）與 **AI Workflow**（Auto Import、Review Workspace 狀態／Filter／Completion Screen）。兩者皆為你已明確提出的 Bug Fix／User Request，依 `docs/DOCUMENTATION.md` 的 Completed Phase Rule 屬於允許重新開啟的情況。不影響两者的核心契約形狀以外的既有行為，也不影響 Render Context & Export Workflow（已 Completed，Tag `v0.5.1`）或其他 Locked Completed Phases。

## 8. Boundaries（沿用既有規則）

- 不建立第二套 Review Workspace 顯示邏輯或直接操作其內部 DOM。
- 不修改 `layoutStates`、Project State schema、Canvas、Thumbnail、Batch Render。
- 不修改 Manifest schema 的核心概念、Photoshop Adapter Boundary、`remove-background.jsx` 的去背核心／Logo copy／Run Report。
- 一般使用者 UI 文案沿用專案既有「只使用核可字彙」原則，不暴露 Manifest、Runtime、Workspace path、HTTP 狀態碼等技術細節；「去背失敗」的提示文案本身也應遵循此原則，正式文案於 Implementation Proposal 確認。

## 9. Proposal Audit 摘要

- **技術可行性**：成立。去背是本機一次性 Photoshop 動作，「第一次失敗＝去背失敗，不需判斷可否重試」的假設可直接成立，不需額外的失敗分類演算法。
- **風險最高點已降低**：原本「讓下載迴圈本身容忍失敗」的方案，會讓「下載/寫入失敗」與「Photoshop 去背失敗」這兩種原因不同、處理方式也不同的失敗混在同一個迴圈與同一套重試語意裡，風險最高。已改為第 6 節「兩條路徑互不干擾」的做法：先分流，Photoshop 失敗的項目完全不進入下載/重試機制，既有下載迴圈與既有 Recovery 情境 F／G 的邏輯不需要更動。
- **Completion Screen 卡住的風險已排除**：發現「有 `processedAsset` 才進 Navigator」與「是否完成審閱要求所有項目都決策完」是同一份清單，若「去背失敗」共用會導致永久卡住；已確認改用平行、獨立清單解決，不影響既有完成度判斷。
- **Scope Creep 檢查**：確認的行為彼此一致、無矛盾，未牽連 Render Engine、Template、Project State schema、CSV、Control Center 主要入口。
- **Rerun 邊界已簡化**：「Rerun 第二次仍失敗」不新增狀態、不新增文案，直接沿用既有「待重新去背＋顯示上次成功結果」行為，縮小了本次改動範圍。
- **結論**：可行，範圍已收斂到最小，可進入 Implementation Proposal。

## 10. Proposal Freeze 後的下一步

Proposal Freeze（第 1–9 節）→ Implementation Proposal（第 11–15 節，本輪對話完成）→ Coding → Browser Validation → Jamie Manual Validation → Code Commit → Documentation Update → Docs Commit。

## 11. Implementation Proposal — 新狀態值與資料模型

**新狀態值（已確認）**：`background_removal_failed`。

- `js/asset-pipeline-state.js` 的 `normalizeStatus()`（目前白名單只允許 `pending|processed|approved|needs_rerun`）新增這個值；其餘用到 `normalizeStatus()` 的既有函式（Project State 匯出/匯入、`getReviewSummary()`）都會自動支援，不需要各自修改。
- 這個狀態值**不寫入** `record.review`（`review.decision` 專屬使用者真正的核准／重新去背決策；「去背失敗」是系統偵測到的結果，語意上分開）。
- **不新增內部除錯欄位**（原本討論的選配 `backgroundRemovalError`，已確認不做，維持最小改動範圍）。
- 新增兩個查詢函式（比照現有 `getNeedsRerunAssets()` / `getNeedsRerunSummary()` 寫法）：
  - `getBackgroundRemovalFailedAssets(pipelineState)`：篩 `status === 'background_removal_failed'`。
  - `getBackgroundRemovalFailedSummary(pipelineState)`：回傳 `{count, items}`。
- 新增一個標記函式（例如 `markBackgroundRemovalFailed(pipelineState, assetKeys, options)`）：沿用 `importProcessedAssetsByManifestItems()` 對 `assetKeys[]` 一對多回填的既有做法（同一原始檔案可能對應多個 assetKey，失敗要一起標，跟成功時的回填邏輯一致）。**只在這筆素材從未成功過（沒有既有 `processedAsset`）時才呼叫**；已經成功過、這次 Rerun 又失敗的，完全不呼叫，維持第 5 節第 5 點「什麼都不做」的決定。

## 12. Implementation Proposal — Runtime Contract（`spx_ad_runtime.py`）

- `/status/{executionId}` 回應的 `lastResult` 新增一個附加欄位 `itemResults: [{assetId, status: "success"|"error"}]`，資料來源是 `report.items[]`，只是額外夾帶，**不改變**現有 `state`／`reason`／`progress` 欄位形狀，忽略這個新欄位的呼叫方不受影響。
- `get_result()` 的判斷從「整批必須是 `Completed`」放寬為「這一張自己在 `report.items[]` 裡是 success，且整批狀態是 `Completed` 或 `PartialFailure`」；整批 `Failure`（全部失敗）維持現有行為不變。

## 13. Implementation Proposal — Auto Import（`js/ai-workflow-auto-import.js`）

- `runAutoImport()` 呼叫前，先用 Status Contract 回傳的 `itemResults`，把 `manifest.items` 分成兩組：
  - Photoshop 成功的項目 → 照舊丟進現有的 `fetchAndWriteAllResults()`（完全不改這個函式本身，既有下載/重試機制、`resumeFromIndex`、Recovery 情境 F／G 都不變）。
  - Photoshop 失敗的項目 → 完全跳過下載，直接呼叫第 11 節的標記函式；如果這個 assetKey 已經有 `processedAsset`（代表 Rerun 失敗，不是首次失敗），什麼都不做，維持原狀。
- 兩條路徑彼此獨立，互不干擾，不需要重新設計既有的重試語意。

## 14. Implementation Proposal — Orchestrator 狀態機（`js/ai-workflow-orchestrator.js`）

- `handleStatusUpdate()` 目前把 `PartialFailure` 一律導向 `partialFailureDetected`（顯示「部分素材處理失敗」＋整批重試）。改為：只要 `success_count > 0`，`PartialFailure` 一律跟 `Completed` 一樣繼續走 Auto Import，並多帶 `itemResults` 供 Auto Import 分流。
- 只有 `success_count === 0`（Runtime 既有的 `all_items_failed`，即整批全部失敗）才維持走現有的 `failed` 分支、顯示整批失敗畫面、提供整批重試——對應第 5 節第 6 點「整批全部失敗維持現狀」。
- `partialFailureDetected` 這個 phase 與其 Recovery Banner，在「有素材成功」的情況下不會再出現，這是本次唯一牽動既有狀態機分支的地方，Coding 前需列成明確的測試項目。

## 15. Implementation Proposal — Review Workspace（`js/asset-review-workspace.js`）

- `REVIEW_MODES` 新增第三個 key `background_removal_failed: true`，Filter 多一顆「去背失敗」按鈕。
- 「全部素材」Filter：清單同時包含現有 reviewable 清單＋去背失敗清單；「待重新去背」／「去背失敗」兩個 Filter 各自只顯示自己那組。
- Navigator 狀態 pill 新增「去背失敗」，用與「重新去背」（橘色）不同的顏色區分（建議紅色，核准綠色／重新去背橘色／去背失敗紅色）。
- 選到「去背失敗」的素材時，底部 Decision Area 不顯示核准／重新去背／撤回，改顯示提示文字（已確認文案）：「此素材去背失敗，請回控制台手動更換圖片。」
- `renderCompletion()` 新增一行「去背失敗（M）」，數量來自 `getBackgroundRemovalFailedSummary()`；**不**影響 `isCurrentFilterComplete()` / `isGlobalReviewComplete()`，這兩個判斷函式維持完全不查這條新清單。
- 「重新去背素材（N）」按鈕不需要修改：它已經只讀 `getNeedsRerunAssets()`，新狀態值不在裡面，自動排除。

## 16. 下一步

Implementation Proposal 已完成（第 11–15 節）。下一步是 Coding，會依上述範圍逐一實作、自行完成 Browser Validation 後再交給你 Manual Validation，過程中不會自行 commit／tag／push。
