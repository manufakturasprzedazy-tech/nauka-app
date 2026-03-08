@echo off
chcp 65001 >nul
echo === Eksport danych z bazy ===
python "%~dp0export_data.py"
if errorlevel 1 (
    echo BLAD: Eksport nie powiodl sie!
    pause
    exit /b 1
)

echo.
echo === Git: dodawanie zmian ===
cd "%~dp0.."
git add app/src/ data/learning.db materials/ scripts/ .env.example
git status --short

echo.
echo === Git: commit i push ===
git commit -m "Aktualizacja materialow"
git push

echo.
echo === Gotowe! ===
echo Apka zaktualizuje sie automatycznie za 1-2 minuty.
echo Link: https://manufakturasprzedazy-tech.github.io/nauka-app/
pause
