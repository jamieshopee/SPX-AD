# PyInstaller spec for the Windows Production Launcher (Coding Phase 7／7).
#
# Must be run ON a real Windows host (PyInstaller does not cross-compile --
# this was already researched and locked in an earlier Architecture
# Question). See BUILD.md in this same directory for the exact command.
#
# console=False means the resulting SPX AD Launcher.exe opens no visible
# Command Prompt / PowerShell window when double-clicked -- satisfies
# "不開 Command Prompt／PowerShell 視窗".

# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['production_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['windows_adapter', 'platform_adapter', 'spx_ad_runtime', 'win32com.client', 'pywintypes'],
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
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SPX AD Launcher',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # no Command Prompt / PowerShell window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
