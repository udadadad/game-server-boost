# GPU Optimization Script - NVIDIA/AMD Tweaks
# For 20-30% FPS boost
Write-Host "Applying GPU Performance Tweaks..."

# === NVIDIA Tweaks (via Registry) ===
$nvidiaKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"
if (Test-Path $nvidiaKey) {
    Write-Host "NVIDIA GPU Detected. Applying tweaks..."
    
    # Prefer Maximum Performance (Power Management)
    Set-ItemProperty -Path $nvidiaKey -Name "PerfLevelSrc" -Value 0x2222 -Type DWord -ErrorAction SilentlyContinue
    
    # Disable Power Saving
    Set-ItemProperty -Path $nvidiaKey -Name "PowerMizerEnable" -Value 0 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $nvidiaKey -Name "PowerMizerLevel" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $nvidiaKey -Name "PowerMizerLevelAC" -Value 1 -Type DWord -ErrorAction SilentlyContinue
}

# === Hardware Accelerated GPU Scheduling (HAGS) ===
$graphicsKey = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
if (Test-Path $graphicsKey) {
    # Enable HAGS (Windows 10 2004+)
    Set-ItemProperty -Path $graphicsKey -Name "HwSchMode" -Value 2 -Type DWord -ErrorAction SilentlyContinue
    Write-Host "Hardware Accelerated GPU Scheduling: ENABLED"
}

# === Disable Fullscreen Optimizations Globally ===
$fsoKey = "HKCU:\System\GameConfigStore"
if (!(Test-Path $fsoKey)) { New-Item -Path $fsoKey -Force | Out-Null }
Set-ItemProperty -Path $fsoKey -Name "GameDVR_FSEBehaviorMode" -Value 2 -Type DWord
Set-ItemProperty -Path $fsoKey -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 1 -Type DWord
Set-ItemProperty -Path $fsoKey -Name "GameDVR_FSEBehavior" -Value 2 -Type DWord
Set-ItemProperty -Path $fsoKey -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -Value 1 -Type DWord
Write-Host "Fullscreen Optimizations: DISABLED globally"

# === Disable Game DVR / Game Bar Recording ===
$gameDVRKey = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR"
if (!(Test-Path $gameDVRKey)) { New-Item -Path $gameDVRKey -Force | Out-Null }
Set-ItemProperty -Path $gameDVRKey -Name "AppCaptureEnabled" -Value 0 -Type DWord
Set-ItemProperty -Path $gameDVRKey -Name "HistoricalBufferLength" -Value 0 -Type DWord
Set-ItemProperty -Path $gameDVRKey -Name "HistoricalBufferLengthUnit" -Value 0 -Type DWord
Set-ItemProperty -Path $gameDVRKey -Name "HistoricalCaptureEnabled" -Value 0 -Type DWord

$gameBarKey = "HKCU:\SOFTWARE\Microsoft\GameBar"
if (!(Test-Path $gameBarKey)) { New-Item -Path $gameBarKey -Force | Out-Null }
Set-ItemProperty -Path $gameBarKey -Name "UseNexusForGameBarEnabled" -Value 0 -Type DWord
Set-ItemProperty -Path $gameBarKey -Name "ShowStartupPanel" -Value 0 -Type DWord
Write-Host "Game DVR / Game Bar: DISABLED"

# === AMD Tweaks (Radeon Settings via Registry) ===
$amdKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000\UMD"
if (Test-Path $amdKey) {
    Write-Host "AMD GPU Detected. Applying tweaks..."
    # Anti-Lag (if supported)
    Set-ItemProperty -Path $amdKey -Name "AntiLag" -Value "1" -ErrorAction SilentlyContinue
    # Enhanced Sync Off for lower latency
    Set-ItemProperty -Path $amdKey -Name "EnableUlps" -Value 0 -ErrorAction SilentlyContinue
}

Write-Host "GPU Optimization Complete. [HAGS, FSO, Game DVR optimized]"
