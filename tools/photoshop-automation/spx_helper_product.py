"""Desktop product host for the existing, unchanged SPX Helper Core.

Phase 1 owns only the shared product lifecycle: background execution,
Running / Working / Attention state, one Helper listener, the fixed tray /
menu-bar commands, Quit, and Restart.  OS login registration and installers
belong to later phases.

This module deliberately imports and composes ``spx_helper``; it does not
redefine the HTTP handler, Runtime Contract, Platform Adapter, or Photoshop
automation flow.
"""

import os
import platform
import subprocess
import sys
import threading
import urllib.error
import urllib.request
import webbrowser

import spx_ad_runtime
import spx_helper
from platform_adapter import get_platform_adapter


PRODUCT_NAME = "SPX Helper"
PRODUCT_VERSION = "0.5.4"
PRODUCT_URL = "https://jamieshopee.github.io/SPX-AD/"

STATE_RUNNING = "Running"
STATE_WORKING = "Working"
STATE_ATTENTION = "Attention"

START_STARTED = "started"
START_ALREADY_RUNNING = "already_running"
START_ATTENTION = "attention"


class ActivityTrackingAdapter(object):
    """Observe adapter execution without changing the adapter or RuntimeCore."""

    def __init__(self, adapter, working_event):
        self._adapter = adapter
        self._working_event = working_event

    def is_ready(self):
        return self._adapter.is_ready()

    def is_alive(self):
        return self._adapter.is_alive()

    def execute(self, manifest_path, original_folder, output_folder):
        self._working_event.set()
        try:
            return self._adapter.execute(
                manifest_path,
                original_folder,
                output_folder,
            )
        finally:
            self._working_event.clear()


class HelperProductService(object):
    """Own the one Helper listener used by the desktop product lifecycle."""

    def __init__(
        self,
        adapter_factory=get_platform_adapter,
        host=spx_helper.HELPER_HOST,
        port=spx_helper.HELPER_PORT,
        allowed_origins=None,
        cleanup_callback=spx_ad_runtime._cleanup_stale_workspaces_on_startup,
    ):
        self._adapter_factory = adapter_factory
        self._host = host
        self._port = port
        self._allowed_origins = allowed_origins
        self._cleanup_callback = cleanup_callback
        self._working_event = threading.Event()
        self._server = None
        self._server_thread = None
        self._core = None
        self._start_attention = False
        self._lock = threading.Lock()

    @property
    def bound_port(self):
        server = self._server
        return server.server_address[1] if server is not None else self._port

    @property
    def is_working(self):
        return self._working_event.is_set()

    @property
    def core(self):
        return self._core

    def _existing_helper_is_reachable(self):
        url = "http://{0}:{1}/ready".format(self._host, self._port)
        request = urllib.request.Request(
            url,
            headers={"Origin": spx_helper.OFFICIAL_GITHUB_PAGES_ORIGIN},
        )
        try:
            with urllib.request.urlopen(request, timeout=0.75) as response:
                return response.status == 200
        except urllib.error.HTTPError as error:
            return error.code == 200
        except Exception:
            return False

    def start(self):
        with self._lock:
            if self._server is not None:
                return START_STARTED

            self._start_attention = False
            if self._port and self._existing_helper_is_reachable():
                return START_ALREADY_RUNNING

            try:
                self._cleanup_callback()
                adapter = ActivityTrackingAdapter(
                    self._adapter_factory(),
                    self._working_event,
                )
                core = spx_ad_runtime.RuntimeCore(adapter)
                server = spx_helper.create_helper_server(
                    core,
                    host=self._host,
                    port=self._port,
                    allowed_origins=self._allowed_origins,
                )
            except OSError:
                if self._port and self._existing_helper_is_reachable():
                    return START_ALREADY_RUNNING
                self._start_attention = True
                return START_ATTENTION
            except Exception:
                self._start_attention = True
                return START_ATTENTION

            thread = threading.Thread(
                target=server.serve_forever,
                name="SPXHelperServer",
                daemon=True,
            )
            self._core = core
            self._server = server
            self._server_thread = thread
            thread.start()
            return START_STARTED

    def state(self):
        if self._working_event.is_set():
            return STATE_WORKING
        if self._start_attention:
            return STATE_ATTENTION
        thread = self._server_thread
        if self._server is not None and thread is not None and thread.is_alive():
            return STATE_RUNNING
        return STATE_ATTENTION

    def stop(self):
        with self._lock:
            server = self._server
            thread = self._server_thread
            self._server = None
            self._server_thread = None
            self._core = None
            self._start_attention = False

        if server is not None:
            server.shutdown()
            server.server_close()
        if thread is not None and thread is not threading.current_thread():
            thread.join(timeout=5)


class NativeDialogs(object):
    """Small native About / Version / confirmation surface; no settings UI."""

    def message(self, title, text):
        system = platform.system()
        if system == "Darwin":
            from AppKit import NSAlert

            alert = NSAlert.alloc().init()
            alert.setMessageText_(title)
            alert.setInformativeText_(text)
            alert.addButtonWithTitle_("OK")
            alert.runModal()
            return
        if system == "Windows":
            import ctypes

            ctypes.windll.user32.MessageBoxW(None, text, title, 0x40)
            return
        print("{0}: {1}".format(title, text))

    def confirm(self, title, text):
        system = platform.system()
        if system == "Darwin":
            from AppKit import NSAlert

            alert = NSAlert.alloc().init()
            alert.setMessageText_(title)
            alert.setInformativeText_(text)
            alert.addButtonWithTitle_("Continue")
            alert.addButtonWithTitle_("Cancel")
            return alert.runModal() == 1000
        if system == "Windows":
            import ctypes

            result = ctypes.windll.user32.MessageBoxW(
                None,
                text,
                title,
                0x21,
            )
            return result == 1
        return True


