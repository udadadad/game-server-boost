# CyberSpoofer PRO - Core Logic
$ErrorActionPreference = "SilentlyContinue"

Write-Host "--- INITIALIZING SYSTEM ROTATION ---" -ForegroundColor Cyan

# 1. GENERATE NEW GUIDs
function Get-RandomGuid { [guid]::NewGuid().ToString() }

$NewMachineGuid = Get-RandomGuid
$NewHardwareId = "{$(Get-RandomGuid)}"
$NewPCName = "DESKTOP-" + ( -join ((65..90) + (48..57) | Get-Random -Count 8 | ForEach-Object { [char]$_ }))

Write-Host "[+] Rotating MachineGuid: $NewMachineGuid" -ForegroundColor Yellow
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name "MachineGuid" -Value $NewMachineGuid

Write-Host "[+] Rotating HardwareID: $NewHardwareId" -ForegroundColor Yellow
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\IDConfigDB\Hardware Profiles\0001" -Name "HwProfileGuid" -Value $NewHardwareId

Write-Host "[+] Rotating PC Name: $NewPCName" -ForegroundColor Yellow
Rename-Computer -NewName $NewPCName -Force

# 2. MAC ADDRESS SPOOFING
Write-Host "[+] Randomizing MAC Addresses..." -ForegroundColor Yellow
$Adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
foreach ($Adapter in $Adapters) {
    $NewMac = "00" + ( -join ((0..9) + (65..70) | Get-Random -Count 10 | ForEach-Object { $_.ToString("X") }))
    # This is a basic spoof via registry for most drivers
    $RegPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}"
    $SubKeys = Get-ChildItem $RegPath
    foreach ($SubKey in $SubKeys) {
        $NetCfgId = Get-ItemProperty $SubKey.PSPath -Name "NetCfgInstanceId" -ErrorAction SilentlyContinue
        if ($NetCfgId.NetCfgInstanceId -eq $Adapter.DeviceGuid) {
            Set-ItemProperty $SubKey.PSPath -Name "NetworkAddress" -Value $NewMac
            Write-Host "    - Adapter [$($Adapter.Name)] -> $NewMac" -ForegroundColor Gray
        }
    }
}

# 3. CLEANING TRACES
Write-Host "[+] Purging Tracker Logs..." -ForegroundColor Cyan
$PathsToClean = @(
    "$env:LOCALAPPDATA\Microsoft\Windows\INetCache",
    "$env:APPDATA\Microsoft\Windows\Recent",
    "$env:LOCALAPPDATA\Temp\*"
)

foreach ($Path in $PathsToClean) {
    Remove-Item -Path $Path -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "--- SPOOFING COMPLETE ---" -ForegroundColor Green
Write-Host "Reboot recommended for full effect." -ForegroundColor Green
