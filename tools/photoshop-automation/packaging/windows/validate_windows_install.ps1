[CmdletBinding()]
param(
    [ValidateSet("Validate", "CaptureRestart", "VerifyRestart", "VerifyQuit")]
    [string]$Mode = "Validate"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProductName = "SPX Helper"
$ProductVersion = "0.5.4"
$Publisher = "SPX AD"
$InstallDir = Join-Path $env:ProgramFiles $ProductName
$Executable = Join-Path $InstallDir "SPX Helper.exe"
$SharedJsx = Join-Path $InstallDir "photoshop\remove-background.jsx"
$StartMenuShortcut = Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs\SPX Helper\SPX Helper.lnk"
$StartupKey = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
$SnapshotDir = Join-Path $PSScriptRoot "build\validation"
$SnapshotPath = Join-Path $SnapshotDir "restart-before.json"

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) {
        throw $Message
    }
    Write-Host "PASS - $Message"
}

function Get-HelperProcesses {
    return @(
        Get-CimInstance Win32_Process -Filter "Name = 'SPX Helper.exe'" |
            Where-Object { $_.ExecutablePath -eq $Executable }
    )
}

function Get-HelperListeners {
    return @(
        Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 8901 -State Listen -ErrorAction SilentlyContinue
    )
}

function Assert-SingleRunningHelper {
    $Processes = Get-HelperProcesses
    $Listeners = Get-HelperListeners
    Assert-True ($Processes.Count -eq 1) "Exactly one installed SPX Helper process is running"
    Assert-True ($Listeners.Count -eq 1) "Exactly one 127.0.0.1:8901 listener exists"
    Assert-True ($Listeners[0].OwningProcess -eq $Processes[0].ProcessId) "The installed SPX Helper owns the listener"
    return $Processes[0]
}

if ($Mode -eq "Validate") {
    Assert-True (Test-Path $Executable) "Installed Product Host executable exists"
    Assert-True (Test-Path $SharedJsx) "Installed shared remove-background.jsx exists"
    Assert-True (Test-Path $StartMenuShortcut) "Start Menu shortcut exists"

    $StartupValue = (Get-ItemProperty -Path $StartupKey -Name $ProductName -ErrorAction Stop).$ProductName
    Assert-True ($StartupValue -eq ('"{0}"' -f $Executable)) "Login Startup targets the installed Product Host"

    $ArpEntries = @(
        Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -eq $ProductName }
    )
    Assert-True ($ArpEntries.Count -eq 1) "Exactly one Apps & Features entry exists"
    Assert-True ($ArpEntries[0].DisplayVersion -eq $ProductVersion) "Apps & Features version is 0.5.4"
    Assert-True ($ArpEntries[0].Publisher -eq $Publisher) "Apps & Features publisher is SPX AD"
    Assert-True (-not [string]::IsNullOrWhiteSpace($ArpEntries[0].UninstallString)) "Apps & Features exposes standard MSI removal"

    $Process = Assert-SingleRunningHelper
    $Response = Invoke-WebRequest `
        -Uri "http://127.0.0.1:8901/ready" `
        -Headers @{ Origin = "https://jamieshopee.github.io" } `
        -UseBasicParsing
    Assert-True ($Response.StatusCode -eq 200) "Installed Helper preserves the Ready HTTP boundary"

    Write-Host ""
    Write-Host "Windows install configuration validation: PASS"
    Write-Host "WAITING - Tray visibility requires Windows visual validation."
    Write-Host "WAITING - Login Startup execution requires sign-out/sign-in validation."
    Write-Host "WAITING - GitHub Pages to Photoshop Happy Path requires real Photoshop validation."
    exit 0
}

if ($Mode -eq "CaptureRestart") {
    $Process = Assert-SingleRunningHelper
    New-Item -ItemType Directory -Path $SnapshotDir -Force | Out-Null
    @{
        ProcessId = [int]$Process.ProcessId
        CapturedAt = (Get-Date).ToString("o")
    } | ConvertTo-Json | Set-Content -Path $SnapshotPath -Encoding UTF8
    Write-Host "Captured Restart baseline PID $($Process.ProcessId)."
    exit 0
}

if ($Mode -eq "VerifyRestart") {
    Assert-True (Test-Path $SnapshotPath) "Restart baseline exists"
    $Snapshot = Get-Content $SnapshotPath -Raw | ConvertFrom-Json
    $Process = Assert-SingleRunningHelper
    Assert-True ($Process.ProcessId -ne $Snapshot.ProcessId) "Restart created a new Product Host process"
    $OldProcess = Get-Process -Id $Snapshot.ProcessId -ErrorAction SilentlyContinue
    Assert-True ($null -eq $OldProcess) "Restart stopped the old Product Host process"
    Write-Host "Windows Restart process validation: PASS"
    exit 0
}

if ($Mode -eq "VerifyQuit") {
    Assert-True ((Get-HelperProcesses).Count -eq 0) "Quit stopped the installed Product Host"
    Assert-True ((Get-HelperListeners).Count -eq 0) "Quit released 127.0.0.1:8901"
    Write-Host "Windows Quit process validation: PASS"
    exit 0
}
