"""
SPX AD Runtime — Photoshop Automation Phase

Cross-platform core implementing the Ready / Execution / Status Contract and
Runtime Health Detection defined in:
  docs/proposals/Photoshop-Automation-Proposal.md (Frozen)

Scope of this Coding pass (per the confirmed Implementation Proposal):
  - SPX AD Runtime (this file)
  - Platform Adapter Interface (platform_adapter.py)
  - macOS Photoshop Adapter (macos_adapter.py)
  - Ready Contract / Execution Contract / Status Contract
  - Runtime Health Detection
  - Reject concurrent Execute while Running
  - Windows Photoshop Adapter: reserved architecture position only, not
    implemented (windows_adapter.py) — this Coding pass does not touch it.

MUST NOT (per explicit Coding boundary):
  - Know about AppleScript, Windows, or any platform-specific implementation.
    All platform-specific work goes through the Platform Adapter Interface.
  - Modify tools/photoshop/remove-background.jsx,
    tools/photoshop/run-photoshop-manifest.applescript,
    tools/photoshop/run-photoshop-manifest.command, the Manifest schema,
    Processed Folder Matching, Review Workspace, Project State schema,
    Approved Asset Resolver, Canvas, Thumbnail, Batch, layoutState,
    layoutStates. This file does not import or reference any of those.
  - Implement Control Center UI, Manifest Builder, Auto Import, Auto
    Matching, or Auto Open Review Workspace — those belong to AI Workflow,
    a separate, dependent Phase, and are out of scope here.

Runtime Lifetime (Decision 32, Locked): this process's lifetime is meant to
be tied to the SPX AD Application being open, not to the Launcher and not to
whether Photoshop itself stays open. That integration belongs to AI Workflow
(a separate, dependent Phase) and does not exist yet. In this Coding pass,
start-spx-ad-runtime.command is a Development Tool only (development / debug
/ Runtime Validation / unit testing) — it is not a production flow and must
not be described as one.

Status Contract concretization: the frozen Proposal defines four states
(Running / Completed / Partial Failure / Failure) plus Progress and Reason.
This implementation models that per-execution as:
  - "state": "Idle" | "Running"  (Idle also covers the resting state right
    after Release; Running is the only busy state that rejects new Execute)
  - "progress": {"current": N, "total": M} while Running, else null
  - "lastResult": the outcome of the most recently finished Execution
    ({"state": "Completed"|"PartialFailure"|"Failure", "reason": str|None,
    "finishedAt": iso8601}), or null if none has run yet.

AI Workflow Phase 2 Correction (Consistency Audit finding corrected): the
Execute Contract is split into two steps: POST /execute (Manifest only, no
asset content) returns an executionId; the caller then uploads each asset's
raw binary content one at a time via
POST /executions/{executionId}/assets/{assetId}. Only once every Manifest
item's asset has arrived does this Runtime invoke the (unchanged) Platform
Adapter, against a hidden, Runtime-managed Workspace directory
(tempfile.mkdtemp()) that the end user never sees, picks, or manages.

AI Workflow Phase 3 Correction (this pass): adds the Runtime -> Browser
retrieval half of the same idea. Status and results are now tracked
per-executionId (this Runtime still only runs one Execution at a time, but
several executions' records can exist simultaneously: one Running/pending,
plus previously-finished ones whose results haven't been fully retrieved
yet):
  - GET /status/{executionId} -> {state, progress, lastResult} for that
    specific execution. Unknown executionId -> caller gets None (404).
    Never carries image content.
  - GET /executions/{executionId}/results/{assetId} -> the raw processed
    PNG bytes for that one asset (Content-Type: image/png), once that
    execution's lastResult.state is "Completed". Not yet finished -> 409.
    Result missing/execution didn't complete -> 404. Already fully
    delivered and cleaned up -> 410.
  - Writing the retrieved bytes into the real 素材資料夾/Processed/ is the
    browser's job (via its own retained FileSystemDirectoryHandle +
    readwrite permission) -- this Runtime only ever writes into its own
    hidden Workspace, never into anything resembling a user-visible asset
    folder.
  - Workspace cleanup for a given execution only happens once every one of
    its expected assetIds has been successfully retrieved via
    GET .../results/{assetId} -- results must never be deleted before they
    have all been delivered. Runtime crash / browser abandoning retrieval
    mid-way is an accepted, out-of-scope limitation for this Coding pass
    (deferred to a future Error/Recovery Hardening phase), same as the
    already-disclosed pending-execution-with-no-uploads limitation from
    Phase 2 Correction.

AI Workflow Coding Phase 6 (Error / Recovery Hardening, this pass) closes two
previously-disclosed limitations, both scoped narrowly to avoid touching the
Ready / Execution / Status / Result Contract shapes themselves:
  - Pending Execution Timeout: a POST /execute that is Accepted but never
    receives every expected asset (browser gave up, crashed, or the network
    dropped mid-upload) used to leave this Runtime permanently REASON_BUSY --
    no new Execute could ever be accepted again without restarting the whole
    process. create_execution() now first calls
    _expire_stale_pending_locked(), which -- only if the current pending
    execution has been waiting longer than PENDING_EXECUTION_TIMEOUT_SECONDS
    without receiving every asset -- deletes its (input-only; nothing was
    ever produced) Workspace, drops it from self._executions, and clears
    self._pending_execution, before the normal accept/reject decision is
    made. This is checked lazily (on the next create_execution call) rather
    than via a background timer, which is sufficient to satisfy "Runtime 不得
    永久 busy": the very next legitimate retry from the browser will succeed
    once the timeout has elapsed, without adding a second concurrent timer
    thread.
  - Stale Workspace sweep on startup: _cleanup_stale_workspaces_on_startup()
    runs once, before the HTTP server starts accepting requests, and removes
    any spx_ad_runtime_ws_* directories under the OS temp dir whose
    modification time is older than STALE_WORKSPACE_MAX_AGE_SECONDS. This
    only ever matters after a hard crash of a previous Runtime process (the
    in-memory self._executions dict does not survive a restart, so anything
    left on disk from a prior run is by definition orphaned) -- while a
    single Runtime process is alive, its own normal cleanup paths
    (_cleanup_workspace_inputs / get_result's full-Workspace rmtree /
    _expire_stale_pending_locked) are what apply. Both new constants are
    defined once, near DEFAULT_PORT, and referenced everywhere rather than
    inlined.

Neither change alters the Ready / Execution / Status / Result Contract
shapes, still does not create any user-visible Run001 / Job Folder concept,
and still never requires the user to manage a Runtime Workspace directly.

Validation performed before any file is written or the Adapter is ever
invoked (an invalid request must never reach Execute/Adapter):
  - POST /execute: manifest must be a dict with a non-empty "items" list;
    every item's source.filename must be a bare, safe filename. Invalid ->
    400 manifest_invalid, and no Workspace is ever created for it.
  - POST /executions/{id}/assets/{assetId}: executionId must reference a
    still-pending execution; assetId must be one this Manifest actually
    expects; the same assetId uploaded twice with *different* content is
    rejected (never silently overwritten) — byte-identical re-upload is
    tolerated (not actually ambiguous).
"""

