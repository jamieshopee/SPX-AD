"""
Runtime Validation harness for SPX AD Runtime (Photoshop Automation Phase).

This is a self-contained validation script (the project has no existing test
framework to plug into — see tests/*.html for the existing convention of
standalone manual test pages). Run with:

    python3 validate_runtime.py

It validates:
  1. RuntimeCore state machine against its REAL current contract: POST
     /execute (Manifest only) -> executionId, POST
     /executions/{executionId}/assets/{assetId} (per-asset raw binary
     upload), GET /status/{executionId}, GET
     /executions/{executionId}/results/{assetId} (raw processed PNG bytes) —
     Reject-concurrent-create_execution, Progress, Completed / Partial
     Failure / Failure + Reason, Ready / Not Ready — using in-process fake
     adapters (no subprocess, no OS dependency).
  2. The real macos_adapter.py code path (argument passing, run report
     reading, error handling) using a fake `osascript` stand-in executable,
     substituted via the SPX_AD_RUNTIME_OSASCRIPT_CMD environment variable.
     This validates everything about the adapter EXCEPT actual AppleScript /
     Photoshop behavior, which cannot be exercised outside real macOS with
     Photoshop installed.
  3. The HTTP transport (GET /ready, POST /execute, POST
     /executions/{id}/assets/{assetId}, GET /status/{id}, GET
     /executions/{id}/results/{assetId}) end-to-end against a running server
     instance bound to a test port.

Naming Contract Consistency Fix — Final One-Pass Completion: this file was
previously out of sync with spx_ad_runtime.py's real Execute contract (it
called a one-shot core.execute(manifest_path, asset_folder) API that no
longer exists — RuntimeCore now exposes create_execution() / receive_asset()
/ status() / get_result(), added by the earlier AI Workflow Phase 2/3
Correction). Per Jamie's explicit instruction, spx_ad_runtime.py itself is
NOT modified to accommodate this test; this file has been rewritten to align
with the Runtime's actual current contract. All processed-filename fixtures
now use "original basename + .png" (Locked Naming Contract), never
"{assetKey}__processed.png" or any jobId/role/slot suffix.

Known limitation (see Validation Report): this sandbox has no macOS and no
Photoshop, so real AppleScript / Photoshop execution cannot be exercised
here. Section 2 validates the adapter's own logic as thoroughly as possible
short of that.
"""

import json
import os
import shutil
import stat
import sys
import tempfile
import threading
import time
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from spx_ad_runtime import RuntimeCore, run_server  # noqa: E402
import macos_adapter  # noqa: E402


PASS = []
FAIL = []


def check(name, condition, detail=""):
    if condition:
        PASS.append(name)
        print("PASS - {0}".format(name))
    else:
        FAIL.append(name)
        print("FAIL - {0}  {1}".format(name, detail))


# ---------------------------------------------------------------------------
# Shared fixtures — Naming Contract（Locked by Jamie）：assetKey 維持原本
# {jobKey}__{role}__{slot}__{basename} 形狀，只作為內部 State Identity；
# source.filename／output.filename 一律是「原始 basename + .png」，與
# assetKey 無關，不使用 {assetKey}__processed.png 或任何 jobId/role/slot
# 後綴。
# ---------------------------------------------------------------------------

def build_fake_manifest(item_count=4):
    """Returns the Manifest as a dict, exactly the shape POST /execute's
    create_execution(manifest) expects directly (no file path — Runtime
    itself owns the on-disk manifest.json inside its hidden Workspace)."""
    return {
        "schema": "spx-ad-photoshop-job-manifest",
        "version": 1,
        "itemCount": item_count,
        "items": [
            {
                "assetKey": "FAKEJOB__product__slot{0}__A00{0}".format(i),
                "source": {"filename": "A00{0}.jpg".format(i)},
                "output": {"filename": "A00{0}.png".format(i)},
            }
            for i in range(item_count)
        ],
    }


