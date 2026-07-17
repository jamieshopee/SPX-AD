"""Self-contained Phase 1 validation for the SPX Helper product lifecycle."""

import json
import os
import socket
import sys
import threading
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from spx_helper import OFFICIAL_GITHUB_PAGES_ORIGIN  # noqa: E402
from spx_helper_product import (  # noqa: E402
    PRODUCT_URL,
    PRODUCT_VERSION,
    START_ALREADY_RUNNING,
    START_ATTENTION,
    START_STARTED,
    STATE_ATTENTION,
    STATE_RUNNING,
    STATE_WORKING,
    ActivityTrackingAdapter,
    HelperProductService,
    ProductController,
    ProductTray,
)


def check(name, condition, detail=""):
    if not condition:
        raise AssertionError("{0}: {1}".format(name, detail))
    print("PASS - {0}".format(name))


def unused_local_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def ready_request(port):
    request = urllib.request.Request(
        "http://127.0.0.1:{0}/ready".format(port),
        headers={"Origin": OFFICIAL_GITHUB_PAGES_ORIGIN},
    )
    with urllib.request.urlopen(request, timeout=3) as response:
        return response.status, json.loads(response.read())


class ReadyAdapter(object):
    def is_ready(self):
        return True

    def is_alive(self):
        return True

    def execute(self, _manifest_path, _original_folder, _output_folder):
        return {"ok": True, "error": None, "report": None}


class BlockingAdapter(ReadyAdapter):
    def __init__(self):
        self.entered = threading.Event()
        self.release = threading.Event()

    def execute(self, _manifest_path, _original_folder, _output_folder):
        self.entered.set()
        self.release.wait(timeout=3)
        return {"ok": True, "error": None, "report": None}


class FakeDialogs(object):
    def __init__(self, answers=None):
        self.answers = list(answers or [])
        self.messages = []
        self.confirmations = []

    def message(self, title, text):
        self.messages.append((title, text))

    def confirm(self, title, text):
        self.confirmations.append((title, text))
        return self.answers.pop(0) if self.answers else True


class FakeTray(object):
    def __init__(self):
        self.stopped = False

    def stop(self):
        self.stopped = True


def validate_service_states():
    port = unused_local_port()
    service = HelperProductService(
        adapter_factory=ReadyAdapter,
        port=port,
        allowed_origins=[OFFICIAL_GITHUB_PAGES_ORIGIN],
        cleanup_callback=lambda: None,
    )
    try:
        check("Product Foundation starts", service.start() == START_STARTED)
        check("Idle maps to Running", service.state() == STATE_RUNNING)
        status, body = ready_request(port)
        check("Existing Helper Ready contract remains reachable", status == 200)
        check("Existing Helper Ready response remains unchanged", body == {"ready": True})

        second = HelperProductService(
            adapter_factory=ReadyAdapter,
            port=port,
            allowed_origins=[OFFICIAL_GITHUB_PAGES_ORIGIN],
            cleanup_callback=lambda: None,
        )
        check(
            "Second product launch reuses the existing Helper",
            second.start() == START_ALREADY_RUNNING,
        )
        check("Second launch creates no second core", second.core is None)
    finally:
        service.stop()

    failed = HelperProductService(
        adapter_factory=lambda: (_ for _ in ()).throw(RuntimeError("failed")),
        port=unused_local_port(),
        cleanup_callback=lambda: None,
    )
    check("Startup failure returns Attention", failed.start() == START_ATTENTION)
    check("Attention state is observable", failed.state() == STATE_ATTENTION)


def validate_working_state():
    adapter = BlockingAdapter()
    working_event = threading.Event()
    tracked = ActivityTrackingAdapter(adapter, working_event)
    worker = threading.Thread(
        target=tracked.execute,
        args=("manifest", "original", "output"),
        daemon=True,
    )
    worker.start()
    check("Working begins with adapter execution", adapter.entered.wait(timeout=2))
    check("Working event is set", working_event.is_set())
    adapter.release.set()
    worker.join(timeout=2)
    check("Working ends with adapter execution", not working_event.is_set())


def validate_menu_lifecycle():
    opened = []
    relaunched = []

    quit_service = HelperProductService(
        adapter_factory=ReadyAdapter,
        port=unused_local_port(),
        cleanup_callback=lambda: None,
    )
    check("Quit fixture starts", quit_service.start() == START_STARTED)
    quit_dialogs = FakeDialogs([True])
    quit_tray = FakeTray()
    quit_controller = ProductController(
        quit_service,
        dialogs=quit_dialogs,
        open_url=opened.append,
        relaunch=lambda: relaunched.append(True),
    )
    quit_controller.attach_tray(quit_tray)
    quit_controller.open_product()
    check("Open command uses the official product URL", opened == [PRODUCT_URL])
    quit_controller.show_about()
    quit_controller.show_version()
    check("About is available", len(quit_dialogs.messages) == 2)
    check("Version is available", quit_dialogs.messages[-1][1] == PRODUCT_VERSION)
    check("Quit is confirmed", quit_controller.request_quit())
    check("Quit stops this Helper session", quit_service.core is None)
    check("Quit stops the tray lifecycle", quit_tray.stopped)
    check("Quit does not relaunch", relaunched == [])

    restart_service = HelperProductService(
        adapter_factory=ReadyAdapter,
        port=unused_local_port(),
        cleanup_callback=lambda: None,
    )
    check("Restart fixture starts", restart_service.start() == START_STARTED)
    restart_tray = FakeTray()
    restart_controller = ProductController(
        restart_service,
        dialogs=FakeDialogs(),
        relaunch=lambda: relaunched.append(True),
    )
    restart_controller.attach_tray(restart_tray)
    check("Restart is accepted", restart_controller.request_restart())
    check("Restart releases the old Helper first", restart_service.core is None)
    check("Restart stops the old tray", restart_tray.stopped)
    check("Restart requests exactly one relaunch", relaunched == [True])


def validate_fixed_menu():
    class MenuService(object):
        def state(self):
            return STATE_RUNNING

    menu = ProductTray(object(), MenuService())._build_menu()
    labels = [str(item) for item in menu.items]
    check(
        "Tray / Menu Bar contains only the fixed Phase 1 commands",
        labels
        == [
            "Status: Running",
            "Open SPX BN Generator",
            "- - - -",
            "About",
            "Version",
            "- - - -",
            "Restart SPX Helper",
            "Quit SPX Helper",
        ],
    )


def validate_working_warnings():
    class WorkingService(object):
        is_working = True

        def __init__(self):
            self.stopped = False

        def stop(self):
            self.stopped = True

    service = WorkingService()
    dialogs = FakeDialogs([False, False])
    controller = ProductController(service, dialogs=dialogs, relaunch=lambda: None)
    check("Working Quit can be cancelled", not controller.request_quit())
    check("Cancelled Working Quit does not stop Helper", not service.stopped)
    check("Working Restart can be cancelled", not controller.request_restart())
    check("Working actions show warnings", len(dialogs.confirmations) == 2)


def main():
    validate_service_states()
    validate_working_state()
    validate_menu_lifecycle()
    validate_fixed_menu()
    validate_working_warnings()
    print("\nSPX Helper product foundation validation: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
