# AI Workflow — Product Proposal (Draft)

Status: **Draft — Runtime Architecture dependency Locked; Proposal Audit may begin.** Not yet Proposal Freeze, not yet Approved.  
Originating branch: `feature/ai-workflow` (drafted). Current Active Phase work has moved to `feature/photoshop-automation`.  
Depends on: `v0.4.5` (Review Workspace UI Upgrade, Locked Completed Phase) **and** SPX AD Runtime — the component delivered by Photoshop Automation. Photoshop Automation has progressed through Product Proposal (Frozen), Proposal Audit, Implementation Proposal (Frozen), Coding, Runtime Validation (Development PASS), and Architecture Compliance. As a result, SPX AD Runtime's Ready / Execute / Status Contract, Platform Adapter Interface, and Runtime Architecture are **Locked** and treated here as a fixed, authoritative dependency — this document does not restate, re-derive, or redesign any of it (see `docs/proposals/Photoshop-Automation-Proposal.md`). Photoshop Automation itself is **not** yet a Completed Phase: Jamie Manual Validation, Code Commit, Documentation Update, and Git Tag for it are still pending.  
Dependency Status: AI Workflow Product Proposal is no longer blocked by Runtime Architecture, so **Proposal Audit for this document may begin**. This does not mean the entire AI Workflow Phase is unblocked end-to-end — Proposal Revision, Implementation Proposal, and Coding each still need their own confirmation in turn, as this document progresses. Separately, per Locked SOP, no End-to-End Workflow exists yet: Photoshop Automation's Coding has only been exercised via Development Runtime Validation, not together with AI Workflow's. Jamie Manual Validation, Code Commit, Documentation Update, Documentation Validation, Docs Commit, and Git Tag for **both** Phases are deferred until AI Workflow also completes Coding, to be performed together as one combined End-to-End Workflow validation.  
Scope of this document: Product Proposal, UX Workflow, Information Architecture, Architecture Questions, Error / Recovery Scenarios, Phase Breakdown only. **No coding, no implementation detail, no schema design.**

This document is a starting draft for the Product Proposal stage of the Formal Development SOP:

```text
Product Proposal（this document）
↓
Proposal Freeze（Jamie）
↓
Proposal Audit（Codex / Claude）
↓
Proposal Revision（ChatGPT）
↓
Implementation Proposal
↓
Coding
```

Nothing below is approved, and none of the User Workflow discussion held so far (Proposal Freeze 01 / Revision 01 in chat) has been folded into or should be read as a final Freeze of this document. Jamie should read, edit, and decide when to freeze it. Proposal Audit for this document can now proceed, since SPX AD Runtime's Contract is Locked and no longer a gap this document needs to work around.

### Photoshop Automation Reference (authoritative; not restated here)

AI Workflow treats **SPX AD Runtime** — the component delivered by Photoshop Automation — as a Locked, authoritative dependency: its Ready / Execute / Status Contract, Platform Adapter Interface, and Runtime Architecture are Locked, per `docs/proposals/Photoshop-Automation-Proposal.md` (Frozen) and the confirmed Implementation Proposal (Frozen), with Coding done and Runtime Validation at Development PASS. Photoshop Automation as a Phase is **not** yet a Completed Phase — Jamie Manual Validation, Code Commit, and Documentation Update for it are still pending, deferred until AI Workflow also completes (see header above). AI Workflow is, architecturally, simply **a user of SPX AD Runtime**: it calls exactly three operations — `Ready`, `Execute`, `Status` — and nothing else. This document does not restate, re-derive, or redesign:

- SPX AD Runtime's internal design, its Runtime Lifecycle, or its binding to the SPX AD Application's own open/close lifecycle.
- The Platform Adapter Interface, the macOS Photoshop Adapter, or the reserved Windows Photoshop Adapter position.
- The Ready / Execution / Status Contract shapes themselves, or Runtime Health Detection's mechanism.

Where this document needs to describe what AI Workflow *does* with those three operations (e.g. when it calls Ready, what it does with a Status read, how it reacts to a Failure Reason), it does so only from the calling side, never by describing or assuming SPX AD Runtime's internals.

