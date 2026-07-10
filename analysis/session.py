"""Détection du cycle de pédalage et agrégation de session.

Pourquoi c'est indispensable : l'angle du genou ne se juge qu'aux points
morts du cycle (extension maximale en bas, flexion maximale en haut).
Mesurer « en continu » n'aurait aucun sens — il faut donc détecter ces
instants sur un signal bruité.

Méthode : on suit la coordonnée verticale de la cheville. Elle oscille de
façon quasi sinusoïdale au rythme du pédalage. Un extremum n'est validé
que lorsque le signal s'en est écarté d'une fraction de l'amplitude du
cycle (hystérésis) : le bruit de ±2 px ne déclenche rien, le vrai
retournement de la pédale si. Alternative écartée : détection de pics par
fenêtre glissante (scipy.signal.find_peaks) — impose une latence d'une
demi-fenêtre et une dépendance de plus ; l'hystérésis est O(1) et réagit
au retournement réel.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class CycleEvent:
    """Un passage au point mort bas ("bottom") ou haut ("top")."""
    kind: str                       # "bottom" | "top"
    angles: dict[str, float]        # angles articulaires à cet instant


class CycleTracker:
    """Détecte les points morts bas/haut via la cheville (y écran).

    En coordonnées image, y augmente vers le BAS : le point mort bas du
    pédalage correspond donc au maximum local de y.

    hysteresis : fraction de l'amplitude du cycle à parcourir en sens
    inverse pour valider un extremum. min_travel_px : garde-fou tant que
    l'amplitude du cycle n'est pas encore connue (premières frames).
    20 px par défaut : le tremblement des landmarks atteint ±10 px alors
    que le débattement vertical réel de la cheville en pédalage dépasse
    100 px dès que le cycliste occupe le cadre.
    """

    def __init__(self, hysteresis: float = 0.25, min_travel_px: float = 20.0):
        self._hysteresis = hysteresis
        self._min_travel = min_travel_px
        self._extreme: float | None = None   # extremum courant candidat
        self._direction: int = 0             # +1 : y croît (descend), -1 : y décroît
        self._amplitude: float | None = None # EMA des amplitudes crête-à-crête
        self._last_extreme_y: float | None = None
        # Amorçage (direction inconnue) : min et max suivis séparément.
        self._boot_min: float = float("inf")
        self._boot_max: float = float("-inf")

    def _threshold(self) -> float:
        if self._amplitude is None:
            return self._min_travel
        return max(self._min_travel, self._hysteresis * self._amplitude)

    def _record_amplitude(self, y: float) -> None:
        if self._last_extreme_y is not None:
            peak_to_peak = abs(y - self._last_extreme_y)
            if self._amplitude is None:
                self._amplitude = peak_to_peak
            else:  # EMA lente : l'amplitude d'un cycle varie peu
                self._amplitude = 0.7 * self._amplitude + 0.3 * peak_to_peak
        self._last_extreme_y = y

    def update(self, ankle_y: float) -> str | None:
        """Avance d'une frame. Retourne "bottom", "top" ou None."""
        if self._extreme is None:
            self._extreme = ankle_y
            return None

        if self._direction == 0:
            # Amorçage : on ne connaît pas encore le sens. On suit min et
            # max depuis le départ ; le premier qui s'éloigne du signal de
            # plus du seuil était un vrai extremum — non émis (le tout
            # premier peut être un artefact de démarrage), mais il fixe la
            # direction et sert de référence d'amplitude.
            self._boot_min = min(self._boot_min, ankle_y)
            self._boot_max = max(self._boot_max, ankle_y)
            threshold = self._threshold()
            if self._boot_max - ankle_y > threshold:
                # Un point bas (max de y écran) vient d'être franchi.
                self._last_extreme_y = self._boot_max
                self._extreme = ankle_y
                self._direction = -1  # le signal remonte : cap sur le point haut
            elif ankle_y - self._boot_min > threshold:
                self._last_extreme_y = self._boot_min
                self._extreme = ankle_y
                self._direction = +1  # le signal descend : cap sur le point bas
            return None

        if self._direction > 0:
            # y croît (pédale descend) : on cherche le point bas.
            if ankle_y > self._extreme:
                self._extreme = ankle_y
            elif self._extreme - ankle_y > self._threshold():
                # Le signal est remonté nettement : le max était le point bas.
                self._record_amplitude(self._extreme)
                self._extreme = ankle_y
                self._direction = -1
                return "bottom"
        else:
            # y décroît (pédale monte) : on cherche le point haut.
            if ankle_y < self._extreme:
                self._extreme = ankle_y
            elif ankle_y - self._extreme > self._threshold():
                self._record_amplitude(self._extreme)
                self._extreme = ankle_y
                self._direction = +1
                return "top"
        return None


@dataclass
class SessionRecorder:
    """Accumule les mesures aux points morts pour le rapport de fin.

    Ne garde que les métriques « événementielles » (genou/hanche aux points
    morts) plus la dernière valeur des métriques continues (dos, coude).
    """

    knee_bottom: list[float] = field(default_factory=list)
    knee_top: list[float] = field(default_factory=list)
    hip_top: list[float] = field(default_factory=list)
    trunk: list[float] = field(default_factory=list)
    elbow: list[float] = field(default_factory=list)

    def record_event(self, event: CycleEvent) -> None:
        if event.kind == "bottom" and "knee" in event.angles:
            self.knee_bottom.append(event.angles["knee"])
        if event.kind == "top":
            if "knee" in event.angles:
                self.knee_top.append(event.angles["knee"])
            if "hip" in event.angles:
                self.hip_top.append(event.angles["hip"])
        # Les métriques continues sont échantillonnées aux mêmes instants :
        # une valeur par demi-cycle suffit largement pour une moyenne.
        if "trunk" in event.angles:
            self.trunk.append(event.angles["trunk"])
        if "elbow" in event.angles:
            self.elbow.append(event.angles["elbow"])

    @property
    def cycles(self) -> int:
        return len(self.knee_bottom)

    def summary(self) -> dict[str, float]:
        """Moyennes par métrique (dict partiel si session trop courte)."""
        out: dict[str, float] = {}
        for name in ("knee_bottom", "knee_top", "hip_top", "trunk", "elbow"):
            values = getattr(self, name)
            if values:
                out[name] = sum(values) / len(values)
        return out
