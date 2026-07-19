"""Rapport de fin de session : mesures moyennes + verdict par métrique.

Logique pure (chaînes de caractères) — séparée de l'UI pour être testable
et réutilisable (affichage écran aujourd'hui, export PDF plus tard).
"""

from __future__ import annotations

from draft.analysis.recommender import evaluate
from draft.analysis.thresholds import MODES, MODE_LABELS

_METRIC_LABELS: dict[str, str] = {
    "knee_bottom": "Genou en bas de course",
    "knee_top": "Genou en haut de course",
    "hip_top": "Hanche en haut de course",
    "trunk": "Inclinaison du dos",
    "elbow": "Coude",
}

# En dessous de ce nombre de cycles, les moyennes ne sont pas fiables.
MIN_CYCLES = 5


def build_report(summary: dict[str, float], cycles: int, mode: str) -> str:
    """Construit le rapport texte de fin de session."""
    lines = [f"Rapport d'analyse — mode {MODE_LABELS[mode]}",
             f"Cycles de pédalage analysés : {cycles}", ""]

    if cycles == 0:
        lines.append("Aucun cycle de pédalage détecté : vérifiez que le "
                      "cycliste pédale et que la caméra le filme de profil.")
        return "\n".join(lines)
    if cycles < MIN_CYCLES:
        lines.append(f"⚠ Session courte (moins de {MIN_CYCLES} cycles) : "
                      "résultats indicatifs seulement.\n")

    targets = MODES[mode]
    lines.append("Mesures moyennes :")
    for metric, label in _METRIC_LABELS.items():
        if metric not in summary:
            continue
        value = summary[metric]
        rng = targets.get(metric)
        target_txt = f" (cible {rng.lo:.0f}–{rng.hi:.0f}°)" if rng and rng.hi < 180 \
            else f" (minimum {rng.lo:.0f}°)" if rng else ""
        status = "✓" if rng and rng.contains(value) else "✗"
        lines.append(f"  {status} {label} : {value:.1f}°{target_txt}")

    lines.append("")
    lines.append("Recommandations :")
    for reco in evaluate(summary, mode):
        lines.append(f"  • {reco.message}")

    lines.append("")
    lines.append("Ces conseils sont une aide à l'orientation, pas un "
                 "diagnostic médical.")
    return "\n".join(lines)