The existing Control Center Manifest Builder (`buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest`, already pure in-memory functions), Processed Folder Matching (`importProcessedAssets`), Needs Rerun Collection (`getNeedsRerunAssets`), and automatic entry into Review Workspace with the correct filter after an import already exist today and remain AI Workflow's to orchestrate, unchanged.

### Current Product Decisions（AI Workflow 自身範圍內的產品決策）

以下是 AI Workflow 自身範圍內、已由 Jamie 決定的內容（不代表 Proposal 已 Freeze 或已 Approved）：

- Photoshop 前提、Ready Check 的存在、Photoshop 不會被自動安裝／啟動／關閉，這些都屬於 SPX AD Runtime（Photoshop Automation）已 Locked 的前提，AI Workflow 只是呼叫方，不重新決定這些事——見上方 Photoshop Automation Reference。
- Ready Check 通過後，使用者在整個 session（含 Rerun 迴圈）不需要再操作 Photoshop；Photoshop 全程保持開啟，AI Workflow 呼叫 SPX AD Runtime 時不會使其重新啟動。
- Processing Mode 是 AI Workflow 新增的 Global Interaction Lock 與 Workflow State（不是單純的狀態顯示）：期間 Control Center 完全鎖定，不可修改文字、不可切換工單、不可下載、不可開始新的工作。這是 AI Workflow 自己的 UI 責任。
- 完成提示（0.5～1 秒轉場，不是完成判定依據）後，控制台自動進入素材審閱，使用者不需點擊「開啟素材審核」；不存在獨立的「等待審閱」狀態。
- Rerun 完成後，控制台自動回到素材審閱，Filter 自動切到「待重新去背」（僅顯示本輪重新處理的素材）。
- Extension System 已從 Roadmap 完全移除（不屬於 Completed / Current / Future / Next Planned Phase Order），本 Proposal 不需要為它預留任何空間。
- 責任切分（與 SPX AD Runtime 不重疊）：SPX AD Runtime（Photoshop Automation 提供）負責 Ready Contract、接收 Manifest、呼叫既有去背核心、Progress/Completion/Failure 狀態回報。**AI Workflow（本文件）** 只負責 Control Center 端 Orchestration：透過既有 Manifest Builder 建立並送出 Manifest、執行 Ready Check 的 Control Center 端流程（未通過時顯示「請先開啟 Photoshop」/「重新檢查」）、顯示並鎖定 Processing Mode、讀取 SPX AD Runtime 回報的狀態、沿用既有 `importProcessedAssets()` 自動 Import、自動開啟 Review Workspace。AI Workflow 不得實作或重新設計 SPX AD Runtime、Platform Adapter 或任何 Photoshop 端觸發/偵測機制。
- Asset Replacement Boundary（沿用 Photoshop-Automation-Proposal.md 第 17 節已 Locked 的邊界）：AI Workflow 建立 Manifest 時，不得將使用者已手動置換（Manual Replacement，透過控制台右側既有素材欄置換）的素材再次送入 SPX AD Runtime / Photoshop Automation。手動置換的素材維持既有「使用者自行完成去背」流程，不觸發 Ready Check 或 Execute。

---

## 1. Product Proposal

### 1.1 Problem Statement

Today, going from "raw assets in a folder" to "approved, render-ready assets" requires the user to understand and manually operate a five-step technical pipeline: export a Photoshop job manifest, run the Photoshop Runner themselves, select an output folder, import the processed folder back into the console, and only then reach Review Workspace. Every rerun cycle repeats this manually.

The product goal for AI Workflow is to remove all of the manual *console-and-Photoshop-handoff* steps — exporting the manifest, running the Runner by hand, selecting folders, importing results by hand. The user's job shrinks to: open Photoshop once at the start of a session, then provide assets and review assets. This is narrower than "Photoshop disappears entirely" — the user does perform one deliberate action (open Photoshop) and may see one conditional prompt (Ready Check not passed yet); beyond that, Manifest / Runner / Processed Folder vocabulary and steps disappear from the user's normal flow.

### 1.2 Goals

