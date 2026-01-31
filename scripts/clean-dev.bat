@echo off
REM Script de nettoyage pour environnement de développement
REM ERP Marchés Publics - STAM

echo ========================================
echo Nettoyage Environnement de Developpement
echo ========================================
echo.

echo [1/3] Arret de tous les processus Node.js...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    Processus Node.js arretes avec succes
) else (
    echo    Aucun processus Node.js a arreter
)
echo.

echo [2/3] Verification des ports...
netstat -ano | findstr :3000 >nul
if %ERRORLEVEL% EQU 0 (
    echo    ATTENTION: Le port 3000 est toujours occupe
    netstat -ano | findstr :3000
) else (
    echo    Port 3000 libre
)
echo.

echo [3/3] Nettoyage termine!
echo.
echo Vous pouvez maintenant demarrer le serveur avec: npm run dev
echo ========================================
pause
