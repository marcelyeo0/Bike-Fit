"""
pose.py — Wrapper autour de MediaPipe Pose Landmarker, mode LIVE_STREAM.

Mode LIVE_STREAM = flux webcam temps réel. Particularité : il est ASYNCHRONE.
On envoie une frame avec detect_async(), et MediaPipe appelle notre fonction
callback quand le résultat est prêt (quelques millisecondes plus tard).
Avantage : si la détection est plus lente que la caméra, on ne bloque pas
le flux vidéo — MediaPipe saute des frames tout seul si besoin.

Le wrapper cache tout ça. Utilisation depuis l'extérieur :

    detector = PoseDetector("config/pose_landmarker.task")
    ...dans la boucle vidéo :
    detector.send(frame, timestamp_ms)      # envoie la frame (ne bloque pas)
    joints = detector.latest(frame.shape)   # dernier résultat dispo (ou None)
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# Indices des landmarks utiles au bike fitting.
# MediaPipe renvoie 33 points ; on garde le côté DROIT du corps
# (en bike fitting on filme le cycliste de profil).
# Liste complète : https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
LANDMARK_IDS = {
    "shoulder": 12,   # épaule droite
    "elbow": 14,      # coude droit
    "wrist": 16,      # poignet droit
    "hip": 24,        # hanche droite
    "knee": 26,       # genou droit
    "ankle": 28,      # cheville droite
}

# Segments à dessiner entre les articulations (paires de noms).
SEGMENTS = [
    ("shoulder", "elbow"),
    ("elbow", "wrist"),
    ("shoulder", "hip"),
    ("hip", "knee"),
    ("knee", "ankle"),
]


class PoseDetector:
    """Détection de pose sur un flux webcam (mode LIVE_STREAM, asynchrone)."""

    def __init__(self, model_path: str):
        # Le dernier résultat reçu du callback. None tant que rien n'est détecté.
        self._last_result = None

        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.LIVE_STREAM,
            # En LIVE_STREAM, on DOIT fournir un callback : la fonction que
            # MediaPipe appellera à chaque résultat prêt.
            result_callback=self._on_result,
        )
        self._detector = vision.PoseLandmarker.create_from_options(options)

    # ------------------------------------------------------------------ #
    # Callback : appelé PAR MediaPipe (depuis un autre thread) quand un
    # résultat est prêt. On se contente de le stocker.
    # Signature imposée par la doc : (result, image, timestamp_ms).
    # ------------------------------------------------------------------ #
    def _on_result(self, result, output_image, timestamp_ms: int):
        self._last_result = result

    def send(self, frame_bgr, timestamp_ms: int):
        """
        Envoie une frame OpenCV (BGR) à MediaPipe pour analyse.
        Ne bloque pas : le résultat arrivera via le callback.

        timestamp_ms doit être STRICTEMENT CROISSANT d'un appel à l'autre
        (utilise le temps écoulé, ex : time.monotonic() converti en ms).
        """
        # OpenCV lit en BGR, MediaPipe attend du RGB.
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        self._detector.detect_async(mp_image, timestamp_ms)

    def latest(self, frame_shape):
        """
        Renvoie les articulations du DERNIER résultat reçu, sous la forme :
            {"shoulder": (x, y), "elbow": (x, y), ...}
        avec x, y en PIXELS. Renvoie None si aucune pose détectée pour l'instant.

        frame_shape : le .shape de la frame OpenCV (pour convertir les
        coordonnées normalisées 0-1 de MediaPipe en pixels).
        """
        result = self._last_result
        if result is None or not result.pose_landmarks:
            return None

        pose = result.pose_landmarks[0]  # première personne détectée

        height, width = frame_shape[:2]
        joints = {}
        for name, idx in LANDMARK_IDS.items():
            lm = pose[idx]
            joints[name] = (int(lm.x * width), int(lm.y * height))
        return joints

    def close(self):
        """À appeler à la fin pour libérer les ressources."""
        self._detector.close()