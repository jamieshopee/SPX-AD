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
  - Execute drives the SAME tools/photoshop/remove-background.jsx that the
    macOS Adapter uses. Windows reads that shared file as UTF-8, prepends the
    existing $.global.__SPX_PS_ADAPTER_ARGS__ object, and sends the complete
    JavaScript source through app.DoJavaScript().
  - app.DoJavaScript() blocks until the one-shot ExtendScript execution
    finishes, so this adapter's execute() can read photoshop-run-report.json
    immediately after the call returns, the same way macos_adapter.py does.

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


def _read_run_report(output_folder):
    report_path = os.path.join(output_folder, "photoshop-run-report.json")
    if not os.path.exists(report_path):
        return None
    try:
        with open(report_path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None


def _read_javascript_source():
    with open(JSX_PATH, "r", encoding="utf-8") as handle:
        return handle.read()


def _debug_mask_path(path):
    """Windows JavaScript Entry Diagnostics (Proposal Freeze
    2026-07-15-freeze-01), debug-only display helper: returns only the
    last path component (basename) formatted as '<...>\\<basename>', so
    JavaScript entry debug output never reveals the username, AppData, Temp, or
    any full disk path. Never raises -- any failure to compute a basename
    falls back to an empty basename rather than propagating an exception
    out of a debug helper."""
    try:
        basename = os.path.basename(str(path))
    except Exception:
        basename = ""
    return "<...>\\{0}".format(basename)


def _debug_describe_exception(error):
    """Windows JavaScript Entry Diagnostics (Proposal Freeze
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
        finishes (or fails to run at all). Does not modify the processing
        logic inside remove-background.jsx.

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

            try:
                jsx_source = _read_javascript_source()
            except Exception as error:
                return {
                    "ok": False,
                    "error": "javascript_source_read_failed: {0}".format(error),
                    "report": None,
                }

            args_json = json.dumps(
                {
                    "manifestPath": manifest_path,
                    "originalFolder": original_folder,
                    "outputFolder": output_folder,
                },
                ensure_ascii=True,
                separators=(",", ":"),
            )
            preamble = "$.global.__SPX_PS_ADAPTER_ARGS__ = {0};\n".format(args_json)
            full_script = preamble + jsx_source
            # Windows JavaScript Entry Diagnostics: print only the masked
            # basenames of the file and three path arguments without ever
            # printing the username, AppData, Temp, or any full disk path.
            print(
                "[SPX AD Runtime][Windows Adapter] DoJavaScript call "
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
                app.DoJavaScript(full_script)
            except Exception as error:
                # Windows JavaScript Entry Diagnostics (Proposal Freeze
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
