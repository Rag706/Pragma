Option Explicit

Dim WshShell, FSO, ScriptDir, IconPath, ShortcutPath, TmpPS, ts

Set WshShell = CreateObject("WScript.Shell")
Set FSO      = CreateObject("Scripting.FileSystemObject")

ScriptDir    = FSO.GetParentFolderName(WScript.ScriptFullName)
IconPath     = ScriptDir & "\taskflow_v2.ico"
ShortcutPath = WshShell.SpecialFolders("Desktop") & "\TaskFlow.lnk"

' ── Generate taskflow.ico only if one does not already exist ──────
' To use a custom icon: place your own taskflow.ico in this folder.
' The script will use it as-is and never overwrite it.
If Not FSO.FileExists(IconPath) Then
    TmpPS = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\taskflow_mkicon.ps1"
    Set ts = FSO.CreateTextFile(TmpPS, True, False)
    ts.WriteLine "Add-Type -AssemblyName System.Drawing"
    ts.WriteLine "$sz = 32"
    ts.WriteLine "$bmp = New-Object System.Drawing.Bitmap $sz,$sz"
    ts.WriteLine "$g = [System.Drawing.Graphics]::FromImage($bmp)"
    ts.WriteLine "$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias"
    ts.WriteLine "$g.Clear([System.Drawing.Color]::Transparent)"
    ts.WriteLine "$bgBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(99,102,241))"
    ts.WriteLine "$bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath"
    ts.WriteLine "$r = 6"
    ts.WriteLine "$bgPath.AddArc(0,0,$r*2,$r*2,180,90)"
    ts.WriteLine "$bgPath.AddArc($sz-$r*2,0,$r*2,$r*2,270,90)"
    ts.WriteLine "$bgPath.AddArc($sz-$r*2,$sz-$r*2,$r*2,$r*2,0,90)"
    ts.WriteLine "$bgPath.AddArc(0,$sz-$r*2,$r*2,$r*2,90,90)"
    ts.WriteLine "$bgPath.CloseFigure()"
    ts.WriteLine "$g.FillPath($bgBrush, $bgPath)"
    ts.WriteLine "$boltPath = New-Object System.Drawing.Drawing2D.GraphicsPath"
    ts.WriteLine "$pts = [System.Drawing.PointF[]]@("
    ts.WriteLine "    [System.Drawing.PointF]::new(17.6, 4.4),"
    ts.WriteLine "    [System.Drawing.PointF]::new(5.6, 18.8),"
    ts.WriteLine "    [System.Drawing.PointF]::new(16.4, 18.8),"
    ts.WriteLine "    [System.Drawing.PointF]::new(15.2, 28.4),"
    ts.WriteLine "    [System.Drawing.PointF]::new(27.2, 14.0),"
    ts.WriteLine "    [System.Drawing.PointF]::new(16.4, 14.0)"
    ts.WriteLine ")"
    ts.WriteLine "$boltPath.AddPolygon($pts)"
    ts.WriteLine "$g.FillPath([System.Drawing.SolidBrush]::new([System.Drawing.Color]::White), $boltPath)"
    ts.WriteLine "$g.Dispose()"
    ts.WriteLine "$hicon = $bmp.GetHicon()"
    ts.WriteLine "$icon = [System.Drawing.Icon]::FromHandle($hicon)"
    ts.WriteLine "$stream = [System.IO.File]::Open('" & IconPath & "', [System.IO.FileMode]::Create)"
    ts.WriteLine "$icon.Save($stream)"
    ts.WriteLine "$stream.Close()"
    ts.WriteLine "$icon.Dispose(); $bmp.Dispose()"
    ts.Close
    WshShell.Run "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & TmpPS & """", 0, True
    If FSO.FileExists(TmpPS) Then FSO.DeleteFile TmpPS
End If

' ── Create Desktop shortcut ────────────────────────────────────────
Dim oLink
Set oLink = WshShell.CreateShortcut(ShortcutPath)
oLink.TargetPath       = "wscript.exe"
oLink.Arguments        = """" & ScriptDir & "\launcher.vbs"""
oLink.WorkingDirectory = ScriptDir
oLink.Description      = "Launch TaskFlow"
If FSO.FileExists(IconPath) Then
    oLink.IconLocation = IconPath & ",0"
End If
oLink.Save

If FSO.FileExists(IconPath) Then
    MsgBox "TaskFlow shortcut created on your Desktop!" & vbCrLf & vbCrLf & _
           "Next step — pin to taskbar:" & vbCrLf & _
           "  1. Find 'TaskFlow' on your Desktop" & vbCrLf & _
           "  2. Right-click it" & vbCrLf & _
           "  3. Select 'Pin to taskbar'" & vbCrLf & vbCrLf & _
           "To use a custom icon: replace taskflow.ico in the app folder," & vbCrLf & _
           "then run this script again.", _
           vbInformation, "TaskFlow — Setup"
Else
    MsgBox "Shortcut created, but the custom icon could not be generated." & vbCrLf & vbCrLf & _
           "The shortcut will use the default Windows icon." & vbCrLf & vbCrLf & _
           "To use a custom icon:" & vbCrLf & _
           "  1. Get a .ico file (e.g. from icoconvert.com)" & vbCrLf & _
           "  2. Save it as 'taskflow.ico' in the app folder" & vbCrLf & _
           "  3. Run this script again" & vbCrLf & vbCrLf & _
           "Then right-click the Desktop shortcut -> Pin to taskbar.", _
           vbExclamation, "TaskFlow — Setup (no custom icon)"
End If
