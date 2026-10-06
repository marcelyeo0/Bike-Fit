import type { MeasurementStatus, Objectif, Pratique } from '../../generated/prisma/enums';
import { ARTICULATIONS, type Articulation } from './angles';

/**
 * Fourchettes cibles des angles, en degres.
 *
 * Deux sources :
 *   - la table locale ci-dessous, ajustee a la morphologie du client ;
 *   - Gemini (voir src/lib/requetes/plages.ts), dont la reponse n'est
 *     acceptee que si elle passe `validerPlagesExternes`.
 *
 * ATTENTION : les valeurs de la table et l'ajustement morphologique sont des
 * ordres de grandeur usuels, repris de l'ancien prototype. Ce ne sont PAS
 * des valeurs sourcees dans la litterature, contrairement a ce que demande
 * le document de cadrage. Elles sont regroupees ici pour etre remplacees ;
 * a faire valider par un fitter.
 */

export type Plage = { min: number; max: number };
export type Plages = Record<Articulation, Plage>;

export type Sens = 'haut' | 'bas';
export type CleConseil = `${Articulation}_${Sens}`;
export type Conseils = Partial<Record<CleConseil, string>>;

/** D'ou viennent les fourchettes d'une seance. Affiche a l'ecran. */
export type SourcePlages = 'gemini' | 'locale';

/** Ce qui est fige sur l'etude a l'ouverture de la seance. */
export type PlagesSeance = {
  source: SourcePlages;
  /** Faux si aucune mensuration n'etait saisie : table de base seule. */
  morphologie: boolean;
  plages: Plages;
  conseils: Conseils;
};

const BASE: Record<Objectif, Plages> = {
  CONFORT: {
    KNEE: { min: 140, max: 150 },
    HIP: { min: 50, max: 65 },
    ELBOW: { min: 150, max: 165 },
    SHOULDER: { min: 80, max: 95 },
  },
  MIXTE: {
    KNEE: { min: 140, max: 150 },
    HIP: { min: 45, max: 60 },
    ELBOW: { min: 150, max: 165 },
    SHOULDER: { min: 85, max: 100 },
  },
  AERO: {
    KNEE: { min: 142, max: 152 },
    HIP: { min: 40, max: 55 },
    ELBOW: { min: 140, max: 160 },
    SHOULDER: { min: 88, max: 103 },
  },
};

/** Decalage applique a la table selon la pratique (min et max ensemble). */
const DECALAGE_PRATIQUE: Record<Pratique, Partial<Record<Articulation, number>>> = {
  ROUTE: {},
  // Position plus relevee, pilotage en terrain meuble.
  GRAVEL: { HIP: 3, SHOULDER: -3 },
  // Buste couche ; le coude est traite a part (appui sur prolongateurs).
  CHRONO: { HIP: -5, SHOULDER: -5 },
};

/** Sur prolongateurs l'avant-bras est a plat : le coude se ferme vers l'equerre. */
const COUDE_CHRONO: Plage = { min: 90, max: 110 };

/** Rapport entrejambe / taille d'une morphologie moyenne. */
const RAPPORT_MOYEN = 0.47;
/** Un degre de decalage par centieme d'ecart au rapport moyen, borne. */
const DECALAGE_MORPHO_MAX = 3;

/**
 * Decalage du a la morphologie, en degres. Positif = jambes longues et buste
 * court : le cycliste se couche moins loin, la hanche reste plus ouverte et
 * l'epaule plus fermee. Negatif = l'inverse. Zero sans les deux mensurations.
 */
export function decalageMorphologique(
  tailleCm: number | null,
  entrejambeCm: number | null
): number {
  if (tailleCm === null || entrejambeCm === null || tailleCm <= 0) return 0;

  const ecart = (entrejambeCm / tailleCm - RAPPORT_MOYEN) * 100;
  return Math.round(Math.min(DECALAGE_MORPHO_MAX, Math.max(-DECALAGE_MORPHO_MAX, ecart)));
}

function decaler(plage: Plage, degres: number): Plage {
  return { min: plage.min + degres, max: plage.max + degres };
}

/**
 * Les fourchettes de la table locale pour une etude.
 *
 * Une etude ancienne sans pratique ni objectif retombe sur route / mixte.
 * Le genou n'est pas ajuste a la morphologie : son angle d'extension ne
 * depend pas de la longueur de la jambe — c'est la hauteur de selle en
 * millimetres qui en depend (voir regles.ts).
 */
export function plagesLocales(
  pratique: Pratique | null,
  objectif: Objectif | null,
  tailleCm: number | null,
  entrejambeCm: number | null
): Plages {
  const base = BASE[objectif ?? 'MIXTE'];
  const parPratique = DECALAGE_PRATIQUE[pratique ?? 'ROUTE'];
  const morpho = decalageMorphologique(tailleCm, entrejambeCm);

  return {
    KNEE: decaler(base.KNEE, parPratique.KNEE ?? 0),
    HIP: decaler(base.HIP, (parPratique.HIP ?? 0) + morpho),
    ELBOW: pratique === 'CHRONO' ? COUDE_CHRONO : decaler(base.ELBOW, parPratique.ELBOW ?? 0),
    SHOULDER: decaler(base.SHOULDER, (parPratique.SHOULDER ?? 0) - morpho),
  };
}

