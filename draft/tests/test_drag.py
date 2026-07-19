"""Tests du score de traînée relatif."""

import numpy as np
import cv2
import pytest

from draft.windtunnel.drag import compare_drag, drag_score


def _rider_mask(height_px: int, h=400, w=600) -> np.ndarray:
    """Silhouette rectangulaire de hauteur donnée (posture plus ou moins
    redressée), même largeur : seule la hauteur varie."""
    mask = np.zeros((h, w), dtype=bool)
    mask[h - height_px:h, 150:450] = True
    return mask


def test_posture_haute_traine_plus():
    upright = drag_score(_rider_mask(300))   # buste redressé
    tucked = drag_score(_rider_mask(180))    # position plongeante
    assert upright.score > tucked.score


def test_masque_vide_leve_une_erreur():
    with pytest.raises(ValueError):
        drag_score(np.zeros((100, 100), dtype=bool))


def test_comparaison_b_meilleure():
    a = drag_score(_rider_mask(300))
    b = drag_score(_rider_mask(180))
    assert "MOINS" in compare_drag(a, b)


def test_comparaison_b_moins_bonne():
    a = drag_score(_rider_mask(180))
    b = drag_score(_rider_mask(300))
    assert "PLUS" in compare_drag(a, b)


def test_comparaison_equivalente():
    a = drag_score(_rider_mask(200))
    b = drag_score(_rider_mask(201))
    assert "équivalentes" in compare_drag(a, b)


def test_score_stable_pour_meme_posture():
    assert drag_score(_rider_mask(250)) == drag_score(_rider_mask(250))
