# Photoshop Adapter (remove-background.jsx)

Version: 2026.07.12-naming-contract-fix  
Scope: this is the JSX + AppleScript core that removes backgrounds for product / person / singleProduct assets, saves processed PNG files using `item.output.filename`, and writes `photoshop-run-report.json`. It reads a Manifest with the same shape as `photoshop-job-manifest.json`.

This same JSX (`remove-background.jsx`) is shared by two callers today:

- **AI Workflow (Completed, primary flow)**: `tools/photoshop-automation/`'s SPX AD Runtime invokes this JSX automatically (via `macos_adapter.py` on macOS, `windows_adapter.py` on Windows) as part of Ready Check → Processing Mode → Auto Import. See `docs/AI-HANDOFF.md`, `docs/Architecture.md`, and `docs/Photoshop Asset Pipeline.md` for the full automated flow.
- **人工備援流程（Manual fallback）**: the `匯出處理檔` / `匯入處理結果` Control Center menu items plus the manual runner described below in this document. This is kept as an independent fallback entry point, not the primary way users interact with Photoshop Automation.

Both callers use the exact same Manifest contract and the exact same Naming Contract (see below) — there is only one processed-filename rule project-wide.

## State Boundary

This adapter only reads:

- `photoshop-job-manifest.json`
- original asset folder selected by the user
- processed output folder selected by the user

This adapter only writes:

- processed PNG files
- `photoshop-run-report.json`

It must not read or write:

- Project State
- `layoutState`
- `layoutStates`
- Canvas / Render Engine
- Thumbnail
- Batch render state

## User Flow（人工備援流程 — Manual fallback only）

This section describes the manual fallback path only. The primary, everyday path is the AI Workflow automatic flow (Ready Check → Processing Mode → Auto Import → Auto Open Review); it calls this same JSX without any of the manual steps below.

1. In the control panel, click `匯出處理檔`.
2. Keep the downloaded `photoshop-job-manifest.json`.
3. Double click:

```text
tools/photoshop/run-photoshop-manifest.command
```

4. Select the manifest JSON.
5. Select the original asset folder.
6. Select the processed output folder.
7. Wait for Photoshop to finish.
8. In the control panel, click `匯入處理結果` and select the processed output folder.

## Background Removal

Background removal runs only for:

- `role = product`
- `role = person`
- `role = singleProduct`

Logo assets are not background-removed. They are opened and saved as processed PNG copies so the output contract remains consistent.

The JSX core is shared by macOS and Windows runners (via `tools/photoshop-automation/macos_adapter.py` / `windows_adapter.py`). The AppleScript file (`run-photoshop-manifest.applescript`) is only the macOS runner; Windows invokes this JSX via `win32com.client.DoJavaScript`, not AppleScript.

Primary target:

- Photoshop 2025

Best-effort compatibility:

- Photoshop 2024

Removal strategy:

1. Try Photoshop Quick Action via Action Manager command `removeBackground`.
2. If that fails, try Select Subject via `autoCutout`, then create a reveal-selection layer mask.
3. If both fail, mark that item as `error` in `photoshop-run-report.json` and continue with the next item.

## Output Filename Contract（Naming Contract — Locked by Jamie）

The Photoshop script saves files using:

```text
item.output.filename
```

The Manifest always sets `output.filename` to the **original asset basename + `.png`** — the one, global processed-image naming rule used everywhere in this project (AI Workflow, this manual fallback, Project Persistence / `project.zip`, Review Workspace Save):

```text
商品A.jpg  -> 商品A.png
商品A.webp -> 商品A.png
LOGO_01.jpg -> LOGO_01.png
```

`assetKey` (e.g. `JOB001__product__slot0__A001_主品`) is only ever used as an internal State Identity / metadata key / Manifest `assetKeys[]` entry — it never appears inside a processed image's actual filename. The control panel's processed-import matching (both AI Workflow's Auto Import and the manual `匯入處理結果` flow) matches a processed file back to the correct asset(s) by comparing the processed file's basename to the original asset's basename, not by parsing an assetKey out of the filename:

```text
商品A.png  -> matched against every asset whose original file is 商品A.jpg / 商品A.webp / ...
```

If `output.filename` is missing from a Manifest item (should not happen with the current Manifest Builder, but handled defensively), `getOutputFilename()` falls back to `item.source.filename`'s basename + `.png` — never to `assetKey + "__processed.png"` or any jobId/role/slot-based name.

Same original basename with a different extension (e.g. `商品A.jpg` and `商品A.webp` both present) will both resolve to `商品A.png` and can overwrite each other — this is a known, accepted limitation of the basename+.png rule (Locked by Jamie), not a bug.

## Run Report

The script writes:

```text
photoshop-run-report.json
```

Example:

```json
{
  "schema": "spx-ad-photoshop-run-report",
  "version": 1,
  "runId": "psrun_20260705000000",
  "startedAt": "2026-07-05T00:00:00.000Z",
  "finishedAt": "2026-07-05T00:00:10.000Z",
  "summary": {
    "total": 3,
    "success": 2,
    "error": 1
  },
  "items": [
    {
      "assetKey": "JOB001__product__slot0__A001_主品",
      "status": "success",
      "sourceFilename": "A001_主品.png",
      "outputFilename": "A001_主品.png",
      "background": {
        "attempted": true,
        "removed": true,
        "method": "removeBackground",
        "error": ""
      }
    }
  ]
}
```

`assetKey` in the run report is metadata only (identifies which internal record this item corresponds to); `outputFilename` is always the basename+.png value actually written to disk.

## Current Status

- Review / approve happens in Review Workspace (Control Center), not here.
- No crop / trim / normalize in this script.
- No direct Canvas integration — this script only produces processed PNG files and a run report.
- Windows is implemented via `tools/photoshop-automation/windows_adapter.py` (pywin32 `DoJavaScript`), which invokes this exact same `remove-background.jsx` — not a separate `.bat` / PowerShell runner. Windows has completed Coding but Windows real-machine validation is Deferred (Waiting for Windows Validation Environment); macOS has completed real-machine validation (Photoshop 2025).
