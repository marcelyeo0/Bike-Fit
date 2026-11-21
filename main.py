"""
main.py — Point d'entrée du logiciel de bureau Axio.

Ouvre le dashboard (copie de la version web, données locales SQLite) :
clients, études, séance de capture webcam, comptes rendus imprimables.

    python main.py            dashboard Axio
    python main.py --rapide   ancien parcours questionnaire → analyse

Lancer depuis la racine du projet.
"""

# Couper les logs bavards de TensorFlow AVANT tout import mediapipe.
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import sys

import customtkinter as ctk
from dotenv import load_dotenv



def resource_path(relative: str) -> str:
    """Chemin absolu vers une ressource, valable dans les trois modes de
    lancement :
      - PyInstaller --onefile : les données sont extraites dans un dossier
        temporaire exposé par sys._MEIPASS ;
      - PyInstaller --onedir  : sys._MEIPASS pointe vers _internal/ à côté
        de l'exécutable (PyInstaller ≥ 6) ;
      - python main.py        : dossier de ce fichier (la racine du projet),
        donc plus de dépendance au répertoire courant."""
    base = getattr(sys, "_MEIPASS", None)
    if base is None:
        if getattr(sys, "frozen", False):
            base = os.path.dirname(sys.executable)
        else:
            base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, relative)


MODEL_PATH = resource_path(os.path.join("config", "pose_landmarker.task"))


def main_rapide():
    """Ancien parcours sans fiche : questionnaire puis analyse."""
    from src.GUI import SetupWindow, AnalysisWindow
    ctk.set_appearance_mode("light")

    def launch_analysis(profile: dict, ranges: dict, advice: dict):
        app.withdraw()
        AnalysisWindow(
            app,
            ranges=ranges,
            advice=advice,
            comment=profile["comment"],
            model_path=MODEL_PATH,
            on_close=app.deiconify,
            title="Axio — Analyse rapide",
        )

    app = SetupWindow(on_profile_ready=launch_analysis)
    app.mainloop()


def main():
    ctk.set_appearance_mode("light")     # design system pensé en thème clair
    load_dotenv(resource_path(".env"))
    load_dotenv()
    from src.GUI.dashboard.app import DashboardApp
    DashboardApp(model_path=MODEL_PATH).mainloop()


if __name__ == "__main__":
    main_rapide() if "--rapide" in sys.argv else main()
