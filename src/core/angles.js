/**
 * angles.js — portage web de `src/core/angles.py` (branche main).
 *
 * Meme decoupage que l'application : le calcul d'angle et la notion de
 * plage cible vivent ici, sans rien connaitre de React. Les composants
 * d'interface consomment ce module, jamais l'inverse.
 *
 * Rappel bike fitting (identique au bureau) :
 *   genou   : on juge le MAX sur la fenetre (extension au point mort bas)
 *   hanche  : on juge le MIN (angle le plus ferme)
 *   coude / epaule : quasi statiques, on juge la MOYENNE
 */

/** Angle en degres au sommet `vertex`, forme par vertex->a et vertex->b. */
export function computeAngle(a, vertex, b) {
  const rad =
    Math.atan2(a[1] - vertex[1], a[0] - vertex[0]) -
    Math.atan2(b[1] - vertex[1], b[0] - vertex[0]);
  const deg = Math.abs((rad * 180) / Math.PI);
  // Un angle articulaire ne depasse jamais 180 : au-dela c'est le meme
  // angle vu de l'autre cote.
  return deg > 180 ? 360 - deg : deg;
}

/** Definition des angles mesures : nom -> (point_a, sommet, point_b). */
export const JOINT_ANGLES = {
  knee: ["hip", "knee", "ankle"],
  hip: ["shoulder", "hip", "knee"],
  elbow: ["shoulder", "elbow", "wrist"],
  shoulder: ["hip", "shoulder", "elbow"],
};

/** Statistique jugee par articulation (voir docstring du module Python). */
export const JUDGE_STAT = {
  knee: "max",
  hip: "min",
  elbow: "moyenne",
  shoulder: "moyenne",
};

/** Plage cible [min, max] : `contains` decide de la couleur d'etat. */
export function angleRange(minDeg, maxDeg) {
  return {
    minDeg,
    maxDeg,
    contains: (value) => value >= minDeg && value <= maxDeg,
    /** "high" au-dessus, "low" en dessous, null si dans la plage. */
    direction: (value) =>
      value > maxDeg ? "high" : value < minDeg ? "low" : null,
    label: `${minDeg}-${maxDeg}°`,
  };
}

/**
 * Courbe de DEMONSTRATION du genou sur un tour de pedale.
 *
 * Ce n'est pas une mesure : l'application lit l'angle sur la video. Ici on
 * rejoue une extension/flexion plausible pour montrer, sur le site, comment
 * la valeur et la couleur d'etat se comportent pendant un coup de pedale.
 * `phase` va de 0 (haut de course) a 1 (tour complet).
 */
export function demoKneeAngle(phase, amplitude = 1) {
  const FLEX_MIN = 72;   // genou le plus ferme, haut de course
  const EXT_MAX = 146;   // extension au point mort bas
  const middle = (FLEX_MIN + EXT_MAX) / 2;
  const half = ((EXT_MAX - FLEX_MIN) / 2) * amplitude;
  return middle - half * Math.cos(2 * Math.PI * phase);
}
