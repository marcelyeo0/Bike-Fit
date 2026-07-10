"""Module windtunnel : soufflerie virtuelle (Phase 2).

Simulation VISUELLE et PÉDAGOGIQUE, pas un CFD : écoulement potentiel 2D
autour de la silhouette (plausible, < 1 s de calcul) et score de traînée
RELATIF fondé sur la géométrie de la silhouette. Justification complète du
cadrage (vs OpenFOAM) dans le README.

Comme analysis/, ce module est de la logique pure (NumPy + OpenCV pour la
morphologie) : aucune dépendance à Qt, testable sans interface.
"""

from windtunnel.silhouette import clean_mask
from windtunnel.flow import FlowField, solve_flow
from windtunnel.drag import DragResult, compare_drag, drag_score
from windtunnel.render import ParticleField, render_tunnel_frame

__all__ = [
    "clean_mask", "FlowField", "solve_flow",
    "DragResult", "compare_drag", "drag_score",
    "ParticleField", "render_tunnel_frame",
]
