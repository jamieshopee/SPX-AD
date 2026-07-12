# PyInstaller spec for the macOS Production Launcher (Coding Phase 7／7).
#
# Must be run ON a real macOS host (PyInstaller does not cross-compile --
# this was already researched and locked in an earlier Architecture
# Question). See BUILD.md in this same directory for the exact command.
#
# windowed=True (via the `EXE(..., console=False, ...)` below plus the
# BUNDLE() step) means: no Terminal window opens when the user double-clicks
# the resulting SPX AD Launcher.app -- satisfies "不開 Terminal 視窗".

# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['production_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['macos_adapter', 'platform_adapter', 'spx_ad_runtime'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='SPX AD Launcher',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # no Terminal window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='SPX AD Launcher',
)
app = BUNDLE(
    coll,
    name='SPX AD Launcher.app',
    icon=None,
    bundle_identifier='com.spxad.launcher',
    info_plist={
        'LSUIElement': False,
        'NSHighResolutionCapable': True,
    },
)
