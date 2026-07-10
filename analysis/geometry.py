"""Géométrie des angles articulaires.

Convention retenue : on mesure l'angle INTÉRIEUR de l'articulation (celui
que montre image.png, ex. genou 134,6°). La littérature bike fitting parle
souvent en « flexion » ; la conversion est flexion = 180° − angle intérieur.
Les seuils de thresholds.py sont exprimés en angle intérieur pour rester
cohérents avec ce qui s'affiche à l'écran.
"""

from __future__ import annotations

import numpy as np


def angle_3pt(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle intérieur en b (degrés, [0, 180]) formé par les segments b→a et b→c.

    Calcul par produit scalaire : cos(θ) = (ba · bc) / (|ba| |bc|).
    """
    ba = np.asarray(a, dtype=np.float64) - np.asarray(b, dtype=np.float64)
    bc = np.asarray(c, dtype=np.float64) - np.asarray(b, dtype=np.float64)
    norm = np.linalg.norm(ba) * np.linalg.norm(bc)
    if norm < 1e-9:  # points confondus : angle indéfini
        return 0.0
    cos_theta = np.clip(np.dot(ba, bc) / norm, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_theta)))


def segment_angle_to_horizontal(p: np.ndarray, q: np.ndarray) -> float:
    """Angle (degrés, [0, 90]) entre le segment p→q et l'horizontale.

    Utilisé pour le dos (hanche→épaule) et le pied (talon→pointe).
    En coordonnées image, l'axe y pointe vers le bas — sans incidence ici
    car on ne retient que l'inclinaison absolue.
    """
    d = np.asarray(q, dtype=np.float64) - np.asarray(p, dtype=np.float64)
    if np.linalg.norm(d) < 1e-9:
        return 0.0
    return float(np.degrees(np.arctan2(abs(d[1]), abs(d[0]))))


def compute_joint_angles(lm: dict[str, np.ndarray]) -> dict[str, float]:
    """Calcule les angles clés disponibles à partir des landmarks (pixels).

    Retourne un dict partiel : un angle n'apparaît que si tous ses points
    sont détectés. Clés : knee, hip, elbow, trunk, foot.
    """
    angles: dict[str, float] = {}
    if all(k in lm for k in ("hip", "knee", "ankle")):
        angles["knee"] = angle_3pt(lm["hip"], lm["knee"], lm["ankle"])
    if all(k in lm for k in ("shoulder", "hip", "knee")):
        angles["hip"] = angle_3pt(lm["shoulder"], lm["hip"], lm["knee"])
    if all(k in lm for k in ("shoulder", "elbow", "wrist")):
        angles["elbow"] = angle_3pt(lm["shoulder"], lm["elbow"], lm["wrist"])
    if all(k in lm for k in ("hip", "shoulder")):
        angles["trunk"] = segment_angle_to_horizontal(lm["hip"], lm["shoulder"])
    if all(k in lm for k in ("heel", "foot")):
        angles["foot"] = segment_angle_to_horizontal(lm["heel"], lm["foot"])
    return angles
