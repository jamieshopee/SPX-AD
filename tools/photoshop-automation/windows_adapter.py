"""
Windows Photoshop Adapter — Photoshop Automation Phase (Coding Phase 7／7:
End-to-End Integration & Validation)

Implements the Platform Adapter Interface (see platform_adapter.py) for
Windows, mirroring macos_adapter.py's interface (is_alive / is_ready /
execute) exactly. This is the ONLY file in this project that knows pywin32 /
win32com.client / the Windows COM Automation surface exists. SPX AD Runtime
never imports this module directly (it goes through
platform_adapter.get_platform_adapter(), which only imports this file when
platform.system() == "Windows").

Locked architecture decisions this file implements (already researched and
confirmed in an earlier Read-Only architecture phase, not re-decided here):
  - Windows Photoshop Adapter uses pywin32 (win32com.client) COM Automation
    to talk to an already-running Photoshop.exe -- never VBScript, never
    cscript.exe, never any other deprecated/legacy Windows scripting host.
  - Ready Check connects to Photoshop only if an instance is already running
    (win32com.client.GetActiveObject("Photoshop.Application")) and must
    never launch a new Photoshop instance itself. GetActiveObject is the
    purpose-built pywin32 entry point for "find the already-running COM
    server instance registered in the Running Object Table, and fail
    (raise) rather than start a new one" -- unlike win32com.client.Dispatch,
    which would create/launch a new instance if none exists.
  - Execute drives the SAME existing, unmodified tools/photoshop/
    remove-background.jsx that the macOS Adapter already uses, via
    app.DoJavaScript(bootstrapScript), where bootstrapScript sets the exact
    same $.global.__SPX_PS_ADAPTER_ARGS__ = {manifestPath, originalFolder,
    outputFolder} global variable and then $.evalFile(jsxPath) that
    tools/photoshop/run-photoshop-manifest.applescript already sets up for
    macOS (see that file's `bootstrap` variable) -- this is the same
    mechanism, just built as a Python string instead of an AppleScript
    string, and invoked via COM instead of `do javascript` -- neither
    remove-background.jsx nor the Manifest/Naming/Matching Contract change
    at all.
  - app.DoJavaScript() blocks until the one-shot ExtendScript execution
    finishes (same synchronous, one-shot semantics as macOS's
    `do javascript` inside `run script`), so this adapter's execute() can
    read photoshop-run-report.json immediately after the call returns, the
    same way macos_adapter.py does.

Dependency note (per this Phase's explicit instruction): pywin32 is a
Windows-only dependency of this one file. It is never imported on macOS or
any other OS (platform_adapter.py's factory only ever imports
windows_adapter when platform.system() == "Windows"). See
requirements-windows.txt in this same directory for the pinned dependency
declaration. pywin32's license (a mix of PSF-derived and BSD-style terms) is
permissive and compatible with this project's use, but as with any
third-party dependency, formal legal/license review before an actual
production release is a separate, pending step for Jamie/legal to confirm --
this note does not constitute or claim that a formal legal review has
already been completed.

Naming Contract: this adapter does not decide output filenames, exactly like
macos_adapter.py. It only passes through the manifest path and folders;
output.filename inside the Manifest (built elsewhere, per the existing
assetKey-based contract) is what actually controls the processed file names.
"""

import json
import os

try:
    import win32com.client
    import pywintypes
    import pythoncom
except ImportError:  # pragma: no cover - only unavailable on non-Windows hosts
    win32com = None
    pywintypes = None
    pythoncom = None

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PHOTOSHOP_TOOLS_DIR = os.path.abspath(os.path.join(_THIS_DIR, "..", "photoshop"))
JSX_PATH = os.path.join(_PHOTOSHOP_TOOLS_DIR, "remove-background.jsx")

PHOTOSHOP_COM_PROGID = "Photoshop.Application"


def _escape_for_js(raw_text):
    """Same escaping rule as run-photoshop-manifest.applescript's
    escapeForJs handler: backslashes first, then single quotes, so the
    result can be safely embedded inside a single-quoted JS string literal.
    Windows paths (e.g. C:\\Users\\...) are exactly the kind of input this
    guards against."""
    return raw_text.replace("\\", "\\\\").replace("'", "\\'")


def _build_bootstrap_script(manifest_path, original_folder, output_folder):
    """Builds the exact same bootstrap ExtendScript that
    run-photoshop-manifest.applescript's `bootstrap` variable builds for
    macOS -- sets $.global.__SPX_PS_ADAPTER_ARGS__ then $.evalFile()'s the
    existing, unmodified remove-background.jsx. Not a reimplementation of
    remove-background.jsx's logic; this only ever hands it the same three
    paths the macOS Adapter already hands it."""
    escaped_manifest = _escape_for_js(manifest_path)
    escaped_original = _escape_for_js(original_folder)
    escaped_output = _escape_for_js(output_folder)
    escaped_jsx = _escape_for_js(JSX_PATH)
    return (
        "$.global.__SPX_PS_ADAPTER_ARGS__ = {{ manifestPath: '{0}', "
        "originalFolder: '{1}', outputFolder: '{2}' }}; "
        "$.evalFile('{3}');"
    ).format(escaped_manifest, escaped_original, escaped_output, escaped_jsx)


