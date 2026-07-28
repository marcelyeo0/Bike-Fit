# build_exe.ps1 - Construit l'executable Windows distribuable de BikeFit.
#
# Prerequis : Python 3.12+ avec les roues mediapipe disponibles.
# Usage     :  powershell -ExecutionPolicy Bypass -File build_exe.ps1
# Sortie    :  dist/BikeFit/           (dossier a distribuer)
#              dist/BikeFit-win64.zip  (archive livrable)
#
# Choix de build :
#  - --onedir (pas --onefile) : mediapipe + modele 9 Mo rendent le onefile
#    trop lent a demarrer (extraction a chaque lancement) ;
#  - --windowed : pas de console derriere l'interface ;
#  - --add-data embarque config/pose_landmarker.task (resolu a l'execution
#    par resource_path() dans main.py) ;
#  - --collect-all : customtkinter et mediapipe portent des donnees non
#    detectees par l'analyse statique de PyInstaller.
#  - le .env (cle Gemini) n'est JAMAIS embarque : l'app retombe sur les
#    plages standard sans cle, c'est le comportement voulu du livrable.

$ErrorActionPreference = "Stop"

# 1. venv propre si absent
if (-not (Test-Path "venv")) {
    python -m venv venv
}
& venv\Scripts\python -m pip install --upgrade pip -q
& venv\Scripts\pip install -q -r requirements.txt
& venv\Scripts\pip install -q pyinstaller

# 2. build
& venv\Scripts\pyinstaller --noconfirm --clean --onedir --windowed `
    --name BikeFit `
    --add-data "config/pose_landmarker.task;config" `
    --collect-all customtkinter `
    --collect-all mediapipe `
    main.py

# 3. archive livrable
Compress-Archive -Path "dist/BikeFit" -DestinationPath "dist/BikeFit-win64.zip" -Force
Write-Host "OK : dist/BikeFit/ et dist/BikeFit-win64.zip"
