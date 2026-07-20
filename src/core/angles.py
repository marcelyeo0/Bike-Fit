"""
angles.py — Calcul et suivi des angles articulaires.

Trois briques :
  1. compute_angle()  : l'angle en degrés au sommet d'une articulation (3 points)
  2. AngleRange       : une plage cible [min, max] avec .contains()
  3. AngleTracker     : historique glissant d'un angle → max / min / moyenne

Rappel bike fitting (voir la discussion) :
  - genou  : on juge le MAX sur la fenêtre (extension au point mort bas)
  - hanche : on juge le MIN (l'angle le plus fermé, quand le genou remonte)
  - coude / épaule : quasi statiques → on juge la MOYENNE (lissage anti-bruit)
"""

from collections import deque
from dataclasses import dataclass

import numpy as np


# --------------------------------------------------------------------------- #
# 1. Calcul d'angle
# --------------------------------------------------------------------------- #

def compute_angle(point_a, vertex, point_b) -> float:
    """
    Angle en degrés au sommet `vertex`, formé par les segments
    vertex→point_a et vertex→point_b. Résultat toujours dans [0, 180].

    Exemple : compute_angle(joints["hip"], joints["knee"], joints["ankle"])
    donne l'angle du genou.

    Chaque point est un tuple (x, y) en pixels.
    """
    a = np.asarray(point_a, dtype=float)
    v = np.asarray(vertex, dtype=float)
    b = np.asarray(point_b, dtype=float)

    # Les deux vecteurs qui partent du sommet.
    va = a - v
    vb = b - v

    # Angle de chaque vecteur par rapport à l'horizontale, puis différence.
    # arctan2(y, x) gère les 4 quadrants, contrairement à arctan(y/x).
    angle_rad = np.arctan2(va[1], va[0]) - np.arctan2(vb[1], vb[0])
    angle_deg = abs(np.degrees(angle_rad))

    # Un angle articulaire ne dépasse jamais 180° : au-delà, c'est le même
    # angle vu de l'autre côté.
    if angle_deg > 180.0:
        angle_deg = 360.0 - angle_deg
    return angle_deg


# Définition des angles mesurés : nom → (point_a, sommet, point_b).
# Les noms de points sont ceux du dict renvoyé par PoseDetector.latest().
JOINT_ANGLES = {
    "knee": ("hip", "knee", "ankle"),
    "hip": ("shoulder", "hip", "knee"),
    "elbow": ("shoulder", "elbow", "wrist"),
    "shoulder": ("elbow", "shoulder", "hip"),
}


def compute_all_angles(joints: dict) -> dict:
    """
    Prend le dict d'articulations de PoseDetector.latest()
    et renvoie {"knee": 148.2, "hip": 51.7, "elbow": ..., "shoulder": ...}.
    """
    return {
        name: compute_angle(joints[a], joints[vertex], joints[b])
        for name, (a, vertex, b) in JOINT_ANGLES.items()
    }


# --------------------------------------------------------------------------- #
# 2. Plage cible
# --------------------------------------------------------------------------- #

@dataclass
class AngleRange:
    """Plage d'angles cible pour une articulation, en degrés."""
    min_deg: float
    max_deg: float

    def __post_init__(self):
        # Garde-fou : impossible de créer une plage incohérente.
        if not (0 <= self.min_deg <= self.max_deg <= 180):
            raise ValueError(f"Plage invalide : [{self.min_deg}, {self.max_deg}]")

    def contains(self, angle: float) -> bool:
        return self.min_deg <= angle <= self.max_deg


# --------------------------------------------------------------------------- #
# 3. Suivi dans le temps
# --------------------------------------------------------------------------- #

class AngleTracker:
    """
    Garde les N dernières valeurs d'UN angle (fenêtre glissante) et fournit
    max / min / moyenne.

    Pourquoi une fenêtre glissante ? L'angle du genou oscille à chaque coup
    de pédale (~70° en haut, ~145° en bas). La règle du fitting porte sur
    l'extension MAX au point mort bas → il faut regarder le max récent,
    pas la valeur instantanée. À 30 fps, window=60 ≈ 2 secondes, soit
    2-3 coups de pédale à cadence normale : suffisant pour capturer le max.
    """

    def __init__(self, window: int = 60):
        # deque avec maxlen : quand elle est pleine, ajouter une valeur
        # éjecte automatiquement la plus ancienne. Parfait pour une fenêtre.
        self._values = deque(maxlen=window)

    def add(self, angle: float):
        """À appeler à chaque frame avec la nouvelle mesure."""
        self._values.append(angle)

    @property
    def ready(self) -> bool:
        """False tant qu'on n'a pas assez de mesures pour juger (fenêtre à
        moitié pleine minimum). Évite de colorier en rouge dès la 1re frame."""
        return len(self._values) >= self._values.maxlen // 2

    def max(self) -> float:
        return max(self._values)

    def min(self) -> float:
        return min(self._values)

    def mean(self) -> float:
        return sum(self._values) / len(self._values)


# Pour chaque articulation : quelle statistique comparer à la plage.
# (voir le rappel bike fitting en tête de fichier)
JUDGE_STAT = {
    "knee": "max",
    "hip": "min",
    "elbow": "mean",
    "shoulder": "mean",
}


class SessionAngles:
    """
    Regroupe un AngleTracker par articulation et applique la bonne
    statistique pour chacune. C'est LA classe que la boucle vidéo utilise.

    Utilisation :
        session = SessionAngles(target_ranges)   # dict {"knee": AngleRange, ...}
        ...à chaque frame :
        session.update(joints)                    # joints venant de pose.py
        session.is_ok("knee")                     # True / False / None
        session.judged_value("knee")              # ex : 147.3 (le max fenêtre)
    """

    def __init__(self, target_ranges: dict, window: int = 60):
        self.target_ranges = target_ranges
        self._trackers = {name: AngleTracker(window) for name in JOINT_ANGLES}

    def update(self, joints: dict):
        """Calcule tous les angles de la frame et alimente les trackers."""
        for name, angle in compute_all_angles(joints).items():
            self._trackers[name].add(angle)

    def judged_value(self, name: str):
        """La valeur à comparer à la plage : max, min ou moyenne selon
        l'articulation. None si pas encore assez de données."""
        tracker = self._trackers[name]
        if not tracker.ready:
            return None
        stat = JUDGE_STAT[name]                 # "max", "min" ou "mean"
        return getattr(tracker, stat)()         # équivaut à tracker.max(), etc.

    def is_ok(self, name: str):
        """True si dans la plage, False sinon, None si pas assez de données."""
        value = self.judged_value(name)
        if value is None:
            return None
        return self.target_ranges[name].contains(value)