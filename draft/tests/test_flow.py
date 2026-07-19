"""Tests du solveur d'écoulement potentiel sur des cas à solution connue."""

import numpy as np
import cv2
import pytest

from draft.windtunnel.flow import solve_flow, wake_mask


def _circle_mask(h=180, w=320, center=(160, 90), radius=35) -> np.ndarray:
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, center, radius, 1, -1)
    return mask.astype(bool)


def test_sans_obstacle_vent_uniforme():
    # Sans obstacle, la solution exacte est le vent incident : u=1, v=0.
    flow = solve_flow(np.zeros((180, 320), dtype=bool), grid_width=120,
                      iterations=200)
    interior = np.s_[2:-2, 2:-2]
    assert np.allclose(flow.u[interior], 1.0, atol=0.02)
    assert np.allclose(flow.v[interior], 0.0, atol=0.02)


def test_vitesse_nulle_dans_l_obstacle():
    flow = solve_flow(_circle_mask(), grid_width=120)
    assert np.all(flow.speed[flow.obstacle] == 0.0)


def test_le_flux_accelere_au_dessus_du_corps():
    # Signature physique du contournement : survitesse au-dessus/en dessous
    # de l'obstacle (>1) et ralentissement devant lui (point d'arrêt, <1).
    flow = solve_flow(_circle_mask(), grid_width=120)
    gh, gw = flow.psi.shape
    cx, cy, r = gw // 2, gh // 2, int(35 / 320 * 120)
    above = flow.speed[max(cy - r - 3, 1), cx]
    front = flow.speed[cy, max(cx - r - 3, 1)]
    assert above > 1.05
    assert front < 0.8


def test_amont_peu_perturbe():
    flow = solve_flow(_circle_mask(), grid_width=120)
    gh = flow.psi.shape[0]
    assert flow.u[gh // 2, 3] == pytest.approx(1.0, abs=0.15)


def test_lignes_de_courant_contournent():
    # ψ est constant sur l'obstacle : aucune iso-ligne ne le traverse
    # (écart-type nul à l'intérieur du corps).
    flow = solve_flow(_circle_mask(), grid_width=120)
    assert float(flow.psi[flow.obstacle].std()) == pytest.approx(0.0, abs=1e-9)


def test_wake_derriere_le_corps_seulement():
    flow = solve_flow(_circle_mask(), grid_width=120)
    wake = wake_mask(flow)
    assert wake.any(), "il doit exister des zones lentes autour du corps"
    x_front = int(np.argmax(flow.obstacle.any(axis=0)))
    assert not wake[:, :x_front].any(), "rien ne doit être marqué en amont"
    assert not (wake & flow.obstacle).any()