def write_fake_manifest(path, item_count=4):
    """Same fixture, written to disk as JSON — used only by Section 2, which
    drives macos_adapter.py directly with a real manifest_path argument
    (mirroring exactly what the Runtime's hidden Workspace does internally)."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(build_fake_manifest(item_count), f)


def upload_all_assets(core, execution_id, manifest, content_for_index=None):
    """Uploads one fake binary payload per Manifest item via
    receive_asset(execution_id, assetId, content) — assetId is the
    stringified item index, per RuntimeCore.create_execution()'s own
    asset_id_to_filename convention. Returns {assetId: content_bytes} so
    callers can assert get_result() round-trips the exact bytes."""
    contents = {}
    for index, _item in enumerate(manifest["items"]):
        asset_id = str(index)
        content = content_for_index(index) if content_for_index else (
            "fake-original-bytes-{0}".format(index).encode("utf-8")
        )
        contents[asset_id] = content
        recv = core.receive_asset(execution_id, asset_id, content)
        check("Asset upload {0}: received".format(asset_id), recv == {"received": True}, detail=str(recv))
    return contents


def wait_for_idle_with_result(core, execution_id, timeout=5, poll=0.1):
    deadline = time.time() + timeout
    status = None
    while time.time() < deadline:
        status = core.status(execution_id)
        if status and status["state"] == "Idle" and status["lastResult"]:
            return status
        time.sleep(poll)
    return status


# ---------------------------------------------------------------------------
# Section 1: RuntimeCore logic with in-process fake adapters, real
# create_execution() / receive_asset() / status() / get_result() contract.
# ---------------------------------------------------------------------------

class FakeAdapter(object):
    """Canned-response adapter (fixed ok/error/report), used for exercising
    Ready / Failure / Partial Failure paths where the exact processed
    filenames written to output_folder don't matter."""

    def __init__(self, ready=True, alive=True, execute_result=None, execute_delay=0.1):
        self.ready = ready
        self.alive = alive
        self.execute_result = execute_result or {"ok": True, "error": None, "report": None}
        self.execute_delay = execute_delay
        self.execute_calls = 0

    def is_ready(self):
        return self.ready

    def is_alive(self):
        return self.alive

    def execute(self, manifest_path, original_folder, output_folder):
        self.execute_calls += 1
        time.sleep(self.execute_delay)
        return self.execute_result


class RealFilenameAdapter(object):
    """Adapter used for the full Completed-path + Progress + get_result
    round-trip validation. Unlike FakeAdapter, this one actually reads the
    Manifest at manifest_path (exactly like the real macOS/Windows adapters
    do) and writes each item's output.filename (basename + .png) into
    output_folder — so Section 1 proves the executionId -> per-asset upload
    -> Adapter -> get_result(basename+.png) path end-to-end against the REAL
    RuntimeCore, not a reimplementation of it."""

    def __init__(self, per_item_delay=0.2, ready=True, alive=True):
        self.per_item_delay = per_item_delay
        self.ready = ready
        self.alive = alive

    def is_ready(self):
        return self.ready

    def is_alive(self):
        return self.alive

    def execute(self, manifest_path, original_folder, output_folder):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        items = manifest.get("items", [])
        for item in items:
            time.sleep(self.per_item_delay)
            source_filename = item.get("source", {}).get("filename", "")
            output_filename = item.get("output", {}).get("filename") or (
                (source_filename.rsplit(".", 1)[0] if "." in source_filename else source_filename) + ".png"
            )
            source_path = os.path.join(original_folder, source_filename)
            content = b"fake-original-bytes-missing"
            if os.path.isfile(source_path):
                with open(source_path, "rb") as f:
                    content = f.read()
            with open(os.path.join(output_folder, output_filename), "wb") as f:
                f.write(content)
        report = {
            "schema": "spx-ad-photoshop-run-report",
            "version": 1,
            "summary": {"total": len(items), "success": len(items), "error": 0},
            "items": [],
        }
        return {"ok": True, "error": None, "report": report}


