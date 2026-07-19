"""Widget d'affichage vidéo : frame NumPy (BGR) → QLabel.

Pattern standard OpenCV/Qt : conversion BGR→RGB puis QImage, et mise à
l'échelle au redimensionnement en conservant le ratio. Le .copy() sur la
QImage est indispensable : sans lui, Qt garde un pointeur vers le buffer
NumPy qui sera libéré à la frame suivante (crash aléatoire classique).
"""

from __future__ import annotations

import numpy as np
import cv2
from PySide6.QtCore import Qt
from PySide6.QtGui import QImage, QPixmap
from PySide6.QtWidgets import QLabel


class VideoView(QLabel):
    def __init__(self, placeholder: str = "En attente de la vidéo…"):
        super().__init__(placeholder)
        self.setObjectName("videoView")
        self.setAlignment(Qt.AlignCenter)
        self.setMinimumSize(480, 360)
        self._pixmap: QPixmap | None = None

    def show_frame(self, frame_bgr: np.ndarray) -> None:
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        h, w, _ = rgb.shape
        image = QImage(rgb.data, w, h, 3 * w, QImage.Format_RGB888).copy()
        self._pixmap = QPixmap.fromImage(image)
        self._rescale()

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        self._rescale()

    def _rescale(self) -> None:
        if self._pixmap is not None:
            self.setPixmap(self._pixmap.scaled(
                self.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation))
