"""Self-contained SPX Helper validation using the real Runtime HTTP mapping."""

import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from spx_helper import (  # noqa: E402
    OFFICIAL_GITHUB_PAGES_ORIGIN,
    create_helper_server,
)
from spx_ad_runtime import RuntimeCore  # noqa: E402


ALLOWED_ORIGIN = OFFICIAL_GITHUB_PAGES_ORIGIN
DENIED_ORIGIN = "https://example.com"


class FakeCore(object):
    def __init__(self):
        self.calls = []

    def ready(self):
        self.calls.append(("ready",))
        return {"ready": True}

    def create_execution(self, manifest):
        self.calls.append(("execute", manifest))
        return {"accepted": True, "executionId": "execution-1"}

    def receive_asset(self, execution_id, asset_id, content):
        self.calls.append(("upload", execution_id, asset_id, content))
        return {"received": True}

    def status(self, execution_id):
        self.calls.append(("status", execution_id))
        return {"state": "Idle", "progress": None, "lastResult": None}

    def get_result(self, execution_id, asset_id):
        self.calls.append(("result", execution_id, asset_id))
        return {"ok": True, "content": b"fake-png"}


class EndToEndAdapter(object):
    """Minimal adapter fixture for RuntimeCore-through-Helper validation."""

    def is_ready(self):
        return True

    def is_alive(self):
        return True

    def execute(self, manifest_path, original_folder, output_folder):
        with open(manifest_path, "r", encoding="utf-8") as handle:
            manifest = json.load(handle)

        report_items = []
        for item in manifest["items"]:
            source_filename = item["source"]["filename"]
            output_filename = item["output"]["filename"]
            with open(os.path.join(original_folder, source_filename), "rb") as handle:
                content = handle.read()
            with open(os.path.join(output_folder, output_filename), "wb") as handle:
                handle.write(content)
            report_items.append(
                {
                    "assetKey": item.get("assetKey", ""),
                    "status": "success",
                    "sourceFilename": source_filename,
                    "outputFilename": output_filename,
                }
            )

        return {
            "ok": True,
            "error": None,
            "report": {
                "schema": "spx-ad-photoshop-run-report",
                "version": 1,
                "summary": {
                    "total": len(report_items),
                    "success": len(report_items),
                    "error": 0,
                },
                "items": report_items,
            },
        }


def request(url, method="GET", origin=None, body=None, headers=None):
    request_headers = dict(headers or {})
    if origin is not None:
        request_headers["Origin"] = origin
    req = urllib.request.Request(
        url,
        data=body,
        headers=request_headers,
        method=method,
    )
    try:
        response = urllib.request.urlopen(req, timeout=3)
        return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), error.read()


def check(name, condition, detail=""):
    if not condition:
        raise AssertionError("{0}: {1}".format(name, detail))
    print("PASS - {0}".format(name))


