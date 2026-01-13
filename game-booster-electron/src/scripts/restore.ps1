# Restore / Revert Optimization Script
Write-Host "Restoring Windows Defaults..."

# 1. Restore Power Plan (Balanced)
# Standard Balanced GUID: 381b4222-f694-41f0-9685-ff5bb260df2e
powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e
Write-Host "Restored Balanced Power Plan."

# 2. Restore Services
$services = @("SysMain", "DiagTrack", "WSearch")
foreach ($service in $services) {
    Start-Service -Name $service -ErrorAction SilentlyContinue
    Write-Host "Started service: $service"
}

# 3. Revert Registry Tweaks (System Profile)
$key = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
if (Test-Path $key) {
    Set-ItemProperty -Path $key -Name "SystemResponsiveness" -Value 20
    Set-ItemProperty -Path $key -Name "NetworkThrottlingIndex" -Value 10
}

# 4. Revert Games Priority
$gameKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
if (Test-Path $gameKey) {
    Set-ItemProperty -Path $gameKey -Name "GPU Priority" -Value 8
    Set-ItemProperty -Path $gameKey -Name "Priority" -Value 2
    Set-ItemProperty -Path $gameKey -Name "Scheduling Category" -Value "Medium"
    Set-ItemProperty -Path $gameKey -Name "SFIO Priority" -Value "Normal"
}

# 5. Remove Network Tweaks (TcpAckFrequency)
$interfaces = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
foreach ($nic in $interfaces) {
    $guid = $nic.InterfaceGuid
    $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$guid"
    if (Test-Path $path) {
        Remove-ItemProperty -Path $path -Name "TcpAckFrequency" -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $path -Name "TCPNoDelay" -ErrorAction SilentlyContinue
    }
}

# 6. Reset TCP Global
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global rss=enabled

Write-Host "System Restored to Defaults."
