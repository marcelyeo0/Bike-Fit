/**
 * ranges.js — portage web de `src/core/ranges.py` (branche main).
 *
 * Le logiciel calcule les plages cibles à partir du questionnaire, via un
 * appel au modèle Gemini, et retombe sur des plages standard si l'appel
 * échoue (pas de réseau, pas de clé). Le site ne fait aucun appel : il
 * expose les mêmes données pour expliquer et démontrer le flux.
 */

import { angleRange } from "./angles";

/**
 * Plages de SECOURS du logiciel, utilisées hors ligne. Ce sont les seules
 * valeurs d'angles qu'on peut afficher comme « standard » : les plages
 * réelles d'une séance sont personnalisées par profil.
 */
export const DEFAULT_RANGES = {
  knee: angleRange(140, 150),
  hip: angleRange(45, 60),
  elbow: angleRange(150, 165),
  shoulder: angleRange(85, 100),
};

/** Les six questions du questionnaire, dans l'ordre de `SetupWindow`. */
export const PROFILE_QUESTIONS = [
  {
    label: "Ton vélo",
    values: ["Route", "Gravel", "VTT", "Ville"],
    value: "Route",
    why: "base des plages",
  },
  {
    label: "Position recherchée",
    values: ["Confort", "Mixte", "Aéro"],
    value: "Mixte",
    why: "aéro ferme la hanche, confort la rouvre",
  },
  {
    label: "Souplesse",
    values: ["Faible", "Moyenne", "Bonne"],
    value: "Moyenne",
    why: "ouverture de hanche réellement atteignable",
  },
  {
    label: "Niveau de pratique",
    values: ["Débutant", "Intermédiaire", "Confirmé"],
    value: "Intermédiaire",
    why: "tolérance à une position engagée",
  },
  {
    label: "Volume hebdomadaire",
    values: ["< 3 h", "3-6 h", "> 6 h"],
    value: "3-6 h",
    why: "tolérance à une position engagée",
  },
  {
    label: "Tranche d'âge",
    values: ["< 30 ans", "30-50 ans", "> 50 ans"],
    value: "30-50 ans",
    why: "biais confort",
  },
];

/** Les quatre étapes du logiciel, de l'accueil au bilan. */
export const FLOW_STEPS = [
  {
    key: "profil",
    title: "Le profil",
    lead: "Six réponses et une zone de remarques.",
    body:
      "Vélo, position visée, souplesse, niveau, volume, âge. Les douleurs déjà connues se notent en clair, elles pèsent sur le calcul.",
  },
  {
    key: "plages",
    title: "Les plages cibles",
    lead: "Une fourchette par articulation, pas un seuil unique.",
    body:
      "Le profil part au modèle, qui renvoie les quatre fourchettes et les huit conseils de réglage. Sans réseau, le logiciel bascule sur les plages standard et le dit à l'écran.",
  },
  {
    key: "analyse",
    title: "L'analyse",
    lead: "Vidéo à pleine cadence, chiffres à 4 Hz.",
    body:
      "MediaPipe suit le squelette de profil, les quatre angles se comparent à leur fourchette en direct, et l'écart devient un conseil de réglage pendant que le client pédale.",
  },
  {
    key: "bilan",
    title: "Le bilan",
    lead: "Un compte rendu à commenter avec le client.",
    body:
      "En fin de séance, les valeurs jugées et les écarts se rassemblent en un bilan personnalisé par le commentaire de départ.",
  },
];
