# SPX AD Runtime (Photoshop Automation)

Scope: implementation reference for this module. This is not a
project-level document under `docs/`; the formal, up-to-date description of
AI Workflow / Photoshop Automation status lives in `docs/AI-HANDOFF.md`,
`docs/Architecture.md`, and `docs/Photoshop Asset Pipeline.md` — this file
only documents the Runtime's own files and HTTP contract.

Status: AI Workflow / Photoshop Automation are Completed and are the
project's primary flow (Ready Check → Processing Mode → Auto Import → Auto
Open Review → automatic Rerun), driven by the Control Center calling this
Runtime automatically. macOS and Windows have completed real-machine
Development Validation with Photoshop 2025; the Windows Validation and Jamie
Manual Validation both passed.

## What this is

A small local helper process ("SPX AD Runtime") implementing the Ready /
Execution / Status / Result Contract. The Control Center's AI Workflow code
(`js/ai-workflow-*.js`) calls it to ask "is Photoshop ready", send it a
Manifest + each asset's raw bytes to process, poll for progress/completion,
and retrieve each processed PNG — without the user manually double-clicking
`tools/photoshop/run-photoshop-manifest.command` and picking folders by
hand. That manual path still exists as an independent fallback (see
`tools/photoshop/README.md`), not as the primary flow.

This is an explicitly approved, scoped exception to the project's general
"no native bridge / local helper / protocol handler" boundary, limited to:
Ready Contract, Execution Contract, Status Contract, Result Contract,
Runtime Health Detection, Platform Adapter Interface, macOS Photoshop
Adapter, and Windows Photoshop Adapter. It does not extend to any other part
of the console.

## What this is not

- Not Control Center UI, not Processing Mode UI, not the Manifest Builder,
  not Auto Import, not Auto Matching, not Auto Open Review Workspace. Those
  are implemented in `js/ai-workflow-*.js` (AI Workflow), which calls this
  Runtime over HTTP; this Runtime itself has no knowledge of Control Center,
  Project State, Review Workspace, `layoutStates`, Canvas, Thumbnail, or
  Batch.
- Not a replacement for the existing manual flow. Double-clicking
  `tools/photoshop/run-photoshop-manifest.command` still works exactly as
  before, as an independent fallback entry point.
- `start-spx-ad-runtime.command` remains a **Development Tool** (see below)
  — it is not how end users start the Runtime; the Control Center's own
  Ready Check flow is what end users interact with directly.

## Development vs Production

**Current (Completed, Development-validated on macOS):**

```text
Control Center (AI Workflow, js/ai-workflow-*.js)
  ↓ HTTP (127.0.0.1:8901)
SPX AD Runtime (this module)
  ↓
Platform Adapter (macOS / Windows)
```

The Runtime's lifecycle today is still started by hand for development /
validation via `start-spx-ad-runtime.command`; a packaged Production
Launcher that starts/stops the Runtime automatically alongside the SPX AD
Application exists as source + build docs (`production_launcher.py`,
`production_launcher_macos.spec`, `production_launcher_windows.spec`,
`BUILD.md`) but Production Deployment itself has **Not Started**.

`start-spx-ad-runtime.command` is used for: development, debug, Runtime
Validation, and manual testing today. Until Production Deployment ships,
running it by hand (with Photoshop already open) is what makes the Control
Center's Ready Check pass.

## Files

