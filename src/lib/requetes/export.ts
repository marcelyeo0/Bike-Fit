import 'server-only';
import { db } from '../db';

/**
 * Exports JSON : les donnees d'un client, ou toutes celles de l'atelier.
 *
 * GARDE : `userId` en premier parametre et dans chaque WHERE, comme partout
 * dans `src/lib/requetes/`.
 *
 * Le format est stable et lisible sans Axio : cles en francais, unites dans
 * le nom des champs. C'est ce que l'atelier remet a un cycliste qui demande
 * ses donnees, ou emporte s'il quitte le service.
 */

const SELECTION_ETUDE_EXPORT = {
  id: true,
  status: true,
  isDemo: true,
  pratique: true,
  objectif: true,
  createdAt: true,
  completedAt: true,
  measurements: {
    orderBy: { joint: 'asc' },
    select: { joint: true, value: true, targetMin: true, targetMax: true, status: true },
  },
  recommendations: {
    orderBy: { priority: 'asc' },
    select: { joint: true, priority: true, text: true },
  },
} as const;

type EtudeBrute = {
  id: string;
  status: string;
  isDemo: boolean;
  pratique: string | null;
  objectif: string | null;
  createdAt: Date;
  completedAt: Date | null;
  measurements: {
    joint: string;
    value: number;
    targetMin: number;
    targetMax: number;
    status: string;
  }[];
  recommendations: { joint: string | null; priority: number; text: string }[];
};

function mettreEnFormeEtude(etude: EtudeBrute) {
  return {
    id: etude.id,
    statut: etude.status,
    pratique: etude.pratique,
    objectif: etude.objectif,
    creeeLe: etude.createdAt.toISOString(),
    termineeLe: etude.completedAt?.toISOString() ?? null,
    mesures: etude.measurements.map((mesure) => ({
      articulation: mesure.joint,
      valeurDegres: mesure.value,
      fourchetteMinDegres: mesure.targetMin,
      fourchetteMaxDegres: mesure.targetMax,
      statut: mesure.status,
    })),
    recommandations: etude.recommendations.map((recommandation) => ({
      articulation: recommandation.joint,
      priorite: recommandation.priority,
      texte: recommandation.text,
    })),
  };
}

type ClientBrut = {
  code: string;
  tailleCm: number | null;
  entrejambeCm: number | null;
  createdAt: Date;
  studies: EtudeBrute[];
};

function mettreEnFormeClient(client: ClientBrut) {
  return {
    code: client.code,
    tailleCm: client.tailleCm,
    entrejambeCm: client.entrejambeCm,
    creeLe: client.createdAt.toISOString(),
    etudes: client.studies.map(mettreEnFormeEtude),
  };
}

/** Les donnees d'un client de CET atelier, ou null s'il n'en fait pas partie. */
export async function exporterClient(userId: string, clientId: string) {
  const client = await db.client.findFirst({
    where: { id: clientId, userId },
    select: {
      code: true,
      tailleCm: true,
      entrejambeCm: true,
      createdAt: true,
      studies: {
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: SELECTION_ETUDE_EXPORT,
      },
    },
  });
  if (!client) return null;

  return {
    format: 'axio.export.client',
    version: 1,
    exporteLe: new Date().toISOString(),
    client: mettreEnFormeClient(client),
  };
}

/** Toutes les donnees de CET atelier. */
export async function exporterAtelier(userId: string) {
  const [atelier, clients, etudesSansClient] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    }),
    db.client.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        code: true,
        tailleCm: true,
        entrejambeCm: true,
        createdAt: true,
        studies: {
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: SELECTION_ETUDE_EXPORT,
        },
      },
    }),
    db.study.findMany({
      where: { userId, clientId: null },
      orderBy: { createdAt: 'asc' },
      select: SELECTION_ETUDE_EXPORT,
    }),
  ]);

  return {
    format: 'axio.export.atelier',
    version: 1,
    exporteLe: new Date().toISOString(),
    atelier: atelier
      ? {
          nom: atelier.name,
          email: atelier.email,
          formule: atelier.plan,
          abonnement: atelier.subscriptionStatus,
          creeLe: atelier.createdAt.toISOString(),
        }
      : null,
    clients: clients.map(mettreEnFormeClient),
    etudesSansClient: etudesSansClient.map(mettreEnFormeEtude),
  };
}

/** Reponse HTTP d'un export : JSON lisible, propose en telechargement. */
export function reponseExport(contenu: unknown, nomFichier: string): Response {
  return new Response(JSON.stringify(contenu, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomFichier}"`,
      // Donnees d'atelier : ni cache navigateur, ni cache intermediaire.
      'Cache-Control': 'no-store',
    },
  });
}
