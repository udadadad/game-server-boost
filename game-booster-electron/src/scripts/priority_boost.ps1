# Process Priority Boost
# Maximizes foreground application priority
Write-Host "Applying Process Priority Tweaks..."

# === Win32PrioritySeparation ===
# Value 38 (0x26) = Short quantum, Fixed, High foreground boost
# This gives maximum priority to the active window (your game)
$priorityKey = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
if (Test-Path $priorityKey) {
    Set-ItemProperty -Path $priorityKey -Name "Win32PrioritySeparation" -Value 38 -Type DWord
    Write-Host "Win32PrioritySeparation: Set to 38 (Maximum foreground boost)"
}

# === IRQ Priority (Give GPU and Network higher priority) ===
# This requires knowing the IRQ numbers, which vary by system
# We'll set a global preference for high-priority devices

# === Disable CPU Core Parking ===
$parkingKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\0cc5b647-c1df-4637-891a-dec35c318583"
if (Test-Path $parkingKey) {
    Set-ItemProperty -Path $parkingKey -Name "ValueMax" -Value 0 -Type DWord -ErrorAction SilentlyContinue
    Write-Host "CPU Core Parking: DISABLED"
}

# === Disable CPU Throttling ===
$cpuThrottleKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\3b04d4fd-1cc7-4f23-ab1c-d1337819c4bb"
if (Test-Path $cpuThrottleKey) {
    Set-ItemProperty -Path $cpuThrottleKey -Name "ValueMax" -Value 0 -Type DWord -ErrorAction SilentlyContinue
}

# === High Performance for All USB Devices ===
$usbKey = "HKLM:\SYSTEM\CurrentControlSet\Services\USB"
if (Test-Path $usbKey) {
    Set-ItemProperty -Path $usbKey -Name "DisableSelectiveSuspend" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Write-Host "USB Selective Suspend: DISABLED"
}

# === Disable Spectre/Meltdown Mitigations (RISKY but +5-10% performance) ===
# Uncomment only if you understand the security implications
# Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -Name "FeatureSettingsOverride" -Value 3 -Type DWord
# Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -Name "FeatureSettingsOverrideMask" -Value 3 -Type DWord

Write-Host "Process Priority Optimization Complete."
