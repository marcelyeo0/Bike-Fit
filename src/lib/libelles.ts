import type {
  Joint,
  MeasurementStatus,
  Objectif,
  Plan,
  Pratique,
  StudyStatus,
  SubscriptionStatus,
} from '../generated/prisma/enums';

/**
 * Textes d'interface associes aux enums de la base, et mises en forme
 * partagees.
 *
 * Module volontairement sans `server-only` ni acces base : composants serveur
 * et composants client lisent les memes libelles. Les imports ci-dessus sont
 * des types, rien de Prisma ne part vers le navigateur.
 *
 * Vocabulaire : reglage, position, fourchette, confort. Aucun terme de soin.
 */

export const LIBELLES_PLAN: Record<Plan, string> = {
  FREE: 'Offre gratuite',
  ESSENTIEL: 'Essentiel',
  ATELIER: 'Atelier',
  MULTI: 'Multi-sites',
};

/** Affiche a la place de la formule pour un compte au role ADMIN. */
export const LIBELLE_ACCES_ILLIMITE = 'Accès illimité';

export const LIBELLES_ABONNEMENT: Record<SubscriptionStatus, string> = {
  NONE: 'Aucun abonnement',
  TRIALING: 'Période d’essai',
  ACTIVE: 'Actif',
  PAST_DUE: 'Paiement en attente',
  CANCELED: 'Résilié',
};

export const LIBELLES_STATUT: Record<StudyStatus, string> = {
  DRAFT: 'Brouillon',
  PROCESSING: 'Analyse en cours',
  COMPLETED: 'Terminée',
  FAILED: 'Échec',
};

export const LIBELLES_JOINT: Record<Joint, string> = {
  KNEE: 'Genou',
  HIP: 'Hanche',
  ELBOW: 'Coude',
  SHOULDER: 'Épaule',
  ANKLE: 'Cheville',
};

export const LIBELLES_MESURE: Record<MeasurementStatus, string> = {
  OK: 'Dans la fourchette',
  WARNING: 'Proche de la limite',
  OUT: 'Hors fourchette',
};

export const LIBELLES_PRATIQUE: Record<Pratique, string> = {
  ROUTE: 'Route',
  GRAVEL: 'Gravel',
  CHRONO: 'Chrono / triathlon',
};

export const LIBELLES_OBJECTIF: Record<Objectif, string> = {
  CONFORT: 'Confort',
  MIXTE: 'Mixte',
  AERO: 'Aéro',
};

/** Ordre d'affichage des choix dans les formulaires et les filtres. */
export const PRATIQUES: Pratique[] = ['ROUTE', 'GRAVEL', 'CHRONO'];
export const OBJECTIFS: Objectif[] = ['CONFORT', 'MIXTE', 'AERO'];
export const STATUTS: StudyStatus[] = ['DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED'];

const DATE_FR = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const NOMBRE_FR = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export function formaterDate(date: Date): string {
  return DATE_FR.format(date);
}

/** « 178 cm », « 84,5 cm », ou un tiret quand la mensuration n'est pas saisie. */
export function formaterCm(valeur: number | null): string {
  return valeur === null ? '—' : `${NOMBRE_FR.format(valeur)} cm`;
}

/** Un angle en degres, une decimale au plus. */
export function formaterDegres(valeur: number): string {
  return `${NOMBRE_FR.format(valeur)}°`;
}

/** « Route · Confort », ou null si l'etude date d'avant ces deux champs. */
export function formaterCadre(pratique: Pratique | null, objectif: Objectif | null): string | null {
  const morceaux = [
    pratique ? LIBELLES_PRATIQUE[pratique] : null,
    objectif ? LIBELLES_OBJECTIF[objectif] : null,
  ].filter((morceau): morceau is string => morceau !== null);

  return morceaux.length > 0 ? morceaux.join(' · ') : null;
}
