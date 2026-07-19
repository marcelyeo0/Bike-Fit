"""Tests du nettoyage de silhouette sur masques synthétiques."""

import numpy as np
import cv2

from draft.windtunnel.silhouette import clean_mask


def _synthetic_mask() -> np.ndarray:
    """« Cycliste » : grande ellipse avec un trou + îlot de bruit isolé."""
    mask = np.zeros((240, 320), dtype=np.float32)
    cv2.ellipse(mask, (160, 120), (60, 90), 0, 0, 360, 1.0, -1)
    cv2.circle(mask, (160, 120), 12, 0.0, -1)     # trou (maillot sombre)
    cv2.circle(mask, (30, 30), 6, 1.0, -1)        # bruit (objet au fond)
    return mask


def test_trou_rempli_et_bruit_supprime():
    cleaned = clean_mask(_synthetic_mask())
    assert cleaned is not None
    assert cleaned[120, 160]          # le trou intérieur est rempli
    assert not cleaned[30, 30]        # l'îlot de bruit a disparu
    assert cleaned[120, 130]          # le corps est conservé


def test_masque_none():
    assert clean_mask(None) is None


def test_masque_quasi_vide():
    mask = np.zeros((240, 320), dtype=np.float32)
    mask[0:5, 0:5] = 1.0  # 25 px : sous le seuil d'exploitabilité
    assert clean_mask(mask) is None


def test_sortie_booleenne_meme_taille():
    cleaned = clean_mask(_synthetic_mask())
    assert cleaned.dtype == bool
    assert cleaned.shape == (240, 320)