- Run a Photoshop Ready Check after CSV + asset folder are provided, so the console knows whether the already-opened Photoshop can accept work.
- Automatically build and send the Manifest once Ready Check passes, with no manual manifest export.
- Automatically detect when background processing finishes and automatically bring processed assets into the console, with no manual "Import Processed Folder" step.
- Show status in plain user language: `素材處理中（18/63）` → `素材處理完成` → (automatic) `素材審閱`. There is no separate "等待審閱" state — completion transitions straight into Review Workspace after a short (0.5–1s) UI transition.
- Automatically repeat the same flow for the "needs rerun" loop (Photoshop stays open, is not relaunched), and automatically return the user to a "待重新去背" second-round review.
- Preserve the Review Workspace UI exactly as delivered in v0.4.5 (Navigator / Dynamic Inspector / Decision Area / Completion Screen). AI Workflow is a Control Center orchestration layer underneath, not a redesign of what the user sees while reviewing.

### 1.3 Non-Goals (this phase)

- Not redesigning Review Workspace, Navigator, Dynamic Inspector, Decision Area, or Completion Screen.
- Not redesigning Control Center UI Upgrade's header/entry structure beyond introducing Processing Mode — a new Global Interaction Lock and Workflow State (not merely a status display) that disables Control Center interaction while background processing runs, plus its Ready Check status surface.
- Not changing Crop / Eraser core logic, Undo Stack, or Save Runtime Processed Asset Flow.
- Not changing Photoshop Adapter's manifest schema or its "only reads manifest, only writes processed assets" boundary.
- Not auto-installing, auto-launching, or auto-closing Photoshop, and not eliminating the one-time "user opens Photoshop before starting" step.
- Not implementing the Photoshop-side Ready Contract, trigger, or execution mechanism itself, and not implementing or modifying SPX AD Runtime, the Platform Adapter Interface, or any Platform Adapter — those are SPX AD Runtime's responsibility, and its Architecture, Contract, and Platform Adapter Interface are Locked (Photoshop Automation as a Phase has not yet completed formal Release). AI Workflow only calls SPX AD Runtime's `Ready` / `Execute` / `Status` operations.
- Not building a generic plugin/extension system — Extension System has been removed from the roadmap entirely, not deferred to a future phase.
- Not moving processing to a cloud service; scope assumes Photoshop still runs locally on the user's machine.

### 1.4 Success Criteria

- A user can go from "select asset folder" to "reviewing processed assets" without ever seeing the words Manifest, Runner, or Processed Folder, and without any manual button click to open Review Workspace.
- If Ready Check fails, the user sees a single, clear prompt ("請先開啟 Photoshop" / "重新檢查") — this is the one sanctioned place Photoshop's name appears in the UI.
- A user can trigger a rerun cycle and land back in "待重新去背" review without manually re-running anything, and without Photoshop being closed or reopened.
- If background automation fails at any step, the user sees an understandable, actionable message (not a raw error, not silence).

---

## 2. UX Workflow (Target, Future)

```text
1. 使用者先自行開啟 Photoshop。
2. 使用者開啟 SPX AD 生成器。
3. 匯入 CSV。
4. 選擇素材資料夾。
5. 系統執行 Photoshop Ready Check。
6. 若未準備完成 → 顯示「請先開啟 Photoshop」與「重新檢查」；使用者開啟 Photoshop 後按「重新檢查」即可繼續，不需重新選擇 CSV / 素材資料夾。
7. Ready Check 通過 → Control Center 顯示：素材處理中 N / M，完成後將自動開啟素材審閱。
8. 背景處理期間 Control Center 不可操作（不可修改文字、不可切換工單、不可下載、不可開始新的工作）。
9. 完成 → 顯示：素材處理完成（停留約 0.5～1 秒，僅為 UI 轉場，不是完成判定依據）。
10. 系統自動開啟素材審閱（Review Workspace，UI 不變），使用者不需點擊「開啟素材審核」。
11. 使用者操作：核准 / 重新去背 / 裁切 / 橡皮擦。
12. Completion Screen：
    - Needs Rerun = 0 → 返回控制台。
    - Needs Rerun > 0 → 「重新去背素材（N）」。
13. 使用者點擊「重新去背素材（N）」→ 系統再次進入相同 Processing Mode（Photoshop 全程保持開啟，不重新啟動）。
14. 完成後自動回到素材審閱，Filter 自動切到「待重新去背」，只顯示本輪重新處理的素材。
15. 重複至 Needs Rerun = 0，使用者按「返回控制台」，Workflow 結束。
```

