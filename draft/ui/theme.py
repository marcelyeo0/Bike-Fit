"""Thème sombre de l'application (feuille de style Qt).

Une seule QSS globale plutôt que du style widget par widget : les couleurs
restent cohérentes entre les deux modes et un futur thème clair ne
demanderait qu'un second fichier. Les couleurs suivent la maquette
assets/ (fond bleu nuit, accent vert, danger rouge).
"""

# Palette centralisée — reprise aussi par l'overlay OpenCV (en BGR là-bas).
BG = "#0f131a"
PANEL = "#151a24"
PANEL_BORDER = "#232c3d"
TEXT = "#dfe6f0"
TEXT_DIM = "#8b96a8"
ACCENT = "#86d94b"     # vert BikeFit
PRIMARY = "#2f6fed"    # bleu action
DANGER = "#e5484d"     # rouge « Terminer l'analyse »

STYLESHEET = f"""
QWidget {{
    background-color: {BG};
    color: {TEXT};
    font-family: 'Segoe UI', sans-serif;
    font-size: 14px;
}}
QLabel {{ background: transparent; }}
QLabel#appTitle {{ font-size: 42px; font-weight: 800; }}
QLabel#pageTitle {{ font-size: 22px; font-weight: 700; }}
QLabel#dim {{ color: {TEXT_DIM}; }}
QLabel#videoView {{
    background-color: black;
    border: 1px solid {PANEL_BORDER};
    border-radius: 8px;
}}

QFrame#panel {{
    background-color: {PANEL};
    border: 1px solid {PANEL_BORDER};
    border-radius: 10px;
}}

QPushButton {{
    background-color: #1c2330;
    border: 1px solid #2a3446;
    border-radius: 8px;
    padding: 10px 18px;
}}
QPushButton:hover {{ background-color: #242e3f; border-color: #3d4c66; }}
QPushButton:disabled {{ color: {TEXT_DIM}; background-color: #161c27; }}

QPushButton#primary {{
    background-color: {PRIMARY};
    color: white; font-weight: 600; border: none;
}}
QPushButton#primary:hover {{ background-color: #4a83f0; }}

QPushButton#danger {{
    background-color: {DANGER};
    color: white; font-weight: 700; border: none;
    padding: 12px 18px;
}}
QPushButton#danger:hover {{ background-color: #f2555a; }}

/* Grandes cartes cliquables (accueil, choix du mode) */
QPushButton#card {{
    background-color: {PANEL};
    border: 1px solid {PANEL_BORDER};
    border-radius: 12px;
    padding: 24px;
    font-size: 16px; font-weight: 600;
    text-align: center;
}}
QPushButton#card:hover {{ border-color: {ACCENT}; }}
QPushButton#card:checked {{ border: 2px solid {ACCENT}; }}

QListWidget {{
    background-color: {PANEL};
    border: 1px solid {PANEL_BORDER};
    border-radius: 8px;
    padding: 4px;
}}
QListWidget::item {{ padding: 8px; border-bottom: 1px solid #1d2534; }}

QSpinBox, QComboBox {{
    background-color: #1c2330;
    border: 1px solid #2a3446;
    border-radius: 6px;
    padding: 6px;
}}
QSlider::groove:horizontal {{
    height: 6px; background: #232c3d; border-radius: 3px;
}}
QSlider::handle:horizontal {{
    width: 14px; margin: -5px 0; border-radius: 7px; background: {PRIMARY};
}}
"""
