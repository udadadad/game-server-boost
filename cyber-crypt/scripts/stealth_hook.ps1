$code = @'
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class StealthHook {
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int VK_RSHIFT = 0xA1;
    private const int VK_BACKSLASH = 0xDC; // VK_OEM_5

    private static LowLevelKeyboardProc _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;
    private static bool _blocking = false;

    public static void Start() {
        _hookID = SetHook(_proc);
        Application.Run();
    }

    public static void Stop() {
        UnhookWindowsHookEx(_hookID);
        Application.Exit();
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    private static IntPtr SetHook(LowLevelKeyboardProc proc) {
        using (var curProcess = System.Diagnostics.Process.GetCurrentProcess())
        using (var curModule = curProcess.MainModule) {
            return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && wParam == (IntPtr)WM_KEYDOWN) {
            int vkCode = Marshal.ReadInt32(lParam);
            
            // Toggle blocking with Backslash
            if (vkCode == VK_BACKSLASH) {
                _blocking = !_blocking;
                Console.WriteLine("Stealth Mode: " + (_blocking ? "ENABLED" : "DISABLED"));
            }

            // Block Right Shift if enabled
            if (_blocking && vkCode == VK_RSHIFT) {
                return (IntPtr)1; // Block the key
            }
        }
        return CallNextHookEx(_hookID, nCode, wParam, lParam);
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Windows.Forms
[StealthHook]::Start()
