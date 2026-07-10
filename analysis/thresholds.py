"""Seuils d'angles articulaires par mode d'analyse.

Tous les angles sont exprimés en ANGLE INTÉRIEUR (convention de
geometry.py, celle affichée à l'écran), sauf trunk et foot qui sont des
inclinaisons par rapport à l'horizontale.

Sources (détaillées dans GUIDE_PROJET.md et le README) :
- Genou en bas de course : méthode Holmes — 35–40° de flexion visée pour
  la performance, soit 140–145° d'angle intérieur ; plage décalée vers plus
  de flexion (135–140°) en confort, la selle légèrement plus basse
  soulageant l'ischio et le bas du dos.
- Genou en haut de course : ~110–115° de flexion (65–70° intérieur) ;
  au-delà, la hanche se referme trop (Bini & Hume).
- Tronc/horizontale : 40–45° route classique ; plus redressé en confort
  (45–55°), plus plongeant en aéro (30–40°) — position « drops/prolongateurs ».
- Coude : 150–160° (légère flexion pour amortir) ; plus fléchi en aéro.
- Hanche en haut de course : garder > 45° d'ouverture pour ne pas écraser
  la respiration/le pédalage ; tolérance plus basse en aéro, assumée.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Range:
    """Fourchette cible [lo, hi] en degrés."""
    lo: float
    hi: float

    def contains(self, value: float) -> bool:
        return self.lo <= value <= self.hi


# Métriques : knee_bottom / knee_top = angle intérieur du genou aux points
# bas/haut du cycle de pédalage ; hip_top = ouverture de hanche au point
# haut ; trunk et elbow = mesurés en continu.
MODES: dict[str, dict[str, Range]] = {
    "performance": {
        "knee_bottom": Range(140, 145),
        "knee_top": Range(65, 70),
        "trunk": Range(40, 45),
        "elbow": Range(150, 160),
        "hip_top": Range(45, 180),
    },
    "confort": {
        "knee_bottom": Range(135, 140),
        "knee_top": Range(70, 75),
        "trunk": Range(45, 55),
        "elbow": Range(155, 165),
        "hip_top": Range(50, 180),
    },
    "aero": {
        "knee_bottom": Range(140, 145),
        "knee_top": Range(65, 70),
        "trunk": Range(30, 40),
        "elbow": Range(140, 155),
        "hip_top": Range(40, 180),
    },
}

MODE_LABELS: dict[str, str] = {
    "performance": "Performance",
    "confort": "Confort",
    "aero": "Aérodynamisme",
}

MODE_DESCRIPTIONS: dict[str, str] = {
    "performance": "Transfert de puissance optimal — cibles route classiques (Holmes).",
    "confort": "Position relevée, contraintes lombaires et cervicales réduites.",
    "aero": "Position plongeante type contre-la-montre, traînée minimale.",
}
