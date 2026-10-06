import type { Pratique } from '../../generated/prisma/enums';

/**
 * Estimation de la taille de cadre et de la hauteur de selle a partir des
 * mensurations saisies sur la fiche client.
 *
 * ATTENTION : ordres de grandeur usuels (coefficient d'entrejambe, paliers
 * de tailles), pas des valeurs sourcees ni la grille d'un constructeur. Les
 * tailles varient d'une marque a l'autre : le resultat est une indication de
 * depart, a confronter a la geometrie du cadre. A faire valider par un
 * fitter avant de s'y fier.
 */

export const TAILLES_CADRE = ['XS', 'S', 'M', 'L', 'XL'] as const;

/** Cadre theorique (axe-tube, en cm) = entrejambe x coefficient. */
const COEFFICIENT_ENTREJAMBE = 0.665;

/** Un cadre de gravel ou de chrono se choisit un peu plus petit qu'un route. */
const RETRAIT_CM: Record<Pratique, number> = { ROUTE: 0, GRAVEL: 1, CHRONO: 2 };

/** Centre de la taille XS et pas entre deux tailles, pour chaque entree. */
const ECHELLE_CADRE = { centreXs: 48, pas: 3 } as const;
const ECHELLE_STATURE = { centreXs: 160, pas: 8 } as const;

/** Poids de l'entrejambe quand les deux mensurations sont connues. */
const POIDS_ENTREJAMBE = 0.7;

/** Au-dela de cet ecart au centre d'une taille, on annonce un intervalle. */
const SEUIL_INTERVALLE = 0.25;

/**
 * « M », ou « S–M » pres d'une frontiere. null sans aucune mensuration.
 *
 * L'entrejambe pilote le resultat (c'est lui qui fixe la hauteur de selle) ;
 * la taille seule sert de repli, et de correctif quand les deux sont connues.
 */
export function estimerCadre(
  pratique: Pratique | null,
  tailleCm: number | null,
  entrejambeCm: number | null
): string | null {
  const positions: { valeur: number; poids: number }[] = [];

  if (entrejambeCm !== null) {
    const cadre = entrejambeCm * COEFFICIENT_ENTREJAMBE - (pratique ? RETRAIT_CM[pratique] : 0);
    positions.push({
      valeur: (cadre - ECHELLE_CADRE.centreXs) / ECHELLE_CADRE.pas,
      poids: POIDS_ENTREJAMBE,
    });
  }
  if (tailleCm !== null) {
    positions.push({
      valeur: (tailleCm - ECHELLE_STATURE.centreXs) / ECHELLE_STATURE.pas,
      poids: 1 - POIDS_ENTREJAMBE,
    });
  }
  if (positions.length === 0) return null;

  const poidsTotal = positions.reduce((somme, position) => somme + position.poids, 0);
  const brute =
    positions.reduce((somme, position) => somme + position.valeur * position.poids, 0) /
    poidsTotal;

  const dernier = TAILLES_CADRE.length - 1;
  const position = Math.min(dernier, Math.max(0, brute));
  const proche = Math.round(position);
  const ecart = position - proche;

  if (Math.abs(ecart) <= SEUIL_INTERVALLE) return TAILLES_CADRE[proche];

  const voisin = proche + (ecart > 0 ? 1 : -1);
  const [petit, grand] = [Math.min(proche, voisin), Math.max(proche, voisin)];
  return `${TAILLES_CADRE[petit]}–${TAILLES_CADRE[grand]}`;
}

/**
 * Hauteur de selle indicative, en cm, de l'axe du pedalier au dessus de la
 * selle : entrejambe x 0,883 (regle dite de LeMond). Point de depart du
 * reglage, que la mesure du genou vient ensuite confirmer ou corriger.
 */
export function estimerHauteurSelle(entrejambeCm: number | null): number | null {
  return entrejambeCm === null ? null : Math.round(entrejambeCm * 0.883 * 10) / 10;
}