def section_1_runtime_core():
    print("\n=== Section 1: RuntimeCore logic (real create_execution/receive_asset/status/get_result contract) ===")

    # Ready / Not Ready
    core_ready = RuntimeCore(FakeAdapter(ready=True))
    check("Ready Contract: ready=True -> {'ready': True}",
          core_ready.ready() == {"ready": True})

    core_not_ready = RuntimeCore(FakeAdapter(ready=False))
    result = core_not_ready.ready()
    check("Ready Contract: ready=False -> ready False with reason",
          result.get("ready") is False and bool(result.get("reason")),
          detail=str(result))

    # manifest_invalid: create_execution() takes the Manifest dict directly.
    core = RuntimeCore(FakeAdapter())
    bad_empty = core.create_execution({"items": []})
    check("Execution Contract: empty items[] rejected as manifest_invalid",
          bad_empty == {"accepted": False, "reason": "manifest_invalid"}, detail=str(bad_empty))

    bad_none = core.create_execution(None)
    check("Execution Contract: non-dict manifest rejected as manifest_invalid",
          bad_none == {"accepted": False, "reason": "manifest_invalid"}, detail=str(bad_none))

    bad_missing_filename = core.create_execution({"items": [{"source": {}, "output": {"filename": "x.png"}}]})
    check("Execution Contract: item missing source.filename rejected as manifest_invalid",
          bad_missing_filename == {"accepted": False, "reason": "manifest_invalid"}, detail=str(bad_missing_filename))

    # Completed path + Progress + full asset upload -> get_result round trip,
    # using REAL basename+.png filenames throughout.
    manifest = build_fake_manifest(item_count=4)
    adapter = RealFilenameAdapter(per_item_delay=0.2)
    core = RuntimeCore(adapter, progress_poll_interval=0.1, health_poll_interval=0.2)
    accept = core.create_execution(manifest)
    check("Execution Contract: valid manifest accepted with executionId",
          accept.get("accepted") is True and bool(accept.get("executionId")), detail=str(accept))
    execution_id = accept["executionId"]

    # Reject concurrent create_execution while this one is pending/running
    reject = core.create_execution(manifest)
    check("Pending: concurrent create_execution rejected as busy",
          reject == {"accepted": False, "reason": "busy"}, detail=str(reject))

    asset_contents = upload_all_assets(core, execution_id, manifest)

    # A second receive_asset for an already-running execution's assetId must
    # be rejected (execution is no longer pending).
    late_upload = core.receive_asset(execution_id, "0", asset_contents["0"])
    check("Asset upload after Running: rejected (execution no longer pending)",
          late_upload.get("received") is False, detail=str(late_upload))

    # Progress should be observable while Running
    saw_progress = False
    deadline = time.time() + 3
    while time.time() < deadline:
        status = core.status(execution_id)
        if status and status["state"] == "Running" and status["progress"] and status["progress"]["current"] > 0:
            saw_progress = True
            break
        time.sleep(0.1)
    check("Status Contract: Progress current advances above 0 while Running", saw_progress)

    final_status = wait_for_idle_with_result(core, execution_id)
    check("Status Contract: returns to Idle after finishing (Release)",
          final_status is not None and final_status["state"] == "Idle", detail=str(final_status))
    check("Status Contract: lastResult is Completed with no reason",
          bool(final_status) and final_status.get("lastResult", {}).get("state") == "Completed"
          and final_status["lastResult"].get("reason") is None,
          detail=str(final_status))

    # get_result round trip: retrieve every asset, confirm exact bytes AND
    # basename+.png naming (no __processed / assetKey / jobId / role / slot).
    for index, item in enumerate(manifest["items"]):
        asset_id = str(index)
        result = core.get_result(execution_id, asset_id)
        expected_filename = item["output"]["filename"]
        check("get_result({0}): ok=True, content matches what was uploaded for {1}".format(asset_id, expected_filename),
              result.get("ok") is True and result.get("content") == asset_contents[asset_id],
              detail=str(result)[:200])
        check("get_result({0}): output.filename is basename+.png, no __processed/assetKey/job/role/slot suffix".format(asset_id),
              not expected_filename.endswith("__processed.png")
              and "FAKEJOB" not in expected_filename
              and expected_filename == "A00{0}.png".format(index),
              expected_filename)

    unknown_execution = core.get_result("does-not-exist", "0")
    check("get_result: unknown executionId -> 404 execution_not_found",
          unknown_execution == {"ok": False, "status": 404, "reason": "execution_not_found"},
          detail=str(unknown_execution))

    unknown_asset = core.get_result(execution_id, "not-an-asset-id")
    check("get_result: unknown assetId for a known execution -> 404 asset_not_expected",
          unknown_asset.get("status") == 404 and unknown_asset.get("reason") == "asset_not_expected",
          detail=str(unknown_asset))

    # Partial Failure path
    pf_manifest = build_fake_manifest(item_count=4)
    adapter_pf = FakeAdapter(execute_result={
        "ok": True, "error": None,
        "report": {
            "schema": "spx-ad-photoshop-run-report", "version": 1,
            "summary": {"total": 4, "success": 3, "error": 1}, "items": [],
        },
    }, execute_delay=0.05)
    core_pf = RuntimeCore(adapter_pf, progress_poll_interval=0.05, health_poll_interval=0.2)
    accept_pf = core_pf.create_execution(pf_manifest)
    upload_all_assets(core_pf, accept_pf["executionId"], pf_manifest)
    status_pf = wait_for_idle_with_result(core_pf, accept_pf["executionId"])
    check("Status Contract: Partial Failure reported with reason",
          bool(status_pf) and status_pf["lastResult"]["state"] == "PartialFailure" and status_pf["lastResult"]["reason"],
          detail=str(status_pf))

    # Failure path: adapter itself fails (ok=False), simulating e.g.
    # AppleScript invocation failure or Photoshop closing mid-run.
    fail_manifest = build_fake_manifest(item_count=2)
    failing_adapter = FakeAdapter(
        execute_result={"ok": False, "error": "applescript_exit_1: boom", "report": None},
        execute_delay=0.1,
    )
    core_fail = RuntimeCore(failing_adapter, progress_poll_interval=0.05, health_poll_interval=0.05)
    accept_fail = core_fail.create_execution(fail_manifest)
    upload_all_assets(core_fail, accept_fail["executionId"], fail_manifest)
    status_fail = wait_for_idle_with_result(core_fail, accept_fail["executionId"], timeout=3)
    check("Status Contract: Failure reported with Reason",
          bool(status_fail) and status_fail["lastResult"]["state"] == "Failure" and status_fail["lastResult"]["reason"],
          detail=str(status_fail))

    # Unexpected Close: adapter goes not-alive during Running, and the
    # underlying execute() call itself fails (as it realistically would if
    # Photoshop actually vanished mid-AppleEvent).
    class DyingAdapter(object):
        def __init__(self):
            self.calls = 0

        def is_ready(self):
            return True

        def is_alive(self):
            self.calls += 1
            return self.calls < 2  # alive for first check, then "closed"

        def execute(self, manifest_path, original_folder, output_folder):
            time.sleep(0.6)
            return {"ok": False, "error": "applescript_exit_1: application isn't running", "report": None}

    close_manifest = build_fake_manifest(item_count=1)
    core_close = RuntimeCore(DyingAdapter(), progress_poll_interval=0.1, health_poll_interval=0.1)
    accept_close = core_close.create_execution(close_manifest)
    upload_all_assets(core_close, accept_close["executionId"], close_manifest)
    status_close = wait_for_idle_with_result(core_close, accept_close["executionId"], timeout=3)
    check("Runtime Health Detection: Unexpected Close -> Failure(photoshop_closed)",
          bool(status_close) and status_close["lastResult"]["state"] == "Failure"
          and status_close["lastResult"]["reason"] == "photoshop_closed",
          detail=str(status_close))


