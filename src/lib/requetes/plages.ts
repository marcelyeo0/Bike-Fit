import 'server-only';
import { db } from '../db';
import type { Objectif, Pratique } from '../../generated/prisma/enums';
import { estimerCadre, estimerHauteurSelle } from '../biomeca/cadre';
import {
  lirePlagesSeance,
  plagesLocales,
  validerPlagesExternes,
  type PlagesSeance,
} from '../biomeca/plages';
import { LIBELLES_OBJECTIF, LIBELLES_PRATIQUE } from '../libelles';

/**
 * Ouverture d'une seance : fourchettes cibles, consignes et estimations
 * tirees des mensurations.
 *
 * GARDE : `userId` (celui de `requireUser()`) en premier parametre, pose dans
 * chaque WHERE. Une etude d'un autre atelier, l'etude de demonstration et une
 * etude deja terminee donnent toutes null.
 *
 * Les fourchettes viennent de Gemini quand `GEMINI_API_KEY` est renseignee,
 * de la table locale sinon ou au moindre doute sur la reponse. Dans les deux
 * cas la morphologie du client (taille, entrejambe) entre dans le calcul.
 *
 * Ce qui part chez Google : pratique, objectif, taille, entrejambe. Rien
 * d'autre — ni code client, ni identifiant d'atelier, ni image.
 */

const MODELE = 'gemini-flash-latest';
const URL_GEMINI = `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent`;
const DELAI_MS = 20_000;

const CONSIGNE_SYSTEME = `Tu es un expert en positionnement sur le vélo (bike fitting).
On te donne le profil d'un cycliste. Tu renvoies :
1. les fourchettes cibles des angles articulaires, mesurés de profil pendant le pédalage ;
2. pour chaque articulation et chaque sens d'écart, la consigne de réglage du vélo.

Articulations : knee, hip, elbow, shoulder.
- knee : angle interne du genou à l'extension maximale (pédale en bas) ;
- hip : angle épaule-hanche-genou le plus fermé (pédale en haut) ;
- elbow : angle moyen du coude (épaule-coude-poignet) ;
- shoulder : angle moyen de l'épaule (coude-épaule-hanche).

Le profil contient la pratique, l'objectif, et si elles sont connues la
taille et la longueur d'entrejambe en centimètres. Croise ces critères :
- pratique et objectif fixent la base (aéro : hanche plus fermée ; confort :
  buste redressé, hanche plus ouverte ; chrono : appui sur prolongateurs) ;
- le rapport entrejambe / taille renseigne sur les proportions : jambes
  longues et buste court, ou l'inverse. Ajuste hanche et épaule en conséquence.

Chaque consigne fait deux phrases, à l'infinitif, 30 mots au plus :
1. le constat de position et sa cause probable sur le vélo ;
2. l'action de réglage : composant, sens, ordre de grandeur en mm.
Priorité à la selle (hauteur, recul) pour knee et hip, au poste de pilotage
(potence, cintre) pour elbow et shoulder.
"high" = angle mesuré au-dessus de la fourchette, "low" = en dessous.

Vocabulaire imposé : réglage, position, fourchette, confort. N'emploie aucun
terme de santé ou de soin.

Réponds uniquement avec un objet JSON, au format exact :
{
  "ranges": {"knee": [min, max], "hip": [min, max], "elbow": [min, max], "shoulder": [min, max]},
  "advice": {
    "knee_high": "...", "knee_low": "...",
    "hip_high": "...", "hip_low": "...",
    "elbow_high": "...", "elbow_low": "...",
    "shoulder_high": "...", "shoulder_low": "..."
  }
}
Les bornes sont des entiers en degrés, entre 0 et 180.`;

type Profil = {
  pratique: Pratique | null;
  objectif: Objectif | null;
  tailleCm: number | null;
  entrejambeCm: number | null;
};

function decrireProfil(profil: Profil): string {
  return [
    `Pratique : ${profil.pratique ? LIBELLES_PRATIQUE[profil.pratique] : 'route'}`,
    `Objectif : ${profil.objectif ? LIBELLES_OBJECTIF[profil.objectif] : 'mixte'}`,
    profil.tailleCm !== null ? `Taille : ${profil.tailleCm} cm` : null,
    profil.entrejambeCm !== null ? `Entrejambe : ${profil.entrejambeCm} cm` : null,
  ]
    .filter((ligne): ligne is string => ligne !== null)
    .join('\n');
}

