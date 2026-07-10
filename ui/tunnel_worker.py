"""Thread de calcul de la soufflerie : frame → silhouette → flux → score.

Le calcul complet (MediaPipe + relaxation du champ) prend 1 à 2 secondes :
comme pour l'analyse posturale, il part dans un QThread pour ne pas geler
l'interface pendant que le vélociste manipule l'application.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PySide6.QtCore import QThread, Signal

from pose.mediapipe_estimator import MediaPipeEstimator
from windtunnel.drag import DragResult, drag_score
from windtunnel.flow import FlowField, solve_flow
from windtunnel.silhouette import clean_mask


@dataclass
class TunnelResult:
    """Tout ce qu'il faut pour animer et noter une position."""
    base_frame: np.ndarray   # frame vidéo d'origine (BGR)
    mask: np.ndarray         # silhouette nettoyée (bool, taille image)
    flow: FlowField
    drag: DragResult


class TunnelWorker(QThread):
    result_ready = Signal(object)   # TunnelResult
    error = Signal(str)

    def __init__(self, frame_bgr: np.ndarray, parent=None):
        super().__init__(parent)
        self._frame = frame_bgr

    def run(self) -> None:
        # model_complexity=2 (heavy) : sur une frame statique, le modèle
        # léger échoue là où le heavy détecte (vérifié sur image.png). La
        # latence (~1 s) est sans importance ici, la fiabilité si.
        # ⚠ Empaquetage : ce modèle n'est PAS dans le paquet pip, MediaPipe
        # le télécharge au premier usage et le met en cache dans
        # site-packages/mediapipe/modules/pose_landmark/. Il faut donc
        # exécuter la soufflerie une fois sur la machine de build AVANT
        # PyInstaller pour que le .tflite soit embarqué (cf. README).
        estimator = MediaPipeEstimator(with_mask=True, static_image=True,
                                       model_complexity=2)
        try:
            pose = estimator.process(self._frame)
        finally:
            estimator.close()

        if pose is None or pose.mask is None:
            self.error.emit("Cycliste non détecté sur cette image : "
                            "choisissez une autre frame avec le curseur.")
            return
        mask = clean_mask(pose.mask)
        if mask is None:
            self.error.emit("Silhouette inexploitable (trop petite ou trop "
                            "bruitée) : essayez une frame mieux éclairée.")
            return

        flow = solve_flow(mask)
        drag = drag_score(mask)
        self.result_ready.emit(TunnelResult(
            base_frame=self._frame, mask=mask, flow=flow, drag=drag))
