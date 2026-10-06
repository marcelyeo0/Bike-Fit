import 'server-only';
import { db } from '../db';
import type {
  Joint,
  MeasurementStatus,
  Objectif,
  Pratique,
  StudyStatus,
} from '../../generated/prisma/enums';
import { SELECTION_ETUDE, type EtudeResumee } from './dashboard';

/**
 * Lectures et ecritures des etudes.
 *
 * GARDE : `userId` (celui de `requireUser()`) en premier parametre, pose dans
 * chaque WHERE. Une etude d'un autre atelier est indiscernable d'une etude
 * inexistante : `null` ou `false`, et l'appelant repond 404.
 *
 * Seule exception, bornee : l'etude de demonstration (`isDemo`), lisible par
 * tout atelier connecte et par personne en ecriture — voir `lireEtude`.
 */

export const ETUDES_PAR_PAGE = 12;

export type PageEtudes = {
  etudes: EtudeResumee[];
  total: number;
  page: number;
  pages: number;
};

/** Les etudes de CET atelier, les plus recentes d'abord, filtrees et paginees. */
export async function lireEtudes(
  userId: string,
  filtre: { statut: StudyStatus | null; page: number }
): Promise<PageEtudes> {
  const where = { userId, ...(filtre.statut ? { status: filtre.statut } : {}) };

  const total = await db.study.count({ where });
  const pages = Math.max(1, Math.ceil(total / ETUDES_PAR_PAGE));
  // Une page au-dela de la derniere (lien perime, etude supprimee) retombe sur
  // la derniere plutot que sur une liste vide.
  const page = Math.min(Math.max(1, filtre.page), pages);

  const etudes = await db.study.findMany({
    where,
    // `id` departage deux etudes creees au meme instant : sans lui, la
    // pagination pourrait repeter ou sauter une ligne.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * ETUDES_PAR_PAGE,
    take: ETUDES_PAR_PAGE,
    select: SELECTION_ETUDE,
  });

  return { etudes, total, page, pages };
}

export type EtudeDetaillee = {
  id: string;
  status: StudyStatus;
  isDemo: boolean;
  createdAt: Date;
  completedAt: Date | null;
  titre: string | null;
  pratique: Pratique | null;
  objectif: Objectif | null;
  client: { id: string; code: string } | null;
  measurements: {
    id: string;
    joint: Joint;
    value: number;
    targetMin: number;
    targetMax: number;
    status: MeasurementStatus;
  }[];
  recommendations: { id: string; joint: Joint | null; text: string; priority: number }[];
  /**
   * Vrai si l'etude est a cet atelier ET n'est pas la demonstration. C'est la
   * seule condition sous laquelle l'interface propose la suppression ou un
   * lien vers la fiche client. La server action refait le controle.
   */
  modifiable: boolean;
};

/**
 * Le detail d'une etude.
 *
 * Lisible si elle est a cet atelier, ou si c'est l'etude de demonstration du
 * seed : celle-ci est une vitrine posee par `prisma/seed.ts`, pas la donnee
 * d'un compte reel, et elle ne se consulte qu'en lecture seule.
 */
export async function lireEtude(userId: string, etudeId: string): Promise<EtudeDetaillee | null> {
  const etude = await db.study.findFirst({
    where: { id: etudeId, OR: [{ userId }, { isDemo: true }] },
    select: {
      id: true,
      userId: true,
      status: true,
      isDemo: true,
      createdAt: true,
      completedAt: true,
      titre: true,
      pratique: true,
      objectif: true,
      client: { select: { id: true, code: true } },
      measurements: {
        orderBy: { joint: 'asc' },
        select: {
          id: true,
          joint: true,
          value: true,
          targetMin: true,
          targetMax: true,
          status: true,
        },
      },
      recommendations: {
        orderBy: [{ priority: 'asc' }, { id: 'asc' }],
        select: { id: true, joint: true, text: true, priority: true },
      },
    },
  });
  if (!etude) return null;

  const { userId: proprietaire, ...reste } = etude;
  return { ...reste, modifiable: proprietaire === userId && !etude.isDemo };
}

/**
 * Ouvre une etude en brouillon pour un client de CET atelier.
 *
 * Renvoie null si le client n'est pas a l'atelier : sans ce controle, une
 * etude pourrait etre rattachee a la fiche d'un autre atelier.
 */
export async function creerEtude(
  userId: string,
  donnees: { clientId: string; pratique: Pratique; objectif: Objectif }
): Promise<{ id: string } | null> {
  const client = await db.client.findFirst({
    where: { id: donnees.clientId, userId },
    select: { id: true },
  });
  if (!client) return null;

  return db.study.create({
    data: {
      userId,
      clientId: client.id,
      pratique: donnees.pratique,
      objectif: donnees.objectif,
    },
    select: { id: true },
  });
}

/**
 * Supprime une etude de CET atelier. `isDemo: false` : l'etude de
 * demonstration n'est jamais supprimable, quel que soit l'appelant. Faux si
 * aucune ligne ne correspond.
 */
export async function supprimerEtude(userId: string, etudeId: string): Promise<boolean> {
  const { count } = await db.study.deleteMany({
    where: { id: etudeId, userId, isDemo: false },
  });
  return count > 0;
}
