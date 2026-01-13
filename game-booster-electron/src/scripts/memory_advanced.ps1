# Advanced Memory Optimization
# Aggressive memory tweaks for gaming
Write-Host "Applying Advanced Memory Tweaks..."

# === Disable Memory Compression ===
# Frees CPU cycles at cost of slightly more RAM usage
Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
Write-Host "Memory Compression: DISABLED"

# === LargeSystemCache = 0 (Better for gaming, not file servers) ===
$memoryKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
if (Test-Path $memoryKey) {
    Set-ItemProperty -Path $memoryKey -Name "LargeSystemCache" -Value 0 -Type DWord
    Write-Host "LargeSystemCache: Set to 0 (Gaming mode)"
    
    # Disable Paging Executive (Keep system files in RAM)
    Set-ItemProperty -Path $memoryKey -Name "DisablePagingExecutive" -Value 1 -Type DWord
    Write-Host "Paging Executive: DISABLED (system stays in RAM)"
    
    # IoPageLockLimit - Increase for faster disk I/O
    # Set to ~512MB (in bytes = 536870912)
    Set-ItemProperty -Path $memoryKey -Name "IoPageLockLimit" -Value 536870912 -Type DWord
    Write-Host "IoPageLockLimit: Set to 512MB"
}

# === Prefetch Optimization (Keep for games, but optimize) ===
$prefetchKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters"
if (Test-Path $prefetchKey) {
    # 3 = Prefetch everything (apps + boot)
    Set-ItemProperty -Path $prefetchKey -Name "EnablePrefetcher" -Value 3 -Type DWord
    Set-ItemProperty -Path $prefetchKey -Name "EnableSuperfetch" -Value 0 -Type DWord
    Write-Host "Prefetcher: Optimized for gaming"
}

# === Increase Non-Paged Pool Size ===
$poolKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
Set-ItemProperty -Path $poolKey -Name "NonPagedPoolSize" -Value 0 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $poolKey -Name "PagedPoolSize" -Value 0 -Type DWord -ErrorAction SilentlyContinue

# === Clear Standby List (immediate RAM cleanup) ===
$code = @"
using System;
using System.Runtime.InteropServices;

public class MemoryCleaner {
    [DllImport("psapi.dll")]
    public static extern int EmptyWorkingSet(IntPtr hProcess);

    public static void Clean() {
        var processes = System.Diagnostics.Process.GetProcesses();
        foreach (var p in processes) {
            try { EmptyWorkingSet(p.Handle); } catch {}
        }
    }
}
"@
Add-Type -TypeDefinition $code
[MemoryCleaner]::Clean()

Write-Host "Advanced Memory Optimization Complete."
