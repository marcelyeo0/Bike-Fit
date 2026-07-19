"""Scène de démonstration : cycliste générique « pseudo-3D ».

Permet de montrer la soufflerie à un client sans vidéo sous la main.
La silhouette est dessinée procéduralement (capsules entre articulations,
posture aéro face au vent) puis « éclairée » par distance au bord
(distance transform) : le centre du corps est clair, les bords sombres,
ce qui donne une impression de volume.

Pourquoi pas un vrai rendu 3D : il faudrait un maillage de cycliste et un
moteur de rendu (dépendance lourde), alors que la simulation sous-jacente
est 2D par choix de cadrage (cf. README). L'ombrage suffit pour la démo.
"""

from __future__ import annotations

import numpy as np
import cv2

_W, _H = 960, 540

# Articulations du cycliste générique (pixels, posture aéro, face à gauche —
# le vent de la soufflerie vient de la gauche).
_HIP = (588, 258)
_SHOULDER = (398, 208)
_HEAD = (345, 202)
_ELBOW = (402, 270)
_WRIST = (322, 278)
_KNEE = (512, 330)          # jambe côté caméra, pédale en bas-avant
_ANKLE = (492, 418)
_TOE = (452, 430)
_KNEE_FAR = (560, 330)      # jambe opposée, pédale en haut-arrière
_ANKLE_FAR = (540, 385)
_TOE_FAR = (505, 400)

# Géométrie du vélo (décor uniquement : il n'entre pas dans la silhouette
# aérodynamique, le score et le flux ne concernent que le corps).
_BB = (500, 415)            # boîtier de pédalier
_WHEEL_F = (230, 415)
_WHEEL_R = (730, 415)
_WHEEL_RADIUS = 82


def _rider_masks() -> tuple[np.ndarray, np.ndarray]:
    """Silhouettes (côté caméra, jambe opposée) en booléen plein cadre."""
    near = np.zeros((_H, _W), np.uint8)
    far = np.zeros_like(near)

    def capsule(img, a, b, thickness):
        cv2.line(img, a, b, 1, thickness)  # bouts ronds = segment « charnu »

    capsule(far, _HIP, _KNEE_FAR, 40)
    capsule(far, _KNEE_FAR, _ANKLE_FAR, 24)
    capsule(far, _ANKLE_FAR, _TOE_FAR, 14)

    capsule(near, _HIP, _SHOULDER, 62)          # tronc
    capsule(near, _SHOULDER, _HEAD, 30)         # cou
    cv2.circle(near, _HEAD, 26, 1, -1)          # tête
    cv2.ellipse(near, (_HEAD[0] + 20, _HEAD[1] - 10), (42, 20), -18,
                0, 360, 1, -1)                  # casque aéro (goutte d'eau)
    capsule(near, _SHOULDER, _ELBOW, 26)
    capsule(near, _ELBOW, _WRIST, 20)
    capsule(near, _HIP, _KNEE, 46)
    capsule(near, _KNEE, _ANKLE, 27)
    capsule(near, _ANKLE, _TOE, 16)
    return near.astype(bool), far.astype(bool)


def _draw_bike(base: np.ndarray) -> None:
    tube = (150, 138, 124)   # gris froid (BGR)
    dark = (90, 82, 74)
    for center in (_WHEEL_F, _WHEEL_R):
        cv2.circle(base, center, _WHEEL_RADIUS, dark, 9, cv2.LINE_AA)
        cv2.circle(base, center, _WHEEL_RADIUS, tube, 3, cv2.LINE_AA)
        cv2.circle(base, center, 10, tube, -1, cv2.LINE_AA)
    frame_lines = [
        (_BB, (600, 250)),            # tube de selle
        (_BB, (330, 262)),            # tube diagonal
        ((588, 254), (332, 252)),     # tube horizontal
        (_BB, _WHEEL_R),              # base arrière
        (_WHEEL_R, (594, 258)),       # hauban
        ((326, 268), _WHEEL_F),       # fourche
        ((572, 250), (626, 250)),     # selle
        ((322, 258), (268, 276)),     # cintre plongeant
    ]
    for a, b in frame_lines:
        cv2.line(base, a, b, tube, 6, cv2.LINE_AA)
    cv2.circle(base, _BB, 9, dark, -1, cv2.LINE_AA)
    cv2.line(base, _BB, (460, 438), dark, 5, cv2.LINE_AA)   # manivelle


def generic_cyclist_scene() -> tuple[np.ndarray, np.ndarray]:
    """Retourne (image BGR uint8, silhouette bool) du cycliste générique.

    L'image est déjà stylisée « soufflerie » (fond sombre, cycliste orange
    volumique) : le rendu doit être appelé sans assombrissement ni teinte
    (cf. paramètres dim/tint_person de render_tunnel_frame).
    """
    near, far = _rider_masks()
    mask = near | far

    # Fond : dégradé vertical bleu nuit, puis ombre portée au sol.
    t = np.linspace(0.0, 1.0, _H, dtype=np.float32)[:, None, None]
    top = np.array([56, 44, 34], dtype=np.float32)    # BGR
    bottom = np.array([20, 15, 12], dtype=np.float32)
    base = (top * (1 - t) + bottom * t).repeat(_W, axis=1)
    base = base.astype(np.uint8)
    cv2.ellipse(base, (480, 478), (340, 24), 0, 0, 360, (12, 10, 9), -1,
                cv2.LINE_AA)

    _draw_bike(base)

    # Cycliste : ombrage par distance au bord (centre clair, bords sombres).
    dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 5)
    depth = (dist / max(float(dist.max()), 1.0)) ** 0.55
    shade = np.empty((_H, _W, 3), dtype=np.float32)
    shade[..., 0] = 25 + 60 * depth     # B
    shade[..., 1] = 60 + 150 * depth    # G
    shade[..., 2] = 165 + 90 * depth    # R → orange lumineux au cœur
    base[mask] = shade[mask].astype(np.uint8)

    # Jambe opposée assombrie : indice de profondeur.
    far_only = far & ~near
    base[far_only] = (base[far_only] * 0.55).astype(np.uint8)
    return base, mask
