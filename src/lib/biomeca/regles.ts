import type { MeasurementStatus } from '../../generated/prisma/enums';
import { ARTICULATIONS, type Angles, type Articulation } from './angles';
import {
  statutMesure,
  type CleConseil,
  type Conseils,
  type Plage,
  type Plages,
  type Sens,
} from './plages';

/**
 * Des angles mesures aux consignes de reglage.
 *
 * Une seule implementation, lue par le navigateur (guidage en direct) et par
 * le serveur (enregistrement) : ce que l'ecran affiche et ce que la base
 * garde sortent de la meme fonction.
 *
 * Vocabulaire : reglage, position, fourchette. Aucun terme de soin.
 */

/**
 * Ordre dans lequel un fitter regle un velo : hauteur de selle, recul de
 * selle, puis poste de pilotage. C'est aussi la priorite des consignes.
 */
export const PRIORITE: Articulation[] = ['KNEE', 'HIP', 'SHOULDER', 'ELBOW'];

/** Consignes standard, utilisees quand la source externe n'en fournit pas. */
const CONSEILS_STANDARD: Record<CleConseil, string> = {
  KNEE_haut:
    'Jambe presque tendue en bas de pédalage : selle probablement trop haute. Baisser la selle.',
  KNEE_bas:
    'Genou encore fléchi en bas de pédalage : selle probablement trop basse. Monter la selle.',
  HIP_haut:
    'Hanche très ouverte, buste plus redressé que la fourchette visée. Reculer la selle de 5 mm ou allonger le poste de pilotage.',
  HIP_bas:
    'Hanche très fermée, buste très incliné. Avancer la selle de 5 mm ou relever le cintre.',
  ELBOW_haut:
    'Bras presque tendus : poste de pilotage probablement trop long. Raccourcir la potence de 10 mm.',
  ELBOW_bas:
    'Bras très pliés : poste de pilotage probablement trop court. Allonger la potence de 10 mm.',
  SHOULDER_haut:
    'Épaule très ouverte, grande allonge. Choisir une potence plus courte ou relever le cintre.',
  SHOULDER_bas:
    'Épaule fermée, allonge réduite. Baisser le cintre ou allonger la potence.',
};

/** Part de l'entrejambe attribuee a la cuisse et a la jambe (ordre de grandeur). */
const PART_FEMUR = 0.53;
const PART_TIBIA = 0.47;
/** Sans entrejambe : correction forfaitaire par degre d'ecart. */
const MM_PAR_DEGRE = 2.5;
const CORRECTION_MAX_MM = 30;

function distanceHancheCheville(femur: number, tibia: number, angleDeg: number): number {
  const radians = (angleDeg * Math.PI) / 180;
  return Math.sqrt(femur * femur + tibia * tibia - 2 * femur * tibia * Math.cos(radians));
}

/**
 * Correction de hauteur de selle, en millimetres (toujours positive : le
 * sens est porte par la consigne). C'est une approximation — elle suppose la
 * hanche et la cheville fixes — d'ou le « environ » du message.
 *
 * d(theta) = racine(f² + t² - 2·f·t·cos theta), correction = d(cible) - d(mesure).
 */
export function correctionSelleMm(
  angleMesure: number,
  plage: Plage,
  entrejambeCm: number | null
): number {
  const cible = (plage.min + plage.max) / 2;

  const brute =
    entrejambeCm === null
      ? Math.abs(angleMesure - cible) * MM_PAR_DEGRE
      : Math.abs(
          distanceHancheCheville(entrejambeCm * PART_FEMUR, entrejambeCm * PART_TIBIA, cible) -
            distanceHancheCheville(
              entrejambeCm * PART_FEMUR,
              entrejambeCm * PART_TIBIA,
              angleMesure
            )
        ) * 10;

  return Math.min(CORRECTION_MAX_MM, Math.max(1, Math.round(brute)));
}

export type Constat = {
  articulation: Articulation;
  valeur: number;
  plage: Plage;
  statut: MeasurementStatus;
  /** Renseignes seulement hors fourchette. */
  sens: Sens | null;
  consigne: string | null;
};

/**
 * Compare chaque angle juge a sa fourchette. Renvoie un constat par
 * articulation, dans l'ordre d'affichage (`ARTICULATIONS`).
 */
export function etablirConstats(
  valeurs: Angles,
  plages: Plages,
  conseils: Conseils,
  entrejambeCm: number | null
): Constat[] {
  return ARTICULATIONS.map((articulation) => {
    const valeur = Math.round(valeurs[articulation] * 10) / 10;
    const plage = plages[articulation];
    const statut = statutMesure(valeur, plage);

    if (statut !== 'OUT') {
      return { articulation, valeur, plage, statut, sens: null, consigne: null };
    }

    const sens: Sens = valeur > plage.max ? 'haut' : 'bas';
    const cle: CleConseil = `${articulation}_${sens}`;
    let consigne = conseils[cle] ?? CONSEILS_STANDARD[cle];

    // La hauteur de selle est le seul reglage que l'on sait chiffrer a
    // partir d'un angle : le complement est calcule, jamais redige a la main.
    if (articulation === 'KNEE') {
      consigne += ` Correction estimée : environ ${correctionSelleMm(valeur, plage, entrejambeCm)} mm.`;
    }

    return { articulation, valeur, plage, statut, sens, consigne };
  });
}

/** Les constats hors fourchette, du plus prioritaire au moins prioritaire. */
export function consignesParPriorite(constats: Constat[]): Constat[] {
  return constats
    .filter((constat) => constat.consigne !== null)
    .sort((a, b) => PRIORITE.indexOf(a.articulation) - PRIORITE.indexOf(b.articulation));
}
