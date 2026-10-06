import { Objectif, Pratique, StudyStatus } from '../generated/prisma/enums';

/**
 * Lecture des valeurs venues du navigateur (FormData, parametres d'URL).
 *
 * Tout ce qui arrive ici est hostile par defaut : une server action est un
 * endpoint public, son formulaire peut etre rejoue avec n'importe quel corps.
 * Ces fonctions ne font que valider la FORME ; l'appartenance d'un identifiant
 * a l'atelier se verifie dans `src/lib/requetes/`, par le filtre `userId`.
 */

/** Bornes plausibles, en centimetres. Elles attrapent surtout les fautes de frappe. */
export const BORNES_TAILLE = { min: 100, max: 230 } as const;
export const BORNES_ENTREJAMBE = { min: 50, max: 120 } as const;

export type Mensurations = {
  tailleCm: number | null;
  entrejambeCm: number | null;
};

type Lecture<T> = { valide: true; valeur: T } | { valide: false };

/**
 * Une mensuration optionnelle. Vide = non renseignee (null), ce qui est un
 * cas valide. La virgule decimale francaise est acceptee, et la valeur est
 * arrondie au millimetre.
 */
function lireMensuration(
  brut: FormDataEntryValue | null,
  bornes: { min: number; max: number }
): Lecture<number | null> {
  if (brut === null) return { valide: true, valeur: null };
  if (typeof brut !== 'string') return { valide: false };

  const texte = brut.trim().replace(',', '.');
  if (texte.length === 0) return { valide: true, valeur: null };
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(texte)) return { valide: false };

  const nombre = Math.round(Number(texte) * 10) / 10;
  if (!Number.isFinite(nombre) || nombre < bornes.min || nombre > bornes.max) {
    return { valide: false };
  }
  return { valide: true, valeur: nombre };
}

/** Les deux mensurations d'un formulaire client, ou null si l'une est invalide. */
export function lireMensurations(donnees: FormData): Mensurations | null {
  const taille = lireMensuration(donnees.get('tailleCm'), BORNES_TAILLE);
  const entrejambe = lireMensuration(donnees.get('entrejambeCm'), BORNES_ENTREJAMBE);
  if (!taille.valide || !entrejambe.valide) return null;

  return { tailleCm: taille.valeur, entrejambeCm: entrejambe.valeur };
}

/** Un identifiant (cuid) : une chaine courte, sans rien d'exotique. */
export function lireIdentifiant(brut: unknown): string | null {
  if (typeof brut !== 'string') return null;
  return /^[A-Za-z0-9_-]{1,64}$/.test(brut) ? brut : null;
}

function lireEnum<T extends string>(valeurs: Record<string, T>, brut: unknown): T | null {
  if (typeof brut !== 'string') return null;
  return (Object.values(valeurs) as string[]).includes(brut) ? (brut as T) : null;
}

export function lirePratique(brut: unknown): Pratique | null {
  return lireEnum(Pratique, brut);
}

export function lireObjectif(brut: unknown): Objectif | null {
  return lireEnum(Objectif, brut);
}

export function lireStatut(brut: unknown): StudyStatus | null {
  return lireEnum(StudyStatus, brut);
}

/** Numero de page d'URL : entier >= 1, 1 par defaut. */
export function lirePage(brut: unknown): number {
  if (typeof brut !== 'string' || !/^\d{1,6}$/.test(brut)) return 1;
  return Math.max(1, Number(brut));
}
