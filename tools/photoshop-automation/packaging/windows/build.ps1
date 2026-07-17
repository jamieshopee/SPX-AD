[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$PackagingDir = $PSScriptRoot
$SharedJsx = (Resolve-Path (Join-Path $PackagingDir "..\..\..\photoshop\remove-background.jsx")).Path
$VenvDir = Join-Path $PackagingDir ".venv"
$BuildDir = Join-Path $PackagingDir "build"
$DistDir = Join-Path $PackagingDir "dist"
$PyInstallerDist = Join-Path $BuildDir "pyinstaller-dist"
$PyInstallerWork = Join-Path $BuildDir "pyinstaller-work"
$BundleDir = Join-Path $PyInstallerDist "SPX Helper"
$IconPath = Join-Path $BuildDir "icon\SPXHelper.ico"
$ExpectedMsi = Join-Path $DistDir "SPX Helper-0.5.4-x64.msi"

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw "Windows packaging must be built on Windows."
}

if (-not [Environment]::Is64BitOperatingSystem) {
    throw "SPX Helper Windows packaging requires 64-bit Windows."
}

$PyLauncher = Get-Command "py.exe" -ErrorAction SilentlyContinue
if ($null -ne $PyLauncher) {
    & $PyLauncher.Source -3 -m venv $VenvDir
} else {
    $Python = Get-Command "python.exe" -ErrorAction Stop
    & $Python.Source -m venv $VenvDir
}

$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    throw "Failed to create the local packaging virtual environment."
}

& $VenvPython -c "import struct; assert struct.calcsize('P') * 8 == 64, '64-bit Python is required'"
& $VenvPython -m pip install --upgrade pip
& $VenvPython -m pip install -r (Join-Path $PackagingDir "requirements-build.txt")

if (Test-Path $BuildDir) {
    Remove-Item $BuildDir -Recurse -Force
}
if (Test-Path $DistDir) {
    Remove-Item $DistDir -Recurse -Force
}

& $VenvPython (Join-Path $PackagingDir "generate_icon.py") --output $IconPath

& $VenvPython -m PyInstaller `
    --noconfirm `
    --clean `
    --distpath $PyInstallerDist `
    --workpath $PyInstallerWork `
    (Join-Path $PackagingDir "SPXHelper.spec")

if (-not (Test-Path (Join-Path $BundleDir "SPX Helper.exe"))) {
    throw "PyInstaller did not produce SPX Helper.exe."
}

$BundledPhotoshopDir = Join-Path $BundleDir "photoshop"
New-Item -ItemType Directory -Path $BundledPhotoshopDir -Force | Out-Null
Copy-Item $SharedJsx (Join-Path $BundledPhotoshopDir "remove-background.jsx") -Force

& $VenvPython (Join-Path $PackagingDir "validate_config.py") --bundle $BundleDir

$DotNet = Get-Command "dotnet.exe" -ErrorAction Stop
& $DotNet.Source build `
    (Join-Path $PackagingDir "SPXHelper.wixproj") `
    --configuration Release `
    "-p:BundleDir=$BundleDir" `
    "-p:IconPath=$IconPath"

if (-not (Test-Path $ExpectedMsi)) {
    throw "WiX did not produce the expected MSI: $ExpectedMsi"
}

Write-Host ""
Write-Host "SPX Helper Windows packaging build completed."
Write-Host "Bundle: $BundleDir"
Write-Host "MSI:    $ExpectedMsi"
