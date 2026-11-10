; Tauri's default passive update forcibly shuts down applications that hold the
; executable. Preserve every running editor instead: refuse installation until
; the user closes those sessions normally. Applies to uninstalling as well.
!ifmacrodef CheckIfAppIsRunning
  !macroundef CheckIfAppIsRunning
!endif
!macro CheckIfAppIsRunning executablePath productName
  ${If} ${FileExists} "${executablePath}"
    ; A mapped Windows executable cannot be opened for writing. Probe access
    ; without writing bytes; no process enumeration or forced shutdown is used.
    System::Call 'kernel32::CreateFileW(w "${executablePath}", i 0x40000000, i 7, p 0, i 3, i 0, p 0) p .r0'
    ${If} $0 == -1
      IfSilent +2
        MessageBox MB_OK "Close all ${productName} windows normally and check folder permissions, then retry. Your work has been left open."
      Abort "The editor is in use or not writable. Nothing was installed."
    ${EndIf}
    System::Call 'kernel32::CloseHandle(p r0)'
  ${EndIf}
!macroend