import hashlib
import json
import os
import re
import shutil
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from socketserver import ThreadingMixIn, TCPServer


DEFAULT_PORT = 8901
PROGRESS_POLL_INTERVAL_SECONDS = 1.0
HEALTH_POLL_INTERVAL_SECONDS = 2.0

# Phase 6 (Error / Recovery Hardening) -- centralized, not inlined elsewhere.
# How long a pending Execution (Accepted but still waiting for one or more
# assets to be uploaded) may sit before it is considered abandoned and is
# expired automatically (see _expire_stale_pending_locked()). Generous enough
# for a realistic asset batch upload over localhost; short enough that a
# genuinely abandoned attempt does not block new Execute requests for long.
PENDING_EXECUTION_TIMEOUT_SECONDS = 300

# How old an on-disk spx_ad_runtime_ws_* directory must be (by mtime) before
# the startup sweep considers it orphaned from a previous, crashed process
# and removes it (see _cleanup_stale_workspaces_on_startup()). Deliberately
# large -- this only ever needs to catch Workspaces left behind by a process
# that no longer exists, never anything belonging to the currently running
# process (which cleans up its own Workspaces through the normal paths).
STALE_WORKSPACE_MAX_AGE_SECONDS = 24 * 60 * 60

REASON_MANIFEST_INVALID = "manifest_invalid"
REASON_PHOTOSHOP_CLOSED = "photoshop_closed"
REASON_ALL_ITEMS_FAILED = "all_items_failed"
REASON_SOME_ITEMS_FAILED = "some_items_failed"
REASON_UNKNOWN_ERROR = "unknown_error"
REASON_BUSY = "busy"
REASON_EXECUTION_NOT_FOUND = "execution_not_found"
REASON_ASSET_NOT_EXPECTED = "asset_not_expected"
REASON_NOT_READY = "not_ready"
REASON_RESULT_NOT_FOUND = "result_not_found"
REASON_GONE = "gone"


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _is_safe_filename(name):
    """Bare-filename guard for the hidden Workspace's original/ and
    processed/ directories. Rejects anything that could be used for path
    traversal or that isn't a plain filename at all (no directory
    separators of either kind, no NUL, no "." / ".."). This is deliberately
    conservative -- it does not try to special-case allowed characters, it
    only forbids the ones that could ever mean "somewhere other than this
    one flat directory"."""
    if not name or not isinstance(name, str):
        return False
    if "\x00" in name:
        return False
    if "/" in name or "\\" in name:
        return False
    if name in (".", ".."):
        return False
    return True


