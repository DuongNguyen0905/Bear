@echo off
rmdir /s /q "%USERPROFILE%\Desktop\Code_De_Up_GitHub" 2>nul
mkdir "%USERPROFILE%\Desktop\Code_De_Up_GitHub"
xcopy /E /I /Y /H "src" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\src\" >nul
xcopy /E /I /Y /H "public" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\public\" >nul
xcopy /E /I /Y /H ".github" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\.github\" >nul
xcopy /E /I /Y /H "android" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\android\" >nul
copy /Y "package.json" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\" >nul
copy /Y "package-lock.json" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\" >nul
copy /Y "vite.config.js" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\" >nul
copy /Y "capacitor.config.ts" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\" >nul
copy /Y "index.html" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\" >nul
copy /Y ".gitignore" "%USERPROFILE%\Desktop\Code_De_Up_GitHub\" >nul
echo Thanh cong! Thu muc da duoc tao tren Desktop.
pause