- `spx_ad_runtime.py` — SPX AD Runtime core. Platform-agnostic: contains no
  AppleScript, no Windows-specific code, and no knowledge of Control Center,
  Project State, Review Workspace, or any Locked Completed Phase. Exposes a
  local-only HTTP interface on `127.0.0.1:8901`:
  - `GET /ready` → `{"ready": true}` or `{"ready": false, "reason": "photoshop_closed"}`
  - `POST /execute` with JSON body `{"manifest": {...}}` (the Manifest only —
    no asset content) → `{"accepted": true, "executionId": "..."}`, or
    `{"accepted": false, "reason": "busy"}` while a pending/Running execution
    already exists, or `{"accepted": false, "reason": "manifest_invalid"}`.
  - `POST /executions/{executionId}/assets/{assetId}` with the asset's raw
    binary body → `{"received": true}` or `{"received": false, "reason": "..."}`.
    `assetId` is the stringified index of that item in the Manifest's
    `items[]`. Once every expected `assetId` has arrived, the Runtime
    triggers the Platform Adapter automatically against its own hidden,
    Runtime-managed Workspace directory (never a user-visible folder).
  - `GET /status/{executionId}` → `{"state": "Idle"|"Running", "progress": {"current":N,"total":M}|null, "lastResult": {...}|null}` for that specific execution, or 404 if unknown.
  - `GET /executions/{executionId}/results/{assetId}` → the raw processed PNG
    bytes (`Content-Type: image/png`) for that one asset, once
    `lastResult.state` is `"Completed"`. 409 if not finished yet, 404 if
    missing/failed, 410 if already fully retrieved and cleaned up.
  - Writing the retrieved bytes into the real 素材資料夾/Processed/ is the
    browser's job (Auto Import, `js/ai-workflow-auto-import.js`) — this
    Runtime only ever writes into its own hidden Workspace.
- `platform_adapter.py` — Platform Adapter Interface + OS-based factory.
- `macos_adapter.py` — macOS implementation. Invokes the existing, unmodified
  `tools/photoshop/run-photoshop-manifest.applescript` non-interactively
  (that file already accepts `manifestPath / originalFolder / outputFolder`
  as positional arguments and does not itself show any picker dialogs — the
  interactive dialogs live only in `run-photoshop-manifest.command`). Ready
  Check uses the `com.adobe.Photoshop` bundle id (not a process-name string
  match), so it is stable across Photoshop versions. Completed, validated on
  a real macOS + Photoshop 2025 machine.
- `windows_adapter.py` — pywin32 (`win32com.client`) implementation.
  `is_ready()` / `is_alive()` use `GetActiveObject("Photoshop.Application")`
  (only connects to an already-open instance, never auto-launches);
  `execute()` reads the shared `remove-background.jsx` as UTF-8, uses
  `json.dumps()` to inject `manifestPath`, `originalFolder`, and
  `outputFolder`, then calls `app.DoJavaScript(full_script)`. Windows
  Validation and Jamie Manual Validation passed on a real Windows + Photoshop
  2025 machine, producing both `photoshop-run-report.json` and Processed PNG.
  The previously validated `DoJavaScriptFile()` entry failed in this
  environment and is not used.
- `production_launcher.py`, `production_launcher_macos.spec`,
  `production_launcher_windows.spec`, `BUILD.md`,
  `requirements-windows.txt` — Production Launcher source and packaging docs
  (PyInstaller). Production Deployment itself has Not Started.
- `validate_runtime.py` — self-contained Runtime Validation harness (see its
  own module docstring); run with `python3 validate_runtime.py`.
- `start-spx-ad-runtime.command` — starts the Runtime for development /
  debug / Runtime Validation / manual testing today (see "Development vs
  Production" above).

## What this Runtime deliberately does not decide

- Output filenames: entirely the Manifest's job. The current, Locked Naming
  Contract is "original asset basename + `.png`" (e.g. `商品A.jpg` /
  `商品A.webp` → `商品A.png`) — never `{assetKey}__processed.png` or any
  jobId/role/slot suffix. `assetKey` is metadata only, never part of a
  processed image's actual filename. This Runtime and its Adapters never
  construct a filename themselves; they only ever use whatever
  `item.output.filename` the Manifest already contains.
- When Ready Check should be called, when Execute should be triggered, what
  UI to show, how to recover from Failure: all AI Workflow's job
  (`js/ai-workflow-*.js`).
- The exact Reason taxonomy used here (`manifest_invalid`,
  `photoshop_closed`, `all_items_failed`, `some_items_failed`,
  `unknown_error`, `busy`, `execution_not_found`, `asset_not_expected`,
  `not_ready`, `gone`) can be extended without changing the Contract shape.
