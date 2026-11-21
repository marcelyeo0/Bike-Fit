import 'server-only';
import { db } from '../db';
import { Prisma } from '../../generated/prisma/client';
import type { Mensurations } from '../saisie';
import { SELECTION_ETUDE, type EtudeResumee } from './dashboard';

/**
 * Lectures et ecritures du carnet de clients.
 *
 * GARDE : chaque fonction prend l'`userId` de `requireUser()` en premier
 * parametre et le pose dans le WHERE, en lecture comme en ecriture. Un
 * identifiant de client venu du navigateur n'est jamais utilise seul : il est
 * toujours accompagne du `userId`. Une fiche d'un autre atelier est donc
 * indiscernable d'une fiche qui n'existe pas — les fonctions renvoient `null`
 * ou `false`, et l'appelant repond 404.
 *
 * Le client est connu par son nom, saisi par l'atelier ; le code `AX-0001`
 * reste une reference secondaire. Aucun contact ni texte libre n'est stocke.
 */

/** Ce que les formulaires de fiche envoient : le nom et les mensurations. */
export type DonneesClient = Mensurations & { nom: string };

/** `AX-0001`. Au-dela de 9999 le code s'allonge, il ne se tronque pas. */
function formaterCode(numero: number): string {
  return `AX-${String(numero).padStart(4, '0')}`;
}

export type ClientDuCarnet = {
  id: string;
  code: string;
  nom: string;
  tailleCm: number | null;
  entrejambeCm: number | null;
  nombreEtudes: number;
  derniereEtude: Date | null;
};

/** Le carnet de CET atelier, les fiches les plus recentes d'abord. */
export async function lireCarnet(userId: string): Promise<ClientDuCarnet[]> {
  const lignes = await db.client.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      nom: true,
      tailleCm: true,
      entrejambeCm: true,
      _count: { select: { studies: true } },
      // Une seule ligne par client : la date de sa derniere etude.
      studies: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
    },
  });

  return lignes.map((ligne) => ({
    id: ligne.id,
    code: ligne.code,
    nom: ligne.nom,
    tailleCm: ligne.tailleCm,
    entrejambeCm: ligne.entrejambeCm,
    nombreEtudes: ligne._count.studies,
    derniereEtude: ligne.studies[0]?.createdAt ?? null,
  }));
}

/** Les clients de CET atelier par ordre alphabetique, pour le selecteur du formulaire d'etude. */
export async function lireClientsSelecteur(
  userId: string
): Promise<{ id: string; nom: string; createdAt: Date }[]> {
  return db.client.findMany({
    where: { userId },
    orderBy: [{ nom: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, nom: true, createdAt: true },
  });
}

export type FicheClient = {
  id: string;
  code: string;
  nom: string;
  tailleCm: number | null;
  entrejambeCm: number | null;
  createdAt: Date;
  etudes: EtudeResumee[];
};

/** La fiche et l'historique d'un client, ou null s'il n'est pas a cet atelier. */
export async function lireFicheClient(userId: string, clientId: string): Promise<FicheClient | null> {
  const client = await db.client.findFirst({
    where: { id: clientId, userId },
    select: {
      id: true,
      code: true,
      nom: true,
      tailleCm: true,
      entrejambeCm: true,
      createdAt: true,
      studies: {
        // Double filtre : le client est deja a l'atelier, ses etudes aussi par
        // construction, mais on ne s'appuie pas sur la construction.
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: SELECTION_ETUDE,
      },
    },
  });
  if (!client) return null;

  const { studies, ...fiche } = client;
  return { ...fiche, etudes: studies };
}

/**
 * Cree un client et lui attribue le code suivant de l'atelier.
 *
 * Le numero vient de `User.dernierNumeroClient`, incremente dans la meme
 * transaction. L'UPDATE pose un verrou de ligne sur l'atelier jusqu'au commit :
 * deux creations simultanees passent l'une apres l'autre et tirent deux
 * numeros distincts. L'index unique (userId, code) reste la seconde barriere.
 * Si la creation echoue, la transaction annule aussi l'increment.
 */
export async function creerClient(
  userId: string,
  donnees: DonneesClient
): Promise<{ id: string; code: string }> {
  return db.$transaction(async (tx) => {
    const { dernierNumeroClient } = await tx.user.update({
      where: { id: userId },
      data: { dernierNumeroClient: { increment: 1 } },
      select: { dernierNumeroClient: true },
    });

    return tx.client.create({
      data: {
        userId,
        code: formaterCode(dernierNumeroClient),
        nom: donnees.nom,
        tailleCm: donnees.tailleCm,
        entrejambeCm: donnees.entrejambeCm,
      },
      select: { id: true, code: true },
    });
  });
}

/** Nom et mensurations. Faux si le client n'est pas a cet atelier (aucune ligne touchee). */
export async function modifierClient(
  userId: string,
  clientId: string,
  donnees: DonneesClient
): Promise<boolean> {
  const { count } = await db.client.updateMany({
    where: { id: clientId, userId },
    data: { nom: donnees.nom, tailleCm: donnees.tailleCm, entrejambeCm: donnees.entrejambeCm },
  });
  if (count === 0) return false;

  // Les fourchettes d'une seance sont calculees a partir des mensurations puis
  // figees sur l'etude : celles des brouillons de ce client sont remises a
  // zero, la prochaine ouverture de seance les recalcule. Une etude terminee
  // garde les siennes — un compte rendu ne change pas apres coup.
  await db.study.updateMany({
    where: { clientId, userId, status: 'DRAFT' },
    data: { plagesSeance: Prisma.DbNull },
  });
  return true;
}

/**
 * Supprime un client. Ses etudes, leurs mesures et leurs recommandations
 * tombent en cascade (voir schema.prisma). Faux si le client n'est pas a cet
 * atelier.
 */
export async function supprimerClient(userId: string, clientId: string): Promise<boolean> {
  const { count } = await db.client.deleteMany({ where: { id: clientId, userId } });
  return count > 0;
}
