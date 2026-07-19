"""Tests du lissage EMA des landmarks."""

import numpy as np

from draft.analysis.filters import LandmarkSmoother


def test_premiere_valeur_inchangee():
    s = LandmarkSmoother(alpha=0.4)
    out = s.update({"knee": np.array([100.0, 200.0])})
    assert np.allclose(out["knee"], [100.0, 200.0])


def test_convergence_vers_valeur_constante():
    s = LandmarkSmoother(alpha=0.4)
    s.update({"knee": np.array([0.0, 0.0])})
    for _ in range(50):
        out = s.update({"knee": np.array([100.0, 100.0])})
    assert np.allclose(out["knee"], [100.0, 100.0], atol=0.01)


def test_amortit_le_bruit():
    # Un signal bruité autour de 100 doit ressortir plus stable qu'en entrée.
    rng = np.random.default_rng(42)
    s = LandmarkSmoother(alpha=0.3)
    raw, smooth = [], []
    for _ in range(200):
        v = 100.0 + rng.normal(0, 5)
        raw.append(v)
        smooth.append(s.update({"p": np.array([v, 0.0])})["p"][0])
    assert np.std(smooth[50:]) < 0.6 * np.std(raw[50:])


def test_reapparition_apres_longue_absence_repart_de_zero():
    s = LandmarkSmoother(alpha=0.4, max_gap=3)
    s.update({"p": np.array([0.0, 0.0])})
    for _ in range(5):  # le point disparaît 5 frames (> max_gap)
        s.update({})
    out = s.update({"p": np.array([500.0, 500.0])})
    # Pas de « téléportation » lissée depuis la vieille position : reset net.
    assert np.allclose(out["p"], [500.0, 500.0])