def _validate_manifest(manifest):
    """Structural validation for POST /execute's Manifest-only body. Returns
    None if valid, or a Reason string if invalid. Read-only: does not modify
    the Manifest schema, only checks the shape the existing schema already
    produces (items / source.filename / output.filename)."""
    if not isinstance(manifest, dict):
        return REASON_MANIFEST_INVALID
    items = manifest.get("items")
    if not isinstance(items, list) or not items:
        return REASON_MANIFEST_INVALID
    for item in items:
        if not isinstance(item, dict):
            return REASON_MANIFEST_INVALID
        source = item.get("source") or {}
        if not _is_safe_filename(source.get("filename")):
            return REASON_MANIFEST_INVALID
        output = item.get("output") or {}
        if not _is_safe_filename(output.get("filename")):
            return REASON_MANIFEST_INVALID
    return None


def _build_item_results(record, report):
    """Bug Fix（去背失敗獨立分類）：把 JSX Run Report 的 items[]（比對依據
    是 sourceFilename，Adapter/Manifest 邊界本來就是以檔名為主，不是
    assetId）對回這個 Runtime 自己的 assetId（record["asset_id_to_filename"]
    的 key）。回傳值只給 _resolve_outcome() 組進 lastResult，不改變既有
    Status Contract 的 state／reason／progress 形狀。

    Fallback（找不到這個 assetId 對應的 items[] 項目時，例如簡化過的
    Adapter/測試假件沒有填 items[] 明細，只有 summary）：如果 summary 顯示
    整批 error 數為 0（全部成功），沒有理由比 summary 本身更悲觀地判它失
    敗，視為 success；除此之外（summary 本身就有錯誤、但這一筆的明細對不
    上）一律誠實回報 error，不猜測、不假裝成功。"""
    filename_to_asset_id = {}
    for asset_id, filename in (record.get("asset_id_to_filename") or {}).items():
        filename_to_asset_id[filename] = asset_id

    status_by_asset_id = {}
    items = report.get("items") if isinstance(report, dict) else None
    for item in items or []:
        source_filename = item.get("sourceFilename")
        asset_id = filename_to_asset_id.get(source_filename)
        if asset_id is None:
            continue
        status_by_asset_id[asset_id] = "success" if item.get("status") == "success" else "error"

    summary = (report.get("summary") or {}) if isinstance(report, dict) else {}
    summary_all_success = isinstance(report, dict) and summary.get("error", 0) == 0

    results = []
    for asset_id in (record.get("asset_id_to_filename") or {}).keys():
        if asset_id in status_by_asset_id:
            status = status_by_asset_id[asset_id]
        elif summary_all_success:
            status = "success"
        else:
            status = "error"
        results.append({"assetId": asset_id, "status": status})
    return results


def _item_status_for_asset(last_result, asset_id):
    """Bug Fix（去背失敗獨立分類）：從 lastResult.itemResults 找這一個
    assetId 自己的成功/失敗。找不到對應項目時（例如舊版 Runtime 留下、沒有
    這個欄位的 lastResult）保守 fallback：state 是 Completed 時視為
    success（維持修改前「整批 Completed 時任何一張都能取回」的既有行為，
    不造成回歸），其餘一律視為 error（不確定就不放行）。"""
    item_results = last_result.get("itemResults") or []
    for entry in item_results:
        if entry.get("assetId") == asset_id:
            return entry.get("status")
    return "success" if last_result.get("state") == "Completed" else "error"


def _count_processed_files(output_folder):
    """Best-effort progress signal: count files already written into the
    Workspace's internal processed/ directory. Does not read or depend on
    file *names* matching any naming contract — that matching logic belongs
    to AI Workflow / Processed Folder Matching, not to this Runtime. This is
    purely a coarse progress indicator (how many output files exist so
    far)."""
    if not output_folder or not os.path.isdir(output_folder):
        return 0
    try:
        return len(
            [
                name
                for name in os.listdir(output_folder)
                if os.path.isfile(os.path.join(output_folder, name))
            ]
        )
    except Exception:
        return 0


