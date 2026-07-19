"""Score de traînée relatif à partir de la silhouette.

## Le raisonnement physique
Traînée aéro = ½ · ρ · CdA · v². À vitesse donnée, seul CdA (coefficient
de forme × aire frontale) distingue deux postures. De profil, on ne voit
pas l'aire frontale — mais ses deux déterminants posturaux, si :
- la HAUTEUR de la silhouette (un dos redressé expose plus de torse au
  vent : c'est le levier n°1 d'une position aéro) ;
- l'ALLONGEMENT (une silhouette compacte et étirée vers l'avant est mieux
  profilée qu'une silhouette haute et courte).

Le score combine ces deux ratios géométriques. Il est RELATIF : comparer
la position A et la position B du même cycliste sur la même caméra est
fiable ; le chiffre absolu ne vaut rien en Newtons et ne doit jamais être
présenté autrement que comme un indice.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# Poids des deux composantes, et échelle pour un score lisible (~200-450,
# du même ordre que la maquette). Valeurs choisies pour que ~5 cm de
# baisse du buste fassent bouger le score de façon visible.
_W_HEIGHT = 0.65
_W_STOCKINESS = 0.35
_SCALE = 600.0


@dataclass(frozen=True)
class DragResult:
    score: int              # indice de traînée (plus bas = mieux)
    height_ratio: float     # hauteur silhouette / hauteur image
    stockiness: float       # hauteur / largeur de la boîte englobante


def drag_score(mask: np.ndarray) -> DragResult:
    """Calcule l'indice de traînée d'une silhouette (masque bool)."""
    rows = np.flatnonzero(mask.any(axis=1))
    cols = np.flatnonzero(mask.any(axis=0))
    if rows.size == 0 or cols.size == 0:
        raise ValueError("Masque vide : pas de silhouette à évaluer.")

    bbox_h = float(rows[-1] - rows[0] + 1)
    bbox_w = float(cols[-1] - cols[0] + 1)
    height_ratio = bbox_h / mask.shape[0]
    stockiness = min(bbox_h / bbox_w, 2.0) / 2.0  # normalisé [0, 1]

    score = _SCALE * (_W_HEIGHT * height_ratio + _W_STOCKINESS * stockiness)
    return DragResult(score=int(round(score)), height_ratio=height_ratio,
                      stockiness=stockiness)


def compare_drag(a: DragResult, b: DragResult) -> str:
    """Phrase comparative A vs B (l'usage prévu du score)."""
    if a.score == 0:
        return "Comparaison impossible (position A vide)."
    delta = (b.score - a.score) / a.score * 100.0
    if abs(delta) < 2.0:
        return "Positions A et B équivalentes en traînée (écart < 2 %)."
    if delta < 0:
        return (f"Position B : environ {abs(delta):.0f} % de traînée en MOINS "
                f"que la position A.")
    return (f"Position B : environ {delta:.0f} % de traînée en PLUS "
            f"que la position A.")
