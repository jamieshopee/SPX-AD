# AI Workflow — Product Proposal (Draft)

Status: **Draft / Paused pending Photoshop Automation.** Not yet Proposal Freeze, not yet Approved. Roadmap has been split: Photoshop Automation must be completed before AI Workflow can enter Proposal Freeze / Implementation Proposal.  
Originating branch: `feature/ai-workflow` (drafted). Current Active Phase work has moved to `feature/photoshop-automation`.  
Depends on: `v0.4.5` (Review Workspace UI Upgrade, Locked Completed Phase) **and** Photoshop Automation (current Active Phase, Proposal stage) being completed.  
Blocking Dependency: **Photoshop Automation must be completed before AI Workflow can enter Proposal Freeze / Implementation Proposal.** See `docs/Photoshop Asset Pipeline.md` (Future Automation Target A) and `docs/Architecture.md` (Future Photoshop Automation Architecture) for the current status of that Phase.  
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

Nothing below is approved, and none of the User Workflow discussion held so far (Proposal Freeze 01 / Revision 01 in chat) has been folded into or should be read as a final Freeze of this document. Jamie should read, edit, and decide when to freeze it before Proposal Audit begins — after Photoshop Automation is complete.

### Audit Finding Summary（reference only, does not change this Proposal's content）

The Current Photoshop Pipeline Architecture Audit confirmed that several capabilities this Proposal assumed are largely reusable rather than needing to be rebuilt: the Control Center Manifest Builder (`buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest`, already pure in-memory functions), Processed Folder Matching (`importProcessedAssets`), Needs Rerun Collection (`getNeedsRerunAssets`), and automatic entry into Review Workspace with the correct filter after an import already exist today. What does **not** exist today, and is the actual blocking dependency, is any mechanism for the Control Center to automatically trigger Photoshop's existing one-shot AppleScript + JSX Runner, or to detect Photoshop's readiness — that gap is exactly what the Photoshop Automation Phase exists to resolve. Watcher / Heartbeat / fixed Runtime Folder are discussion directions only and must not be treated as a selected solution until Photoshop Automation reaches Proposal Freeze.

### Current Product Decisions（已由 Jamie 決定，取代本文件先前的部分假設；不代表 Proposal 已 Freeze 或已 Approved）

These decisions **supersede** earlier assumptions in this document (the older assumptions are corrected in place below, not left standing):

