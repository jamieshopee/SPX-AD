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

# TEMPORARY (Windows Minimal JSX Load Verification, Proposal Freeze
# 2026-07-15-freeze-03): JSX_PATH is temporarily repointed at a minimal,
# standalone test JSX in the same tools/photoshop/ folder, to A/B-test
# whether $.evalFile() itself can load/execute a JSX at all here,
# independent of remove-background.jsx's own content. _build_bootstrap_
# script() itself is unchanged -- only this one path value differs.
# Revert this single line back to "remove-background.jsx" and delete
# tools/photoshop/debug-minimal-evalfile-test.jsx once validation is done.
JSX_PATH = os.path.join(_PHOTOSHOP_TOOLS_DIR, "debug-minimal-evalfile-test.jsx")

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
    paths the macOS Adapter already hands it.

    Windows DoJavaScript Phase Checkpoints (Proposal Freeze
    2026-07-15-freeze-02), temporary diagnostic only: wraps the same two
    original statements in a try/catch and tracks which phase was reached
    via a $.global marker (no temp files -- a Checkpoint file's own
    creation could itself fail and be misread as an earlier phase, which
    is exactly why this uses an in-memory $.global assignment instead):
      'A' -- before the parameters are set at all (the initial value).
      'B' -- immediately after $.global.__SPX_PS_ADAPTER_ARGS__ is set,
             right before $.evalFile() is called.
      'C' -- set by remove-background.jsx's own very first executable
             statement, so it is only ever reached once $.evalFile() has
             truly started running that file's content.
    On any exception, the phase reached so far is appended to a re-thrown
    Error's message, so the existing Windows COM Exception Diagnostics
    (_debug_describe_exception) prints it automatically as part of the
    existing HRESULT/excepinfo output -- no new print logic needed. Still
    exactly one app.DoJavaScript() call; does not change the Ready/
    Execution/Status/Result Contract, return values, or Report Format."""
    escaped_manifest = _escape_for_js(manifest_path)
    escaped_original = _escape_for_js(original_folder)
    escaped_output = _escape_for_js(output_folder)
    escaped_jsx = _escape_for_js(JSX_PATH)
    return (
        "$.global.__SPX_PS_DEBUG_PHASE__ = 'A'; "
        "try {{ "
        "$.global.__SPX_PS_ADAPTER_ARGS__ = {{ manifestPath: '{0}', "
        "originalFolder: '{1}', outputFolder: '{2}' }}; "
        "$.global.__SPX_PS_DEBUG_PHASE__ = 'B'; "
        "throw new Error('SPX_PRE_EVAL_PROBE'); "
        "}} catch (e) {{ throw new Error('[Phase ' + "
        "$.global.__SPX_PS_DEBUG_PHASE__ + '] ' + "
        "(e && e.message ? e.message : e)); }}"
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


def _debug_mask_path(path):
    """Windows DoJavaScript Debug Diagnostics (Proposal Freeze
    2026-07-15-freeze-01), debug-only display helper: returns only the
    last path component (basename) formatted as '<...>\\<basename>', so
    bootstrap debug output never reveals the username, AppData, Temp, or
    any full disk path. Never raises -- any failure to compute a basename
    falls back to an empty basename rather than propagating an exception
    out of a debug helper."""
    try:
        basename = os.path.basename(str(path))
    except Exception:
        basename = ""
    return "<...>\\{0}".format(basename)


def _debug_describe_exception(error):
    """Windows DoJavaScript Debug Diagnostics (Proposal Freeze
    2026-07-15-freeze-01), debug-only helper: best-effort, defensive
    extraction of whatever COM error detail is available on `error` (e.g.
    a pywintypes.com_error raised by app.DoJavaScript), including HRESULT
    and, if present, the excepinfo tuple's source / description /
    helpFile / helpContext / scode. Every attribute access is individually
    guarded so this debug helper itself can never turn into a new
    Exception; any field that isn't available is reported as such rather
    than guessed at. Does not change com_automation_failed's existing
    return value -- purely additional print output."""
    lines = ["type: {0}".format(type(error).__name__)]

    def _safe_get(name, fallback_index=None):
        try:
            value = getattr(error, name, None)
        except Exception:
            value = None
        if value is None and fallback_index is not None:
            try:
                args = getattr(error, "args", None)
                if args is not None and len(args) > fallback_index:
                    value = args[fallback_index]
            except Exception:
                value = None
        return value

    hresult = _safe_get("hresult", 0)
    lines.append("HRESULT: {0}".format(hresult))

    excepinfo = _safe_get("excepinfo", 2)
    if excepinfo:
        wcode = source = description = helpfile = helpcontext = scode = None
        try:
            fields = list(excepinfo) + [None] * max(0, 6 - len(excepinfo))
            wcode, source, description, helpfile, helpcontext, scode = fields[:6]
        except Exception:
            pass
        lines.append("excepinfo.wCode: {0}".format(wcode))
        lines.append("excepinfo.source: {0}".format(source))
        lines.append("excepinfo.description: {0}".format(description))
        lines.append("excepinfo.helpFile: {0}".format(helpfile))
        lines.append("excepinfo.helpContext: {0}".format(helpcontext))
        lines.append("excepinfo.scode: {0}".format(scode))
    else:
        lines.append("excepinfo: not available")

    return "\n".join(lines)


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
            # Windows DoJavaScript Debug Diagnostics (Proposal Freeze
            # 2026-07-15-freeze-01): print only the masked basenames of the
            # four paths the bootstrap embeds, so it's possible to confirm
            # the bootstrap was built with the right filenames/last folder
            # without ever printing the username, AppData, Temp, or any
            # full disk path. Purely additive -- does not change bootstrap,
            # the COM call, or any return value.
            print(
                "[SPX AD Runtime][Windows Adapter] DoJavaScript bootstrap "
                "(paths masked):\n"
                "  manifestPath: {0}\n"
                "  originalFolder: {1}\n"
                "  outputFolder: {2}\n"
                "  JSX_PATH: {3}".format(
                    _debug_mask_path(manifest_path),
                    _debug_mask_path(original_folder),
                    _debug_mask_path(output_folder),
                    _debug_mask_path(JSX_PATH),
                )
            )
            try:
                app.DoJavaScript(bootstrap)
            except Exception as error:
                # Windows DoJavaScript Debug Diagnostics (Proposal Freeze
                # 2026-07-15-freeze-01): print full available COM error
                # detail (HRESULT, excepinfo fields) so the real DISP_E_
                # EXCEPTION detail is visible instead of only the generic
                # "com_automation_failed" string. _debug_describe_exception
                # is fully defensive and cannot itself raise. Does not
                # change this except block's existing return value.
                print(
                    "[SPX AD Runtime][Windows Adapter] DoJavaScript failed:\n{0}".format(
                        _debug_describe_exception(error)
                    )
                )
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
