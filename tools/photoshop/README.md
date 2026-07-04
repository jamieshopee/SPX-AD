# Photoshop Adapter MVP

Version: 2026.07.05-2B1  
Scope: Phase 2B-1 Contract Test. This adapter reads `photoshop-job-manifest.json`, opens original assets in Photoshop, saves processed PNG files using `item.output.filename`, and writes `photoshop-run-report.json`.

This MVP does not remove backgrounds yet. It only verifies the manifest-to-processed-assets contract.

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

## User Flow

1. In the control panel, click `匯出 Photoshop Manifest`.
2. Keep the downloaded `photoshop-job-manifest.json`.
3. Double click:

```text
tools/photoshop/run-photoshop-manifest.command
```

4. Select the manifest JSON.
5. Select the original asset folder.
6. Select the processed output folder.
7. Wait for Photoshop to finish.
8. In the control panel, click `匯入 Processed Folder` and select the processed output folder.

## Output Filename Contract

The Photoshop script saves files using:

```text
item.output.filename
```

The current manifest creates filenames like:

```text
{assetKey}__processed.png
```

This matches the control panel processed import rule:

```text
JOB001__product__slot0__A001_主品__processed.png
  -> JOB001__product__slot0__A001_主品
```

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
      "outputFilename": "JOB001__product__slot0__A001_主品__processed.png"
    }
  ]
}
```

## MVP Limitation

- No background removal yet.
- No review / approve flow.
- No crop / trim / normalize.
- No Canvas integration.
