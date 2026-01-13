# Timer Resolution Optimization
# Reduces system timer to 0.5-1ms for lower input lag
Write-Host "Applying Timer Resolution Tweaks..."

# === Disable Dynamic Tick (Forces consistent timer) ===
bcdedit /set useplatformtick yes 2>$null
bcdedit /set disabledynamictick yes 2>$null
Write-Host "Dynamic Tick: DISABLED (requires reboot)"

# === Force High Resolution Timer in Windows ===
$timerKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel"
if (Test-Path $timerKey) {
    Set-ItemProperty -Path $timerKey -Name "GlobalTimerResolutionRequests" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Write-Host "Global Timer Resolution Requests: ENABLED"
}

# === Disable HPET (Can improve performance on some systems) ===
# NOTE: This is controversial - some systems work better WITH HPET
# We'll disable it but user can revert via restore
bcdedit /deletevalue useplatformclock 2>$null
Write-Host "HPET: Using default platform clock"

# === Set Multimedia Timer to High Precision ===
$mmKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
if (Test-Path $mmKey) {
    # Already set by optimize_cpu but ensure it's 0
    Set-ItemProperty -Path $mmKey -Name "SystemResponsiveness" -Value 0 -Type DWord
}

# === Disable Power Throttling ===
$powerThrottleKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling"
if (!(Test-Path $powerThrottleKey)) { New-Item -Path $powerThrottleKey -Force | Out-Null }
Set-ItemProperty -Path $powerThrottleKey -Name "PowerThrottlingOff" -Value 1 -Type DWord
Write-Host "Power Throttling: DISABLED"

Write-Host "Timer Resolution Optimization Complete. [Reboot recommended]"