class ProductController(object):
    """Translate the fixed product menu into lifecycle operations."""

    def __init__(
        self,
        service,
        dialogs=None,
        open_url=webbrowser.open,
        relaunch=None,
    ):
        self.service = service
        self.dialogs = dialogs or NativeDialogs()
        self._open_url = open_url
        self._relaunch = relaunch or relaunch_current_product
        self._tray = None

    def attach_tray(self, tray):
        self._tray = tray

    def open_product(self):
        self._open_url(PRODUCT_URL)

    def show_about(self):
        self.dialogs.message(
            "About {0}".format(PRODUCT_NAME),
            "{0}\nDepartment background helper".format(PRODUCT_NAME),
        )

    def show_version(self):
        self.dialogs.message(
            "{0} Version".format(PRODUCT_NAME),
            PRODUCT_VERSION,
        )

    def _working_warning(self, action):
        return self.dialogs.confirm(
            "{0} {1}?".format(action, PRODUCT_NAME),
            "SPX Helper is Working. {0} may interrupt the current work.".format(
                action
            ),
        )

    def request_quit(self):
        if self.service.is_working:
            if not self._working_warning("Quit"):
                return False
        else:
            if not self.dialogs.confirm(
                "Quit {0}?".format(PRODUCT_NAME),
                (
                    "SPX Helper will stop for this login session. "
                    "It will start automatically the next time you log in. "
                    "You can start it again from Start Menu or Applications."
                ),
            ):
                return False

        self.service.stop()
        if self._tray is not None:
            self._tray.stop()
        return True

    def request_restart(self):
        if self.service.is_working and not self._working_warning("Restart"):
            return False

        self.service.stop()
        if self._tray is not None:
            self._tray.stop()
        self._relaunch()
        return True


class ProductTray(object):
    """The fixed System Tray / Menu Bar surface shared by both platforms."""

    def __init__(self, controller, service):
        self._controller = controller
        self._service = service
        self._icon = None
        self._monitor_stop = threading.Event()
        self._monitor_thread = None

    def _create_image(self):
        from PIL import Image, ImageDraw

        image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((4, 4, 60, 60), radius=14, fill=(238, 77, 45, 255))
        draw.rectangle((18, 18, 46, 46), fill=(255, 255, 255, 255))
        draw.rectangle((24, 24, 40, 40), fill=(238, 77, 45, 255))
        return image

    def _status_text(self, _item):
        return "Status: {0}".format(self._service.state())

    def _build_menu(self):
        import pystray

        return pystray.Menu(
            pystray.MenuItem(self._status_text, None, enabled=False),
            pystray.MenuItem(
                "Open SPX BN Generator",
                lambda _icon, _item: self._controller.open_product(),
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "About",
                lambda _icon, _item: self._controller.show_about(),
            ),
            pystray.MenuItem(
                "Version",
                lambda _icon, _item: self._controller.show_version(),
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "Restart SPX Helper",
                lambda _icon, _item: self._controller.request_restart(),
            ),
            pystray.MenuItem(
                "Quit SPX Helper",
                lambda _icon, _item: self._controller.request_quit(),
            ),
        )

    def _monitor_state(self):
        previous = None
        while not self._monitor_stop.wait(0.5):
            current = self._service.state()
            if current == previous:
                continue
            previous = current
            icon = self._icon
            if icon is not None:
                icon.title = "{0} — {1}".format(PRODUCT_NAME, current)
                icon.update_menu()

    def run(self):
        import pystray

        self._icon = pystray.Icon(
            "spx-helper",
            self._create_image(),
            "{0} — {1}".format(PRODUCT_NAME, self._service.state()),
            self._build_menu(),
        )
        self._controller.attach_tray(self)
        self._monitor_stop.clear()
        self._monitor_thread = threading.Thread(
            target=self._monitor_state,
            name="SPXHelperTrayState",
            daemon=True,
        )
        self._monitor_thread.start()
        try:
            self._icon.run()
        finally:
            self._monitor_stop.set()
            monitor = self._monitor_thread
            if monitor is not None and monitor is not threading.current_thread():
                monitor.join(timeout=2)

    def stop(self):
        self._monitor_stop.set()
        if self._icon is not None:
            self._icon.stop()


def relaunch_current_product():
    """Relaunch only after the current Helper listener has been released."""

    if getattr(sys, "frozen", False):
        command = [sys.executable]
    else:
        command = [sys.executable, os.path.abspath(__file__)]

    kwargs = {
        "stdin": subprocess.DEVNULL,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }
    if os.name == "nt":
        kwargs["creationflags"] = 0x00000008 | 0x00000200
    else:
        kwargs["start_new_session"] = True
    subprocess.Popen(command, **kwargs)


def main():
    service = HelperProductService()
    start_result = service.start()
    if start_result == START_ALREADY_RUNNING:
        return 0

    controller = ProductController(service)
    tray = ProductTray(controller, service)
    try:
        tray.run()
    finally:
        service.stop()
    return 0 if start_result == START_STARTED else 1


if __name__ == "__main__":
    raise SystemExit(main())
