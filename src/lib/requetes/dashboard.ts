import 'server-only';
import { db } from '../db';
import type {
  Joint,
  MeasurementStatus,
  Objectif,
  Pratique,
  StudyStatus,
} from '../../generated/prisma/enums';

/**
 * Lectures du tableau de bord.
 *
 * GARDE : chaque fonction prend l'`userId` de `requireUser()` en premier
 * parametre et le pose dans le WHERE. Aucune de ces requetes ne doit exister
 * sans ce filtre — c'est la seule chose qui empeche un utilisateur de lire les
 * etudes d'un autre. Le module est `server-only` : il ne peut pas etre importe
 * depuis un composant client, donc Prisma ne fuit jamais vers le navigateur.
 */

export type StatistiquesDashboard = {
  etudesRealisees: number;
  clientsSuivis: number;
  etudesCeMois: number;
  ecartsDetectes: number;
};

/**
 * Les quatre compteurs en une seule requete plutot qu'en quatre allers-retours.
 *
 * Prisma ne sait pas agreger plusieurs tables dans un seul `findMany`, d'ou le
 * SQL brut : quatre sous-requetes scalaires, un seul round-trip. Les valeurs
 * sont interpolees par le tag `$queryRaw`, donc envoyees en parametres lies
 * ($1, $2...) et jamais concatenees dans le texte de la requete.
 *
 * `::int` sur chaque COUNT : Postgres renvoie un bigint, que le driver mappe en
 * BigInt JavaScript — non serialisable vers un composant client.
 *
 * Les ecarts passent par une jointure sur "Study" pour que le filtre `userId`
 * s'applique aussi aux mesures, qui ne portent pas la colonne elles-memes.
 *
 * `createdAt` est un TIMESTAMP(3) sans fuseau, ou Prisma ecrit de l'heure UTC.
 * On envoie donc la borne en ISO (donc en UTC) et on la caste en `timestamp` :
 * laisser le driver passer un Date ferait comparer un `timestamp` a un
 * `timestamptz`, converti selon le fuseau de la session Postgres — de quoi
 * decaler la frontiere du mois de quelques heures.
 */
export async function lireStatistiques(
  userId: string,
  debutDuMois: Date
): Promise<StatistiquesDashboard> {
  const lignes = await db.$queryRaw<StatistiquesDashboard[]>`
    SELECT
      (SELECT COUNT(*) FROM "Study"
        WHERE "userId" = ${userId} AND "status" = 'COMPLETED')::int AS "etudesRealisees",
      (SELECT COUNT(*) FROM "Client"
        WHERE "userId" = ${userId})::int AS "clientsSuivis",
      (SELECT COUNT(*) FROM "Study"
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${debutDuMois.toISOString()}::timestamp)::int AS "etudesCeMois",
      (SELECT COUNT(*) FROM "Measurement" m
        JOIN "Study" s ON s."id" = m."studyId"
        WHERE s."userId" = ${userId} AND m."status" = 'OUT')::int AS "ecartsDetectes"
  `;

  return (
    lignes[0] ?? { etudesRealisees: 0, clientsSuivis: 0, etudesCeMois: 0, ecartsDetectes: 0 }
  );
}

export type EtudeResumee = {
  id: string;
  status: StudyStatus;
  isDemo: boolean;
  createdAt: Date;
  completedAt: Date | null;
  titre: string | null;
  /** Nuls sur les etudes anterieures a l'ajout de ces deux champs. */
  pratique: Pratique | null;
  objectif: Objectif | null;
  /**
   * Nul tant qu'aucune fiche client n'est rattachee — voir `titre`. Le client
   * n'est qu'un code : le serveur ne connait pas l'identite du cycliste.
   */
  client: { code: string } | null;
  measurements: {
    joint: Joint;
    value: number;
    targetMin: number;
    targetMax: number;
    status: MeasurementStatus;
  }[];
};

export const SELECTION_ETUDE = {
  id: true,
  status: true,
  isDemo: true,
  createdAt: true,
  completedAt: true,
  titre: true,
  pratique: true,
  objectif: true,
  client: { select: { code: true } },
  measurements: {
    select: { joint: true, value: true, targetMin: true, targetMax: true, status: true },
  },
} as const;

/** Les dernieres etudes de CET utilisateur, les plus recentes d'abord. */
export async function lireEtudesRecentes(userId: string, limite = 6): Promise<EtudeResumee[]> {
  return db.study.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limite,
    select: SELECTION_ETUDE,
  });
}

/**
 * L'etude de demonstration du seed, affichee uniquement quand l'utilisateur
 * n'en a aucune.
 *
 * Seule lecture du fichier qui ne filtre pas sur `userId` — c'est volontaire et
 * borne : `isDemo` marque la ligne vitrine posee par `prisma/seed.ts`, pas la
 * donnee d'un compte reel. Elle est rendue en lecture seule, avec un badge
 * « Demo », et n'entre dans aucun compteur.
 */
export async function lireEtudeDemo(): Promise<EtudeResumee | null> {
  return db.study.findFirst({
    where: { isDemo: true },
    orderBy: { createdAt: 'desc' },
    select: SELECTION_ETUDE,
  });
}
