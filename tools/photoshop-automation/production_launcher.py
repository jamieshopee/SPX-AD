"""
SPX AD Production Launcher — Coding Phase 7／7: End-to-End Integration

This is the Production Launcher, NOT the Runtime and NOT a Development Tool.
It is the single, cross-platform (macOS + Windows) source file that a
PyInstaller build turns into the double-clickable Production application
(see BUILD.md in this same directory for the per-OS build commands — the
actual .app / .exe binary must be produced by running PyInstaller ON that
OS; this sandbox cannot cross-compile either one).

Clear separation of concerns (per this Phase's explicit instruction):
  - Development Launcher: start-spx-ad-runtime.command (Terminal, dev/debug/
    Runtime Validation/unit testing only — unchanged, still exists, still
    documented as Development-only).
  - Production Launcher: THIS FILE. What an end user actually double-clicks
    in Production. Does not implement any generator/editor UI itself.
  - Runtime: spx_ad_runtime.py (unchanged Ready / Execution / Status /
    Result Contract). This Launcher imports and runs it in a background
    thread inside the same process -- it does not modify Runtime at all.
  - index.html UI: unchanged, still the only functional generator UI. This
    Launcher only ever opens the user's default browser to it; it never
    embeds a browser, never adds any UI of its own.

What this Launcher does, in order (all with generous, bounded timeouts --
no infinite loops, no magic numbers scattered elsewhere in this file):
  1. Start SPX AD Runtime (spx_ad_runtime.run_server) in a background,
     daemon thread inside this same process -- no visible console window,
     no Terminal / Command Prompt / PowerShell window, no requirement that
     the user has Python installed themselves (once bundled by PyInstaller,
     this process carries its own embedded Python + pywin32/AppleScript
     dependencies).
  2. Poll the Runtime's existing GET /ready endpoint until it responds at
     all (HTTP-reachable), NOT until Photoshop itself is reported ready --
     "Photoshop not open yet" is index.html's own Ready Check UI's job
     (already built, Coding Phase 1), not this Launcher's. This Launcher
     only confirms the Runtime *process* itself is up.
  3. Start (or reuse, if one is already listening) a small static file
     server for the SPX AD project root on 127.0.0.1, serving index.html --
     matching the exact same "reuse existing local server if already
     running, otherwise start one" convention already used by this
     project's existing launch/*.command scripts (see e.g.
     launch/啟動編輯器_3189x3992.command), rather than opening index.html
     via a file:// URL (which would send Origin: null to the Runtime's CORS
     handling and break fetch()/Execute/Status/Result calls).
  4. Open the user's default browser to that URL. index.html remains the
     sole functional generator UI; this file adds nothing to it.

This file does not:
  - Implement or duplicate any part of Control Center / generator UI.
  - Modify spx_ad_runtime.py, any Platform Adapter, or the Ready /
    Execution / Status / Result Contract.
  - Require the end user to install Python, or open Terminal / Command
    Prompt / PowerShell themselves.
"""

import http.server
import os
import socket
import socketserver
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser

# Centralized constants -- not scattered as inline magic numbers elsewhere
# in this file.
RUNTIME_PORT = 8901
STATIC_SERVER_PORT = 8080
RUNTIME_READY_ENDPOINT = "http://127.0.0.1:{0}/ready".format(RUNTIME_PORT)
RUNTIME_STARTUP_TIMEOUT_SECONDS = 30
RUNTIME_STARTUP_POLL_INTERVAL_SECONDS = 0.5

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
# The SPX AD project root (where index.html lives) is two levels up from
# this file's directory (tools/photoshop-automation/ -> project root).
_PROJECT_ROOT = os.path.abspath(os.path.join(_THIS_DIR, "..", ".."))


def _is_port_listening(port, host="127.0.0.1", timeout=0.5):
    """Best-effort check: is something already listening on this port. Used
    both for "is the Runtime already up" and "is a static server already
    serving index.html" -- in both cases, reuse rather than start a second,
    competing instance."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        return sock.connect_ex((host, port)) == 0
    finally:
        sock.close()


def _start_runtime_in_background():
    """Starts SPX AD Runtime (unchanged) in a background daemon thread
    inside this same process, unless one is already listening on
    RUNTIME_PORT (e.g. a developer already has
    start-spx-ad-runtime.command running -- reuse it rather than binding
    the same port twice, which would just fail anyway)."""
    if _is_port_listening(RUNTIME_PORT):
        return

    from platform_adapter import get_platform_adapter
    import spx_ad_runtime

    spx_ad_runtime._cleanup_stale_workspaces_on_startup()
    adapter = get_platform_adapter()
    core = spx_ad_runtime.RuntimeCore(adapter)

    thread = threading.Thread(
        target=spx_ad_runtime.run_server,
        args=(core, RUNTIME_PORT),
        daemon=True,
    )
    thread.start()


def _wait_for_runtime_reachable(timeout_seconds=RUNTIME_STARTUP_TIMEOUT_SECONDS):
    """Polls GET /ready until the Runtime process itself responds at all
    (any HTTP response, regardless of the ready:true/false value inside --
    that distinction is index.html's own Ready Check UI's job). Bounded by
    timeout_seconds; never loops forever. Returns True once reachable,
    False if the timeout elapses first."""
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(RUNTIME_READY_ENDPOINT, timeout=2) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(RUNTIME_STARTUP_POLL_INTERVAL_SECONDS)
    return False


def _start_static_server_in_background():
    """Serves the SPX AD project root (where index.html lives) over
    127.0.0.1, matching the existing project convention (see
    launch/*.command) of a local HTTP origin rather than file://. Reuses an
    already-listening server on STATIC_SERVER_PORT instead of starting a
    second one."""
    if _is_port_listening(STATIC_SERVER_PORT):
        return

    class _Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=_PROJECT_ROOT, **kwargs)

        def log_message(self, format, *args):  # noqa: A002 - stdlib signature
            pass  # quiet by default -- Production build has no visible console anyway

    class _ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    server = _ReusableTCPServer(("127.0.0.1", STATIC_SERVER_PORT), _Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()


def main():
    _start_runtime_in_background()
    reachable = _wait_for_runtime_reachable()
    # Even if the Runtime did not become reachable within the timeout, still
    # proceed to open index.html -- the browser's own Ready Check UI already
    # handles "Runtime unreachable" (see js/ai-workflow-ready-check.js,
    # reason: 'unreachable') and lets the user retry via 「重新檢查」without
    # needing to relaunch this Production Launcher. This Launcher must not
    # silently do nothing just because the Runtime happened to be slow to
    # start.
    del reachable  # decision documented above; value itself not branched on

    _start_static_server_in_background()
    webbrowser.open("http://127.0.0.1:{0}/index.html".format(STATIC_SERVER_PORT))


if __name__ == "__main__":
    main()
