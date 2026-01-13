# Capture System State for Restore v2
# Extended backup for all new optimizations
$backup = @{}

# 1. Active Power Plan
$power = powercfg /getactivescheme
if ($power -match "GUID: (.*?) ") {
    $backup["PowerPlan"] = $matches[1]
}

# 2. Registry: System Profile
$key = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
if (Test-Path $key) {
    $props = Get-ItemProperty -Path $key
    $backup["SystemResponsiveness"] = $props.SystemResponsiveness
    $backup["NetworkThrottlingIndex"] = $props.NetworkThrottlingIndex
}

# 3. Registry: Games Priority
$gameKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
if (Test-Path $gameKey) {
    $props = Get-ItemProperty -Path $gameKey
    $backup["GPUPriority"] = $props."GPU Priority"
    $backup["Priority"] = $props.Priority
    $backup["SchedulingCategory"] = $props."Scheduling Category"
    $backup["SFIOPriority"] = $props."SFIO Priority"
}

# 4. Services State (Extended list)
$services = @("SysMain", "DiagTrack", "WSearch", "Spooler", "BTAGService", "bthserv", "wuauserv", "BITS", "WbioSrvc", "TabletInputService", "PcaSvc", "CDPSvc", "OneSyncSvc", "WMPNetworkSvc", "WerSvc", "PhoneSvc")
$srvState = @{}
foreach ($s in $services) {
    $srv = Get-Service -Name $s -ErrorAction SilentlyContinue
    if ($srv) {
        $srvState[$s] = @{
            Status    = $srv.Status.ToString()
            StartType = $srv.StartType.ToString()
        }
    }
}
$backup["Services"] = $srvState

# 5. Win32PrioritySeparation
$priorityKey = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
if (Test-Path $priorityKey) {
    $backup["Win32PrioritySeparation"] = (Get-ItemProperty -Path $priorityKey).Win32PrioritySeparation
}

# 6. Memory Settings
$memKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
if (Test-Path $memKey) {
    $memProps = Get-ItemProperty -Path $memKey
    $backup["LargeSystemCache"] = $memProps.LargeSystemCache
    $backup["DisablePagingExecutive"] = $memProps.DisablePagingExecutive
}

# 7. Visual Effects
$visualKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
if (Test-Path $visualKey) {
    $backup["VisualFXSetting"] = (Get-ItemProperty -Path $visualKey -ErrorAction SilentlyContinue).VisualFXSetting
}

# 8. Transparency
$personalize = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"
if (Test-Path $personalize) {
    $backup["EnableTransparency"] = (Get-ItemProperty -Path $personalize).EnableTransparency
}

# 9. HAGS
$graphicsKey = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
if (Test-Path $graphicsKey) {
    $backup["HwSchMode"] = (Get-ItemProperty -Path $graphicsKey -ErrorAction SilentlyContinue).HwSchMode
}

# 10. Game DVR
$gameDVRKey = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR"
if (Test-Path $gameDVRKey) {
    $backup["AppCaptureEnabled"] = (Get-ItemProperty -Path $gameDVRKey -ErrorAction SilentlyContinue).AppCaptureEnabled
}

# Output JSON
$backup | ConvertTo-Json -Depth 4
