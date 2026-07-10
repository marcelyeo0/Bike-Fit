"""Tests du calcul d'angles — cas géométriques connus."""

import numpy as np
import pytest

from analysis.geometry import angle_3pt, compute_joint_angles, segment_angle_to_horizontal


def test_angle_droit():
    assert angle_3pt([0, 1], [0, 0], [1, 0]) == pytest.approx(90.0)


def test_angle_plat():
    assert angle_3pt([-1, 0], [0, 0], [1, 0]) == pytest.approx(180.0)


def test_angle_45():
    assert angle_3pt([1, 1], [0, 0], [1, 0]) == pytest.approx(45.0)


def test_angle_invariant_par_translation_et_echelle():
    offset = np.array([37.5, -12.0])
    a, b, c = np.array([0, 1]), np.array([0, 0]), np.array([1, 0])
    assert angle_3pt(a * 100 + offset, b * 100 + offset, c * 100 + offset) \
        == pytest.approx(90.0)


def test_angle_points_confondus():
    # Cas dégénéré : ne doit pas lever d'exception (division par zéro).
    assert angle_3pt([0, 0], [0, 0], [1, 0]) == 0.0


def test_horizontale():
    assert segment_angle_to_horizontal([0, 0], [10, 0]) == pytest.approx(0.0)


def test_verticale():
    assert segment_angle_to_horizontal([0, 0], [0, 10]) == pytest.approx(90.0)


def test_inclinaison_45_independante_du_sens():
    # Peu importe le sens du segment et le repère image (y vers le bas).
    assert segment_angle_to_horizontal([0, 0], [1, 1]) == pytest.approx(45.0)
    assert segment_angle_to_horizontal([1, 1], [0, 0]) == pytest.approx(45.0)
    assert segment_angle_to_horizontal([0, 0], [1, -1]) == pytest.approx(45.0)


def test_compute_joint_angles_partiel():
    # Sans épaule : pas d'angle de coude ni de tronc, mais le genou est là.
    lm = {
        "hip": np.array([0.0, 0.0]),
        "knee": np.array([10.0, 50.0]),
        "ankle": np.array([0.0, 100.0]),
    }
    angles = compute_joint_angles(lm)
    assert "knee" in angles
    assert "elbow" not in angles and "trunk" not in angles


def test_compute_joint_angles_jambe_tendue():
    # Hanche, genou, cheville alignés verticalement : genou à 180°.
    lm = {
        "hip": np.array([0.0, 0.0]),
        "knee": np.array([0.0, 50.0]),
        "ankle": np.array([0.0, 100.0]),
    }
    assert compute_joint_angles(lm)["knee"] == pytest.approx(180.0)
