"""Écoulement potentiel 2D autour de la silhouette.

## La physique, en bref
Pour un fluide incompressible et non visqueux en 2D, on peut décrire tout
l'écoulement par une seule fonction ψ (la « fonction de courant ») :
les lignes de niveau de ψ SONT les lignes de courant, et la vitesse s'en
déduit par u = ∂ψ/∂y, v = −∂ψ/∂x. En l'absence de rotation du fluide,
ψ obéit à l'équation de Laplace ∇²ψ = 0.

Le problème devient alors purement géométrique :
- loin du cycliste, vent uniforme de gauche à droite → ψ = y aux bords ;
- le corps est imperméable → ψ constant sur toute la silhouette
  (aucune ligne de courant ne la traverse).

## La méthode numérique
On résout ∇²ψ = 0 par relaxation : chaque cellule est remplacée par la
moyenne de ses 4 voisines, encore et encore, jusqu'à convergence
(méthode de Gauss-Seidel avec sur-relaxation « red-black » : les cellules
sont mises à jour en damier, ce qui permet de vectoriser en NumPy tout en
convergeant ~2× plus vite que Jacobi).

## Ce que ce modèle ne fait PAS (assumé)
Pas de viscosité → pas de décollement ni de sillage turbulent réels.
C'est LA différence avec un solveur Navier-Stokes (OpenFOAM) : ici on a
un champ plausible et instantané, pas la vraie turbulence. La « zone de
traînée » affichée est une heuristique (cf. wake_mask), pas une solution.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import cv2


@dataclass
class FlowField:
    """Champ résolu sur une grille réduite (gh × gw).

    image_shape garde la taille de l'image d'origine : le rendu remet le
    champ à l'échelle au moment de dessiner.
    """
    psi: np.ndarray        # fonction de courant (gh, gw)
    u: np.ndarray          # vitesse horizontale (1.0 = vent incident)
    v: np.ndarray          # vitesse verticale
    speed: np.ndarray      # |vitesse|
    obstacle: np.ndarray   # bool (gh, gw) — la silhouette sur la grille
    image_shape: tuple[int, int]  # (h, w) de l'image d'origine


def solve_flow(mask: np.ndarray, grid_width: int = 200,
               iterations: int = 600, omega: float = 1.85) -> FlowField:
    """Résout l'écoulement autour du masque bool (taille image pleine).

    grid_width=200 : assez fin pour épouser la silhouette, assez grossier
    pour résoudre en < 1 s. omega : facteur de sur-relaxation (1 = Gauss-
    Seidel pur, ~1.85 = quasi optimal pour cette taille de grille).
    """
    img_h, img_w = mask.shape
    gw = grid_width
    gh = max(2, round(gw * img_h / img_w))
    obstacle = cv2.resize(mask.astype(np.uint8), (gw, gh),
                          interpolation=cv2.INTER_AREA) > 0.5

    # ψ initial = y : vent uniforme partout (c'est aussi la condition aux
    # 4 bords, qui restent figés pendant la relaxation).
    ys = np.arange(gh, dtype=np.float64)
    psi = np.tile(ys[:, None], (1, gw))

    # ψ constant sur le corps : la valeur « neutre » est le y du centroïde,
    # pour que le flux se partage au-dessus/en-dessous du cycliste.
    psi_body = float(ys[obstacle.any(axis=1)].mean()) if obstacle.any() else 0.0
    psi[obstacle] = psi_body

    interior = np.zeros((gh, gw), dtype=bool)
    interior[1:-1, 1:-1] = True
    interior &= ~obstacle
    iy, ix = np.mgrid[0:gh, 0:gw]
    checkerboard = (iy + ix) % 2 == 0

    for _ in range(iterations):
        for parity_mask in (checkerboard, ~checkerboard):
            neighbours = (np.roll(psi, 1, axis=0) + np.roll(psi, -1, axis=0)
                          + np.roll(psi, 1, axis=1) + np.roll(psi, -1, axis=1))
            cells = interior & parity_mask
            psi[cells] += omega * (0.25 * neighbours[cells] - psi[cells])
        # np.roll « enroule » les bords ; les cellules de bord ne sont
        # jamais dans `interior`, donc les conditions limites tiennent.

    u = np.gradient(psi, axis=0)
    v = -np.gradient(psi, axis=1)
    u[obstacle] = 0.0
    v[obstacle] = 0.0
    speed = np.hypot(u, v)
    return FlowField(psi=psi, u=u, v=v, speed=speed, obstacle=obstacle,
                     image_shape=(img_h, img_w))


def wake_mask(flow: FlowField, speed_threshold: float = 0.55) -> np.ndarray:
    """Zones de « traînée » : heuristique, PAS une solution physique.

    L'écoulement potentiel n'ayant pas de sillage, on marque comme zone de
    frottement les cellules lentes (le flux y est écrasé ou contourné)
    situées au niveau ou derrière le corps — visuellement là où un vrai
    sillage se formerait (nuque, dos, arrière du cycliste).
    """
    if not flow.obstacle.any():
        return np.zeros_like(flow.obstacle)
    x_front = int(np.argmax(flow.obstacle.any(axis=0)))  # 1re colonne du corps
    behind = np.zeros_like(flow.obstacle)
    behind[:, x_front:] = True
    slow = flow.speed < speed_threshold
    return slow & behind & ~flow.obstacle
