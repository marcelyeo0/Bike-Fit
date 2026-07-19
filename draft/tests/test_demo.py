"""Tests de la scène de démonstration (cycliste générique)."""

import numpy as np

from draft.windtunnel.demo import generic_cyclist_scene
from draft.windtunnel.drag import drag_score
from draft.windtunnel.flow import solve_flow


def test_scene_formats():
    base, mask = generic_cyclist_scene()
    assert base.shape == (540, 960, 3) and base.dtype == np.uint8
    assert mask.shape == (540, 960) and mask.dtype == bool


def test_silhouette_plausible():
    _, mask = generic_cyclist_scene()
    # Assez grande pour être exploitable, sans envahir toute l'image.
    assert 10_000 < mask.sum() < 0.4 * mask.size
    # Le score de traînée se calcule sans erreur et reste dans la plage
    # attendue d'une position aéro (indice ~200-350).
    assert 150 < drag_score(mask).score < 400


def test_scene_deterministe():
    base1, mask1 = generic_cyclist_scene()
    base2, mask2 = generic_cyclist_scene()
    assert np.array_equal(base1, base2)
    assert np.array_equal(mask1, mask2)


def test_flux_soluble_sur_la_demo():
    _, mask = generic_cyclist_scene()
    flow = solve_flow(mask, grid_width=100, iterations=200)
    assert np.all(flow.speed[flow.obstacle] == 0.0)
    assert flow.speed.max() > 1.0  # le flux accélère bien autour du corps
