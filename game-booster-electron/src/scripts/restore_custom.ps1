param (
    [string]$JsonPath
)

if (-not (Test-Path $JsonPath)) {
    Write-Error "Backup file not found!"
    exit 1
}

$json = Get-Content -Raw -Path $JsonPath | ConvertFrom-Json
Write-Host "Restoring User Configuration v2..."

# 1. Restore Power Plan
if ($json.PowerPlan) {
    powercfg /setactive $json.PowerPlan
    Write-Host "Restored Power Plan: $($json.PowerPlan)"
}

# 2. Restore Registry - System Profile
$key = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
if (Test-Path $key) {
    if ($null -ne $json.SystemResponsiveness) {
        Set-ItemProperty -Path $key -Name "SystemResponsiveness" -Value $json.SystemResponsiveness
    }
    if ($null -ne $json.NetworkThrottlingIndex) {
        Set-ItemProperty -Path $key -Name "NetworkThrottlingIndex" -Value $json.NetworkThrottlingIndex
    }
}

$gameKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
if (Test-Path $gameKey) {
    if ($null -ne $json.GPUPriority) { Set-ItemProperty -Path $gameKey -Name "GPU Priority" -Value $json.GPUPriority }
    if ($null -ne $json.Priority) { Set-ItemProperty -Path $gameKey -Name "Priority" -Value $json.Priority }
    if ($null -ne $json.SchedulingCategory) { Set-ItemProperty -Path $gameKey -Name "Scheduling Category" -Value $json.SchedulingCategory }
    if ($null -ne $json.SFIOPriority) { Set-ItemProperty -Path $gameKey -Name "SFIO Priority" -Value $json.SFIOPriority }
}

# 3. Restore Services
if ($json.Services) {
    $json.Services | Get-Member -MemberType NoteProperty | ForEach-Object {
        $name = $_.Name
        $svcData = $json.Services.$name
        
        # Handle both old format (string) and new format (object)
        $status = if ($svcData -is [string]) { $svcData } else { $svcData.Status }
        $startType = if ($svcData -is [string]) { "Automatic" } else { $svcData.StartType }
        
        if ($status -eq "Running") {
            Set-Service -Name $name -StartupType $startType -ErrorAction SilentlyContinue
            Start-Service -Name $name -ErrorAction SilentlyContinue
            Write-Host "Restored $name"
        }
    }
}

# 4. Cleanup Network Tweaks
$interfaces = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
foreach ($nic in $interfaces) {
    $guid = $nic.InterfaceGuid
    $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$guid"
    if (Test-Path $path) {
        Remove-ItemProperty -Path $path -Name "TcpAckFrequency" -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $path -Name "TCPNoDelay" -ErrorAction SilentlyContinue
    }
}

# 5. Restore Win32PrioritySeparation
$priorityKey = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
if ($null -ne $json.Win32PrioritySeparation) {
    Set-ItemProperty -Path $priorityKey -Name "Win32PrioritySeparation" -Value $json.Win32PrioritySeparation
    Write-Host "Restored Win32PrioritySeparation"
}

# 6. Restore Memory Settings
$memKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
if (Test-Path $memKey) {
    if ($null -ne $json.LargeSystemCache) {
        Set-ItemProperty -Path $memKey -Name "LargeSystemCache" -Value $json.LargeSystemCache
    }
    if ($null -ne $json.DisablePagingExecutive) {
        Set-ItemProperty -Path $memKey -Name "DisablePagingExecutive" -Value $json.DisablePagingExecutive
    }
    Write-Host "Restored Memory Settings"
}

# 7. Restore Visual Effects
$visualKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
if ($null -ne $json.VisualFXSetting) {
    Set-ItemProperty -Path $visualKey -Name "VisualFXSetting" -Value $json.VisualFXSetting -ErrorAction SilentlyContinue
}

# 8. Restore Transparency
$personalize = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"
if ($null -ne $json.EnableTransparency) {
    Set-ItemProperty -Path $personalize -Name "EnableTransparency" -Value $json.EnableTransparency
    Write-Host "Restored Transparency"
}

# 9. Restore HAGS
$graphicsKey = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
if ($null -ne $json.HwSchMode) {
    Set-ItemProperty -Path $graphicsKey -Name "HwSchMode" -Value $json.HwSchMode
    Write-Host "Restored HAGS setting"
}

# 10. Restore Game DVR
$gameDVRKey = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR"
if ($null -ne $json.AppCaptureEnabled) {
    Set-ItemProperty -Path $gameDVRKey -Name "AppCaptureEnabled" -Value $json.AppCaptureEnabled -ErrorAction SilentlyContinue
    Write-Host "Restored Game DVR"
}

# 11. Re-enable Timer defaults (requires reboot)
bcdedit /deletevalue useplatformtick 2>$null
bcdedit /deletevalue disabledynamictick 2>$null
Write-Host "Timer settings reset to defaults (reboot required)"

# 12. Re-enable Memory Compression
Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
Write-Host "Memory Compression: RE-ENABLED"

# 13. Re-enable Windows Defender (if Turbo Mode was used)
Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue
Set-MpPreference -DisableIOAVProtection $false -ErrorAction SilentlyContinue
Set-MpPreference -DisableBehaviorMonitoring $false -ErrorAction SilentlyContinue
Set-MpPreference -DisableBlockAtFirstSight $false -ErrorAction SilentlyContinue
Write-Host "Windows Defender: RE-ENABLED"

Write-Host "Full Restore Complete. Reboot recommended for all changes to take effect."
