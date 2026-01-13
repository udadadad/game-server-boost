# Extreme Service Cleaner v2
# Disables heavy non-essential background services for maximum FPS
Write-Host "Applying EXTREME Optimization Profile v2..."

$services = @(
    # Original services
    "Spooler",          # Print Spooler
    "BTAGService",      # Bluetooth Audio Gateway
    "bthserv",          # Bluetooth Support Service
    "wuauserv",         # Windows Update
    "BITS",             # Background Intelligent Transfer
    "RemoteRegistry",   # Remote Registry
    "TermService",      # Remote Desktop
    "Fax",              # Fax Service
    "MapsBroker",       # Downloaded Maps Manager
    "XblAuthManager",   # Xbox Live Auth
    "XblGameSave",      # Xbox Live Game Save
    "XboxNetApiSvc",    # Xbox Live Networking
    
    # NEW v2 Services - More aggressive
    "WbioSrvc",         # Windows Biometric Service
    "TabletInputService", # Tablet Input (if no touchscreen)
    "PcaSvc",           # Program Compatibility Assistant
    "CDPSvc",           # Connected Devices Platform
    "CDPUserSvc",       # Connected Devices Platform User
    "OneSyncSvc",       # Sync Host
    "WMPNetworkSvc",    # Windows Media Player Network Sharing
    "lfsvc",            # Geolocation Service
    "SharedAccess",     # Internet Connection Sharing
    "WerSvc",           # Windows Error Reporting
    "Wecsvc",           # Windows Event Collector
    "stisvc",           # Windows Image Acquisition
    "wisvc",            # Windows Insider Service
    "WpcMonSvc",        # Parental Controls
    "WPDBusEnum",       # Portable Device Enumerator
    "PhoneSvc",         # Phone Service
    "TrkWks",           # Distributed Link Tracking Client
    "dmwappushservice", # Device Management WAP Push
    "RetailDemo",       # Retail Demo Service
    "MessagingService", # Messaging Service
    "PimIndexMaintenanceSvc", # Contact Data indexing
    "UnistoreSvc",      # User Data Storage
    "UserDataSvc",      # User Data Access
    "WalletService",    # Wallet Service
    "NcbService",       # Network Connection Broker
    "SEMgrSvc",         # Payments and NFC
    "AJRouter"          # AllJoyn Router
)

$stoppedCount = 0
foreach ($svc in $services) {
    $service = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($service) {
        Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
        Set-Service -Name $svc -StartupType Disabled -ErrorAction SilentlyContinue
        $stoppedCount++
        Write-Host "Deactivated: $svc"
    }
}

# === Enhanced Game Mode ===
$gameBar = "HKCU:\Software\Microsoft\GameBar"
if (!(Test-Path $gameBar)) { New-Item -Path $gameBar -Force | Out-Null }
Set-ItemProperty -Path $gameBar -Name "AllowAutoGameMode" -Value 1
Set-ItemProperty -Path $gameBar -Name "AutoGameModeEnabled" -Value 1

# === Disable Cortana ===
$cortanaKey = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search"
if (!(Test-Path $cortanaKey)) { New-Item -Path $cortanaKey -Force | Out-Null }
Set-ItemProperty -Path $cortanaKey -Name "AllowCortana" -Value 0 -Type DWord
Write-Host "Cortana: DISABLED"

# === Disable Telemetry ===
$telemetryKey = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection"
if (!(Test-Path $telemetryKey)) { New-Item -Path $telemetryKey -Force | Out-Null }
Set-ItemProperty -Path $telemetryKey -Name "AllowTelemetry" -Value 0 -Type DWord
Write-Host "Telemetry: DISABLED"

Write-Host "Extreme Profile v2 Applied. $stoppedCount services deactivated."
Write-Host "Hardware status: BEAST_MODE"