def _read_run_report(output_folder):
    report_path = os.path.join(output_folder, "photoshop-run-report.json")
    if not os.path.exists(report_path):
        return None
    try:
        with open(report_path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None


class WindowsPhotoshopAdapter:
    def _connect(self):
        """Connect to an ALREADY RUNNING Photoshop instance only. Must never
        launch a new one -- GetActiveObject raises (rather than starting a
        new instance) when nothing is currently registered in the Running
        Object Table for this ProgID, which is exactly the "don't
        auto-launch" behavior the Ready Check requires. Returns None on any
        failure (Photoshop not running, COM not available, etc.) rather than
        raising, so callers can treat "not connectable" uniformly."""
        if win32com is None:
            return None
        try:
            return win32com.client.GetActiveObject(PHOTOSHOP_COM_PROGID)
        except Exception as error:
            # Windows real-machine diagnostic only (this Phase's explicit,
            # scoped instruction): print the exception type and message so
            # the real GetActiveObject failure reason is visible in the
            # Runtime's own console window, instead of being silently
            # discarded. Deliberately no traceback and no path/user data --
            # does not change this method's return value or the Ready
            # Contract in any way.
            print(
                "[SPX AD Runtime][Windows Adapter] GetActiveObject('{0}') failed: "
                "{1}: {2}".format(PHOTOSHOP_COM_PROGID, type(error).__name__, error)
            )
            return None

    def is_alive(self):
        """Platform-specific liveness primitive: is Photoshop currently
        running and reachable via COM. Used both for Ready Check and for
        Runtime Health Detection polling during Running.

        COM initialization note (Windows COM Initialization Bug Fix):
        SPX AD Runtime handles each HTTP request on its own thread
        (ThreadingMixIn), and win32com.client.GetActiveObject requires COM
        to have been initialized on the CALLING thread first, or it fails
        with com_error -2147221008 ("CoInitialize has not been called") --
        this was the actual, previously-hidden root cause of Ready Check
        always reporting Photoshop as closed. pythoncom.CoInitialize() is
        called immediately before the one piece of COM work this method
        does (_connect()), and pythoncom.CoUninitialize() is guaranteed to
        run afterward via try/finally, whether _connect() returns normally
        or raises -- this method never keeps the returned COM object alive
        past its own return, so it is safe to uninitialize COM before
        returning here. Does not change this method's return value (still
        a plain bool) or the Ready Contract."""
        if pythoncom is None:
            return False
        try:
            pythoncom.CoInitialize()
        except Exception:
            return False
        try:
            return self._connect() is not None
        finally:
            pythoncom.CoUninitialize()

    def is_ready(self):
        """Ready Contract primitive: same liveness check for this adapter,
        matching macos_adapter.py's pattern (is_ready == is_alive)."""
        return self.is_alive()

    def execute(self, manifest_path, original_folder, output_folder):
        """Hand the manifest to the existing JSX pipeline via Photoshop COM
        Automation. Blocks until the one-shot DoJavaScript() execution
        finishes (or fails to run at all). Does not modify
        remove-background.jsx in any way.

        COM initialization note (Windows COM Initialization Bug Fix): same
        reasoning as is_alive() -- this method must initialize COM on its
        own calling thread before touching COM at all. Unlike is_alive(),
        the COM object returned by _connect() (`app`) is used AFTER the
        connect call too (app.DoJavaScript(...) below), so the
        CoInitialize()/CoUninitialize() pair here wraps this method's
        entire body, not just the _connect() call, and CoUninitialize()
        only runs (via finally) once this method is completely done with
        `app`. Does not change this method's return value shape or the
        Ready Contract."""
        if pythoncom is None:
            return {
                "ok": False,
                "error": "photoshop_com_unavailable",
                "report": None,
            }
        try:
            pythoncom.CoInitialize()
        except Exception:
            return {
                "ok": False,
                "error": "photoshop_com_unavailable",
                "report": None,
            }
        try:
            app = self._connect()
            if app is None:
                return {
                    "ok": False,
                    "error": "photoshop_com_unavailable",
                    "report": None,
                }

            bootstrap = _build_bootstrap_script(manifest_path, original_folder, output_folder)
            try:
                app.DoJavaScript(bootstrap)
            except Exception as error:
                return {
                    "ok": False,
                    "error": "com_automation_failed: {0}".format(error),
                    "report": None,
                }

            # DoJavaScript() returned without raising -- the ExtendScript ran
            # to completion. Mirrors macos_adapter.py's leniency exactly:
            # report may still be None here (e.g. the JSX exited early
            # before writing one); that ambiguity is deliberately NOT
            # decided here -- SPX AD Runtime's existing, unmodified
            # _resolve_outcome() already treats a missing/non-dict report as
            # a Failure with a generic reason, the same way it would for
            # macOS. This file does not duplicate that decision.
            report = _read_run_report(output_folder)
            return {"ok": True, "error": None, "report": report}
        finally:
            pythoncom.CoUninitialize()
