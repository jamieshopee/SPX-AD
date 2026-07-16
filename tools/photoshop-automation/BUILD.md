# Building the Production Launcher (Coding Phase 7／7)

> Historical implementation note: this file documents the older local
> Production Launcher prototype. It is **not** the approved SPX Helper
> deployment path. SPX Helper core now lives in `spx_helper.py`; installer,
> login auto-start, update, signing, notarization, Authenticode, and release
> packaging require their own later Implementation Proposals.

Scope: implementation reference for this Coding pass only, same as
`README.md` in this directory — not a project-level document under `docs/`.

PyInstaller cannot cross-compile: each binary below **must** be produced by
running PyInstaller on a real host of that exact OS. This sandbox (Linux)
cannot produce either one — this file only documents the commands; actually
running them is Jamie's / a real macOS or Windows machine's job.

## macOS

Run on a real Mac, with Python 3 + PyInstaller + pywin32 **not** required
(pywin32 is Windows-only):

```bash
cd tools/photoshop-automation
pip3 install pyinstaller
pyinstaller production_launcher_macos.spec --noconfirm
```

Produces `dist/SPX AD Launcher.app`. Double-clicking it:
- Opens no Terminal window.
- Starts SPX AD Runtime (via `macos_adapter.py` + AppleScript/osascript,
  unchanged) in the background.
- Opens the user's default browser to `index.html` once the Runtime is
  reachable (or after a bounded timeout, whichever comes first).

## Windows

Run on a real Windows machine, with Python 3 + PyInstaller + pywin32
installed (see `requirements-windows.txt`):

```powershell
cd tools\photoshop-automation
pip install pyinstaller
pip install -r requirements-windows.txt
pyinstaller production_launcher_windows.spec --noconfirm
```

Produces `dist\SPX AD Launcher.exe`. Double-clicking it:
- Opens no Command Prompt / PowerShell window.
- Starts SPX AD Runtime (via `windows_adapter.py` + pywin32 COM Automation,
  unchanged Ready/Execution/Status/Result Contract) in the background.
- Opens the user's default browser to `index.html` once the Runtime is
  reachable (or after a bounded timeout, whichever comes first).

## What is NOT covered by this Coding pass

- Code signing / notarization (macOS) or Authenticode signing (Windows) —
  a separate, pending release-engineering step, not part of this Phase.
- Auto-update mechanics for the Launcher binary itself.
- Formal legal/license review of bundled dependencies (see
  `requirements-windows.txt`'s license note for pywin32) — that confirmation
  is a separate, pending step before any actual production release and is
  not claimed as complete here.

## Development vs Production (unchanged distinction, restated for Phase 7)

| | Development Launcher | Production Launcher |
|---|---|---|
| File | `start-spx-ad-runtime.command` | `production_launcher.py` (built via the two `.spec` files above) |
| Audience | Developers only | End users |
| Console window | Yes (Terminal, intentional — shows Runtime logs) | No |
| Requires Python installed by the user | Yes | No (PyInstaller bundles it) |
| Opens index.html automatically | No | Yes |
| Starts a static server for index.html | No (developer opens it however they already do, e.g. `launch/*.command`) | Yes (127.0.0.1:8080, reusing an existing one if already running) |
