# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller onedir bundle for the existing Phase 1 Product Host."""

from pathlib import Path


PACKAGING_DIR = Path(SPECPATH).resolve()
AUTOMATION_DIR = PACKAGING_DIR.parents[1]
ENTRY_POINT = AUTOMATION_DIR / "spx_helper_product.py"
ICON_PATH = PACKAGING_DIR / "build" / "icon" / "SPXHelper.ico"

a = Analysis(
    [str(ENTRY_POINT)],
    pathex=[str(AUTOMATION_DIR)],
    binaries=[],
    datas=[],
    hiddenimports=[
        "PIL.Image",
        "PIL.ImageDraw",
        "pythoncom",
        "pystray._win32",
        "pywintypes",
        "win32com",
        "win32com.client",
        "windows_adapter",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "AppKit",
        "Foundation",
        "Quartz",
        "macos_adapter",
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
    contents_directory="_internal",
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="SPX Helper",
)
