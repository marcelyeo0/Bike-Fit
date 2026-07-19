"""Rendu de la soufflerie : lignes de courant, particules, zones de traînée.

Trois couches composées sur la frame vidéo (style maquette assets/) :
1. fond assombri + cycliste teinté orange (lisibilité du sujet) ;
2. zones de traînée en rouge translucide (heuristique wake_mask) ;
3. lignes de courant bleues (iso-niveaux de ψ) + particules animées.

Les iso-lignes de ψ sont extraites avec cv2.findContours sur des seuils
successifs : pas de matplotlib (dépendance lourde et lente à empaqueter).
"""

from __future__ import annotations

import numpy as np
import cv2

from draft.windtunnel.flow import FlowField, wake_mask


class ParticleField:
    """Particules advectées par le champ de vitesse (les « filets d'air »).

    Positions en coordonnées de grille (x, y flottants). À chaque pas :
    position += vitesse·dt, avec ré-injection sur le bord gauche quand une
    particule sort du domaine ou s'immobilise contre le corps.
    """

    def __init__(self, flow: FlowField, count: int = 350, seed: int = 0):
        self._flow = flow
        self._rng = np.random.default_rng(seed)
        gh, gw = flow.psi.shape
        self._pos = np.column_stack([
            self._rng.uniform(0, gw - 1, count),
            self._rng.uniform(1, gh - 2, count),
        ])
        self._prev = self._pos.copy()

    def step(self, dt: float = 1.4) -> None:
        gh, gw = self._flow.psi.shape
        ix = np.clip(self._pos[:, 0].astype(int), 0, gw - 1)
        iy = np.clip(self._pos[:, 1].astype(int), 0, gh - 1)
        self._prev = self._pos.copy()
        self._pos[:, 0] += self._flow.u[iy, ix] * dt
        self._pos[:, 1] += self._flow.v[iy, ix] * dt

        # Ré-injection : sortie du domaine ou particule « collée » au corps.
        speed = self._flow.speed[iy, ix]
        out = ((self._pos[:, 0] >= gw - 1) | (self._pos[:, 0] < 0)
               | (self._pos[:, 1] < 1) | (self._pos[:, 1] >= gh - 1)
               | (speed < 0.05))
        n_out = int(out.sum())
        if n_out:
            self._pos[out, 0] = 0.0
            self._pos[out, 1] = self._rng.uniform(1, gh - 2, n_out)
            self._prev[out] = self._pos[out]

    def segments(self) -> tuple[np.ndarray, np.ndarray]:
        """Couples (position précédente, position actuelle) en grille."""
        return self._prev, self._pos


def _grid_to_image(points: np.ndarray, flow: FlowField) -> np.ndarray:
    """Coordonnées grille (x, y) → pixels image."""
    img_h, img_w = flow.image_shape
    gh, gw = flow.psi.shape
    scale = np.array([img_w / gw, img_h / gh])
    return points * scale


def _draw_streamlines(canvas: np.ndarray, flow: FlowField,
                      n_lines: int = 18) -> None:
    """Iso-niveaux de ψ = lignes de courant, en dégradé bleu→cyan."""
    gh, gw = flow.psi.shape
    psi_min, psi_max = float(flow.psi.min()), float(flow.psi.max())
    levels = np.linspace(psi_min, psi_max, n_lines + 2)[1:-1]
    margin = 2  # findContours referme les contours le long du cadre :
    #             on ne dessine que les portions intérieures au domaine.
    for i, level in enumerate(levels):
        above = (flow.psi > level).astype(np.uint8)
        contours, _ = cv2.findContours(above, cv2.RETR_LIST,
                                       cv2.CHAIN_APPROX_NONE)
        t = i / max(n_lines - 1, 1)
        color = (255, int(140 + 90 * t), int(40 + 120 * t))  # BGR bleu→cyan
        for contour in contours:
            pts = contour[:, 0, :].astype(np.float64)
            inside = ((pts[:, 0] >= margin) & (pts[:, 0] < gw - margin)
                      & (pts[:, 1] >= margin) & (pts[:, 1] < gh - margin))
            # Découpe le contour en tronçons intérieurs consécutifs.
            boundaries = np.flatnonzero(np.diff(inside.astype(int))) + 1
            for run in np.split(np.arange(len(pts)), boundaries):
                if run.size < 8 or not inside[run[0]]:
                    continue
                seg = _grid_to_image(pts[run], flow)
                cv2.polylines(canvas, [seg.astype(np.int32)], False, color, 1,
                              cv2.LINE_AA)


def render_tunnel_frame(base_bgr: np.ndarray, flow: FlowField,
                        person_mask: np.ndarray,
                        particles: ParticleField | None = None, *,
                        dim: float = 0.35,
                        tint_person: bool = True) -> np.ndarray:
    """Compose l'image de soufflerie complète (retourne une nouvelle image).

    dim / tint_person : sur une frame vidéo, on assombrit le fond et on
    teinte le cycliste en orange. La scène de démo (windtunnel/demo.py)
    est déjà stylisée : elle se rend avec dim=1.0, tint_person=False.
    """
    frame = (base_bgr * dim).astype(np.uint8)

    person = person_mask.astype(bool)
    if tint_person:
        # Cycliste teinté orange (le sujet reste le point focal).
        tint = frame.copy()
        tint[person] = (0.45 * frame[person]
                        + 0.55 * np.array([40, 120, 255])).astype(np.uint8)
        frame = tint

    # Zones de traînée (rouge translucide), remises à l'échelle image.
    wake_small = wake_mask(flow)
    wake = cv2.resize(wake_small.astype(np.uint8),
                      (frame.shape[1], frame.shape[0]),
                      interpolation=cv2.INTER_NEAREST).astype(bool)
    red = frame.copy()
    red[wake] = (0.6 * frame[wake] + 0.4 * np.array([30, 30, 220])).astype(np.uint8)
    frame = red

    # Lignes de courant sur un calque, fondues à 55 %.
    lines_layer = frame.copy()
    _draw_streamlines(lines_layer, flow)
    frame = cv2.addWeighted(lines_layer, 0.55, frame, 0.45, 0)

    # Particules : petits traits brillants dans le sens du flux.
    if particles is not None:
        prev, cur = particles.segments()
        p1 = _grid_to_image(prev, flow).astype(np.int32)
        p2 = _grid_to_image(cur, flow).astype(np.int32)
        for (x1, y1), (x2, y2) in zip(p1, p2):
            cv2.line(frame, (x1, y1), (x2, y2), (255, 235, 190), 1, cv2.LINE_AA)
    return frame
