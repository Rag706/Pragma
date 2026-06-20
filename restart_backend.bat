@echo off
echo Stopping old backend...

:: Kill any process listening on port 59080 using PowerShell
powershell -NoProfile -Command "
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -eq 59080 } |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
        $h = [System.Runtime.InteropServices.Marshal]::GetHINSTANCE([System.Reflection.Assembly]::GetExecutingAssembly().GetModules()[0])
        Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport(\"kernel32.dll\")] public static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport(\"kernel32.dll\")] public static extern bool TerminateProcess(IntPtr handle, uint code);
    [DllImport(\"kernel32.dll\")] public static extern bool CloseHandle(IntPtr handle);
}
'@
        $handle = [WinAPI]::OpenProcess(0x0001, $false, $_)
        if ($handle -ne [IntPtr]::Zero) {
            [WinAPI]::TerminateProcess($handle, 1) | Out-Null
            [WinAPI]::CloseHandle($handle) | Out-Null
            Write-Host 'Terminated PID' $_
        } else {
            taskkill /PID $_ /F /T 2>nul
        }
    }
"

:: Also kill by name just in case
wmic process where "commandline like '%%uvicorn%%main:app%%'" call Terminate >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting fresh backend...
cd /d "%~dp0backend"
start /MIN cmd /k "py -3 -m uvicorn main:app --reload --port 59080"

echo Done. Backend restarting on port 59080.
timeout /t 2 /nobreak >nul
