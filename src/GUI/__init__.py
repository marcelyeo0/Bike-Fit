"""
GUI — Interface graphique (customtkinter).

  - dashboard.app.DashboardApp : dashboard Axio (clients, études, séances)
  - AnalysisWindow             : webcam + squelette + feedback temps réel
  - SetupWindow                : ancien questionnaire (python main.py --rapide)

Imports paresseux : AnalysisWindow charge mediapipe (plusieurs secondes),
le dashboard ne le paie qu'à l'ouverture d'une séance.
"""

__all__ = ["SetupWindow", "AnalysisWindow"]


def __getattr__(nom):
    if nom == "SetupWindow":
        from src.GUI.setup_window import SetupWindow
        return SetupWindow
    if nom == "AnalysisWindow":
        from src.GUI.analysis_window import AnalysisWindow
        return AnalysisWindow
    raise AttributeError(nom)
