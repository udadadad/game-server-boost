param (
    [string]$Action,
    [string]$VhdPath,
    [string]$SizeGB,
    [string]$Label = "CyberVault",
    [string]$DriveLetter = "Z"
)

# Force ASCII for diskpart compatibility and handle temporary scripts safely
function Invoke-Diskpart {
    param([string]$Script)
    $tempFile = [System.IO.Path]::GetTempFileName()
    Write-Output "[SYSTEM] Generating DiskPart script..."
    $Script | Out-File -FilePath $tempFile -Encoding ascii
    Write-Output "[SYSTEM] Executing DiskPart..."
    $output = diskpart /s $tempFile
    Remove-Item $tempFile
    return $output
}

function New-Vault {
    Write-Output "[SYSTEM] Initializing New Vault Creation..."
    Write-Output "[SYSTEM] Target Path: $VhdPath"

    # Cleanup existing corrupted files
    if (Test-Path $VhdPath) {
        Write-Output "[WARNING] Existing file found. Detaching and removing..."
        $cleanupScript = "select vdisk file=`"$VhdPath`"`ndetach vdisk"
        Invoke-Diskpart $cleanupScript | Out-Null
        Start-Sleep -Seconds 1
        Remove-Item $VhdPath -Force -ErrorAction SilentlyContinue
    }

    $ParentDir = Split-Path $VhdPath
    if (-not (Test-Path $ParentDir)) {
        New-Item -ItemType Directory -Path $ParentDir -Force | Out-Null
    }

    Write-Output "[SYSTEM] Stage 1: Creating VHDX container ($SizeGB GB)..."
    $createScript = "create vdisk file=`"$VhdPath`" maximum=$([int]$SizeGB * 1024) type=expandable"
    Invoke-Diskpart $createScript | Out-Null
    
    Start-Sleep -Seconds 2 # Give Windows time to register the file

    Write-Output "[SYSTEM] Stage 2: Initializing, Onlining and Formatting..."
    # Robust sequence: Create -> Attach -> Online -> Clear Readonly -> Convert -> Partition -> Format -> Assign
    $initScript = @"
rescan
select vdisk file="$VhdPath"
attach vdisk
online disk noerr
attributes disk clear readonly noerr
convert gpt
create partition primary
format fs=ntfs label="$Label" quick
assign letter=$DriveLetter
"@
    
    $res = Invoke-Diskpart $initScript
    Write-Output $res
    
    if (Test-Path $VhdPath) {
        Write-Output "[SUCCESS] Vault created and synchronized."
        Write-Output "Vault successfully initialized as $DriveLetter`:"
    } else {
        Write-Output "[FATAL ERROR] DiskPart finished but the file was NOT created."
    }
}

function Mount-Vault {
    Write-Output "[SYSTEM] Attempting to mount vault at $VhdPath"
    if (-not (Test-Path $VhdPath)) {
        Write-Output "ERROR: Vault file not found."
        return
    }
    
    $script = @"
rescan
select vdisk file="$VhdPath"
attach vdisk noerr
online disk noerr
attributes disk clear readonly noerr
select partition 1
assign letter=$DriveLetter noerr
"@
    $res = Invoke-Diskpart $script
    Write-Output $res
    Write-Output "Vault Unlocked and Mounted as $DriveLetter`:"
}

function Dismount-Vault {
    Write-Output "[SYSTEM] Locking vault..."
    if (-not (Test-Path $VhdPath)) {
        Write-Output "ERROR: Vault file not found."
        return
    }
    
    $script = @"
select vdisk file="$VhdPath"
detach vdisk
"@
    $res = Invoke-Diskpart $script
    Write-Output $res
    Write-Output "Vault Locked and Hidden."
}

function Delete-Vault {
    Write-Output "[SYSTEM] Permanent Deletion Initiated..."
    if (Test-Path $VhdPath) {
        $script = "select vdisk file=`"$VhdPath`"`ndetach vdisk"
        Invoke-Diskpart $script | Out-Null
        Start-Sleep -Seconds 1
        Remove-Item $VhdPath -Force
        Write-Output "[SUCCESS] Vault file permanently deleted."
    } else {
        Write-Output "ERROR: Vault file not found."
    }
}

switch ($Action) {
    "create"  { New-Vault }
    "mount"   { Mount-Vault }
    "unmount" { Dismount-Vault }
    "delete"  { Delete-Vault }
    default   { Write-Output "Invalid Action" }
}
