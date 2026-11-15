@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 goto bundled
node.exe -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 goto bundled
node.exe server.mjs --open
goto end
:bundled
if not exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" goto offline
"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs --open
goto end
:offline
start "" "%~dp0dist\index.html"
:end
endlocal
