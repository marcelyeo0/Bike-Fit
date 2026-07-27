"""
GUI — Interface graphique (customtkinter, style iOS).

Deux fenêtres :
  - SetupWindow    : questionnaire → plages d'angles via l'API
  - AnalysisWindow : webcam + squelette + feedback temps réel + bilan IA
"""

from src.GUI.setup_window import SetupWindow
from src.GUI.analysis_window import AnalysisWindow

__all__ = ["SetupWindow", "AnalysisWindow"]