/** A moins de tant de degres d'une borne, la mesure est « proche de la limite ». */
export const MARGE_LIMITE = 2;

export function statutMesure(valeur: number, plage: Plage): MeasurementStatus {
  if (valeur < plage.min || valeur > plage.max) return 'OUT';
  if (valeur - plage.min < MARGE_LIMITE || plage.max - valeur < MARGE_LIMITE) return 'WARNING';
  return 'OK';
}

// ---------------------------------------------------------------------------
// Validation d'une reponse externe (Gemini)
// ---------------------------------------------------------------------------

/** Une fourchette externe ne s'eloigne pas de la table locale de plus de tant. */
const ECART_EXTERNE_MAX = 15;
const LARGEUR_MIN = 4;
const LARGEUR_MAX = 30;
const LONGUEUR_CONSEIL_MAX = 260;

/**
 * Termes exclus de l'interface (contrainte reglementaire : outil d'aide au
 * reglage, pas de discours de soin). Un conseil externe qui en contient un
 * est ecarte, et le conseil standard prend sa place.
 */
const TERMES_EXCLUS = /blessure|douleur|diagnosti|pr[ée]vention|patient|m[ée]dic|th[ée]rap|pathologi/i;

const CLES_EXTERNES: Record<Articulation, string> = {
  KNEE: 'knee',
  HIP: 'hip',
  ELBOW: 'elbow',
  SHOULDER: 'shoulder',
};

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

/**
 * Lit la reponse JSON d'un modele :
 *   { "ranges": { "knee": [min, max], ... }, "advice": { "knee_high": "...", ... } }
 *
 * Renvoie null des qu'une fourchette est absente, mal formee ou trop loin de
 * la table locale : on ne melange pas une source a moitie valide avec
 * l'autre, l'appelant retombe alors entierement sur la table. Les conseils,
 * eux, sont filtres un par un.
 */
export function validerPlagesExternes(
  brut: unknown,
  reference: Plages
): { plages: Plages; conseils: Conseils } | null {
  if (!estObjet(brut) || !estObjet(brut.ranges)) return null;

  const plages = {} as Plages;
  for (const articulation of ARTICULATIONS) {
    const paire = brut.ranges[CLES_EXTERNES[articulation]];
    if (!Array.isArray(paire) || paire.length !== 2) return null;

    const [min, max] = paire;
    if (typeof min !== 'number' || typeof max !== 'number') return null;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (min < 0 || max > 180) return null;

    const largeur = max - min;
    if (largeur < LARGEUR_MIN || largeur > LARGEUR_MAX) return null;

    const attendue = reference[articulation];
    if (
      Math.abs(min - attendue.min) > ECART_EXTERNE_MAX ||
      Math.abs(max - attendue.max) > ECART_EXTERNE_MAX
    ) {
      return null;
    }
    plages[articulation] = { min: Math.round(min), max: Math.round(max) };
  }

  const conseils: Conseils = {};
  if (estObjet(brut.advice)) {
    for (const articulation of ARTICULATIONS) {
      for (const [suffixe, sens] of [
        ['high', 'haut'],
        ['low', 'bas'],
      ] as const) {
        const texte = brut.advice[`${CLES_EXTERNES[articulation]}_${suffixe}`];
        if (typeof texte !== 'string') continue;

        const propre = texte.replace(/\s+/g, ' ').trim();
        if (propre.length === 0 || propre.length > LONGUEUR_CONSEIL_MAX) continue;
        if (TERMES_EXCLUS.test(propre)) continue;
        conseils[`${articulation}_${sens}`] = propre;
      }
    }
  }

  return { plages, conseils };
}

/** Relit ce qui a ete fige sur l'etude (colonne JSON) : meme defiance qu'a l'ecriture. */
export function lirePlagesSeance(brut: unknown): PlagesSeance | null {
  if (!estObjet(brut) || !estObjet(brut.plages)) return null;
  if (brut.source !== 'gemini' && brut.source !== 'locale') return null;

  const plages = {} as Plages;
  for (const articulation of ARTICULATIONS) {
    const plage = brut.plages[articulation];
    if (!estObjet(plage)) return null;
    const { min, max } = plage;
    if (typeof min !== 'number' || typeof max !== 'number' || !(min < max)) return null;
    plages[articulation] = { min, max };
  }

  const conseils: Conseils = {};
  if (estObjet(brut.conseils)) {
    for (const articulation of ARTICULATIONS) {
      for (const sens of ['haut', 'bas'] as const) {
        const texte = brut.conseils[`${articulation}_${sens}`];
        if (typeof texte === 'string' && texte.length > 0) {
          conseils[`${articulation}_${sens}`] = texte;
        }
      }
    }
  }

  return { source: brut.source, morphologie: brut.morphologie === true, plages, conseils };
}
