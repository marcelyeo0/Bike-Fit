"""Lissage temporel des landmarks.

Les points de pose « tremblent » d'une frame à l'autre (bruit du modèle).
Sans lissage, les angles affichés sautent de ±3° et les recommandations
clignotent. On utilise une moyenne mobile exponentielle (EMA) :

    lissé(t) = α · brut(t) + (1 − α) · lissé(t−1)

Choix de l'EMA plutôt qu'une moyenne glissante sur N frames : mémoire O(1),
pas de latence de N/2 frames, un seul paramètre α à régler. Le filtre
One-Euro (adaptatif) serait la version raffinée si l'EMA introduit trop de
retard sur les mouvements rapides — écarté pour l'instant, cf. notes.md.
"""

from __future__ import annotations

import numpy as np


class LandmarkSmoother:
    """EMA appliquée indépendamment à chaque landmark (x, y).

    alpha ∈ ]0, 1] : 1 = aucun lissage, 0.1 = très lissé mais traînant.
    0.4 est un bon compromis à 30 fps (mesuré à l'usage, ajustable).

    Si un landmark disparaît (occlusion) puis réapparaît, son historique
    est oublié au-delà de `max_gap` frames pour éviter de « téléporter »
    le point depuis une vieille position.
    """

    def __init__(self, alpha: float = 0.4, max_gap: int = 15):
        if not 0.0 < alpha <= 1.0:
            raise ValueError("alpha doit être dans ]0, 1]")
        self.alpha = alpha
        self.max_gap = max_gap
        self._state: dict[str, np.ndarray] = {}
        self._missing: dict[str, int] = {}

    def update(self, landmarks: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
        """Retourne une copie lissée du dict de landmarks."""
        smoothed: dict[str, np.ndarray] = {}
        for name, pos in landmarks.items():
            pos = np.asarray(pos, dtype=np.float64)
            prev = self._state.get(name)
            if prev is None or self._missing.get(name, 0) > self.max_gap:
                self._state[name] = pos.copy()
            else:
                self._state[name] = self.alpha * pos + (1 - self.alpha) * prev
            self._missing[name] = 0
            smoothed[name] = self._state[name].copy()

        # Compte les frames d'absence des landmarks non vus cette fois-ci.
        for name in self._state:
            if name not in landmarks:
                self._missing[name] = self._missing.get(name, 0) + 1
        return smoothed

    def reset(self) -> None:
        self._state.clear()
        self._missing.clear()
