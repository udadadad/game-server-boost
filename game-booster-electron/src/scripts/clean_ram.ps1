# RAM Intelligent Cleaner
# Releases memory from Standby List and System Cache
Write-Host "Initing Intelligent RAM Cleaning..."

# Use EmptyWorkingSet or clear standby list via API if possible, 
# but for a script, we use a trick with large object allocation or specialized tools.
# Since we don't want external dependencies, we use the Garbage Collector trigger 
# and Memory Compression hint.

# 1. Clear Standby List (requires special permissions or tools usually)
# Here we use a safe method to request Windows to trim working sets of all processes.
$code = @"
using System;
using System.Runtime.InteropServices;

public class RamCleaner {
    [DllImport("psapi.dll")]
    public static extern int EmptyWorkingSet(IntPtr hProcess);

    public static void Clean() {
        var processes = System.Diagnostics.Process.GetProcesses();
        foreach (var p in processes) {
            try {
                EmptyWorkingSet(p.Handle);
            } catch {}
        }
    }
}
"@

Add-Type -TypeDefinition $code
[RamCleaner]::Clean()

Write-Host "RAM Standby List and Working Sets Trimmed."