Every visible state must be phrased in the approved terms: 素材處理中、素材處理完成、素材審閱、核准、重新去背、待重新去背、重新去背素材（N）, plus the Ready-Check-not-passed prompt「請先開啟 Photoshop」/「重新檢查」（the only sanctioned place Photoshop's name appears). There is no "等待審閱" term or state — completion transitions straight into Review Workspace. No other technical vocabulary should reach the user.

### 2.1 What changes for the user vs. today

| Step | Today (v0.4.5) | AI Workflow (Target) |
|---|---|---|
| Photoshop prerequisite | N/A (user runs Photoshop manually at the point they need it) | User opens Photoshop once before starting the session; console runs a Ready Check and prompts "請先開啟 Photoshop" / "重新檢查" if not ready |
| Trigger processing | User manually exports manifest, runs Photoshop Runner | Automatic: Manifest built and sent via SPX AD Runtime's Contract once Ready Check passes |
| Bring results back | User manually runs "Import Processed Folder" | Automatic detection + auto-import (`importProcessedAssets`) |
| Status visibility | None (silent until user checks) | 素材處理中 (N/M) → 素材處理完成 → auto-enter 素材審閱 (no separate waiting state) |
| Rerun loop | User manually re-exports rerun manifest, re-runs Photoshop, re-imports | Automatic, triggered by one click; Photoshop stays open throughout |
| Review Workspace | Unchanged | Unchanged |

---

## 3. Information Architecture

### 3.1 Processing Mode: a new Global Interaction Lock and Workflow State (not merely a status surface)

Processing Mode is not simply a status indicator AI Workflow adds to Control Center — it is a new **Global Interaction Lock** (Control Center becomes non-interactive while background processing runs) combined with a **Workflow State** (Idle → Ready Check → Processing → Complete → Review, tracked across the whole session, not just a visual badge). The visible status text is one surface of this state, extending the existing "素材審核" header entry (not replacing it — Control Center UI Upgrade is Locked), but the lock itself reaches the entire Control Center, not just that one entry. Resolved states (this is a decision, not an open question):

- `請先開啟 Photoshop` / `重新檢查` — shown only when Ready Check has not passed. The one sanctioned place Photoshop's name appears in the UI.
- `素材處理中（N / M）` — Processing Mode active; Control Center fully locked (Global Interaction Lock in effect, not just this one status badge).
- `素材處理完成` — a 0.5–1s transition state only, immediately followed by automatically opening Review Workspace. It is not a holding state the user can linger in, and there is no additional "等待審閱" state after it.

### 3.2 No new information architecture inside Review Workspace

Navigator, Dynamic Inspector, Decision Area, and Completion Screen are unchanged. AI Workflow's only IA surface is the Control Center status indicator described above, plus whatever minimal state is needed to drive it.

### 3.3 Terminology additions

No new internal values are introduced beyond what v0.4.5 already defines (`pending` / `processed` / `approved` / `needs_rerun`). AI Workflow needs one additional user-facing state concept — "background job in progress" — which should map to existing `assetPipelineState` per-asset `status` counts rather than inventing a new schema field, pending this document's own Implementation Proposal confirmation.

---

## 4. Architecture Questions (Open — need answers before Implementation Proposal)

These are genuine open questions for **AI Workflow's own scope** (Control Center orchestration). Questions about how Photoshop itself is triggered, detected as ready, or executes batch processing are SPX AD Runtime's responsibility — Locked, not repeated here (Photoshop Automation as a Phase has not yet completed formal Release).

Resolved because SPX AD Runtime's Contract and Architecture are Locked (no longer open questions for this document): how the console detects Photoshop readiness and completion (SPX AD Runtime's Ready / Status operations, called by AI Workflow), and whether a rerun uses the same Contract flow as a first run (it does — per Photoshop-Automation-Proposal.md Section 18, every new Execution, including reruns, goes through the same Ready Check).

