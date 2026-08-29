/**
 * feedback.js — portage web de `src/core/feedback.py` (branche main).
 *
 * Les conseils affichés sur le site sont ceux du logiciel : chaque écart
 * d'angle se traduit en un constat postural PUIS en une action de réglage
 * chiffrée. Le constat seul laisse le cycliste démuni, l'action seule sort
 * de nulle part.
 *
 * Copie fidèle des textes de `DIAGNOSTICS`, reponctuée pour le web
 * (le tiret cadratin du fichier Python devient un point ou deux-points).
 */

/** Noms lisibles des articulations mesurées. */
export const JOINT_LABELS = {
  knee: "Genou",
  hip: "Hanche",
  elbow: "Coude",
  shoulder: "Épaule",
};

/**
 * Conseil de réglage vélo par (articulation, direction d'écart).
 * "high" = au-dessus de la plage cible, "low" = en dessous.
 * Version STANDARD, celle qui sert de repli quand l'IA n'a pas généré de
 * conseils personnalisés au moment du questionnaire.
 */
export const DIAGNOSTICS = {
  knee: {
    high: {
      constat:
        "Extension du genou trop grande, jambe presque tendue en bas de pédale.",
      action:
        "Selle sans doute trop haute : abaisse-la d'environ 3 mm par degré d'écart.",
    },
    low: {
      constat: "Genou trop fléchi au point mort bas.",
      action:
        "Selle sans doute trop basse : remonte-la d'environ 3 mm par degré d'écart.",
    },
  },
  hip: {
    high: {
      constat: "Hanche très ouverte, buste redressé, position plus droite que la cible.",
      action: "Recule la selle de 5 mm ou allonge le cockpit.",
    },
    low: {
      constat:
        "Hanche très fermée, buste plongeant : position agressive, tension possible en bas du dos.",
      action: "Avance la selle de 5 mm ou remonte le cintre.",
    },
  },
  elbow: {
    high: {
      constat: "Bras quasi tendus, coudes verrouillés, cockpit probablement trop long.",
      action: "Raccourcis la potence de 10 mm ou recule légèrement les mains.",
    },
    low: {
      constat: "Bras très pliés, cockpit probablement trop court.",
      action: "Allonge la potence de 10 mm.",
    },
  },
  shoulder: {
    high: {
      constat: "Épaules très ouvertes, grande allonge : le poste de pilotage est loin.",
      action: "Potence plus courte ou plus haute.",
    },
    low: {
      constat: "Épaules fermées, buste peu incliné, allonge insuffisante.",
      action: "Abaisse le cintre ou allonge la potence.",
    },
  },
};

/**
 * Compare une valeur à sa plage et renvoie le constat affichable.
 * Renvoie `null` quand l'angle est dans la plage : le logiciel n'a alors
 * rien à corriger, et le site ne doit rien inventer.
 */
export function diagnose(joint, value, range) {
  const direction = range.direction(value);
  if (!direction) return null;
  const bound = direction === "high" ? range.maxDeg : range.minDeg;
  return {
    joint,
    direction,
    delta: Math.round((value - bound) * 10) / 10,
    ...DIAGNOSTICS[joint][direction],
  };
}

/** Phrase affichée dans la carte « conseils en direct » quand tout est bon. */
export const ALL_IN_RANGE = "Position dans les plages cibles. Continue comme ça.";

/** Mention légale obligatoire, reprise telle quelle de l'écran de bilan. */
export const LEGAL_NOTICE =
  "Orientation posturale à titre indicatif. Ne remplace pas un avis médical.";
