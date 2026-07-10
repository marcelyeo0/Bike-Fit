"""Pages du mode Analyse posturale : choix du mode, puis analyse live.

FitSetupPage : l'utilisateur choisit Performance / Confort / Aérodynamisme
(cf. cahier des charges : les seuils d'angles diffèrent par mode) et la
caméra, puis démarre.

FitLivePage : vidéo annotée à gauche, console de recommandations à droite,
bouton « Terminer l'analyse » en bas de la console — disposition de la
maquette assets/.
"""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (QButtonGroup, QFrame, QHBoxLayout, QLabel,
                               QListWidget, QListWidgetItem, QPushButton,
                               QSpinBox, QVBoxLayout, QWidget)

from analysis.recommender import Recommendation
from analysis.thresholds import MODE_DESCRIPTIONS, MODE_LABELS
from ui.video_view import VideoView


class FitSetupPage(QWidget):
    start_requested = Signal(str, int)   # mode, index caméra
    back_requested = Signal()

    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(24)

        title = QLabel("Choisissez un mode d'analyse")
        title.setObjectName("pageTitle")
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        hint = QLabel("Chaque mode applique des cibles d'angles différentes "
                      "(issues de la littérature du bike fitting).")
        hint.setObjectName("dim")
        hint.setAlignment(Qt.AlignCenter)
        layout.addWidget(hint)

        cards = QHBoxLayout()
        cards.setSpacing(16)
        cards.addStretch()
        self._group = QButtonGroup(self)
        for i, (mode, label) in enumerate(MODE_LABELS.items()):
            card = QPushButton(f"{label}\n\n{MODE_DESCRIPTIONS[mode]}")
            card.setObjectName("card")
            card.setCheckable(True)
            card.setMinimumSize(260, 150)
            card.setProperty("mode", mode)
            self._group.addButton(card, i)
            cards.addWidget(card)
        self._group.buttons()[0].setChecked(True)
        cards.addStretch()
        layout.addLayout(cards)

        camera_row = QHBoxLayout()
        camera_row.setAlignment(Qt.AlignCenter)
        camera_row.addWidget(QLabel("Caméra n°"))
        self._camera = QSpinBox()
        self._camera.setRange(0, 8)
        camera_row.addWidget(self._camera)
        layout.addLayout(camera_row)

        buttons = QHBoxLayout()
        buttons.setAlignment(Qt.AlignCenter)
        buttons.setSpacing(16)
        back = QPushButton("← Retour")
        back.clicked.connect(self.back_requested)
        start = QPushButton("Démarrer l'analyse")
        start.setObjectName("primary")
        start.clicked.connect(self._on_start)
        buttons.addWidget(back)
        buttons.addWidget(start)
        layout.addLayout(buttons)

    def _on_start(self) -> None:
        mode = self._group.checkedButton().property("mode")
        self.start_requested.emit(mode, self._camera.value())


class FitLivePage(QWidget):
    finish_requested = Signal()

    def __init__(self):
        super().__init__()
        layout = QHBoxLayout(self)
        layout.setSpacing(12)

        # — Gauche : flux vidéo annoté —
        left = QVBoxLayout()
        self.mode_label = QLabel("")
        self.mode_label.setObjectName("pageTitle")
        left.addWidget(self.mode_label)
        self.video = VideoView("Ouverture de la caméra…")
        left.addWidget(self.video, stretch=1)
        layout.addLayout(left, stretch=3)

        # — Droite : console de recommandations —
        panel = QFrame()
        panel.setObjectName("panel")
        panel_layout = QVBoxLayout(panel)
        console_title = QLabel("Console")
        console_title.setObjectName("pageTitle")
        console_title.setAlignment(Qt.AlignCenter)
        panel_layout.addWidget(console_title)

        self.console = QListWidget()
        self.console.setWordWrap(True)
        panel_layout.addWidget(self.console, stretch=1)

        finish = QPushButton("Terminer l'analyse")
        finish.setObjectName("danger")
        finish.clicked.connect(self.finish_requested)
        panel_layout.addWidget(finish)
        layout.addWidget(panel, stretch=1)

    def set_mode(self, mode: str) -> None:
        self.mode_label.setText(f"Mode {MODE_LABELS[mode]}")

    def clear_console(self) -> None:
        self.console.clear()

    def add_recommendation(self, reco: Recommendation) -> None:
        icon = "⚠️" if reco.severity == "warn" else "✅"
        item = QListWidgetItem(f"{icon}  {reco.message}")
        self.console.addItem(item)
        self.console.scrollToBottom()

    def add_info(self, text: str) -> None:
        self.console.addItem(QListWidgetItem(f"ℹ️  {text}"))
        self.console.scrollToBottom()