1. **State machine for "processing"**: Is `素材處理中` derived from existing `assetPipelineState.assets[...].status` counts (e.g., count of `pending` vs `processed`), or does it need a new top-level "job run" state? Recommend deriving from existing per-asset status to avoid new schema, consistent with how Needs Rerun Collection is already derived rather than stored. Still open.
2. **Concurrency / one run at a time**: Can the user start a new CSV import or asset folder selection while background processing is in progress? What happens to an in-flight run? Still open.
3. **Partial failure**: If a subset of assets fail to process, how is that surfaced in Control Center without exposing Photoshop-level errors? (SPX AD Runtime reports the failure with a Reason; AI Workflow decides how to display it.) Still open — see Error/Recovery section below.
4. **Permission model**: Automatic folder access (source folder, output folder) likely still requires the same File System Access API permission grants used today. Can these be requested once and remembered, or does the browser require re-granting each session? This affects how seamless Ready-Check-passed → hands-off can really be. Still open.
5. **Backward compatibility**: Does the manual flow (Export Manifest → run Photoshop yourself → Import Processed Folder) need to remain available as a fallback/power-user path, or is it fully replaced? Recommend keeping it available but hidden, consistent with Control Center UI Upgrade's existing principle of preserving underlying manifest/import capability without exposing it as the primary entry. Still open.
6. **Ready Check UX details**: How long does the console wait after the user clicks "重新檢查" before showing a result? Does repeated failure show any additional guidance beyond repeating the same prompt? Still open.

---

## 5. Error / Recovery Scenarios

All scenarios must resolve to a message using only the approved user vocabulary — no Photoshop/Manifest/Runner/Processed Folder exposure — plus a safe recovery action.

| Scenario | Proposed user-facing behavior |
|---|---|
| Photoshop Ready Check does not pass | Show "請先開啟 Photoshop" / "素材處理需要使用 Photoshop。開啟後按「重新檢查」即可繼續。" with a "重新檢查" action. This is the one sanctioned place Photoshop's name appears. Does not consume or discard the already-selected CSV / asset folder. |
| Background processing fails to start after Ready Check passed | Show an error state distinct from `素材處理中`, e.g. "素材處理失敗，請重試" with a retry action. Must not silently hang on `素材處理中（0/N）` forever. |
| Background processing partially completes (some assets fail) | **Proposed, still open (see Architecture Question 3 — not yet confirmed by Proposal Audit):** treat succeeded assets as `processed` (enter Review Workspace normally); failed assets remain `pending` and are visibly flagged in Navigator using existing Review Status vocabulary — no new status needed if `pending` already covers "not yet processed." |
| Completion detected but auto-import fails | Fall back to existing manual "Import Processed Folder" affordance (kept, per Architecture Question 5) so the user is never fully blocked. |
| User closes the console / navigates away mid-processing | On return, Control Center must reflect true current state (`素材處理中` / `素材處理完成`, then immediately auto-entering Review Workspace — there is no `等待審閱` holding state to restore) rather than resetting or showing stale state — needs a defined resume/rehydrate behavior. |
| User starts a new CSV import while a background run is in progress | Must decide: block new import until current run settles, or cancel/discard the in-flight run. Needs product decision (see Architecture Question 2). |
| Rerun triggered twice in a row (double click) | Must guard against duplicate manifest export / duplicate background runs, similar to existing `N=0` disabled-button guard on the rerun button today. |
| Underlying Photoshop Adapter output doesn't match expected asset keys (already a documented FAQ case in Photoshop Asset Pipeline.md) | Same fallback as today: unmatched assets are recorded and do not block matched assets from proceeding; user-facing message should not mention "assetKey" — needs a plain-language equivalent, e.g. "N 個素材處理結果無法對應，請確認素材未被更名". |

---

## 6. Phase Breakdown (Proposed)

This is a suggested breakdown for Proposal Audit to validate or adjust — not a commitment. SPX AD Runtime's Contract (Ready, Execute, Status) and Architecture are Locked and available for AI Workflow to call — Photoshop Automation has progressed through Proposal Freeze, Implementation Proposal Freeze, Coding, and Runtime Validation (Development PASS) to reach this point. Photoshop Automation as a Phase is **not** yet a Completed Phase, and real End-to-End Integration between it and AI Workflow has not yet happened: Development Runtime Validation is done, but real End-to-End Workflow Validation happens together once AI Workflow also completes Coding. AI Workflow does not implement any Photoshop-side trigger, detection, or execution mechanism itself.

