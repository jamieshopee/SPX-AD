"""Static and artifact validation for Phase 3 macOS packaging."""

import argparse
import ast
from pathlib import Path
import plistlib
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET


PRODUCT_NAME = "SPX Helper"
PRODUCT_VERSION = "0.5.4"
BUNDLE_IDENTIFIER = "com.spxad.helper"
PACKAGE_IDENTIFIER = "com.spxad.helper.pkg"
LAUNCH_AGENT_LABEL = "com.spxad.helper"
INSTALLED_EXECUTABLE = "/Applications/SPX Helper.app/Contents/MacOS/SPX Helper"


def check(name, condition, detail=""):
    if not condition:
        raise AssertionError("{0}: {1}".format(name, detail))
    print("PASS - {0}".format(name))


def read_product_version(product_host):
    module = ast.parse(product_host.read_text(encoding="utf-8"))
    for node in module.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "PRODUCT_VERSION":
                    return ast.literal_eval(node.value)
    return None


def validate_spec(packaging_dir, automation_dir):
    spec_text = (packaging_dir / "SPXHelper.spec").read_text(encoding="utf-8")
    check(
        "Product Host is the only PyInstaller entry point",
        'ENTRY_POINT = AUTOMATION_DIR / "spx_helper_product.py"' in spec_text,
    )
    check("macOS bundle has no console", "console=False" in spec_text)
    check("macOS application bundle is created", "BUNDLE(" in spec_text)
    check("macOS bundle identifier is fixed", 'bundle_identifier="com.spxad.helper"' in spec_text)
    check("Menu Bar backend is bundled", '"pystray._darwin"' in spec_text)
    check("Cocoa dialogs are bundled", '"AppKit"' in spec_text)
    check("macOS Adapter is bundled", '"macos_adapter"' in spec_text)
    check("Windows Adapter is excluded", '"windows_adapter"' in spec_text)
    check("Historical launcher is not an entry point", "production_launcher.py" not in spec_text)
    check("Spec resolves the existing automation directory", automation_dir.name == "photoshop-automation")


def validate_launch_agent(packaging_dir):
    plist_path = packaging_dir / "resources" / "com.spxad.helper.plist"
    with plist_path.open("rb") as handle:
        launch_agent = plistlib.load(handle)
    check("Login LaunchAgent label is fixed", launch_agent.get("Label") == LAUNCH_AGENT_LABEL)
    check(
        "Login LaunchAgent targets the installed Product Host",
        launch_agent.get("ProgramArguments") == [INSTALLED_EXECUTABLE],
    )
    check("Login LaunchAgent starts at login", launch_agent.get("RunAtLoad") is True)
    check("Login LaunchAgent is limited to Aqua", launch_agent.get("LimitLoadToSessionType") == "Aqua")
    check("Login LaunchAgent does not keep Quit alive", launch_agent.get("KeepAlive") in (None, False))


def validate_build_inputs(packaging_dir, automation_dir):
    requirements = (packaging_dir / "requirements-build.txt").read_text(encoding="utf-8").splitlines()
    check("PyInstaller version is pinned", "PyInstaller==6.21.0" in requirements)
    check("Phase 1 pystray version is preserved", "pystray==0.19.5" in requirements)
    check("Phase 1 Pillow version is preserved", "Pillow==11.3.0" in requirements)
    check("Phase 1 PyObjC version is preserved", "pyobjc-core==9.2" in requirements)

    ignore_rules = (packaging_dir / ".gitignore").read_text(encoding="utf-8").splitlines()
    check("Packaging virtual environment is locally ignored", ".venv/" in ignore_rules)
    check("Packaging Python cache is locally ignored", "__pycache__/" in ignore_rules)
    check("Packaging build output is locally ignored", "build/" in ignore_rules)
    check("Packaging PKG output is locally ignored", "dist/" in ignore_rules)

    product_host = automation_dir / "spx_helper_product.py"
    check("Product Host exists", product_host.is_file())
    check("Product Host version remains 0.5.4", read_product_version(product_host) == PRODUCT_VERSION)
    check(
        "Shared AppleScript exists",
        (automation_dir.parent / "photoshop" / "run-photoshop-manifest.applescript").is_file(),
    )
    check(
        "Shared remove-background.jsx exists",
        (automation_dir.parent / "photoshop" / "remove-background.jsx").is_file(),
    )

    build_text = (packaging_dir / "build.sh").read_text(encoding="utf-8")
    check("Build is macOS-only", "macOS packaging must be built on macOS" in build_text)
    check("Build produces an application bundle", "SPX Helper.app" in build_text)
    check("Build produces a PKG without a bootstrapper", "/usr/bin/pkgbuild" in build_text and "/usr/bin/productbuild" in build_text)
    check("Build analyzes the component plist", "pkgbuild --analyze" in build_text)
    check("Build disables App bundle relocation", "Set :0:BundleIsRelocatable false" in build_text)
    check("Build passes the component plist to pkgbuild", '--component-plist "$COMPONENT_PLIST"' in build_text)
    check("Release build requires an Application identity", "SPX_MACOS_APPLICATION_SIGNING_IDENTITY" in build_text)
    check("Release build requires an Installer identity", "SPX_MACOS_INSTALLER_SIGNING_IDENTITY" in build_text)
    check("Release build requires a notarization profile", "SPX_MACOS_NOTARY_PROFILE" in build_text)
    check("Release build submits for notarization", "notarytool submit" in build_text)
    check("Release build staples the ticket", "stapler staple" in build_text)
    check("Release build validates the stapled ticket", "stapler validate" in build_text)
    check("Build copies shared Photoshop files without modifying them", "/bin/cp \"$PHOTOSHOP_DIR/run-photoshop-manifest.applescript\"" in build_text and "/bin/cp \"$PHOTOSHOP_DIR/remove-background.jsx\"" in build_text)

    postinstall_text = (packaging_dir / "scripts" / "postinstall").read_text(encoding="utf-8")
    check("Install registers the current Aqua session", "launchctl bootstrap" in postinstall_text)
    check("Install launches SPX Helper immediately", "/usr/bin/open \"$APP_PATH\"" in postinstall_text)
    check("Install does not remove login startup", "bootout" not in postinstall_text)


