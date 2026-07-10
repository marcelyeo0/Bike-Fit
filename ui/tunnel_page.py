"""Page Soufflerie virtuelle — implémentée en Phase 2 (jalon P2.x).

Page provisoire pour que la navigation de l'accueil fonctionne dès la
Phase 1 ; sera remplacée par l'import vidéo + simulation de flux.
"""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QLabel, QPushButton, QVBoxLayout, QWidget


class TunnelPage(QWidget):
    back_requested = Signal()

    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(20)

        title = QLabel("💨 Soufflerie virtuelle")
        title.setObjectName("pageTitle")
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        info = QLabel("Module en construction — disponible en Phase 2.")
        info.setObjectName("dim")
        info.setAlignment(Qt.AlignCenter)
        layout.addWidget(info)

        back = QPushButton("← Retour à l'accueil")
        back.clicked.connect(self.back_requested)
        layout.addWidget(back, alignment=Qt.AlignCenter)

    def shutdown(self) -> None:
        """Arrêt des ressources (rien à faire tant que la page est un stub)."""