class RuntimeCore(object):
    """Platform-agnostic Ready / Execute / Status / Health Detection core.

    Takes a Platform Adapter instance via constructor injection so it can be
    exercised in tests (or on non-macOS hosts) without ever importing a
    platform-specific module itself.
    """

    def __init__(
        self,
        adapter,
        progress_poll_interval=PROGRESS_POLL_INTERVAL_SECONDS,
        health_poll_interval=HEALTH_POLL_INTERVAL_SECONDS,
    ):
        self._adapter = adapter
        self._progress_poll_interval = progress_poll_interval
        self._health_poll_interval = health_poll_interval
        self._lock = threading.Lock()
        # An Execution that has been created (POST /execute accepted) but is
        # still waiting for one or more assets to be uploaded. Exactly one
        # at a time -- a second POST /execute while this (or a Running
        # execution) is set is rejected as busy.
        self._pending_execution = None
        self._running_execution_id = None
        # Every execution this Runtime has created, keyed by executionId.
        # Entries persist (so Status/Results can still be queried) until
        # the browser has retrieved every one of that execution's results,
        # at which point its Workspace is cleaned up.
        self._executions = {}

    # ---- Ready Contract -------------------------------------------------
    def ready(self):
        try:
            is_ready = bool(self._adapter.is_ready())
        except Exception:
            is_ready = False
        if is_ready:
            return {"ready": True}
        return {"ready": False, "reason": REASON_PHOTOSHOP_CLOSED}

    # ---- Execution Contract: step 1 (create) -----------------------------
    def create_execution(self, manifest):
        """POST /execute. manifest: the full Manifest JSON (dict) as already
        built by the existing, unmodified buildPhotoshopJobManifest() /
        buildPhotoshopRerunManifest() -- no asset content here. Returns
        {"accepted": True, "executionId": str} or
        {"accepted": False, "reason": str}. Creates no Workspace at all if
        the Manifest is invalid."""
        with self._lock:
            self._expire_stale_pending_locked()

            if self._pending_execution is not None or self._running_execution_id is not None:
                return {"accepted": False, "reason": REASON_BUSY}

            invalid_reason = _validate_manifest(manifest)
            if invalid_reason:
                return {"accepted": False, "reason": invalid_reason}

            items = manifest["items"]
            asset_id_to_filename = {
                str(index): item["source"]["filename"]
                for index, item in enumerate(items)
            }
            asset_id_to_output_filename = {
                str(index): item["output"]["filename"]
                for index, item in enumerate(items)
            }

            try:
                workspace_dir, manifest_path, original_folder, output_folder = (
                    _create_workspace(manifest)
                )
            except Exception:
                return {"accepted": False, "reason": REASON_MANIFEST_INVALID}

            execution_id = uuid.uuid4().hex
            record = {
                "execution_id": execution_id,
                "workspace_dir": workspace_dir,
                "manifest_path": manifest_path,
                "original_folder": original_folder,
                "output_folder": output_folder,
                "asset_id_to_filename": asset_id_to_filename,
                "asset_id_to_output_filename": asset_id_to_output_filename,
                "received_asset_ids": set(),
                "received_content_hash": {},
                "total_items": len(items),
                "progress": None,
                "last_result": None,
                "delivered_asset_ids": set(),
                "cleaned": False,
                "pending_created_at": time.monotonic(),
            }
            self._executions[execution_id] = record
            self._pending_execution = record
            return {"accepted": True, "executionId": execution_id}

    def _expire_stale_pending_locked(self):
        """Phase 6: must be called with self._lock already held. If the
        current pending execution (Accepted, still waiting for one or more
        assets) has been sitting for longer than
        PENDING_EXECUTION_TIMEOUT_SECONDS, treat it as abandoned: delete its
        Workspace (nothing was ever produced -- Photoshop was never
        triggered for a pending execution, only original/ input and
        manifest.json exist), drop its record entirely (there are no results
        to preserve for later retrieval), and clear the pending slot so the
        next POST /execute is accepted instead of returning REASON_BUSY
        forever. A Running execution (Photoshop already invoked) is a
        completely separate state and is never touched here."""
        record = self._pending_execution
        if record is None:
            return
        age = time.monotonic() - record.get("pending_created_at", 0)
        if age <= PENDING_EXECUTION_TIMEOUT_SECONDS:
            return
        shutil.rmtree(record["workspace_dir"], ignore_errors=True)
        self._executions.pop(record["execution_id"], None)
        self._pending_execution = None

    # ---- Execution Contract: step 2 (per-asset upload) --------------------
    def receive_asset(self, execution_id, asset_id, content_bytes):
        """POST /executions/{executionId}/assets/{assetId}. Writes the raw
        binary content into the hidden Workspace's original/ directory.
        Once every expected assetId has arrived, triggers the (unchanged)
        Platform Adapter in a background thread. Returns
        {"received": True} or {"received": False, "reason": str}."""
        trigger_record = None
        with self._lock:
            record = self._executions.get(execution_id)
            if not record or self._pending_execution is not record:
                return {"received": False, "reason": REASON_EXECUTION_NOT_FOUND}

            filename = record["asset_id_to_filename"].get(asset_id)
            if filename is None or not _is_safe_filename(filename):
                return {"received": False, "reason": REASON_ASSET_NOT_EXPECTED}

            content_hash = hashlib.sha256(content_bytes).hexdigest()
            existing_hash = record["received_content_hash"].get(asset_id)
            if existing_hash and existing_hash != content_hash:
                # Same assetId, different content on re-upload: which one
                # "wins" is ambiguous -- never silently overwrite, reject.
                return {"received": False, "reason": REASON_MANIFEST_INVALID}

            if not existing_hash:
                target_path = os.path.join(record["original_folder"], filename)
                if (
                    os.path.dirname(os.path.abspath(target_path))
                    != os.path.abspath(record["original_folder"])
                ):
                    # Defense in depth: _is_safe_filename() already
                    # guarantees this can't happen.
                    return {"received": False, "reason": REASON_ASSET_NOT_EXPECTED}
                with open(target_path, "wb") as handle:
                    handle.write(content_bytes)
                record["received_content_hash"][asset_id] = content_hash
                record["received_asset_ids"].add(asset_id)

            all_received = record["received_asset_ids"] == set(
                record["asset_id_to_filename"].keys()
            )
            if all_received:
                # Flip to Running and clear the pending slot atomically with
                # the "all received" check, so this can only ever trigger
                # once for a given execution.
                self._pending_execution = None
                self._running_execution_id = execution_id
                record["progress"] = {"current": 0, "total": record["total_items"]}
                trigger_record = record

        if trigger_record is not None:
            thread = threading.Thread(
                target=self._run_execution,
                args=(trigger_record,),
                daemon=True,
            )
            thread.start()

        return {"received": True}

    def _run_execution(self, record):
        manifest_path = record["manifest_path"]
        original_folder = record["original_folder"]
        output_folder = record["output_folder"]

        stop_event = threading.Event()
        health_flag = {"lost": False}

        progress_thread = threading.Thread(
            target=self._poll_progress,
            args=(record, output_folder, stop_event),
            daemon=True,
        )
        health_thread = threading.Thread(
            target=self._poll_health,
            args=(stop_event, health_flag),
            daemon=True,
        )
        progress_thread.start()
        health_thread.start()

        try:
            result = self._adapter.execute(
                manifest_path, original_folder, output_folder
            )
        except Exception as error:  # adapter must not crash the Runtime
            result = {
                "ok": False,
                "error": "adapter_exception: {0}".format(error),
                "report": None,
            }
        finally:
            stop_event.set()
            progress_thread.join(timeout=5)
            health_thread.join(timeout=5)

        outcome = self._resolve_outcome(record, result, health_flag["lost"])

        # Workspace cleanup policy: temporary input only (manifest.json,
        # original/); the internal processed/ copy is left alone here until
        # every result has been retrieved (see get_result()).
        _cleanup_workspace_inputs(manifest_path, original_folder)

        with self._lock:
            record["last_result"] = outcome
            record["progress"] = None
            if self._running_execution_id == record["execution_id"]:
                self._running_execution_id = None

    def _poll_progress(self, record, output_folder, stop_event):
        while not stop_event.is_set():
            current = _count_processed_files(output_folder)
            with self._lock:
                if record["progress"] is not None:
                    total = record["progress"].get("total", 0)
                    record["progress"]["current"] = min(current, total) if total else current
            stop_event.wait(self._progress_poll_interval)

    def _poll_health(self, stop_event, health_flag):
        while not stop_event.is_set():
            try:
                alive = bool(self._adapter.is_alive())
            except Exception:
                alive = False
            if not alive:
                health_flag["lost"] = True
            stop_event.wait(self._health_poll_interval)

    def _resolve_outcome(self, record, result, photoshop_lost):
        finished_at = _now_iso()

        if photoshop_lost and not result.get("ok"):
            return {
                "state": "Failure",
                "reason": REASON_PHOTOSHOP_CLOSED,
                "finishedAt": finished_at,
                "itemResults": [],
            }

        if not result.get("ok"):
            return {
                "state": "Failure",
                "reason": result.get("error") or REASON_UNKNOWN_ERROR,
                "finishedAt": finished_at,
                "itemResults": [],
            }

        report = result.get("report")
        if not isinstance(report, dict):
            # Adapter reported ok=True but no run report could be read.
            if photoshop_lost:
                return {
                    "state": "Failure",
                    "reason": REASON_PHOTOSHOP_CLOSED,
                    "finishedAt": finished_at,
                    "itemResults": [],
                }
            return {
                "state": "Failure",
                "reason": REASON_UNKNOWN_ERROR,
                "finishedAt": finished_at,
                "itemResults": [],
            }

        summary = report.get("summary") or {}
        success_count = summary.get("success", 0)
        error_count = summary.get("error", 0)

        # Bug Fix（去背失敗獨立分類）：逐張成功/失敗明細，additive 欄位，不
        # 改變既有 state／reason／finishedAt 的形狀。忽略這個欄位的既有呼叫
        # 方不受影響。
        item_results = _build_item_results(record, report)

        if error_count == 0:
            return {
                "state": "Completed",
                "reason": None,
                "finishedAt": finished_at,
                "itemResults": item_results,
            }
        if success_count == 0:
            return {
                "state": "Failure",
                "reason": REASON_ALL_ITEMS_FAILED,
                "finishedAt": finished_at,
                "itemResults": item_results,
            }
        return {
            "state": "PartialFailure",
            "reason": REASON_SOME_ITEMS_FAILED,
            "finishedAt": finished_at,
            "itemResults": item_results,
        }

    # ---- Status Contract (per execution) ----------------------------------
    def status(self, execution_id):
        """GET /status/{executionId}. Returns {state, progress, lastResult}
        for that specific execution, or None if executionId is unknown
        (caller maps that to 404). Never carries image content."""
        with self._lock:
            record = self._executions.get(execution_id)
            if not record:
                return None
            state = "Running" if self._running_execution_id == execution_id else "Idle"
            return {
                "state": state,
                "progress": dict(record["progress"]) if record["progress"] else None,
                "lastResult": dict(record["last_result"]) if record["last_result"] else None,
            }

    # ---- Result retrieval (Runtime -> Browser, Phase 3 Correction) --------
    def get_result(self, execution_id, asset_id):
        """GET /executions/{executionId}/results/{assetId}. Returns
        {"ok": True, "status": 200, "content": bytes} on success, or
        {"ok": False, "status": int, "reason": str, ...} otherwise.

        Bug Fix（去背失敗獨立分類）：原本規定「整批必須等於 Completed 才能
        取回任何一張」，導致 PartialFailure 時連已經成功的圖也一起被擋住。
        放寬為：整批狀態是 Completed 或 PartialFailure，且「這一張」自己在
        itemResults 裡是 success，才能取回；這一張自己失敗、或整批
        Failure（全部失敗），一律誠實回報「不可用」，不猜測、不假裝。"""
        with self._lock:
            record = self._executions.get(execution_id)
            if not record:
                return {"ok": False, "status": 404, "reason": REASON_EXECUTION_NOT_FOUND}

            # Validate the request itself (is this even a known assetId for
            # this execution?) before consulting any state-based condition
            # (cleaned / not-ready / completed) -- an unknown assetId is a
            # client error regardless of the execution's own lifecycle
            # stage, and must not be masked as "410 gone" just because every
            # *valid* assetId happened to already be delivered.
            output_filename = record["asset_id_to_output_filename"].get(asset_id)
            if not output_filename:
                return {"ok": False, "status": 404, "reason": REASON_ASSET_NOT_EXPECTED}

            if record.get("cleaned"):
                return {"ok": False, "status": 410, "reason": REASON_GONE}

            last_result = record.get("last_result")
            if not last_result:
                return {"ok": False, "status": 409, "reason": REASON_NOT_READY}
            if last_result.get("state") not in ("Completed", "PartialFailure"):
                return {
                    "ok": False,
                    "status": 404,
                    "reason": REASON_RESULT_NOT_FOUND,
                    "executionState": last_result.get("state"),
                    "executionReason": last_result.get("reason"),
                }
            if _item_status_for_asset(last_result, asset_id) != "success":
                return {
                    "ok": False,
                    "status": 404,
                    "reason": REASON_RESULT_NOT_FOUND,
                    "executionState": last_result.get("state"),
                    "executionReason": last_result.get("reason"),
                }

            file_path = os.path.join(record["output_folder"], output_filename)
            if not os.path.isfile(file_path):
                return {"ok": False, "status": 404, "reason": REASON_RESULT_NOT_FOUND}

            try:
                with open(file_path, "rb") as handle:
                    content = handle.read()
            except Exception:
                return {"ok": False, "status": 404, "reason": REASON_RESULT_NOT_FOUND}

            record["delivered_asset_ids"].add(asset_id)
            all_asset_ids = set(record["asset_id_to_output_filename"].keys())
            if record["delivered_asset_ids"] == all_asset_ids and not record["cleaned"]:
                # Results have never been deleted before this point -- every
                # expected assetId has now been successfully retrieved at
                # least once. Safe to clean up the rest of the Workspace.
                shutil.rmtree(record["workspace_dir"], ignore_errors=True)
                record["cleaned"] = True

            return {"ok": True, "status": 200, "content": content}


