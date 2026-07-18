# SPX Helper / SPX AD Runtime (Photoshop Automation)

Scope: implementation reference for this module. This is not a
project-level document under `docs/`; the formal, up-to-date description of
AI Workflow / Photoshop Automation status lives in `docs/AI-HANDOFF.md`,
`docs/Architecture.md`, and `docs/Photoshop Asset Pipeline.md` — this file
only documents the Helper / Runtime module files and HTTP boundary.

Status: SPX Helper Core, Runtime Productization Phase 1 Foundation, Phase 2
Windows Packaging, Phase 3 macOS Packaging, AI Workflow, and Photoshop Automation are Completed. SPX Helper owns the
production localhost boundary and delegates allowed requests to the existing
RuntimeCore without changing its contract. The Phase 1 Product Host owns only
the desktop Foundation lifecycle: Running / Working / Attention, one Helper
instance, the fixed Tray / Menu Bar surface, Quit, and Restart. Phase 2 packages
that unchanged Product Host with PyInstaller and WiX Toolset SDK 5.0.2 as a
per-machine Windows MSI. Phase 3 packages the same Product Host as a PyInstaller
`SPX Helper.app` and macOS PKG installed at `/Applications/SPX Helper.app`, with
LaunchAgent login startup. Update, uninstall, and final validation remain later
phases. Developer ID signing and Apple Notarization are credential-dependent and
have not been validated.

Manual validation result: macOS completed the full Happy Path through Run
Report and Processed PNG, including a second Execute after Helper restart.
Windows completed PyInstaller EXE and WiX MSI build/install, background
residency, System Tray, Browser, Ready, Execute, RuntimeCore, Windows Adapter,
Runtime Contract, Run Report, and Processed PNG validation.
macOS completed local app／PKG build and install validation, Fresh Install,
immediate launch, Menu Bar, Applications launch, Restart, Quit, Login Startup,
and GitHub Pages → Helper → Photoshop → Processed PNG. The PKG relocation issue
was fixed with a non-relocatable component plist and revalidated with the staging
App retained. Phase 3 Bug Fix Commit
`781df79c232a9644cc0bd69653e390ef70d12964` replaced the install-complete
`/usr/bin/open` launch with LaunchAgent bootstrap plus non-forcing kickstart so
the Helper does not inherit PackageKit's temporary sandbox environment. Clean
Install, the normal user temp environment, and the 5-job／22-asset production
Happy Path were revalidated PASS by Jamie.

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

## SPX Helper boundary

```text
GitHub Pages (official Origin)
  ↓ HTTPS browser page → local HTTP
SPX Helper (127.0.0.1:8901)
  ↓ direct in-process delegation
Existing RuntimeCore
  ↓
Platform Adapter (macOS / Windows)
```

`spx_helper.py` binds only `127.0.0.1:8901`, allows the official
`https://jamieshopee.github.io` Origin, handles CORS / OPTIONS, and reuses the
existing Runtime HTTP handler for Ready / Execute / Asset Upload / Status /
Result. Binding the fixed endpoint is the single-instance boundary: a second
Helper exits instead of selecting another port.

`spx_helper.py` remains the unchanged Helper Core. For development validation,
start the Product Host from this directory with
`python3 spx_helper_product.py` (Windows: `python spx_helper_product.py`). This
source command is not the final Windows or macOS end-user launch path; Phase 2
installs the packaged Product Host through the Windows MSI, and Phase 3 installs
`/Applications/SPX Helper.app` through the macOS PKG. The system LaunchAgent at
`/Library/LaunchAgents/com.spxad.helper.plist` uses `RunAtLoad = true` without
`KeepAlive`, so login starts the Helper while Quit remains stopped for the current
login session. The PKG `postinstall` starts that registered job with
`launchctl kickstart` in the current GUI user domain; it does not use
`kickstart -k`, direct `/usr/bin/open`, or `bootout`.

Windows Packaging source is located in `packaging/windows/`. It uses
PyInstaller plus WiX Toolset SDK 5.0.2; WiX v7 is not used because its OSMF
condition does not meet this project's no-additional-cost packaging requirement.

macOS Packaging source is located in `packaging/macos/`. It uses PyInstaller to
build the menu-bar-only `SPX Helper.app`, then `pkgbuild`／`productbuild` to create
the PKG. Product Name is `SPX Helper`, bundle identifier is `com.spxad.helper`,
package identifier is `com.spxad.helper.pkg`, and Product Version is `0.5.4`.
Local app build, local PKG build, install validation, and Jamie Manual Validation
passed, including the Phase 3 install-launch Bug Fix validation confirming that
the installed Helper environment contains no `PKInstallSandbox` or installer
variables and that the production Photoshop pipeline produces Processed PNG.
Release mode requires Developer ID Application／Installer identities and
a notary profile, but those credential-dependent paths have not been validated.

Known Issue: in the validated Windows environment, Version / About information
dialogs and some Installer dialogs do not close through OK, Esc, or X. This does
not affect Packaging, Runtime, Browser API, Photoshop Automation, or the
background-removal flow and is tracked separately.

## Development Runtime fallback

The older direct Development Runtime path remains available and unchanged:

```text
Control Center (AI Workflow, js/ai-workflow-*.js)
  ↓ HTTP (127.0.0.1:8901)
SPX AD Runtime (this module)
  ↓
Platform Adapter (macOS / Windows)
```

`start-spx-ad-runtime.command` is used for: development, debug, Runtime
Validation, and manual testing. It is not the SPX Helper production boundary.

## Files

- `spx_helper_product.py` — Phase 1 desktop Product Host. Composes the
  unchanged `spx_helper.py` Core and existing RuntimeCore; exposes
  Running / Working / Attention, prevents a second Helper listener, and owns
  the fixed Open / About / Version / Restart / Quit Tray or Menu Bar lifecycle.
- `validate_spx_helper_product.py` — self-contained Phase 1 validation for
  lifecycle state, unchanged Ready response, single-instance behavior,
  Working transitions, Attention, fixed menu commands, Quit, Restart, and
  Working warnings. Run with `python3 validate_spx_helper_product.py`.
- `requirements-product.txt` — Phase 1 Product Host dependencies used for
  development and later platform bundling. End users must not install or
  manage these Python packages themselves.
- `packaging/macos/` — completed Phase 3 macOS Packaging source: PyInstaller
  spec, PKG build pipeline, entitlements, LaunchAgent, postinstall script, icon
  generator, static/artifact validation, and installed-product validation.
- `spx_helper.py` — production localhost boundary. Owns the sole
  `127.0.0.1:8901` listener, validates the official GitHub Pages Origin,
  supplies CORS / OPTIONS behavior, and delegates allowed requests to a fresh
  existing `RuntimeCore` instance without redefining the Runtime Contract.
  Phase 1 did not modify this file.
- `validate_spx_helper.py` — self-contained validation for Origin rejection,
  CORS / OPTIONS, unchanged Runtime response mapping, fixed-port
  single-instance behavior, clean restart, and real RuntimeCore pass-through.
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
  `production_launcher_windows.spec`, `BUILD.md` — older launcher prototype
  sources and build notes. They are not the approved SPX Helper deployment
  path and are not part of this completed Helper core.
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
