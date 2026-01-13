# Visual Effects Killer
# Disables all Windows animations and effects for maximum FPS
Write-Host "Disabling Windows Visual Effects..."

# === Set Visual Effects to Best Performance ===
$visualKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
if (!(Test-Path $visualKey)) { New-Item -Path $visualKey -Force | Out-Null }
Set-ItemProperty -Path $visualKey -Name "VisualFXSetting" -Value 2 -Type DWord

# === Disable Individual Effects ===
$desktopKey = "HKCU:\Control Panel\Desktop"
Set-ItemProperty -Path $desktopKey -Name "UserPreferencesMask" -Value ([byte[]](0x90, 0x12, 0x03, 0x80, 0x10, 0x00, 0x00, 0x00)) -Type Binary
Set-ItemProperty -Path $desktopKey -Name "DragFullWindows" -Value "0"
Set-ItemProperty -Path $desktopKey -Name "FontSmoothing" -Value "0"

# === Disable Window Animations ===
$windowKey = "HKCU:\Control Panel\Desktop\WindowMetrics"
Set-ItemProperty -Path $windowKey -Name "MinAnimate" -Value "0"

# === Disable Transparency ===
$personalize = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"
if (Test-Path $personalize) {
    Set-ItemProperty -Path $personalize -Name "EnableTransparency" -Value 0 -Type DWord
    Write-Host "Transparency: DISABLED"
}

# === Disable Cursor Shadow ===
$cursorKey = "HKCU:\Control Panel\Cursors"
Set-ItemProperty -Path $cursorKey -Name "CursorShadow" -Value 0 -ErrorAction SilentlyContinue

# === Disable Smooth Scrolling ===
$explorerKey = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
Set-ItemProperty -Path $explorerKey -Name "ListviewAlphaSelect" -Value 0 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $explorerKey -Name "ListviewShadow" -Value 0 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $explorerKey -Name "TaskbarAnimations" -Value 0 -Type DWord -ErrorAction SilentlyContinue

# === Disable Aero Peek ===
$dwmKey = "HKCU:\SOFTWARE\Microsoft\Windows\DWM"
if (Test-Path $dwmKey) {
    Set-ItemProperty -Path $dwmKey -Name "EnableAeroPeek" -Value 0 -Type DWord
    Set-ItemProperty -Path $dwmKey -Name "AlwaysHibernateThumbnails" -Value 0 -Type DWord
}

Write-Host "Visual Effects: ALL DISABLED for maximum performance"