def _create_workspace(manifest):
    """Create a fresh, hidden, Runtime-owned Workspace directory (the user
    never sees or manages this path) and write the received Manifest JSON
    into it. Returns
    (workspace_dir, manifest_path, original_folder, output_folder) -- all
    real, absolute OS paths that the unchanged Platform Adapter Interface
    can use exactly as it always has. Asset content is NOT written here --
    that happens incrementally via receive_asset() as each upload arrives."""
    workspace_dir = tempfile.mkdtemp(prefix="spx_ad_runtime_ws_")
    original_folder = os.path.join(workspace_dir, "original")
    output_folder = os.path.join(workspace_dir, "processed")
    manifest_path = os.path.join(workspace_dir, "manifest.json")

    os.makedirs(original_folder, exist_ok=True)
    os.makedirs(output_folder, exist_ok=True)

    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle)

    return workspace_dir, manifest_path, original_folder, output_folder


def _cleanup_stale_workspaces_on_startup(max_age_seconds=STALE_WORKSPACE_MAX_AGE_SECONDS):
    """Phase 6: run once, before the HTTP server starts accepting requests.
    Removes any spx_ad_runtime_ws_* directories under the OS temp dir whose
    mtime is older than max_age_seconds. Only ever matters for Workspaces
    orphaned by a previous, crashed Runtime process -- this process's own
    in-memory self._executions is empty at this point (nothing has been
    created yet), so there is no risk of this racing with or deleting
    anything the current process is using."""
    base_dir = tempfile.gettempdir()
    try:
        entries = os.listdir(base_dir)
    except Exception:
        return
    now = time.time()
    for name in entries:
        if not name.startswith("spx_ad_runtime_ws_"):
            continue
        path = os.path.join(base_dir, name)
        try:
            if not os.path.isdir(path):
                continue
            age = now - os.path.getmtime(path)
            if age > max_age_seconds:
                shutil.rmtree(path, ignore_errors=True)
        except Exception:
            continue


