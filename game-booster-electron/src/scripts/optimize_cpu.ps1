# Power & CPU Optimization Script
Write-Host "Optimizing CPU and Power Settings..."

# Import Ultimate Performance Plan (if not exists)
# High Performance GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
# Ultimate Performance GUID (Win 10 Workstation/Enterprise usually): e9a42b02-d5df-448d-aa00-03f14749eb61

powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
powercfg /setactive e9a42b02-d5df-448d-aa00-03f14749eb61

# Disable Hibernation to free space and reduce background writes
powercfg /h off

# Set Priority Control
# Aggressive Optimization for "50% Less Lag"

# 1. System Responsiveness (Give Games 100% CPU access, default prevents 20%)
$key = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
if (Test-Path $key) {
    Set-ItemProperty -Path $key -Name "SystemResponsiveness" -Value 0
    Set-ItemProperty -Path $key -Name "NetworkThrottlingIndex" -Value 4294967295 # FFFFFFFF
}

# 2. Games Priority (Force High Priority for Gaming Tasks)
$gameKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
if (Test-Path $gameKey) {
    Set-ItemProperty -Path $gameKey -Name "GPU Priority" -Value 8
    Set-ItemProperty -Path $gameKey -Name "Priority" -Value 6
    Set-ItemProperty -Path $gameKey -Name "Scheduling Category" -Value "High"
    Set-ItemProperty -Path $gameKey -Name "SFIO Priority" -Value "High"
}

Write-Host "Aggressive GPU/CPU Tweaks Applied."
Write-Host "Power Optimization Complete."