def main():
    core = FakeCore()
    server = create_helper_server(
        core,
        port=0,
        allowed_origins=[ALLOWED_ORIGIN],
    )
    port = server.server_address[1]
    base_url = "http://127.0.0.1:{0}".format(port)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        status, headers, _body = request(
            base_url + "/execute",
            method="OPTIONS",
            origin=ALLOWED_ORIGIN,
            headers={
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        check("Allowed OPTIONS returns 204", status == 204, status)
        check(
            "Allowed OPTIONS returns exact Origin",
            headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN,
            headers,
        )
        check(
            "Allowed OPTIONS preserves allowed methods",
            headers.get("Access-Control-Allow-Methods") == "GET, POST, OPTIONS",
            headers,
        )
        check(
            "Allowed OPTIONS preserves Content-Type header allowance",
            headers.get("Access-Control-Allow-Headers") == "Content-Type",
            headers,
        )
        check("OPTIONS never calls RuntimeCore", core.calls == [], core.calls)

        status, headers, _body = request(
            base_url + "/execute",
            method="OPTIONS",
            origin=DENIED_ORIGIN,
        )
        check("Denied OPTIONS returns 403", status == 403, status)
        check(
            "Denied OPTIONS has no allow-origin header",
            "Access-Control-Allow-Origin" not in headers,
            headers,
        )
        check("Denied OPTIONS never calls RuntimeCore", core.calls == [], core.calls)

        status, _headers, body = request(base_url + "/ready")
        check("Missing Origin is rejected", status == 403, (status, body))
        check("Missing Origin never calls RuntimeCore", core.calls == [], core.calls)

        status, _headers, body = request(
            base_url + "/ready",
            origin=DENIED_ORIGIN,
        )
        check("Denied GET is rejected", status == 403, (status, body))
        check("Denied GET never calls RuntimeCore", core.calls == [], core.calls)

        status, headers, body = request(
            base_url + "/execute",
            method="POST",
            origin=DENIED_ORIGIN,
            body=b'{"manifest":{"items":[]}}',
            headers={"Content-Type": "application/json"},
        )
        check("Denied POST is rejected", status == 403, (status, body))
        check(
            "Denied POST has no allow-origin header",
            "Access-Control-Allow-Origin" not in headers,
            headers,
        )
        check("Denied POST never calls RuntimeCore", core.calls == [], core.calls)

        status, headers, body = request(
            base_url + "/ready",
            origin=ALLOWED_ORIGIN,
        )
        check("Ready status is preserved", status == 200, status)
        check("Ready body is preserved", json.loads(body) == {"ready": True}, body)
        check(
            "Ready CORS header is present",
            headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN,
            headers,
        )

        manifest = {"items": [{"source": {"filename": "A.jpg"}}]}
        status, _headers, body = request(
            base_url + "/execute",
            method="POST",
            origin=ALLOWED_ORIGIN,
            body=json.dumps({"manifest": manifest}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        check("Execute status is preserved", status == 202, status)
        check(
            "Execute body is preserved",
            json.loads(body) == {"accepted": True, "executionId": "execution-1"},
            body,
        )

        status, _headers, body = request(
            base_url + "/executions/execution-1/assets/0",
            method="POST",
            origin=ALLOWED_ORIGIN,
            body=b"asset-bytes",
        )
        check("Asset Upload contract is preserved", status == 200, status)
        check("Asset Upload body is preserved", json.loads(body) == {"received": True}, body)

        status, _headers, body = request(
            base_url + "/status/execution-1",
            origin=ALLOWED_ORIGIN,
        )
        check("Status contract is preserved", status == 200, status)
        check("Status JSON is preserved", json.loads(body)["state"] == "Idle", body)

        status, headers, body = request(
            base_url + "/executions/execution-1/results/0",
            origin=ALLOWED_ORIGIN,
        )
        check("Result Retrieval status is preserved", status == 200, status)
        check("PNG binary is preserved", body == b"fake-png", body)
        check("PNG content type is preserved", headers.get("Content-Type") == "image/png", headers)
        check(
            "PNG CORS header is present",
            headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN,
            headers,
        )

        second_core = FakeCore()
        conflict_detected = False
        try:
            second_server = create_helper_server(
                second_core,
                port=port,
                allowed_origins=[ALLOWED_ORIGIN],
            )
        except OSError:
            conflict_detected = True
        else:
            second_server.server_close()
        check("Fixed-port bind prevents a second Helper", conflict_detected)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)

    restarted_core = FakeCore()
    restarted_server = create_helper_server(
        restarted_core,
        port=port,
        allowed_origins=[ALLOWED_ORIGIN],
    )
    restarted_thread = threading.Thread(
        target=restarted_server.serve_forever,
        daemon=True,
    )
    restarted_thread.start()
    try:
        status, _headers, body = request(
            "http://127.0.0.1:{0}/ready".format(port),
            origin=ALLOWED_ORIGIN,
        )
        check("External relaunch creates a clean Helper", status == 200, status)
        check("External relaunch creates a fresh Runtime boundary", json.loads(body) == {"ready": True}, body)
    finally:
        restarted_server.shutdown()
        restarted_server.server_close()
        restarted_thread.join(timeout=3)

    runtime_core = RuntimeCore(
        EndToEndAdapter(),
        progress_poll_interval=0.02,
        health_poll_interval=0.02,
    )
    runtime_server = create_helper_server(
        runtime_core,
        port=0,
        allowed_origins=[ALLOWED_ORIGIN],
    )
    runtime_port = runtime_server.server_address[1]
    runtime_base_url = "http://127.0.0.1:{0}".format(runtime_port)
    runtime_thread = threading.Thread(
        target=runtime_server.serve_forever,
        daemon=True,
    )
    runtime_thread.start()
    try:
        manifest = {
            "schema": "spx-ad-photoshop-job-manifest",
            "version": 1,
            "itemCount": 1,
            "items": [
                {
                    "assetKey": "HELPER__product__slot0__A",
                    "source": {"filename": "A.jpg"},
                    "output": {"filename": "A.png"},
                }
            ],
        }
        status, _headers, body = request(
            runtime_base_url + "/execute",
            method="POST",
            origin=ALLOWED_ORIGIN,
            body=json.dumps({"manifest": manifest}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        execute_result = json.loads(body)
        execution_id = execute_result.get("executionId")
        check("Real RuntimeCore Execute passes through Helper", status == 202 and execution_id, body)

        status, _headers, body = request(
            runtime_base_url + "/executions/{0}/assets/0".format(execution_id),
            method="POST",
            origin=ALLOWED_ORIGIN,
            body=b"real-runtime-through-helper",
        )
        check("Real RuntimeCore Asset Upload passes through Helper", status == 200, body)

        deadline = time.time() + 5
        completed_status = None
        while time.time() < deadline:
            status, _headers, body = request(
                runtime_base_url + "/status/{0}".format(execution_id),
                origin=ALLOWED_ORIGIN,
            )
            completed_status = json.loads(body)
            if (
                status == 200
                and completed_status.get("lastResult")
                and completed_status["lastResult"].get("state") == "Completed"
            ):
                break
            time.sleep(0.02)
        check(
            "Real RuntimeCore Status reaches Completed through Helper",
            completed_status
            and completed_status.get("lastResult", {}).get("state") == "Completed",
            completed_status,
        )

        status, headers, body = request(
            runtime_base_url + "/executions/{0}/results/0".format(execution_id),
            origin=ALLOWED_ORIGIN,
        )
        check("Real RuntimeCore Result passes through Helper", status == 200, status)
        check("Real RuntimeCore PNG bytes are unchanged", body == b"real-runtime-through-helper", body)
        check("Real RuntimeCore Result remains image/png", headers.get("Content-Type") == "image/png", headers)
    finally:
        runtime_server.shutdown()
        runtime_server.server_close()
        runtime_thread.join(timeout=3)

    print("\nSPX Helper validation: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
