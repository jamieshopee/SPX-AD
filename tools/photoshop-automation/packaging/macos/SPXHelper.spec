# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller app bundle for the existing Phase 1 Product Host."""

from pathlib import Path


PACKAGING_DIR = Path(SPECPATH).resolve()
AUTOMATION_DIR = PACKAGING_DIR.parents[1]
ENTRY_POINT = AUTOMATION_DIR / "spx_helper_product.py"
ICON_PATH = PACKAGING_DIR / "build" / "icon" / "SPXHelper.icns"

a = Analysis(
    [str(ENTRY_POINT)],
    pathex=[str(AUTOMATION_DIR)],
    binaries=[],
    datas=[],
    hiddenimports=[
        "AppKit",
        "Foundation",
        "PIL.Image",
        "PIL.ImageDraw",
        "Quartz",
        "macos_adapter",
        "pystray._darwin",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "pythoncom",
        "pystray._win32",
        "pywintypes",
        "win32com",
        "windows_adapter",
    ],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="SPX Helper",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    icon=str(ICON_PATH),
    target_arch=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="SPX Helper",
)

app = BUNDLE(
    coll,
    name="SPX Helper.app",
    icon=str(ICON_PATH),
    bundle_identifier="com.spxad.helper",
    info_plist={
        "CFBundleDisplayName": "SPX Helper",
        "CFBundleName": "SPX Helper",
        "CFBundleShortVersionString": "0.5.4",
        "CFBundleVersion": "0.5.4",
        "LSUIElement": True,
        "NSHumanReadableCopyright": "SPX AD",
        "NSAppleEventsUsageDescription": (
            "SPX Helper controls Adobe Photoshop to process approved SPX assets."
        ),
    },
)