def validate_component_plist(component_plist):
    with component_plist.open("rb") as handle:
        components = plistlib.load(handle)
    check("Component plist contains one top-level App bundle", len(components) == 1)
    component = components[0]
    check(
        "Component App path is fixed to Applications",
        component.get("RootRelativeBundlePath") == "Applications/SPX Helper.app",
    )
    check("Component App is not relocatable", component.get("BundleIsRelocatable") is False)
    check("Component App uses a strict bundle identifier", component.get("BundleHasStrictIdentifier") is True)
    check("Component App version is checked", component.get("BundleIsVersionChecked") is True)
    check("Component App uses upgrade overwrite behavior", component.get("BundleOverwriteAction") == "upgrade")


def validate_app(app_path):
    check("SPX Helper.app exists", app_path.is_dir())
    executable = app_path / "Contents" / "MacOS" / PRODUCT_NAME
    check("Bundled Product Host executable exists", executable.is_file())
    check("Bundled Product Host executable is executable", bool(executable.stat().st_mode & 0o111))
    info_path = app_path / "Contents" / "Info.plist"
    with info_path.open("rb") as handle:
        info = plistlib.load(handle)
    check("Application product name is fixed", info.get("CFBundleDisplayName") == PRODUCT_NAME)
    check("Application bundle identifier is fixed", info.get("CFBundleIdentifier") == BUNDLE_IDENTIFIER)
    check("Application version is fixed", info.get("CFBundleShortVersionString") == PRODUCT_VERSION)
    check("Application build version is fixed", info.get("CFBundleVersion") == PRODUCT_VERSION)
    check("Application publisher information is fixed", info.get("NSHumanReadableCopyright") == "SPX AD")
    check("Application is a Menu Bar product", info.get("LSUIElement") is True)
    check(
        "Bundle contains the shared AppleScript at the Adapter-compatible path",
        (app_path / "Contents" / "photoshop" / "run-photoshop-manifest.applescript").is_file(),
    )
    check(
        "Bundle contains the shared JSX at the Adapter-compatible path",
        (app_path / "Contents" / "photoshop" / "remove-background.jsx").is_file(),
    )
    signature = subprocess.run(
        ["/usr/bin/codesign", "--verify", "--deep", "--strict", str(app_path)],
        capture_output=True,
        text=True,
    )
    check("Application code signature is structurally valid", signature.returncode == 0, signature.stderr.strip())


def validate_pkg(pkg_path):
    check("SPX Helper PKG exists", pkg_path.is_file())
    check("SPX Helper PKG is not empty", pkg_path.stat().st_size > 0)
    with tempfile.TemporaryDirectory(prefix="spx-helper-pkg-") as temp_dir:
        expanded = Path(temp_dir) / "expanded"
        result = subprocess.run(
            ["/usr/sbin/pkgutil", "--expand-full", str(pkg_path), str(expanded)],
            capture_output=True,
            text=True,
        )
        check("PKG can be expanded", result.returncode == 0, result.stderr.strip())
        components = list(expanded.glob("*.pkg"))
        check("PKG contains one component package", len(components) == 1)
        component = components[0]
        package_info = ET.parse(component / "PackageInfo").getroot()
        check("PKG identifier is fixed", package_info.get("identifier") == PACKAGE_IDENTIFIER)
        check("PKG version is fixed", package_info.get("version") == PRODUCT_VERSION)
        check("PKG App bundle is not relocatable", package_info.get("relocatable") == "false")
        payload = component / "Payload"
        check(
            "PKG installs SPX Helper.app in Applications",
            (payload / "Applications" / "SPX Helper.app").is_dir(),
        )
        check(
            "PKG installs the Login LaunchAgent",
            (payload / "Library" / "LaunchAgents" / "com.spxad.helper.plist").is_file(),
        )
        check("PKG includes the install-complete script", (component / "Scripts" / "postinstall").is_file())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--app")
    parser.add_argument("--component-plist")
    parser.add_argument("--pkg")
    args = parser.parse_args()

    packaging_dir = Path(__file__).resolve().parent
    automation_dir = packaging_dir.parents[1]

    validate_spec(packaging_dir, automation_dir)
    validate_launch_agent(packaging_dir)
    validate_build_inputs(packaging_dir, automation_dir)
    if args.app:
        validate_app(Path(args.app).resolve())
    if args.component_plist:
        validate_component_plist(Path(args.component_plist).resolve())
    if args.pkg:
        validate_pkg(Path(args.pkg).resolve())

    print("\nSPX Helper macOS packaging configuration validation: PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print("FAIL - {0}".format(error), file=sys.stderr)
        raise SystemExit(1)
