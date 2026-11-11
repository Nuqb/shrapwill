@echo off
setlocal
set "CAMERA_REPORT=%~dp0..\..\Outputs\Camera-Roll-%RANDOM%-%RANDOM%"
echo Comparing F:\Camera Roll with the I drive. Media will not be changed.
echo For full content verification, run this file with --verify.
node "%~dp0camera-roll-compare.mjs" "F:\Camera Roll" "I:/" "%CAMERA_REPORT%" %1
if errorlevel 1 goto failed
start "" "%CAMERA_REPORT%\report.html"
echo Report saved to %CAMERA_REPORT%
pause
exit /b 0
:failed
echo Comparison failed. Review the message above.
pause
exit /b 1
