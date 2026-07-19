"""Tests du rendu soufflerie (particules + composition d'image)."""

import numpy as np
import cv2

from draft.windtunnel.flow import solve_flow
from draft.windtunnel.render import ParticleField, render_tunnel_frame


def _setup():
    mask = np.zeros((180, 320), dtype=np.uint8)
    cv2.circle(mask, (160, 90), 35, 1, -1)
    mask = mask.astype(bool)
    flow = solve_flow(mask, grid_width=100, iterations=300)
    return mask, flow


def test_particules_avancent_avec_le_flux():
    # Domaine sans obstacle : u=1 partout. On place les particules loin des
    # bords (pas de ré-injection possible) : toutes doivent aller à droite.
    flow = solve_flow(np.zeros((180, 320), dtype=bool), grid_width=100,
                      iterations=100)
    particles = ParticleField(flow, count=50, seed=1)
    particles._pos[:, 0] = 20.0
    x_before = particles._pos[:, 0].copy()
    for _ in range(3):
        particles.step()
    assert np.all(particles._pos[:, 0] > x_before)


def test_particules_restent_dans_le_domaine():
    _, flow = _setup()
    gh, gw = flow.psi.shape
    particles = ParticleField(flow, count=200, seed=2)
    for _ in range(200):
        particles.step()
    assert np.all(particles._pos[:, 0] >= 0)
    assert np.all(particles._pos[:, 0] < gw)
    assert np.all(particles._pos[:, 1] >= 0)
    assert np.all(particles._pos[:, 1] < gh)


def test_rendu_compose_sans_crash():
    mask, flow = _setup()
    base = np.full((180, 320, 3), 128, dtype=np.uint8)
    particles = ParticleField(flow, count=100)
    particles.step()
    out = render_tunnel_frame(base, flow, mask, particles)
    assert out.shape == base.shape
    assert out.dtype == np.uint8
    # Le fond est assombri, le rendu n'est pas l'image d'entrée.
    assert out.mean() < base.mean()
