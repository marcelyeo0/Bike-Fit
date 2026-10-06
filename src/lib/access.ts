import 'server-only';
import { db } from './db';
import { Role, SubscriptionStatus } from '../generated/prisma/enums';
import type { User } from '../generated/prisma/client';

/**
 * Regles d'acces produit.
 *
 * GARDE : ce module est la seule autorite sur « le droit de faire ». Il est
 * `server-only` et toute decision doit etre prise ici, cote serveur, avant
 * l'ecriture. L'interface appelle les memes fonctions, mais seulement pour
 * eviter a l'utilisateur de buter sur un refus : desactiver un bouton n'est
 * pas un controle d'acces, la server action refait toujours la verification.
 *
 * Aucun controle n'existe sur la creation de client : le carnet d'adresses
 * reste libre, seule l'etude est le geste facture.
 *
 * Le role ADMIN leve la limite de creation d'etudes, et rien d'autre : il ne
 * donne acces aux donnees d'aucun autre atelier (le filtrage par `userId` de
 * `src/lib/requetes/` ne lit pas le role). Il sert au compte de demonstration
 * commerciale. Il se lit sur la ligne User de la base — celle que renvoie
 * `requireUser()` —, jamais sur une valeur venue du navigateur ou de Clerk,
 * et ne se pose que par `scripts/promouvoir-admin.ts`.
 */

/**
 * Pourquoi l'acces est accorde ou refuse.
 *
 * Les deux motifs de refus se distinguent parce qu'ils appellent deux
 * discours differents : l'un s'adresse a un atelier qui vient d'epuiser son
 * essai, l'autre a un client qui l'etait et ne l'est plus.
 */
export type MotifCreationEtude =
  /** Role ADMIN : aucun quota, independamment de tout abonnement. */
  | 'ACCES_ILLIMITE'
  /** Abonnement ACTIVE ou TRIALING : aucun quota. */
  | 'ABONNEMENT_ACTIF'
  /** Aucune etude reelle encore realisee : la premiere est offerte. */
  | 'ETUDE_OFFERTE'
  /** Etude offerte consommee, aucun abonnement n'a jamais ete pris. */
  | 'ETUDE_OFFERTE_CONSOMMEE'
  /** Abonnement echu, suspendu ou resilie. */
  | 'ABONNEMENT_EXPIRE';

export type AutorisationCreationEtude = {
  autorise: boolean;
  motif: MotifCreationEtude;
};

/** Un abonnement en cours d'essai compte comme actif : l'essai sert a ca. */
const STATUTS_OUVRANTS: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

/**
 * L'utilisateur peut-il ouvrir une nouvelle etude ?
 *
 * Ordre volontaire : le role et l'abonnement d'abord, le comptage ensuite.
 * Un abonne ne declenche jamais la requete de comptage — c'est le cas courant.
 * Le role passe avant l'abonnement pour que la facturation, quand elle
 * ecrira `subscriptionStatus`, ne puisse pas refermer un acces illimite.
 *
 * `isDemo: false` dans le comptage : l'etude de demonstration est une vitrine,
 * elle ne doit pas consommer l'etude offerte.
 */
export async function canCreateStudy(user: User): Promise<AutorisationCreationEtude> {
  if (user.role === Role.ADMIN) {
    return { autorise: true, motif: 'ACCES_ILLIMITE' };
  }

  if (STATUTS_OUVRANTS.includes(user.subscriptionStatus)) {
    return { autorise: true, motif: 'ABONNEMENT_ACTIF' };
  }

  const etudesReelles = await db.study.count({
    where: { userId: user.id, isDemo: false },
  });

  if (etudesReelles === 0) {
    return { autorise: true, motif: 'ETUDE_OFFERTE' };
  }

  // NONE = l'atelier n'a jamais souscrit, il vient d'epuiser son essai.
  // PAST_DUE / CANCELED = il a souscrit, le paiement ou l'abonnement a lache.
  return {
    autorise: false,
    motif:
      user.subscriptionStatus === SubscriptionStatus.NONE
        ? 'ETUDE_OFFERTE_CONSOMMEE'
        : 'ABONNEMENT_EXPIRE',
  };
}
