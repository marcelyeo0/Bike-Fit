"""Abstractions de la détection de pose.

`PoseEstimator` est une classe abstraite : MediaPipe n'en est qu'une
implémentation (voir `mediapipe_estimator.py`). Si sa précision déçoit sur
les postures penchées, on branchera RTMPose/ONNX ici sans toucher au reste
du logiciel — c'est le point d'échange prévu dans la feuille de route.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import numpy as np

# Articulations utilisées en vue de profil (cf. GUIDE_PROJET.md §1) :
# épaule=acromion, coude, poignet, hanche=grand trochanter, genou,
# cheville=malléole, talon, pied=5e métatarse (pointe).
JOINTS = ("shoulder", "elbow", "wrist", "hip", "knee", "ankle", "heel", "foot")


@dataclass
class PoseFrame:
    """Résultat de la détection sur UNE image.

    landmarks : nom d'articulation -> position (x, y) en pixels.
    visibility : confiance [0, 1] par articulation.
    side : "left" ou "right" — côté du corps le plus visible (vue de profil,
           on ne travaille que sur un côté).
    mask : silhouette de la personne (float [0, 1], taille de l'image),
           fournie « gratuitement » par MediaPipe et réutilisée en Phase 2.
    """

    landmarks: dict[str, np.ndarray] = field(default_factory=dict)
    visibility: dict[str, float] = field(default_factory=dict)
    side: str = "right"
    mask: np.ndarray | None = None

    def has(self, *names: str) -> bool:
        """Vrai si toutes les articulations demandées sont détectées."""
        return all(n in self.landmarks for n in names)


class PoseEstimator(ABC):
    """Interface commune à tous les détecteurs de pose."""

    @abstractmethod
    def process(self, frame_bgr: np.ndarray) -> PoseFrame | None:
        """Détecte la pose sur une image BGR. None si personne non détectée."""

    def close(self) -> None:  # noqa: B027 — hook optionnel
        """Libère les ressources du modèle (optionnel selon le backend)."""