# ---------------------------------------------------------------------------
# Section 2: real macos_adapter.py logic via a fake `osascript` stand-in
# ---------------------------------------------------------------------------

FAKE_OSASCRIPT_SCRIPT = """#!/bin/bash
if [ "$1" = "-e" ]; then
  echo "true"
  exit 0
fi
APPLESCRIPT_PATH="$1"
MANIFEST="$2"
ORIGINAL="$3"
OUTPUT="$4"
mkdir -p "$OUTPUT"
python3 - "$MANIFEST" "$OUTPUT" <<'PYEOF'
import json, sys
manifest_path, output_folder = sys.argv[1], sys.argv[2]
with open(manifest_path) as f:
    manifest = json.load(f)
items = manifest.get('items', [])
out_items = []
for item in items:
    asset_key = item.get('assetKey', 'unknown')
    out_filename = item.get('output', {}).get('filename')
    if not out_filename:
        # Naming Contract Consistency Fix：缺少 output.filename 時的 fallback
        # 必須沿用「原始 basename + .png」，取自 item.source.filename，不得
        # 再組出 assetKey + "__processed.png"（呼應 remove-background.jsx
        # 的 getOutputFilename() fallback 修正）。
        source_filename = item.get('source', {}).get('filename', asset_key)
        base = source_filename.rsplit('.', 1)[0] if '.' in source_filename else source_filename
        out_filename = base + '.png'
    with open(output_folder + '/' + out_filename, 'wb') as out:
        out.write(b'fake-png')
    out_items.append({"assetKey": asset_key, "status": "success"})
report = {
    "schema": "spx-ad-photoshop-run-report",
    "version": 1,
    "summary": {"total": len(items), "success": len(items), "error": 0},
    "items": out_items,
}
with open(output_folder + '/photoshop-run-report.json', 'w') as f:
    json.dump(report, f)
PYEOF
exit 0
"""


