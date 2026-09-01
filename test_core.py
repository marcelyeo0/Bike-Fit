"""
test_core.py — Test du coeur du projet : webcam + pose + angles + couleurs.
SANS GUI ni API. À LANCER DEPUIS LA RACINE du projet :

    python test_core.py

Quitter : touche Q dans la fenêtre.

Ce fichier est temporaire (une démo). Quand main.py prendra le relais avec
la vraie GUI, tu pourras le supprimer ou le garder comme banc d'essai.
"""

# --- Couper les logs bavards de TensorFlow AVANT tout import mediapipe ------
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import time
import cv2

from src.core.pose import PoseDetector, SEGMENTS
from src.core.angles import AngleRange, SessionAngles, JUDGE_STAT


MODEL_PATH = "config/pose_landmarker.task"

# Plages EN DUR pour l'instant (position mixte route). Plus tard, c'est
# l'API IA qui les renverra en fonction du questionnaire.
TARGET_RANGES = {
    "knee": AngleRange(140, 150),
    "hip": AngleRange(45, 60),
    "elbow": AngleRange(150, 165),
    "shoulder": AngleRange(85, 100),
}

# Couleurs OpenCV en BGR (pas RGB !).
GREEN = (0, 200, 0)
RED = (0, 0, 255)
GRAY = (150, 150, 150)   # pas encore assez de données


def color_for(session: SessionAngles, joint_name: str):
    """Vert / rouge / gris selon l'état de l'articulation.
    Les points sans angle mesuré (wrist, ankle) restent gris."""
    if joint_name not in TARGET_RANGES:
        return GRAY
    state = session.is_ok(joint_name)   # True / False / None
    if state is None:
        return GRAY
    return GREEN if state else RED


def main():
    cap = cv2.VideoCapture(0)   # 0 = webcam par défaut
    if not cap.isOpened():
        print("Impossible d'ouvrir la webcam.")
        return

    detector = PoseDetector(MODEL_PATH)
    session = SessionAngles(TARGET_RANGES)

    # Base de temps pour des timestamps strictement croissants (obligatoire
    # en LIVE_STREAM). On part de 0 au lancement.
    start = time.monotonic()

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        # Effet miroir : plus naturel quand tu te regardes dans la webcam.
        frame = cv2.flip(frame, 1)

        # 1. Envoyer la frame à MediaPipe (asynchrone).
        timestamp_ms = int((time.monotonic() - start) * 1000)
        detector.send(frame, timestamp_ms)

        # 2. Récupérer le dernier résultat disponible.
        joints = detector.latest(frame.shape)

        if joints is not None:
            # 3. Mettre à jour les trackers d'angles.
            session.update(joints)

            # 4. Dessiner les segments.
            for name_a, name_b in SEGMENTS:
                color = color_for(session, name_b)
                cv2.line(frame, joints[name_a], joints[name_b], color, 3)

            # 5. Dessiner les points.
            for name, (x, y) in joints.items():
                cv2.circle(frame, (x, y), 6, color_for(session, name), -1)

            # 6. Afficher les valeurs jugées (max/min/moyenne) en haut à gauche.
            y_text = 30
            for name in TARGET_RANGES:
                value = session.judged_value(name)
                stat = JUDGE_STAT[name]
                if value is None:
                    txt = f"{name} ({stat}): ..."
                    col = GRAY
                else:
                    txt = f"{name} ({stat}): {value:.0f} deg"
                    col = color_for(session, name)
                cv2.putText(frame, txt, (10, y_text),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, col, 2)
                y_text += 28

        cv2.imshow("BikeFit - test coeur", frame)

        # waitKey rafraichit la fenetre ET lit le clavier. Sans lui, ecran fige.
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    detector.close()
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()