1. **AI Workflow — Ready Check Integration**: build the Control Center side of Ready Check (calling SPX AD Runtime's `Ready` operation, showing "請先開啟 Photoshop" / "重新檢查" when not ready), without yet wiring Processing Mode or Manifest sending.
2. **AI Workflow — Manifest Send + Processing Mode Core**: build and send the Manifest via existing `buildPhotoshopJobManifest`, wire Processing Mode UI (`素材處理中 N/M`, Control Center lock), and read back status from SPX AD Runtime's `Status` operation for the *first* run (CSV import → folder select → processed assets ready).
3. **AI Workflow — Auto Import + Auto Review Entry**: reuse existing `importProcessedAssets()` to auto-scan and match, then auto-open Review Workspace with no manual click. No changes to Review Workspace itself.
4. **AI Workflow — Rerun Loop Automation**: extend the same orchestration to the `重新去背素材（N）` trigger, closing the loop back into Review Workspace's existing "待重新去背" filter, confirming Photoshop is not relaunched.
5. **AI Workflow — Error / Recovery Hardening**: implement the fallback and error-state behaviors from Section 5.
6. **AI Workflow — Browser Validation + Jamie Manual Validation**: full regression pass confirming Review Workspace UI, Crop/Eraser, Save flow, Project State, and manual fallback path are all unaffected. Per the Locked SOP, this is where AI Workflow's own Coding gets exercised together with Photoshop Automation's for the first true End-to-End Workflow — Jamie Manual Validation, Code Commit, Documentation Update, and Git Tag for both Phases happen together after this step.

Each numbered item above should go through its own Implementation Proposal before coding, per the existing SOP — this phase breakdown is not a license to batch them into one large change.

Note: SPX AD Runtime's Contract shape is fixed and trustworthy for AI Workflow's Implementation Proposal and Coding to build against, but real macOS + Photoshop behavior has only been exercised via Development Runtime Validation so far — not a true End-to-End Workflow. That gap closes together, for both Phases, in the combined validation described in step 6.

---

## 7. Boundaries Reaffirmed

Per `docs/AI-HANDOFF.md` and `docs/DOCUMENTATION.md`:

- Review Workspace UI Upgrade (v0.4.5) is a Locked Completed Phase. This proposal must not redesign Navigator, Dynamic Inspector, Decision Area, or Completion Screen.
- Control Center UI Upgrade is a Locked Completed Phase. This proposal must not redesign its header/entry structure beyond introducing Processing Mode (a new Global Interaction Lock and Workflow State, not merely a status surface — see Section 3.1) and its Ready Check status surface.
- Photoshop Adapter, Asset Pipeline schema, Review Decision Model, Approved Asset Resolver, and Project State schema must not change as part of this proposal.
- All automation must maintain existing State Boundaries: AI Workflow's Control Center orchestration may call existing Asset Pipeline / Photoshop Adapter / Review Workspace interfaces and SPX AD Runtime's Ready / Execute / Status Contract, but must not write directly to Canvas, `layoutStates`, or Project State schema.
- **Responsibility split (not overlapping) with Photoshop Automation**: SPX AD Runtime (delivered by Photoshop Automation; its Architecture and Contract are Locked) owns the Ready Contract, Manifest/Rerun-Manifest receipt, calling the removal-background core via its Platform Adapter, and Progress/Completion/Failure reporting. AI Workflow owns building/sending the Manifest, the Control Center side of Ready Check, Processing Mode display and lock, reading reported status, auto-import, and auto-opening Review Workspace. AI Workflow must not implement or redesign SPX AD Runtime, the Platform Adapter Interface, or any Platform Adapter; SPX AD Runtime must not implement Control Center UI, Processing Mode, auto-import, or auto-opening Review Workspace.
- The system never auto-installs, auto-launches, or auto-closes Photoshop, at any point in this Proposal's scope — this is a permanent design constraint, not a temporary limitation of "not yet implemented."
- **Asset Replacement Boundary** (per Photoshop-Automation-Proposal.md Section 17, Locked): AI Workflow's Manifest-building must not send manually-replaced assets (replaced via the console's existing right-side asset panel) back into SPX AD Runtime / Photoshop Automation. Manually-replaced assets stay outside the Ready Check / Execute flow entirely.
- Extension System is not part of this Proposal's scope and is not a future phase to plan around — it has been removed from the roadmap entirely.
