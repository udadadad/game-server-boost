# Turbo Mode: Windows Defender Suspension
# Disabling Real-Time Protection for maximum performance during gaming
Write-Host "Initing TURBO MODE: Suspending Windows Defender..."

# 1. Disable Real-Time Monitoring
Set-MpPreference -DisableRealtimeMonitoring $true -ErrorAction SilentlyContinue

# 2. Disable IOAV Protection (Scanning downloads/attachments)
Set-MpPreference -DisableIOAVProtection $true -ErrorAction SilentlyContinue

# 3. Disable Behavior Monitoring
Set-MpPreference -DisableBehaviorMonitoring $true -ErrorAction SilentlyContinue

# 4. Disable Block At First Sight
Set-MpPreference -DisableBlockAtFirstSight $true -ErrorAction SilentlyContinue

Write-Host "TURBO MODE ACTIVE: Windows Defender scanning suspended."
