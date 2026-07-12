"""
macOS Photoshop Adapter — Photoshop Automation Phase

Implements the Platform Adapter Interface (see platform_adapter.py) for
macOS. This is the ONLY file in this Coding pass that knows AppleScript
exists. SPX AD Runtime never imports this module directly (it goes through
platform_adapter.get_platform_adapter()).

This adapter does not modify, wrap, or reimplement the existing Photoshop
Pipeline. It only invokes the existing, unmodified files:

  - tools/photoshop/run-photoshop-manifest.applescript
      Already accepts three positional arguments (manifestPath,
      originalFolderPath, outputFolderPath) and is already non-interactive —
      the interactive "choose file / choose folder" dialogs live only in
      run-photoshop-manifest.command (the manual-flow wrapper), not in the
      .applescript file itself. That means this adapter can call the
      .applescript directly, non-interactively, with zero modification to
      it.
  - tools/photoshop/remove-background.jsx
      Invoked by the .applescript exactly as it is today (one-shot
      execution). Not modified.

Naming Contract: this adapter does not decide output filenames. It only
passes through the manifest path and folders; output.filename inside the
manifest (built elsewhere, per the existing assetKey-based contract) is what
actually controls the processed file names.
"""

import json
import os
import subprocess

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PHOTOSHOP_TOOLS_DIR = os.path.abspath(
    os.path.join(_THIS_DIR, "..", "photoshop")
)
APPLESCRIPT_PATH = os.path.join(
    _PHOTOSHOP_TOOLS_DIR, "run-photoshop-manifest.applescript"
)

# Allows Runtime Validation (see validate_runtime.py) to substitute a fake
# stand-in for `osascript` when there is no real macOS/Photoshop available
# (e.g. this sandbox). Production use always defaults to the real `osascript`
# binary. This does not change any behavior of the adapter's logic itself,
# only which executable it shells out to.
OSASCRIPT_CMD = os.environ.get("SPX_AD_RUNTIME_OSASCRIPT_CMD", "osascript")

# Coding Phase 7, Stage 1 Root Cause Fix: is_alive() previously matched
# Photoshop by exact process NAME via System Events ("Adobe Photoshop").
# AppleScript's list `contains` is an exact-equality membership test (not
# substring matching), so any version-suffixed or otherwise differently
# named running process would never match, even with Photoshop genuinely
# open. Switched to the same, version-stable bundle identifier that
# tools/photoshop/run-photoshop-manifest.applescript already uses,
# unmodified ("tell application id \"com.adobe.Photoshop\""), instead of a
# display-name string.
PHOTOSHOP_BUNDLE_ID = "com.adobe.Photoshop"


def _log_ready_check_diagnostic(summary):
    """Coding Phase 7, Stage 1 Root Cause Fix (diagnostic aid only): prints a
    short, non-sensitive line to this Runtime's own Terminal window whenever
    is_alive()'s osascript call fails for ANY reason. Previously every such
    failure (Photoshop genuinely not running, a denied macOS Automation
    permission for controlling System Events, a timeout, etc.) was silently
    collapsed into the exact same {"ready": false, "reason":
    "photoshop_closed"} response with zero visible distinction -- this only
    adds a print() so the real cause is visible locally while developing/
    validating. Does not print a full traceback, and never prints
    OSASCRIPT_CMD's own value (which could be an overridden path during
    testing) or any Workspace/manifest path -- only osascript's own
    returncode / stderr text (truncated) / exception type. Does not change
    is_alive()'s return type or is_ready()/execute()'s behavior in any way
    -- this is a print()-only diagnostic addition, not a Contract change."""
    print("[SPX AD Runtime][macOS Adapter] Ready/Health check failed: {0}".format(summary))


class MacOSPhotoshopAdapter:
    def is_alive(self):
        """Platform-specific liveness primitive: is Photoshop running.

        Queries the stable bundle identifier's `running` property directly
        -- does not enumerate System Events process names (avoids the
        exact-name-match fragility described above), and does not launch
        Photoshop if it isn't already running (querying `running` is a
        read-only property check, same "must not auto-launch" behavior as
        before)."""
        script = 'application id "{0}" is running'.format(PHOTOSHOP_BUNDLE_ID)
        try:
            proc = subprocess.run(
                [OSASCRIPT_CMD, "-e", script],
                capture_output=True,
                text=True,
                timeout=10,
            )
        except subprocess.TimeoutExpired:
            _log_ready_check_diagnostic("osascript timed out after 10s (type: TimeoutExpired)")
            return False
        except Exception as error:
            _log_ready_check_diagnostic(
                "osascript could not be run (exception type: {0})".format(type(error).__name__)
            )
            return False

        if proc.returncode != 0:
            stderr_text = (proc.stderr or "").strip()
            if len(stderr_text) > 200:
                stderr_text = stderr_text[:200] + "...(截斷)"
            _log_ready_check_diagnostic(
                "osascript exited with code {0}, stderr: {1}".format(
                    proc.returncode, stderr_text or "(空)"
                )
            )
            return False

        is_true = proc.stdout.strip() == "true"
        if not is_true:
            stdout_text = proc.stdout.strip()[:100]
            _log_ready_check_diagnostic(
                "osascript succeeded but did not report Photoshop as running "
                "(stdout: {0!r})".format(stdout_text)
            )
        return is_true

    def is_ready(self):
        """Ready Contract primitive: same liveness check for this adapter."""
        return self.is_alive()

    def execute(self, manifest_path, original_folder, output_folder):
        """Hand the manifest to the existing AppleScript + JSX pipeline.

        Blocks until the one-shot AppleScript/JSX execution finishes (or
        fails to run at all). Does not modify run-photoshop-manifest.
        applescript or remove-background.jsx in any way.
        """
        try:
            proc = subprocess.run(
                [
                    OSASCRIPT_CMD,
                    APPLESCRIPT_PATH,
                    manifest_path,
                    original_folder,
                    output_folder,
                ],
                capture_output=True,
                text=True,
            )
        except Exception as error:
            return {
                "ok": False,
                "error": "applescript_invocation_failed: {0}".format(error),
                "report": None,
            }

        report = _read_run_report(output_folder)

        if proc.returncode != 0 and report is None:
            return {
                "ok": False,
                "error": "applescript_exit_{0}: {1}".format(
                    proc.returncode, proc.stderr.strip()
                ),
                "report": None,
            }

        return {"ok": True, "error": None, "report": report}


def _read_run_report(output_folder):
    report_path = os.path.join(output_folder, "photoshop-run-report.json")
    if not os.path.exists(report_path):
        return None
    try:
        with open(report_path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None