/** La reponse brute de Gemini, deja parsee, ou null si l'appel n'aboutit pas. */
async function interrogerGemini(profil: Profil): Promise<unknown> {
  const cle = process.env.GEMINI_API_KEY?.trim();
  if (!cle) return null;

  try {
    const reponse = await fetch(URL_GEMINI, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cle },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CONSIGNE_SYSTEME }] },
        contents: [{ role: 'user', parts: [{ text: decrireProfil(profil) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          // Les modeles recents « reflechissent » avant de repondre et ces
          // jetons comptent dans le plafond : trop bas, le JSON est tronque.
          maxOutputTokens: 4000,
        },
      }),
      signal: AbortSignal.timeout(DELAI_MS),
      cache: 'no-store',
    });
    if (!reponse.ok) {
      console.warn(`[plages] Gemini a repondu ${reponse.status}, table locale utilisee`);
      return null;
    }

    const corps: unknown = await reponse.json();
    const texte = (
      corps as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    ).candidates?.[0]?.content?.parts
      ?.map((partie) => partie.text ?? '')
      .join('');
    if (!texte) return null;

    return JSON.parse(texte);
  } catch (erreur) {
    // Reseau coupe, delai depasse, JSON illisible : jamais bloquant.
    console.warn(
      `[plages] appel Gemini en echec (${erreur instanceof Error ? erreur.name : 'erreur'}), table locale utilisee`
    );
    return null;
  }
}

/** Calcule les fourchettes d'un profil : Gemini si la reponse est saine, sinon la table. */
export async function calculerPlagesSeance(profil: Profil): Promise<PlagesSeance> {
  const locales = plagesLocales(
    profil.pratique,
    profil.objectif,
    profil.tailleCm,
    profil.entrejambeCm
  );
  const morphologie = profil.tailleCm !== null && profil.entrejambeCm !== null;

  const externes = validerPlagesExternes(await interrogerGemini(profil), locales);
  if (externes) {
    return { source: 'gemini', morphologie, plages: externes.plages, conseils: externes.conseils };
  }
  return { source: 'locale', morphologie, plages: locales, conseils: {} };
}

export type ContexteSeance = {
  etudeId: string;
  codeClient: string | null;
  pratique: Pratique | null;
  objectif: Objectif | null;
  tailleCm: number | null;
  entrejambeCm: number | null;
  /** « M », « S–M », ou null sans mensuration. */
  cadre: string | null;
  hauteurSelleCm: number | null;
  seance: PlagesSeance;
};

/**
 * Tout ce dont l'ecran de seance et l'enregistrement ont besoin, pour une
 * etude EN BROUILLON de CET atelier. null sinon.
 *
 * Les fourchettes sont calculees au premier appel puis figees sur l'etude :
 * un rechargement de la page, ou l'enregistrement, relisent exactement ce que
 * l'ecran a affiche, et la source externe n'est interrogee qu'une fois.
 */
export async function ouvrirSeance(
  userId: string,
  etudeId: string
): Promise<ContexteSeance | null> {
  const etude = await db.study.findFirst({
    where: { id: etudeId, userId, isDemo: false, status: 'DRAFT' },
    select: {
      id: true,
      pratique: true,
      objectif: true,
      plagesSeance: true,
      client: { select: { code: true, tailleCm: true, entrejambeCm: true } },
    },
  });
  if (!etude) return null;

  const tailleCm = etude.client?.tailleCm ?? null;
  const entrejambeCm = etude.client?.entrejambeCm ?? null;

  let seance = lirePlagesSeance(etude.plagesSeance);
  if (!seance) {
    seance = await calculerPlagesSeance({
      pratique: etude.pratique,
      objectif: etude.objectif,
      tailleCm,
      entrejambeCm,
    });
    // `userId` et le statut dans le WHERE, comme pour la lecture.
    await db.study.updateMany({
      where: { id: etude.id, userId, isDemo: false, status: 'DRAFT' },
      data: { plagesSeance: seance },
    });
  }

  return {
    etudeId: etude.id,
    codeClient: etude.client?.code ?? null,
    pratique: etude.pratique,
    objectif: etude.objectif,
    tailleCm,
    entrejambeCm,
    cadre: estimerCadre(etude.pratique, tailleCm, entrejambeCm),
    hauteurSelleCm: estimerHauteurSelle(entrejambeCm),
    seance,
  };
}
