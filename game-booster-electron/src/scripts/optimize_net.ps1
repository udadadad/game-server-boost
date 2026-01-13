# Network Optimization Script
Write-Host "Optimizing Network Adapter Settings..."

# TCP Optimizer
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
netsh int tcp set global dca=enabled
netsh int tcp set global netdma=enabled
netsh int tcp set global transport=ctcp
netsh int tcp set global ecncapability=disabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global rss=enabled

# Flush DNS
ipconfig /flushdns

# Registry Tweaks for Nagle Algorithm (Requires Admin)
# Find primary interface
$interfaces = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
foreach ($nic in $interfaces) {
    # Get GUID
    $guid = $nic.InterfaceGuid
    $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$guid"
    
    if (Test-Path $path) {
        # TcpAckFrequency = 1 (Disable delayed ACK)
        New-ItemProperty -Path $path -Name "TcpAckFrequency" -Value 1 -PropertyType DWORD -Force
        # TCPNoDelay = 1 (Disable Nagle)
        New-ItemProperty -Path $path -Name "TCPNoDelay" -Value 1 -PropertyType DWORD -Force
        Write-Host "Optimized Interface: $($nic.Name)"
    }
}

Write-Host "Network Optimization Complete."