- The user must self-open Photoshop before using the SPX AD console (one-time prerequisite each session). This supersedes the earlier framing that the user "never needs to open Photoshop" / "is completely unaware Photoshop exists."
- The system does not auto-install, auto-launch, or auto-close Photoshop. There is no mechanism, now or planned, that spawns or quits the Photoshop application.
- After Photoshop Ready Check passes, the user does not need to operate Photoshop again for the rest of the session (including the rerun loop — Photoshop stays open throughout, it is not relaunched).
- During Processing Mode, Control Center is locked: no text edits, no job switching, no downloads, no starting new work.
- After the completion prompt (0.5–1s transition only, not a completion signal), the console automatically enters Review Workspace. The user never has to click "開啟素材審核" to get there. There is no separate "等待審閱" holding state between completion and entering review — this resolves what was previously an open question in this document.
- After a rerun completes, the console automatically returns to Review Workspace filtered to "待重新去背" (this rerun's assets only).
- Extension System has been removed from the roadmap entirely (not Completed, not Current, not Future, not in Next Planned Phase Order). It is not a future phase this Proposal should plan around.
- Responsibility is split across two Phases, and this Proposal (AI Workflow) owns only one side of it: **Photoshop Automation** (separate, prerequisite Phase) owns the Photoshop-side Ready Contract, Manifest/Rerun-Manifest receipt, calling the existing removal-background core, and Progress/Completion/Failure status reporting. **AI Workflow** (this document) owns Control Center orchestration only: building and sending the Manifest via that Contract, running the Control Center side of Ready Check (showing "請先開啟 Photoshop" / "重新檢查" when not ready), showing and locking Processing Mode, reading back reported status, auto-running existing `importProcessedAssets()`, and auto-opening Review Workspace. AI Workflow must not attempt to own or redesign the Photoshop-side trigger/detection mechanism — that belongs to Photoshop Automation's own Proposal.

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
- Not redesigning Control Center UI Upgrade's header/entry structure beyond adding a Processing Mode / Ready Check status surface.
- Not changing Crop / Eraser core logic, Undo Stack, or Save Runtime Processed Asset Flow.
- Not changing Photoshop Adapter's manifest schema or its "only reads manifest, only writes processed assets" boundary.
- Not auto-installing, auto-launching, or auto-closing Photoshop, and not eliminating the one-time "user opens Photoshop before starting" step.
- Not implementing the Photoshop-side Ready Contract, trigger, or execution mechanism itself — that is Photoshop Automation's Proposal, a separate prerequisite Phase. AI Workflow only calls that Contract once it exists.
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

Every visible state must be phrased in the approved terms: 素材處理中、素材處理完成、素材審閱、核准、重新去背、待重新去背、重新去背素材（N）, plus the Ready-Check-not-passed prompt「請先開啟 Photoshop」/「重新檢查」（the only sanctioned place Photoshop's name appears). There is no "等待審閱" term or state — that ambiguity from earlier drafts is resolved: completion transitions straight into Review Workspace. No other technical vocabulary should reach the user.

### 2.1 What changes for the user vs. today

| Step | Today (v0.4.5) | AI Workflow (Target) |
|---|---|---|
| Photoshop prerequisite | N/A (user runs Photoshop manually at the point they need it) | User opens Photoshop once before starting the session; console runs a Ready Check and prompts "請先開啟 Photoshop" / "重新檢查" if not ready |
| Trigger processing | User manually exports manifest, runs Photoshop Runner | Automatic: Manifest built and sent via Photoshop Automation's Contract once Ready Check passes |
| Bring results back | User manually runs "Import Processed Folder" | Automatic detection + auto-import (`importProcessedAssets`) |
| Status visibility | None (silent until user checks) | 素材處理中 (N/M) → 素材處理完成 → auto-enter 素材審閱 (no separate waiting state) |
| Rerun loop | User manually re-exports rerun manifest, re-runs Photoshop, re-imports | Automatic, triggered by one click; Photoshop stays open throughout |
| Review Workspace | Unchanged | Unchanged |

---

## 3. Information Architecture

### 3.1 New user-visible surface: Processing Status

A status indicator/surface lives in Control Center (extending the existing "素材審核" header entry, not replacing it — Control Center UI Upgrade is Locked). Resolved states (this is a decision, not an open question):

- `請先開啟 Photoshop` / `重新檢查` — shown only when Ready Check has not passed. The one sanctioned place Photoshop's name appears in the UI.
- `素材處理中（N / M）` — Processing Mode active; Control Center locked.
- `素材處理完成` — a 0.5–1s transition state only, immediately followed by automatically opening Review Workspace. It is not a holding state the user can linger in, and there is no additional "等待審閱" state after it — that ambiguity from earlier drafts of this document is now resolved.

### 3.2 No new information architecture inside Review Workspace

Navigator, Dynamic Inspector, Decision Area, and Completion Screen are unchanged. AI Workflow's only IA surface is the Control Center status indicator described above, plus whatever minimal state is needed to drive it.

### 3.3 Terminology additions

No new internal values are introduced beyond what v0.4.5 already defines (`pending` / `processed` / `approved` / `needs_rerun`). AI Workflow needs one additional user-facing state concept — "background job in progress" — which should map to existing `assetPipelineState` per-asset `status` counts rather than inventing a new schema field, pending Architecture Proposal confirmation.

---

## 4. Architecture Questions (Open — need answers before Implementation Proposal)

These are genuine open questions for **AI Workflow's own scope** (Control Center orchestration). Questions about how Photoshop itself is triggered, detected as ready, or executes batch processing belong to Photoshop Automation's own Proposal and are out of scope here — AI Workflow only consumes that Contract once it exists.

1. ~~**Trigger mechanism**: How does the browser-based console "automatically launch Photoshop in the background"?~~ **Superseded by Product Decision.** The console does not launch Photoshop; the user opens it manually, and the console runs a Ready Check against the already-open Photoshop. How that Ready Check is technically implemented is Photoshop Automation's open question, not AI Workflow's.
2. ~~**Completion detection**: local-helper vs polling?~~ **Partially superseded.** AI Workflow's job is to *read* the Completion status that Photoshop Automation's Contract reports — it does not need to invent its own detection mechanism against the processed folder directly. Remaining AI Workflow question: what shape does that Contract's read API take from the Control Center side (e.g., polling a status object, subscribing to an event), given Photoshop Automation hasn't Frozen this yet?
3. **State machine for "processing"**: Is `素材處理中` derived from existing `assetPipelineState.assets[...].status` counts (e.g., count of `pending` vs `processed`), or does it need a new top-level "job run" state? Recommend deriving from existing per-asset status to avoid new schema, consistent with how Needs Rerun Collection is already derived rather than stored. Still open.
4. **Concurrency / one run at a time**: Can the user start a new CSV import or asset folder selection while background processing is in progress? What happens to an in-flight run? Still open.
5. **Partial failure**: If a subset of assets fail to process, how is that surfaced in Control Center without exposing Photoshop-level errors? (Photoshop Automation reports the failure; AI Workflow decides how to display it.) Still open — see Error/Recovery section below.
6. **Permission model**: Automatic folder access (source folder, output folder) likely still requires the same File System Access API permission grants used today. Can these be requested once and remembered, or does the browser require re-granting each session? This affects how seamless Ready-Check-passed → hands-off can really be. Still open.
7. **Backward compatibility**: Does the manual flow (Export Manifest → run Photoshop yourself → Import Processed Folder) need to remain available as a fallback/power-user path, or is it fully replaced? Recommend keeping it available but hidden, consistent with Control Center UI Upgrade's existing principle of preserving underlying manifest/import capability without exposing it as the primary entry. Still open.
8. **Rerun trigger boundary**: Today "重新去背素材（N）" only calls `exportPhotoshopRerunManifest`. Automating this means AI Workflow sends the rerun Manifest through the same Photoshop Automation Contract used for the first run, filtered to `needs_rerun` assets. Does Photoshop Automation's Contract treat a rerun as identical to a first run (same Ready Check, same Processing Mode), or does it need a distinct state? Still open — depends on Photoshop Automation's Proposal.
9. **Ready Check UX details** (new): How long does the console wait after the user clicks "重新檢查" before showing a result? Does repeated failure show any additional guidance beyond repeating the same prompt?

---

## 5. Error / Recovery Scenarios

All scenarios must resolve to a message using only the approved user vocabulary — no Photoshop/Manifest/Runner/Processed Folder exposure — plus a safe recovery action.

| Scenario | Proposed user-facing behavior |
|---|---|
| Photoshop Ready Check does not pass | Show "請先開啟 Photoshop" / "素材處理需要使用 Photoshop。開啟後按「重新檢查」即可繼續。" with a "重新檢查" action. This is the one sanctioned place Photoshop's name appears. Does not consume or discard the already-selected CSV / asset folder. |
| Background processing fails to start after Ready Check passed | Show an error state distinct from `素材處理中`, e.g. "素材處理失敗，請重試" with a retry action. Must not silently hang on `素材處理中（0/N）` forever. |
| Background processing partially completes (some assets fail) | Treat succeeded assets as `processed` (enter Review Workspace normally); failed assets remain `pending` and are visibly flagged in Navigator using existing Review Status vocabulary — no new status needed if `pending` already covers "not yet processed." |
| Completion detected but auto-import fails | Fall back to existing manual "Import Processed Folder" affordance (kept, per Architecture Question 7) so the user is never fully blocked. |
| User closes the console / navigates away mid-processing | On return, Control Center must reflect true current state (`素材處理中` / `素材處理完成`, then immediately auto-entering Review Workspace — there is no `等待審閱` holding state to restore) rather than resetting or showing stale state — needs a defined resume/rehydrate behavior. |
| User starts a new CSV import while a background run is in progress | Must decide: block new import until current run settles, or cancel/discard the in-flight run. Needs product decision (see Architecture Question 4). |
| Rerun triggered twice in a row (double click) | Must guard against duplicate manifest export / duplicate background runs, similar to existing `N=0` disabled-button guard on the rerun button today. |
| Underlying Photoshop Adapter output doesn't match expected asset keys (already a documented FAQ case in Photoshop Asset Pipeline.md) | Same fallback as today: unmatched assets are recorded and do not block matched assets from proceeding; user-facing message should not mention "assetKey" — needs a plain-language equivalent, e.g. "N 個素材處理結果無法對應，請確認素材未被更名". |

---

## 6. Phase Breakdown (Proposed)

This is a suggested breakdown for Proposal Audit to validate or adjust — not a commitment. All items below assume Photoshop Automation has already reached Proposal Freeze and Implementation, and its Contract (Ready Check, Manifest receipt, Progress/Completion/Failure reporting) exists for AI Workflow to call. AI Workflow does not implement any Photoshop-side trigger, detection, or execution mechanism itself.

1. **AI Workflow — Ready Check Integration**: build the Control Center side of Ready Check (calling Photoshop Automation's Contract, showing "請先開啟 Photoshop" / "重新檢查" when not ready), without yet wiring Processing Mode or Manifest sending.
2. **AI Workflow — Manifest Send + Processing Mode Core**: build and send the Manifest via existing `buildPhotoshopJobManifest`, wire Processing Mode UI (`素材處理中 N/M`, Control Center lock), and read back Completion from Photoshop Automation's Contract for the *first* run (CSV import → folder select → processed assets ready).
3. **AI Workflow — Auto Import + Auto Review Entry**: reuse existing `importProcessedAssets()` to auto-scan and match, then auto-open Review Workspace with no manual click. No changes to Review Workspace itself.
4. **AI Workflow — Rerun Loop Automation**: extend the same orchestration to the `重新去背素材（N）` trigger, closing the loop back into Review Workspace's existing "待重新去背" filter, confirming Photoshop is not relaunched.
5. **AI Workflow — Error / Recovery Hardening**: implement the fallback and error-state behaviors from Section 5.
6. **AI Workflow — Browser Validation + Jamie Manual Validation**: full regression pass confirming Review Workspace UI, Crop/Eraser, Save flow, Project State, and manual fallback path are all unaffected.

Each numbered item above should go through its own Implementation Proposal before coding, per the existing SOP — this phase breakdown is not a license to batch them into one large change.

---

## 7. Boundaries Reaffirmed

Per `docs/AI-HANDOFF.md` and `docs/DOCUMENTATION.md`:

- Review Workspace UI Upgrade (v0.4.5) is a Locked Completed Phase. This proposal must not redesign Navigator, Dynamic Inspector, Decision Area, or Completion Screen.
- Control Center UI Upgrade is a Locked Completed Phase. This proposal must not redesign its header/entry structure beyond adding the Processing Mode / Ready Check status surface described above.
- Photoshop Adapter, Asset Pipeline schema, Review Decision Model, Approved Asset Resolver, and Project State schema must not change as part of this proposal.
- All automation must maintain existing State Boundaries: AI Workflow's Control Center orchestration may call existing Asset Pipeline / Photoshop Adapter / Review Workspace interfaces and Photoshop Automation's Contract, but must not write directly to Canvas, `layoutStates`, or Project State schema.
- **Responsibility split (not overlapping) with Photoshop Automation**: Photoshop Automation owns the Ready Contract, Manifest/Rerun-Manifest receipt, calling the removal-background core, and Progress/Completion/Failure reporting. AI Workflow owns building/sending the Manifest, the Control Center side of Ready Check, Processing Mode display and lock, reading reported status, auto-import, and auto-opening Review Workspace. AI Workflow must not implement Photoshop-side trigger/detection/execution; Photoshop Automation must not implement Control Center UI, Processing Mode, auto-import, or auto-opening Review Workspace.
- The system never auto-installs, auto-launches, or auto-closes Photoshop, at any point in this Proposal's scope — this is a permanent design constraint, not a temporary limitation of "not yet implemented."
- Extension System is not part of this Proposal's scope and is not a future phase to plan around — it has been removed from the roadmap entirely.
