# Telemetry & Privacy Debloater
# Disables Windows tracking services and background data collection
Write-Host "Disabling Windows Telemetry & Privacy Invasive Services..."

# 1. Disable Services
$services = @("DiagTrack", "dmwappushservice")
foreach ($svc in $services) {
    if (Get-Service $svc -ErrorAction SilentlyContinue) {
        Stop-Service $svc -Force -ErrorAction SilentlyContinue
        Set-Service $svc -StartupType Disabled -ErrorAction SilentlyContinue
        Write-Host "Service ${svc}: DISABLED"
    }
}

# 2. Registry Tweaks for Data Collection
$registryPaths = @(
    "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection"
)

foreach ($path in $registryPaths) {
    if (!(Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "AllowTelemetry" -Value 0 -Type DWord -ErrorAction SilentlyContinue
}

# 3. Disable Scheduled Tasks (Telemetry)
$tasks = @(
    "\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
    "\Microsoft\Windows\Application Experience\ProgramDataUpdater",
    "\Microsoft\Windows\Application Experience\StartupAppTask",
    "\Microsoft\Windows\Autochk\Proxy",
    "\Microsoft\Windows\Customer Experience Improvement Program\Consolidator",
    "\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip",
    "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector"
)

foreach ($task in $tasks) {
    if (Get-ScheduledTask -TaskName ($task -split '\\')[-1] -TaskPath ($task.Substring(0, $task.LastIndexOf('\')) + '\') -ErrorAction SilentlyContinue) {
        Disable-ScheduledTask -TaskName ($task -split '\\')[-1] -TaskPath ($task.Substring(0, $task.LastIndexOf('\')) + '\') -ErrorAction SilentlyContinue
        Write-Host "Task ${task}: DISABLED"
    }
}

# 4. Disable Cortana & Bing Search
$searchKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
if (!(Test-Path $searchKey)) { New-Item -Path $searchKey -Force | Out-Null }
Set-ItemProperty -Path $searchKey -Name "CanCortanaBeEnabled" -Value 0 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $searchKey -Name "BingSearchEnabled" -Value 0 -Type DWord -ErrorAction SilentlyContinue

Write-Host "Telemetry & Privacy Optimization Complete."