def _cleanup_workspace_inputs(manifest_path, original_folder):
    """Workspace cleanup policy (part 1 of 2): delete the temporary *input*
    (manifest.json, original/) as soon as an Execution has finished (Release
    -> Idle), regardless of outcome. The internal processed/ copy is left
    alone here -- see RuntimeCore.get_result() for part 2 (full Workspace
    cleanup, gated on every result having been retrieved)."""
    try:
        if manifest_path and os.path.isfile(manifest_path):
            os.remove(manifest_path)
    except Exception:
        pass
    try:
        if original_folder and os.path.isdir(original_folder):
            shutil.rmtree(original_folder, ignore_errors=True)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# HTTP transport (local-only). This is the concrete realization of the Ready /
# Execution / Status Contract's transport for this Coding pass. AI Workflow
# (a separate, out-of-scope Phase) is expected to be the eventual caller;
# nothing in this file assumes who the caller is.
#
# CORS compatibility (AI Workflow Phase 1 Blocking Issue fix, unchanged by
# this Correction): pages served locally by the SPX AD Application (e.g.
# http://localhost:5174) are a different browser origin than this Runtime
# (http://127.0.0.1:8901), so browsers block reading responses unless
# Access-Control-Allow-Origin is present, and block POST bodies with a
# preflight OPTIONS request unless that is answered too. The handler below
# reflects the request's Origin back only when it is itself a loopback
# origin (http(s)://localhost or http(s)://127.0.0.1, any port), and answers
# OPTIONS preflights. This is a CORS (browser-side) relaxation only: it does
# not change what this process binds to (still 127.0.0.1 only — see
# run_server below) or turn the Runtime into a network-facing service, and
# it does not change the Ready / Execute / Status Contract shapes.
# ---------------------------------------------------------------------------


