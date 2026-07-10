"""Nettoyage de la silhouette issue de la segmentation MediaPipe.

Le masque brut est bruité : bords dentelés, petits îlots parasites
(reflets, objets au fond), trous dans le corps (maillot sombre). La
soufflerie a besoin d'un obstacle PLEIN et UNIQUE, sinon les lignes de
flux « fuient » à travers le cycliste.

Pipeline : seuillage → fermeture puis ouverture morphologiques → plus
grande composante connexe → remplissage des trous par flood fill depuis
le bord (tout ce qui n'est pas atteignable depuis l'extérieur est un trou).
"""

from __future__ import annotations

import numpy as np
import cv2


def clean_mask(raw: np.ndarray, threshold: float = 0.5) -> np.ndarray | None:
    """Masque float [0,1] (ou bool) → masque bool propre. None si vide.

    None signale à l'appelant « pas de silhouette exploitable » (personne
    non détectée ou masque réduit à quelques pixels de bruit).
    """
    if raw is None:
        return None
    binary = (np.asarray(raw) > threshold).astype(np.uint8)
    if binary.sum() < 500:  # moins de ~500 px : rien d'exploitable
        return None

    # Fermeture (soude les fissures) puis ouverture (retire les îlots fins).
    kernel7 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    kernel5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel7)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel5)

    # Plus grande composante connexe = le cycliste ; le reste est du bruit.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary)
    if count < 2:
        return None
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    binary = (labels == largest).astype(np.uint8)

    # Remplissage des trous : flood fill du fond depuis le bord (0,0) ;
    # ce que le remplissage n'atteint pas est un trou intérieur.
    filled = binary.copy()
    flood_border = np.zeros((binary.shape[0] + 2, binary.shape[1] + 2), np.uint8)
    cv2.floodFill(filled, flood_border, (0, 0), 1)
    holes = filled == 0
    return (binary | holes).astype(bool)
