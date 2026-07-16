"""SPX Helper HTTP boundary for the production GitHub Pages flow.

SPX Helper owns the single local listener on 127.0.0.1:8901, validates the
official GitHub Pages Origin, and delegates every allowed Runtime operation
to the existing RuntimeCore.  It does not proxy to a second HTTP server and
does not redefine the Ready / Execute / Asset Upload / Status / Result
contract.

Installer integration, login auto-start, automatic restart triggers,
packaging, signing, and updates are intentionally outside this module.
"""

import json

import spx_ad_runtime
from platform_adapter import get_platform_adapter


HELPER_HOST = "127.0.0.1"
HELPER_PORT = 8901

# GitHub Pages project paths are not part of an HTTP Origin.  The official
# SPX-AD Pages site therefore sends this scheme + host value in Origin.
OFFICIAL_GITHUB_PAGES_ORIGIN = "https://jamieshopee.github.io"
DEFAULT_ALLOWED_ORIGINS = frozenset([OFFICIAL_GITHUB_PAGES_ORIGIN])

ORIGIN_NOT_ALLOWED = "origin_not_allowed"


def _normalized_allowed_origins(allowed_origins):
    origins = DEFAULT_ALLOWED_ORIGINS if allowed_origins is None else allowed_origins
    return frozenset(str(origin) for origin in origins if origin)


def make_helper_handler(core, allowed_origins=None):
    """Build the one SPX Helper HTTP handler around an existing RuntimeCore.

    The existing Runtime handler remains the source of truth for route,
    payload, status-code, JSON, binary, and error-reason mapping.  This
    subclass adds only the production Origin gate and CORS response headers.
    """

    runtime_handler = spx_ad_runtime.make_handler(core)
    allowed = _normalized_allowed_origins(allowed_origins)

    class SPXHelperHandler(runtime_handler):
        def _request_origin_is_allowed(self):
            return self.headers.get("Origin") in allowed

        def _send_cors_headers(self):
            origin = self.headers.get("Origin")
            if origin in allowed:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")

        def _reject_origin(self):
            body = json.dumps({"error": ORIGIN_NOT_ALLOWED}).encode("utf-8")
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            self.close_connection = True

        def do_OPTIONS(self):  # noqa: N802 - stdlib handler signature
            if not self._request_origin_is_allowed():
                self._reject_origin()
                return
            # Existing handler returns the established 204 preflight shape.
            # It never calls RuntimeCore.
            super().do_OPTIONS()

        def do_GET(self):  # noqa: N802 - stdlib handler signature
            if not self._request_origin_is_allowed():
                self._reject_origin()
                return
            super().do_GET()

        def do_POST(self):  # noqa: N802 - stdlib handler signature
            if not self._request_origin_is_allowed():
                self._reject_origin()
                return
            super().do_POST()

    return SPXHelperHandler


def create_helper_server(core, host=HELPER_HOST, port=HELPER_PORT, allowed_origins=None):
    """Create and bind the sole SPX Helper server.

    Binding the fixed loopback endpoint is the single-instance boundary: if
    another Helper (or any other process) already owns the port, this raises
    OSError and the caller exits without selecting a fallback port.
    """

    handler = make_helper_handler(core, allowed_origins=allowed_origins)
    return spx_ad_runtime.ThreadingHTTPServer((host, port), handler)


def serve_helper(core, host=HELPER_HOST, port=HELPER_PORT, allowed_origins=None):
    """Run SPX Helper until externally stopped; return False on bind failure."""

    try:
        server = create_helper_server(
            core,
            host=host,
            port=port,
            allowed_origins=allowed_origins,
        )
    except OSError as error:
        print(
            "[SPX Helper] {0}:{1} unavailable; helper not started: {2}".format(
                host, port, error
            )
        )
        return False

    print("[SPX Helper] listening on http://{0}:{1}".format(host, port))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return True


def main():
    """Create a fresh RuntimeCore and run the production Helper boundary."""

    spx_ad_runtime._cleanup_stale_workspaces_on_startup()
    adapter = get_platform_adapter()
    core = spx_ad_runtime.RuntimeCore(adapter)
    return 0 if serve_helper(core) else 1


if __name__ == "__main__":
    raise SystemExit(main())
