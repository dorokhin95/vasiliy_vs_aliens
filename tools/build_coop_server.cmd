@echo off
rem Сборка VasiliyCoopServer.exe (сервер сетевого коопа, docs/COOP.md) в корень игры.
rem Компилятор C# из .NET Framework 4.8 — он есть в любой Windows 10/11, ставить ничего не нужно.
chcp 65001 >nul
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
cd /d "%~dp0.."
"%CSC%" /nologo /optimize+ /target:exe /codepage:65001 /out:VasiliyCoopServer.exe /win32icon:tools\coop_server\coop_server.ico tools\coop_server\CoopServer.cs
if errorlevel 1 (
  echo Сборка не удалась
  exit /b 1
)
echo Готово: %CD%\VasiliyCoopServer.exe
