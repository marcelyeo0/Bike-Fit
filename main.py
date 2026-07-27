"""
main.py — Point d'entrée de l'application BikeFit.

Enchaînement :
  1. SetupWindow : le cycliste remplit le questionnaire ;
  2. l'API calcule les plages d'angles cibles (repli hors ligne géré) ;
  3. AnalysisWindow : analyse webcam temps réel + bilan IA de fin de session ;
  4. retour au questionnaire pour une nouvelle session éventuelle.

Lancer depuis la racine du projet :  python main.py
"""

# Couper les logs bavards de TensorFlow AVANT tout import mediapipe.
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import customtkinter as ctk

from src.GUI import SetupWindow, AnalysisWindow

MODEL_PATH = "config/pose_landmarker.task"


def main():
    ctk.set_appearance_mode("light")     # le style iOS est pensé en clair

    def launch_analysis(profile: dict, ranges: dict):
        # Le questionnaire s'efface pendant l'analyse et revient à la fin.
        app.withdraw()
        AnalysisWindow(
            app,
            ranges=ranges,
            comment=profile["comment"],
            model_path=MODEL_PATH,
            on_close=app.deiconify,
        )

    app = SetupWindow(on_profile_ready=launch_analysis)
    app.mainloop()


if __name__ == "__main__":
    main()
