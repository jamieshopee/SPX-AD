"""
Platform Adapter Interface — Photoshop Automation Phase

Defines the minimal, platform-agnostic contract that SPX AD Runtime uses to
talk to a platform-specific Photoshop invocation mechanism. SPX AD Runtime
(spx_ad_runtime.py) must only ever call methods on an adapter object that
satisfies this interface; it must never import or reference AppleScript,
macOS, or Windows specifics directly.

Per docs/proposals/Photoshop-Automation-Proposal.md (Frozen) and the
Implementation Proposal discussion:
  - Platform Adapter only handles platform-specific Photoshop invocation.
  - Ready / Execution / Status Contract logic and Runtime Health Detection
    decisions live in SPX AD Runtime, not in any adapter.

Every adapter must implement:

    is_alive() -> bool
        Platform-specific primitive: is Photoshop currently running /
        reachable. Used both for Ready Check and for Runtime Health
        Detection polling during Running.

    execute(manifest_path, original_folder, output_folder) -> dict
        Platform-specific primitive: hand the manifest to Photoshop and
        block until the one-shot execution finishes (or fails to start).
        Must return a dict shaped like:
            {
                "ok": bool,               # False only if the platform-level
                                          # invocation itself could not run
                                          # (e.g. AppleScript call failed to
                                          # launch at all)
                "error": str | None,      # human-readable detail when ok=False
                "report": dict | None,    # parsed photoshop-run-report.json
                                          # if one was produced, else None
            }
        This method does not decide Completed vs Partial Failure vs Failure
        — that decision is SPX AD Runtime's job, based on this return value.

This file intentionally defines no behavior of its own beyond a factory that
picks the right adapter for the current OS. Windows support is a reserved
architecture position only (see windows_adapter.py) and is not implemented
in this Coding pass.
"""

import platform


def get_platform_adapter():
    """Return a Platform Adapter instance for the current operating system.

    Raises NotImplementedError for any OS without an implemented adapter
    (currently: anything other than macOS). This is intentional — Windows
    Photoshop Adapter is architecture-reserved only, per the Implementation
    Proposal's explicit scope ("Windows Photoshop Adapter 本次不實作，只保留
    架構位置").
    """
    system = platform.system()
    if system == "Darwin":
        from macos_adapter import MacOSPhotoshopAdapter

        return MacOSPhotoshopAdapter()
    if system == "Windows":
        from windows_adapter import WindowsPhotoshopAdapter

        return WindowsPhotoshopAdapter()
    raise NotImplementedError(
        "No Platform Adapter is implemented for OS: {0}".format(system)
    )