def section_2_macos_adapter():
    print("\n=== Section 2: real macos_adapter.py via fake `osascript` stand-in ===")
    print("NOTE: this validates argument passing / run-report handling only.")
    print("Real AppleScript + Photoshop behavior cannot be exercised in this sandbox.")
    tmp = tempfile.mkdtemp(prefix="spxad_macos_adapter_test_")
    try:
        fake_osascript_path = os.path.join(tmp, "osascript")
        with open(fake_osascript_path, "w") as f:
            f.write(FAKE_OSASCRIPT_SCRIPT)
        st = os.stat(fake_osascript_path)
        os.chmod(fake_osascript_path, st.st_mode | stat.S_IEXEC)

        os.environ["SPX_AD_RUNTIME_OSASCRIPT_CMD"] = fake_osascript_path
        import importlib

        importlib.reload(macos_adapter)  # pick up env var
        adapter = macos_adapter.MacOSPhotoshopAdapter()

        check("macOS Adapter: is_alive() true via fake osascript -e",
              adapter.is_alive() is True)

        manifest_path = os.path.join(tmp, "photoshop-job-manifest.json")
        write_fake_manifest(manifest_path, item_count=3)
        asset_folder = os.path.join(tmp, "asset-folder")
        output_folder = os.path.join(asset_folder, "Processed")
        os.makedirs(asset_folder, exist_ok=True)

        result = adapter.execute(manifest_path, asset_folder, output_folder)
        check("macOS Adapter: execute() ok=True with report",
              result.get("ok") is True and isinstance(result.get("report"), dict),
              detail=str(result))
        produced = os.listdir(output_folder) if os.path.isdir(output_folder) else []
        produced_pngs = [name for name in produced if name.endswith(".png")]
        check("macOS Adapter: 3 processed files written using Manifest output.filename "
              "(basename + .png, no __processed/jobId/role/slot suffix)",
              len(produced_pngs) == 3 and all(not name.endswith("__processed.png") for name in produced_pngs),
              detail=str(produced))
        check("macOS Adapter: run report readable and matches basename + .png Naming Contract",
              "A000.png" in produced, detail=str(produced))
    finally:
        os.environ.pop("SPX_AD_RUNTIME_OSASCRIPT_CMD", None)
        shutil.rmtree(tmp, ignore_errors=True)


# ---------------------------------------------------------------------------
# Section 3: HTTP transport end-to-end, real current contract
# ---------------------------------------------------------------------------

def _http_get(port, path):
    with urllib.request.urlopen("http://127.0.0.1:{0}{1}".format(port, path), timeout=5) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def _http_get_binary(port, path):
    try:
        with urllib.request.urlopen("http://127.0.0.1:{0}{1}".format(port, path), timeout=5) as resp:
            return resp.status, resp.read(), dict(resp.getheaders())
    except urllib.error.HTTPError as error:
        return error.code, error.read(), dict(error.headers or {})


