# Debloat / Temporary Suspension Script
Write-Host "Suspending non-essential services..."

# List of services to stop (Safe list)
$services = @(
    "SysMain",          # Superfetch
    "DiagTrack",        # Telemetry
    "WSearch"           # Windows Search Indexer
)

foreach ($service in $services) {
    if (Get-Service $service -ErrorAction SilentlyContinue) {
        Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped $service"
    }
}

# Clear Temp Files
$tempFolders = @(
    $env:TEMP,
    "C:\Windows\Temp"
)

foreach ($folder in $tempFolders) {
    if (Test-Path $folder) {
        Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    }
}

Write-Host "Debloat Complete."
