"""Moteur de recommandations : angles mesurés → conseils chiffrés.

Approche « règles expertes » (niveau 0 du GUIDE_PROJET) : chaque règle
compare une mesure à la fourchette du mode et convertit l'écart en réglage
mécanique concret.

Conversion écart d'angle → réglage, ordres de grandeur de la littérature :
- Selle (hauteur) : ~3,5 mm par degré d'angle de genou. Un écart de 1° de
  flexion correspond à 3–5 mm de hauteur de selle pour un adulte (dérivé
  géométriquement d'une longueur de jambe ~85 cm ; cohérent avec la règle
  de terrain « 5 mm par degré » citée par Bini & Hume).
- Cintre (hauteur) : ~8 mm par degré d'angle de tronc (bras de levier
  d'un buste ~60 cm : sin(1°) × 600 mm ≈ 10 mm, arrondi prudent).
Ces valeurs sont des ORDRES DE GRANDEUR : sans calibration pixel→mm de la
scène, on affiche des fourchettes arrondies au ½ cm, jamais au mm près.
"""

from __future__ import annotations

from dataclasses import dataclass

from analysis.thresholds import MODES, MODE_LABELS

MM_PER_DEG_SADDLE = 3.5
MM_PER_DEG_HANDLEBAR = 8.0


@dataclass(frozen=True)
class Recommendation:
    metric: str      # métrique concernée ("knee_bottom", "trunk", ...)
    severity: str    # "ok" | "warn"
    message: str     # phrase en français, chiffrée


def _round_mm(mm: float) -> int:
    """Arrondit au multiple de 5 mm (≥ 5) : la précision réelle du système."""
    return max(5, int(round(mm / 5.0)) * 5)


def _fmt(value: float) -> str:
    return f"{value:.0f}°"


def evaluate(measures: dict[str, float], mode: str) -> list[Recommendation]:
    """Compare les mesures aux cibles du mode et produit les conseils.

    `measures` : dict partiel métrique -> valeur moyenne (cf. SessionRecorder).
    Les règles sont ordonnées : la hauteur de selle (genou en bas de course)
    prime, car elle influence toutes les autres mesures.
    """
    if mode not in MODES:
        raise ValueError(f"Mode inconnu : {mode!r} (attendu : {list(MODES)})")
    targets = MODES[mode]
    recos: list[Recommendation] = []

    def check(metric: str, too_low: str, too_high: str | None,
              mm_per_deg: float | None) -> None:
        if metric not in measures or metric not in targets:
            return
        value, rng = measures[metric], targets[metric]
        if rng.contains(value):
            return
        if value < rng.lo:
            delta = rng.lo - value
            template = too_low
        else:
            if too_high is None:
                return
            delta = value - rng.hi
            template = too_high
        mm = _round_mm(delta * mm_per_deg) if mm_per_deg else 0
        recos.append(Recommendation(
            metric=metric, severity="warn",
            message=template.format(
                val=_fmt(value), lo=_fmt(rng.lo), hi=_fmt(rng.hi), mm=mm),
        ))

    # 1. Hauteur de selle — angle du genou au point mort bas.
    #    Angle intérieur trop GRAND = jambe trop tendue = selle trop haute.
    check(
        "knee_bottom",
        too_low=("Genou trop fléchi en bas de course ({val}, cible {lo}–{hi}) : "
                 "monter la selle d'environ {mm} mm."),
        too_high=("Genou trop tendu en bas de course ({val}, cible {lo}–{hi}) : "
                  "descendre la selle d'environ {mm} mm."),
        mm_per_deg=MM_PER_DEG_SADDLE,
    )

    # 2. Genou au point mort haut — trop fermé = selle basse et/ou trop avancée.
    #    On ne la signale que si la règle n°1 n'a pas déjà demandé de monter
    #    la selle (même remède, éviter le doublon contradictoire).
    saddle_already_up = any(r.metric == "knee_bottom" and "monter" in r.message
                            for r in recos)
    if not saddle_already_up:
        check(
            "knee_top",
            too_low=("Genou trop fermé en haut de course ({val}, cible {lo}–{hi}) : "
                     "monter la selle d'environ {mm} mm ou vérifier la longueur "
                     "des manivelles."),
            too_high=None,  # un genou « pas assez fermé » en haut n'est pas un défaut
            mm_per_deg=MM_PER_DEG_SADDLE,
        )

    # 3. Inclinaison du tronc — hauteur du poste de pilotage.
    check(
        "trunk",
        too_low=("Dos trop plongeant ({val}, cible {lo}–{hi}) : relever le cintre "
                 "d'environ {mm} mm (ajouter des entretoises)."),
        too_high=("Dos trop redressé pour ce mode ({val}, cible {lo}–{hi}) : "
                  "baisser le cintre d'environ {mm} mm (retirer des entretoises)."),
        mm_per_deg=MM_PER_DEG_HANDLEBAR,
    )

    # 4. Coude — amorti et allonge.
    check(
        "elbow",
        too_low=("Coudes trop fléchis ({val}, cible {lo}–{hi}) : allonger la "
                 "potence d'environ 10 mm ou reculer légèrement la selle."),
        too_high=("Bras trop tendus ({val}, cible {lo}–{hi}) : fléchir les coudes ; "
                  "si la position est inconfortable, raccourcir la potence "
                  "d'environ 10 mm."),
        mm_per_deg=None,  # le remède est discret (taille de potence), pas linéaire
    )

    # 5. Ouverture de hanche au point mort haut.
    check(
        "hip_top",
        too_low=("Hanche trop fermée en haut de course ({val}, minimum {lo}) : "
                 "reculer la selle d'environ 5 mm ou relever le cintre."),
        too_high=None,
        mm_per_deg=None,
    )

    if not recos:
        recos.append(Recommendation(
            metric="all", severity="ok",
            message=(f"Posture conforme aux cibles du mode "
                     f"{MODE_LABELS[mode]} — aucun réglage nécessaire."),
        ))
    return recos