class ThreadingHTTPServer(ThreadingMixIn, TCPServer):
    allow_reuse_address = True
    daemon_threads = True


_LOOPBACK_ORIGIN_RE = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")
_EXECUTION_ASSET_PATH_RE = re.compile(r"^/executions/([^/]+)/assets/([^/]+)$")
_EXECUTION_RESULT_PATH_RE = re.compile(r"^/executions/([^/]+)/results/([^/]+)$")
_STATUS_PATH_RE = re.compile(r"^/status/([^/]+)$")


def make_handler(core):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):  # noqa: A002 - match stdlib signature
            pass  # quiet by default, matches existing launcher script style

        def _allowed_origin(self):
            origin = self.headers.get("Origin")
            if origin and _LOOPBACK_ORIGIN_RE.match(origin):
                return origin
            return None

        def _send_cors_headers(self):
            allowed = self._allowed_origin()
            if allowed:
                self.send_header("Access-Control-Allow-Origin", allowed)
                self.send_header("Vary", "Origin")

        def _write_json(self, status_code, payload):
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(body)

        def _write_binary(self, status_code, content_type, content):
            self.send_response(status_code)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(content)

        def do_OPTIONS(self):  # noqa: N802 - stdlib naming convention
            # CORS preflight only. No Ready / Execute / Status logic runs
            # here.
            self.send_response(204)
            self._send_cors_headers()
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self):  # noqa: N802 - stdlib naming convention
            if self.path == "/ready":
                self._write_json(200, core.ready())
                return

            status_match = _STATUS_PATH_RE.match(self.path)
            if status_match:
                execution_id = status_match.group(1)
                payload = core.status(execution_id)
                if payload is None:
                    self._write_json(404, {"error": REASON_EXECUTION_NOT_FOUND})
                    return
                self._write_json(200, payload)
                return

            result_match = _EXECUTION_RESULT_PATH_RE.match(self.path)
            if result_match:
                execution_id, asset_id = result_match.group(1), result_match.group(2)
                result = core.get_result(execution_id, asset_id)
                if result.get("ok"):
                    self._write_binary(200, "image/png", result["content"])
                    return
                error_payload = {"error": result.get("reason")}
                if "executionState" in result:
                    error_payload["executionState"] = result["executionState"]
                if "executionReason" in result:
                    error_payload["executionReason"] = result["executionReason"]
                self._write_json(result.get("status", 404), error_payload)
                return

            self._write_json(404, {"error": "not_found"})

        def do_POST(self):  # noqa: N802 - stdlib naming convention
            if self.path == "/execute":
                length = int(self.headers.get("Content-Length", 0) or 0)
                raw = self.rfile.read(length) if length else b""
                try:
                    body = json.loads(raw or b"{}")
                except Exception:
                    self._write_json(
                        400, {"accepted": False, "reason": REASON_MANIFEST_INVALID}
                    )
                    return
                manifest = body.get("manifest")
                result = core.create_execution(manifest)
                status_code = 202 if result.get("accepted") else 409
                if result.get("reason") == REASON_MANIFEST_INVALID:
                    status_code = 400
                self._write_json(status_code, result)
                return

            asset_match = _EXECUTION_ASSET_PATH_RE.match(self.path)
            if asset_match:
                execution_id, asset_id = asset_match.group(1), asset_match.group(2)
                length = int(self.headers.get("Content-Length", 0) or 0)
                content = self.rfile.read(length) if length else b""
                result = core.receive_asset(execution_id, asset_id, content)
                if result.get("received"):
                    status_code = 200
                elif result.get("reason") == REASON_EXECUTION_NOT_FOUND:
                    status_code = 404
                else:
                    status_code = 400
                self._write_json(status_code, result)
                return

            self._write_json(404, {"error": "not_found"})

    return Handler


def run_server(core, port=DEFAULT_PORT):
    handler_cls = make_handler(core)
    server = ThreadingHTTPServer(("127.0.0.1", port), handler_cls)
    print(
        "[SPX AD Runtime] listening on http://127.0.0.1:{0} "
        "(Ctrl+C to stop)".format(port)
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    from platform_adapter import get_platform_adapter

    _cleanup_stale_workspaces_on_startup()
    _adapter = get_platform_adapter()
    _core = RuntimeCore(_adapter)
    run_server(_core)
