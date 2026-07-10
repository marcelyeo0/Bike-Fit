"""Dessin de l'overlay (squelette + étiquettes d'angles) sur les frames.

Dessin fait avec OpenCV (sur le tableau NumPy, avant conversion en QImage) :
dessiner dans le repère de l'image garantit que l'overlay reste collé au
cycliste quel que soit le redimensionnement de la fenêtre.

Style calqué sur la maquette assets/ : squelette en dégradé de couleurs
(chaud en haut du corps, froid vers le pied) et étiquettes colorées.
"""

from __future__ import annotations

import numpy as np
import cv2

# Couleur par articulation (BGR), dégradé chaud → froid le long du corps.
JOINT_COLORS: dict[str, tuple[int, int, int]] = {
    "shoulder": (60, 76, 231),    # rouge
    "elbow": (0, 152, 255),       # orange
    "wrist": (0, 216, 255),       # jaune
    "hip": (89, 217, 134),        # vert clair
    "knee": (113, 204, 46),       # vert
    "ankle": (208, 224, 64),      # cyan
    "heel": (237, 149, 100),      # bleu
    "foot": (182, 89, 155),       # violet
}

_BONES = [
    ("shoulder", "elbow"), ("elbow", "wrist"),
    ("shoulder", "hip"),
    ("hip", "knee"), ("knee", "ankle"),
    ("ankle", "heel"), ("heel", "foot"),
]

# Étiquette d'angle : (articulation d'ancrage, libellé court).
_ANGLE_LABELS: dict[str, tuple[str, str]] = {
    "knee": ("knee", "Genou"),
    "hip": ("hip", "Hanche"),
    "elbow": ("elbow", "Coude"),
    "trunk": ("shoulder", "Dos"),
    "foot": ("foot", "Pied"),
}

_FONT = cv2.FONT_HERSHEY_SIMPLEX


def _mix(c1, c2) -> tuple[int, int, int]:
    return tuple(int((a + b) / 2) for a, b in zip(c1, c2))


def draw_skeleton(frame: np.ndarray, lm: dict[str, np.ndarray]) -> None:
    """Trace os et articulations en place (modifie frame)."""
    for a, b in _BONES:
        if a in lm and b in lm:
            pa, pb = tuple(lm[a].astype(int)), tuple(lm[b].astype(int))
            color = _mix(JOINT_COLORS[a], JOINT_COLORS[b])
            cv2.line(frame, pa, pb, color, 3, cv2.LINE_AA)
    for name, pos in lm.items():
        color = JOINT_COLORS.get(name, (255, 255, 255))
        center = tuple(pos.astype(int))
        cv2.circle(frame, center, 6, color, -1, cv2.LINE_AA)
        cv2.circle(frame, center, 6, (255, 255, 255), 1, cv2.LINE_AA)


def _draw_badge(frame: np.ndarray, anchor: tuple[int, int], text: str,
                color: tuple[int, int, int]) -> None:
    """Étiquette colorée semi-transparente près d'un point."""
    (tw, th), _ = cv2.getTextSize(text, _FONT, 0.5, 1)
    x = int(np.clip(anchor[0] + 14, 2, frame.shape[1] - tw - 14))
    y = int(np.clip(anchor[1] - 14, th + 12, frame.shape[0] - 6))
    x1, y1, x2, y2 = x - 6, y - th - 8, x + tw + 6, y + 6
    box = frame[y1:y2, x1:x2]
    if box.size:  # fond coloré fondu à 75 % pour laisser voir la vidéo
        tint = np.full_like(box, color)
        cv2.addWeighted(tint, 0.75, box, 0.25, 0, dst=box)
    cv2.putText(frame, text, (x, y - 2), _FONT, 0.5, (20, 20, 20), 1, cv2.LINE_AA)


def draw_angles(frame: np.ndarray, lm: dict[str, np.ndarray],
                angles: dict[str, float]) -> None:
    """Affiche chaque angle mesuré près de son articulation."""
    for metric, value in angles.items():
        if metric not in _ANGLE_LABELS:
            continue
        anchor_joint, label = _ANGLE_LABELS[metric]
        if anchor_joint not in lm:
            continue
        _draw_badge(frame, tuple(lm[anchor_joint].astype(int)),
                    f"{label} {value:.0f}", JOINT_COLORS[anchor_joint])


def draw_status(frame: np.ndarray, text: str) -> None:
    """Bandeau d'état en haut de l'image (ex. « Cycliste non détecté »)."""
    cv2.rectangle(frame, (0, 0), (frame.shape[1], 34), (20, 24, 32), -1)
    cv2.putText(frame, text, (12, 23), _FONT, 0.6, (200, 210, 225), 1, cv2.LINE_AA)