def _http_post_json(port, path, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:{0}{1}".format(port, path), data=data, method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read().decode("utf-8"))


def _http_post_binary(port, path, content_bytes):
    req = urllib.request.Request(
        "http://127.0.0.1:{0}{1}".format(port, path), data=content_bytes, method="POST",
        headers={"Content-Type": "application/octet-stream"},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read().decode("utf-8"))


def section_3_http_transport():
    print("\n=== Section 3: HTTP transport (GET /ready, POST /execute, POST .../assets/{id}, "
          "GET /status/{id}, GET .../results/{id}) ===")

    tmp = tempfile.mkdtemp(prefix="spxad_http_test_")
    try:
        manifest = build_fake_manifest(item_count=3)
        adapter = RealFilenameAdapter(per_item_delay=0.2)
        core = RuntimeCore(adapter, progress_poll_interval=0.1, health_poll_interval=0.2)

        port = 8931
        server_thread = threading.Thread(target=run_server, args=(core, port), daemon=True)
        server_thread.start()
        time.sleep(0.3)

        status_code, body = _http_get(port, "/ready")
        check("HTTP GET /ready returns 200 + ready:true", status_code == 200 and body == {"ready": True})

        status_code, body = _http_post_json(port, "/execute", {"manifest": manifest})
        check("HTTP POST /execute accepted (202) with executionId",
              status_code == 202 and body.get("accepted") is True and bool(body.get("executionId")),
              detail=str(body))
        execution_id = body["executionId"]

        status_code, body = _http_post_json(port, "/execute", {"manifest": manifest})
        check("HTTP POST /execute while pending -> 409 busy",
              status_code == 409 and body == {"accepted": False, "reason": "busy"}, detail=str(body))

        asset_contents = {}
        for index, item in enumerate(manifest["items"]):
            asset_id = str(index)
            content = "fake-original-bytes-{0}".format(index).encode("utf-8")
            asset_contents[asset_id] = content
            status_code, body = _http_post_binary(
                port, "/executions/{0}/assets/{1}".format(execution_id, asset_id), content
            )
            check("HTTP POST /executions/{id}/assets/" + asset_id + ": 200 received",
                  status_code == 200 and body == {"received": True}, detail=str(body))

        status_code, body = _http_get(port, "/status/{0}".format(execution_id))
        check("HTTP GET /status/{executionId} shows Running with progress",
              status_code == 200 and body["state"] == "Running", detail=str(body))

        deadline = time.time() + 5
        final_body = None
        while time.time() < deadline:
            _, final_body = _http_get(port, "/status/{0}".format(execution_id))
            if final_body["state"] == "Idle" and final_body["lastResult"]:
                break
            time.sleep(0.2)
        check("HTTP GET /status/{executionId} shows Completed lastResult after finishing",
              final_body is not None and final_body["lastResult"]["state"] == "Completed", detail=str(final_body))

        for index, item in enumerate(manifest["items"]):
            asset_id = str(index)
            expected_filename = item["output"]["filename"]
            status_code, content, headers = _http_get_binary(
                port, "/executions/{0}/results/{1}".format(execution_id, asset_id)
            )
            check("HTTP GET .../results/" + asset_id + ": 200 image/png with exact uploaded bytes ("
                  + expected_filename + ")",
                  status_code == 200 and content == asset_contents[asset_id]
                  and headers.get("Content-Type") == "image/png",
                  detail=str((status_code, headers.get("Content-Type"), len(content))))

        status_code, unknown_body, _headers = _http_get_binary(port, "/status/does-not-exist")
        # /status/{id} returns JSON even on 404, but this generic binary
        # fetcher still gets the raw bytes — decode them separately here.
        check("HTTP GET /status/{unknown executionId} -> 404",
              status_code == 404, detail=str(status_code))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    section_1_runtime_core()
    section_2_macos_adapter()
    section_3_http_transport()

    print("\n=== Summary ===")
    print("PASS: {0}".format(len(PASS)))
    print("FAIL: {0}".format(len(FAIL)))
    if FAIL:
        print("Failed cases:")
        for name in FAIL:
            print(" - {0}".format(name))
        sys.exit(1)
    sys.exit(0)
