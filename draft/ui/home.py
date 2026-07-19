"""Écran d'accueil : choix entre les deux modes du logiciel."""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (QHBoxLayout, QLabel, QPushButton, QVBoxLayout,
                               QWidget)

from draft.ui.theme import ACCENT


class HomePage(QWidget):
    fit_requested = Signal()
    tunnel_requested = Signal()

    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(28)

        title = QLabel(f'BikeFit <span style="color:{ACCENT}">AI</span>')
        title.setObjectName("appTitle")
        title.setTextFormat(Qt.RichText)
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        subtitle = QLabel("Analyse posturale et soufflerie virtuelle "
                          "pour le bike fitting")
        subtitle.setObjectName("dim")
        subtitle.setAlignment(Qt.AlignCenter)
        layout.addWidget(subtitle)

        cards = QHBoxLayout()
        cards.setSpacing(24)
        cards.addStretch()

        fit_card = QPushButton("🚴  Analyse posturale\n\nAngles articulaires en "
                               "direct via webcam\net recommandations de réglage.")
        tunnel_card = QPushButton("💨  Soufflerie virtuelle\n\nVisualisation du "
                                  "flux d'air sur une vidéo\net score de traînée "
                                  "comparatif.")
        for card, signal in ((fit_card, self.fit_requested),
                             (tunnel_card, self.tunnel_requested)):
            card.setObjectName("card")
            card.setMinimumSize(300, 170)
            card.clicked.connect(signal)
            cards.addWidget(card)
        cards.addStretch()
        layout.addLayout(cards)

        version = QLabel("Version 0.1.0")
        version.setObjectName("dim")
        version.setAlignment(Qt.AlignCenter)
        layout.addWidget(version)
