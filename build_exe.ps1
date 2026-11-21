# build_exe.ps1 - Construit l'executable Windows distribuable de Axio.
#
# Prerequis : Python 3.12+ avec les roues mediapipe disponibles.
# Usage     :  powershell -ExecutionPolicy Bypass -File build_exe.ps1
# Sortie    :  dist/Axio/           (dossier a distribuer)
#              dist/Axio-win64.zip  (archive livrable)
#
# Choix de build :
#  - les donnees (SQLite) vivent dans %APPDATA%\Axio, hors du dossier
#    livre : une nouvelle version ne les ecrase pas ;
#  - --onedir (pas --onefile) : mediapipe + modele 9 Mo rendent le onefile
#    trop lent a demarrer (extraction a chaque lancement) ;
#  - --windowed : pas de console derriere l'interface ;
#  - --add-data embarque config/pose_landmarker.task (resolu a l'execution
#    par resource_path() dans main.py) ;
#  - --collect-all : customtkinter et mediapipe portent des donnees non
#    detectees par l'analyse statique de PyInstaller.
#  - le .env (cle Gemini) n'est JAMAIS embarque : les fourchettes viennent de la
#    table locale Axio sans cle, comportement voulu du livrable.

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
    --name Axio `
    --add-data "config/pose_landmarker.task;config" `
    --collect-all customtkinter `
    --collect-all mediapipe `
    main.py

# 3. archive livrable
Compress-Archive -Path "dist/Axio" -DestinationPath "dist/Axio-win64.zip" -Force
Write-Host "OK : dist/Axio/ et dist/Axio-win64.zip"
