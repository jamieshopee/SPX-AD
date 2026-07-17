"""Cross-platform static validation for the Phase 2 Windows packaging files."""

import argparse
import ast
from pathlib import Path
import sys
import xml.etree.ElementTree as ET


PRODUCT_NAME = "SPX Helper"
PRODUCT_VERSION = "0.5.4"
PUBLISHER = "SPX AD"
UPGRADE_CODE = "{0E9BD5FB-A6F1-472B-8B6B-A395BDEDC941}"
WIX_NAMESPACE = {"w": "http://wixtoolset.org/schemas/v4/wxs"}


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
    check("Windows bundle has no console", "console=False" in spec_text)
    check("Windows bundle is onedir", "COLLECT(" in spec_text)
    check("Windows bundle keeps the internal support directory", 'contents_directory="_internal"' in spec_text)
    check("Windows tray backend is bundled", '"pystray._win32"' in spec_text)
    check("Windows COM client is bundled", '"win32com.client"' in spec_text)
    check("Historical launcher is not an entry point", "production_launcher.py" not in spec_text)
    check("Spec resolves the existing automation directory", automation_dir.name == "photoshop-automation")


def validate_wix(packaging_dir):
    package_root = ET.parse(packaging_dir / "Package.wxs").getroot()
    package = package_root.find("w:Package", WIX_NAMESPACE)
    check("WiX Package exists", package is not None)
    check("MSI product name is fixed", package.get("Name") == PRODUCT_NAME)
    check("MSI product version is fixed", package.get("Version") == PRODUCT_VERSION)
    check("MSI publisher is fixed", package.get("Manufacturer") == PUBLISHER)
    check("MSI upgrade identity is fixed", package.get("UpgradeCode") == UPGRADE_CODE)
    check("MSI is per-machine", package.get("Scope") == "perMachine")

    major_upgrade = package.find("w:MajorUpgrade", WIX_NAMESPACE)
    check("MSI has a major-upgrade identity", major_upgrade is not None)

    shortcut = package.find(".//w:Shortcut", WIX_NAMESPACE)
    check("Start Menu shortcut exists", shortcut is not None)
    check("Start Menu shortcut uses the product name", shortcut.get("Name") == PRODUCT_NAME)
    check("Start Menu shortcut uses the product icon", shortcut.get("Icon") == "SPXHelper.ico")

    startup = None
    for registry_value in package.findall(".//w:RegistryValue", WIX_NAMESPACE):
        if registry_value.get("Name") == PRODUCT_NAME:
            startup = registry_value
            break
    check("Login Startup registry value exists", startup is not None)
    check("Login Startup is machine-wide", startup.get("Root") == "HKLM")
    check(
        "Login Startup uses the Windows Run key",
        startup.get("Key") == r"Software\Microsoft\Windows\CurrentVersion\Run",
    )
    check("Login Startup launches the installed Product Host", "SPX Helper.exe" in startup.get("Value", ""))

    custom_action = package.find("w:CustomAction[@Id='LaunchSPXHelper']", WIX_NAMESPACE)
    check("Install-complete launch action exists", custom_action is not None)
    check("Install-complete launch targets the Product Host", custom_action.get("FileRef") == "SPXHelperExe")
    check("Install-complete launch passes no alternate entry arguments", custom_action.get("ExeCommand") == "")
    check("Install-complete launch runs as the installing user", custom_action.get("Impersonate") == "yes")
    check("Install-complete launch does not block MSI", custom_action.get("Return") == "asyncNoWait")

    scheduled_action = package.find(".//w:Custom[@Action='LaunchSPXHelper']", WIX_NAMESPACE)
    check("Install-complete launch is scheduled", scheduled_action is not None)
    check("Install-complete launch happens after finalization", scheduled_action.get("After") == "InstallFinalize")
    check("Install-complete launch is fresh-install only", "NOT Installed" in scheduled_action.get("Condition", ""))
    check(
        "Install-complete launch does not pre-implement update behavior",
        "NOT WIX_UPGRADE_DETECTED" in scheduled_action.get("Condition", ""),
    )

    files = package.find(".//w:Files", WIX_NAMESPACE)
    excluded = package.find(".//w:Files/w:Exclude", WIX_NAMESPACE)
    check("MSI harvests the complete Product Host bundle", files is not None and files.get("Include", "").endswith(r"\**"))
    check("MSI authors the main executable exactly once", excluded is not None and excluded.get("Files", "").endswith("SPX Helper.exe"))

    wix_project = ET.parse(packaging_dir / "SPXHelper.wixproj").getroot()
    check("WiX Toolset SDK is pinned", wix_project.get("Sdk") == "WixToolset.Sdk/5.0.2")
    project_text = (packaging_dir / "SPXHelper.wixproj").read_text(encoding="utf-8")
    check("MSI output name includes the fixed version", "SPX Helper-0.5.4-x64" in project_text)


def validate_build_inputs(packaging_dir, automation_dir):
    requirements = (packaging_dir / "requirements-build.txt").read_text(encoding="utf-8").splitlines()
    check("PyInstaller version is pinned", "PyInstaller==6.21.0" in requirements)
    check("pywin32 version is pinned", "pywin32==312" in requirements)
    check("Phase 1 pystray version is preserved", "pystray==0.19.5" in requirements)
    check("Phase 1 Pillow version is preserved", "Pillow==11.3.0" in requirements)

    ignore_rules = (packaging_dir / ".gitignore").read_text(encoding="utf-8").splitlines()
    check("Packaging virtual environment is locally ignored", ".venv/" in ignore_rules)
    check("Packaging Python cache is locally ignored", "__pycache__/" in ignore_rules)
    check("Packaging build output is locally ignored", "build/" in ignore_rules)
    check("Packaging MSI output is locally ignored", "dist/" in ignore_rules)

    product_host = automation_dir / "spx_helper_product.py"
    check("Product Host exists", product_host.is_file())
    check("Product Host version remains 0.5.4", read_product_version(product_host) == PRODUCT_VERSION)
    check(
        "Shared remove-background.jsx exists",
        (automation_dir.parent / "photoshop" / "remove-background.jsx").is_file(),
    )

    build_text = (packaging_dir / "build.ps1").read_text(encoding="utf-8")
    check("Build is Windows-only", "Windows packaging must be built on Windows" in build_text)
    check("Build requires 64-bit Windows", "64-bit Windows" in build_text)
    check("Build copies the shared JSX without modifying it", "Copy-Item $SharedJsx" in build_text)
    check("Build produces an MSI without a bootstrapper", "dotnet" in build_text and "bootstrapper" not in build_text.lower())


def validate_bundle(bundle_dir):
    check("Bundled Product Host executable exists", (bundle_dir / "SPX Helper.exe").is_file())
    check("Bundled Python support directory exists", (bundle_dir / "_internal").is_dir())
    check(
        "Bundle contains the shared JSX at the adapter-compatible path",
        (bundle_dir / "photoshop" / "remove-background.jsx").is_file(),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle")
    args = parser.parse_args()

    packaging_dir = Path(__file__).resolve().parent
    automation_dir = packaging_dir.parents[1]

    validate_spec(packaging_dir, automation_dir)
    validate_wix(packaging_dir)
    validate_build_inputs(packaging_dir, automation_dir)
    if args.bundle:
        validate_bundle(Path(args.bundle).resolve())

    print("\nSPX Helper Windows packaging configuration validation: PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print("FAIL - {0}".format(error), file=sys.stderr)
        raise SystemExit(1)
