Option Explicit

Dim WshShell, FSO, ScriptDir, BackendDir, FrontendDir
Dim PythonCmd, result, LocalAppData, DepsMarker

Set WshShell = CreateObject("WScript.Shell")
Set FSO     = CreateObject("Scripting.FileSystemObject")

ScriptDir    = FSO.GetParentFolderName(WScript.ScriptFullName)
BackendDir   = ScriptDir & "\backend"
FrontendDir  = ScriptDir & "\frontend"
LocalAppData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
DepsMarker   = ScriptDir & "\.deps_installed"

' --- Open loading page immediately (before any other work) ---
WshShell.Run "explorer """ & ScriptDir & "\loading.html"""

' --- Find Python ---
' Change 3: use `where py` (fast PATH lookup) instead of `py -3 --version`
' (avoids starting a full Python process just to pick a command alias)
PythonCmd = "py -3"
result = WshShell.Run("cmd /c where py", 0, True)
If result <> 0 Then
    PythonCmd = """" & LocalAppData & "\Programs\Python\Python314\python.exe"""
End If

' --- Check / install Python packages ---
' Change 1: skip the uvicorn check entirely if requirements.txt hasn't changed
' since the last verified install (marker file tracks this).
' First launch (or after requirements.txt changes): runs the check once.
' Every subsequent launch: skips instantly.
Dim NeedsInstall
NeedsInstall = True
If FSO.FileExists(DepsMarker) Then
    If FSO.GetFile(DepsMarker).DateLastModified >= FSO.GetFile(BackendDir & "\requirements.txt").DateLastModified Then
        NeedsInstall = False
    End If
End If

If NeedsInstall Then
    result = WshShell.Run("cmd /c " & PythonCmd & " -m uvicorn --version", 0, True)
    If result <> 0 Then
        result = WshShell.Run("cmd /c " & PythonCmd & " -m pip install -r """ & BackendDir & "\requirements.txt"" --quiet", 0, True)
        If result <> 0 Then
            MsgBox "TaskFlow failed to start." & vbCrLf & vbCrLf & _
                   "Could not install Python packages." & vbCrLf & _
                   "Run start_debug.bat to see the full error.", vbCritical, "TaskFlow"
            WScript.Quit 1
        End If
    End If
    Dim f
    Set f = FSO.CreateTextFile(DepsMarker, True)
    f.WriteLine "Dependencies verified. Delete this file to force a re-check."
    f.Close
End If

' --- Check npm ---
result = WshShell.Run("cmd /c where npm", 0, True)
If result <> 0 Then
    MsgBox "TaskFlow failed to start." & vbCrLf & vbCrLf & _
           "npm not found. Please install Node.js.", vbCritical, "TaskFlow"
    WScript.Quit 1
End If

' --- Install node_modules if missing ---
If Not FSO.FolderExists(FrontendDir & "\node_modules") Then
    result = WshShell.Run("cmd /c cd /d """ & FrontendDir & """ && npm install --silent", 0, True)
    If result <> 0 Then
        MsgBox "TaskFlow failed to start." & vbCrLf & vbCrLf & _
               "npm install failed." & vbCrLf & _
               "Run start_debug.bat to see the full error.", vbCritical, "TaskFlow"
        WScript.Quit 1
    End If
End If

' --- Clear ports 59080 and 5173 ---
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano 2>nul ^| findstr "":59080 ""') do taskkill /F /PID %a >nul 2>&1", 0, False
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano 2>nul ^| findstr "":5173 ""') do taskkill /F /PID %a >nul 2>&1", 0, False

' --- Start backend and frontend in background ---
WshShell.Run "cmd /c cd /d """ & BackendDir & """ && " & PythonCmd & " -m uvicorn main:app --reload --port 59080", 0, False
WshShell.Run "cmd /c cd /d """ & FrontendDir & """ && npm run dev", 0, False

WScript.Quit 0
