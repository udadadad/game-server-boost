# Junk File Cleaner Script
# Cleans temporary files, prefetch, and system logs
Write-Host "Cleaning System Junk Files..."

$dirs = @(
    "$env:TEMP\*",
    "C:\Windows\Temp\*",
    "C:\Windows\Prefetch\*",
    "C:\Windows\SoftwareDistribution\Download\*",
    "C:\Users\*\AppData\Local\Microsoft\Windows\WER\*"
)

foreach ($dir in $dirs) {
    try {
        Write-Host "Cleaning: $dir"
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue 
    }
    catch {
        Write-Host "Skip: $dir (Protected or Empty)"
    }
}

# Empty Recycle Bin
Write-Host "Emptying Recycle Bin..."
try {
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host "Recycle Bin already empty or inaccessible."
}

# Clean Event Logs (Optional, but frees space)
# Uncomment if you want aggressive cleaning
# Get-EventLog -LogName * | ForEach-Object { Clear-EventLog -LogName $_.Log }

Write-Host "Junk Cleaning Complete."
