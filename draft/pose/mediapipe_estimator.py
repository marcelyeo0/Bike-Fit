"""Implémentation MediaPipe de PoseEstimator.

Choix justifié dans le README : temps réel sur CPU (le vélociste n'a pas de
GPU), masque de segmentation inclus (réutilisé par la soufflerie), et points
du pied (talon + pointe) absents du format COCO 17 points de RTMPose.

On utilise l'API « solutions » (mp.solutions.pose) plutôt que la nouvelle
API Tasks : le modèle est embarqué dans le paquet pip (rien à télécharger,
crucial pour l'empaquetage PyInstaller) et l'option enable_segmentation
fournit la silhouette en même temps que la pose.
"""

from __future__ import annotations

import numpy as np
import cv2
import mediapipe as mp

from draft.pose.base import PoseEstimator, PoseFrame

_mp_pose = mp.solutions.pose

# Correspondance nos noms -> landmarks MediaPipe, par côté.
# MediaPipe fournit 33 points ; on n'utilise que les 8 utiles au profil.
_LANDMARK_IDS = {
    "left": {
        "shoulder": _mp_pose.PoseLandmark.LEFT_SHOULDER,
        "elbow": _mp_pose.PoseLandmark.LEFT_ELBOW,
        "wrist": _mp_pose.PoseLandmark.LEFT_WRIST,
        "hip": _mp_pose.PoseLandmark.LEFT_HIP,
        "knee": _mp_pose.PoseLandmark.LEFT_KNEE,
        "ankle": _mp_pose.PoseLandmark.LEFT_ANKLE,
        "heel": _mp_pose.PoseLandmark.LEFT_HEEL,
        "foot": _mp_pose.PoseLandmark.LEFT_FOOT_INDEX,
    },
    "right": {
        "shoulder": _mp_pose.PoseLandmark.RIGHT_SHOULDER,
        "elbow": _mp_pose.PoseLandmark.RIGHT_ELBOW,
        "wrist": _mp_pose.PoseLandmark.RIGHT_WRIST,
        "hip": _mp_pose.PoseLandmark.RIGHT_HIP,
        "knee": _mp_pose.PoseLandmark.RIGHT_KNEE,
        "ankle": _mp_pose.PoseLandmark.RIGHT_ANKLE,
        "heel": _mp_pose.PoseLandmark.RIGHT_HEEL,
        "foot": _mp_pose.PoseLandmark.RIGHT_FOOT_INDEX,
    },
}

# En dessous de cette confiance, on considère le point non fiable.
_MIN_VISIBILITY = 0.5


class MediaPipeEstimator(PoseEstimator):
    def __init__(self, with_mask: bool = True, model_complexity: int = 1,
                 static_image: bool = False):
        # model_complexity=1 : compromis précision/vitesse (0=rapide, 2=précis).
        # smooth_landmarks : lissage temporel interne de MediaPipe, complété
        # par notre propre EMA dans analysis/filters.py.
        # static_image=True pour une frame isolée (soufflerie) : détection
        # complète à chaque image au lieu du suivi vidéo frame à frame.
        self._pose = _mp_pose.Pose(
            static_image_mode=static_image,
            model_complexity=model_complexity,
            enable_segmentation=with_mask,
            smooth_landmarks=not static_image,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def process(self, frame_bgr: np.ndarray) -> PoseFrame | None:
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        result = self._pose.process(rgb)
        if result.pose_landmarks is None:
            return None

        points = result.pose_landmarks.landmark
        side = self._pick_side(points)

        landmarks: dict[str, np.ndarray] = {}
        visibility: dict[str, float] = {}
        for name, lm_id in _LANDMARK_IDS[side].items():
            lm = points[lm_id]
            if lm.visibility < _MIN_VISIBILITY:
                continue
            landmarks[name] = np.array([lm.x * w, lm.y * h], dtype=np.float64)
            visibility[name] = float(lm.visibility)

        mask = result.segmentation_mask  # float [0,1] HxW ou None
        return PoseFrame(landmarks=landmarks, visibility=visibility,
                         side=side, mask=mask)

    @staticmethod
    def _pick_side(points) -> str:
        """Vue de profil : on garde le côté le mieux vu par la caméra."""
        def score(side: str) -> float:
            ids = _LANDMARK_IDS[side]
            return sum(points[ids[n]].visibility
                       for n in ("shoulder", "hip", "knee", "ankle"))

        return "left" if score("left") >= score("right") else "right"

    def close(self) -> None:
        self._pose.close()
