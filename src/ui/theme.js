/**
 * theme.js — miroir JavaScript de `src/GUI/theme.py` (branche main).
 *
 * Tailwind porte déjà les couleurs (voir tailwind.config.js) ; ce module
 * existe pour le code qui a besoin des valeurs en JavaScript : couleurs
 * interpolées par GSAP, seuils d'hystérésis, cadence de rafraîchissement.
 * Une seule source de vérité, jamais de hex recopié dans un composant.
 */

export const COLORS = {
  bg: "#FAFAFA",
  card: "#FFFFFF",
  dark: "#18181B",
  dark2: "#27272A",
  rule: "#E4E4E7",
  accent: "#3572D6",
  accentHover: "#2C5FB4",
  stateIn: "#2FA35C",
  stateOut: "#D05353",
  stateNone: "#A1A1AA",
  ink: "#1B1B1F",
  inkSoft: "#71717A",
  inkOnDark: "#FAFAFA",
  inkSoftOnDark: "#A1A1AA",
};

/**
 * Règle des 4 Hz : les textes qui suivent la mesure se rafraîchissent quatre
 * fois par seconde, la vidéo reste à pleine cadence. Un chiffre qui tremble
 * à 60 Hz est illisible.
 */
export const REFRESH_MS = 250;

/**
 * Règle anti-clignotement : l'état vert/rouge ne bascule qu'après 12 frames
 * consécutives identiques (~0,4 s). L'angle frôle ses bornes à chaque coup
 * de pédale, la couleur ne doit pas clignoter.
 */
export const HYSTERESIS_FRAMES = 12;

/** Rayons : pilule pour les actions, 16 px pour les surfaces, 10 px champs. */
export const RADIUS = { surface: 16, field: 10, button: 24 };
