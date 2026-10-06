'use server';

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '../../../../lib/auth';
import { lireIdentifiant, lireMensurations } from '../../../../lib/saisie';
import {
  creerClient,
  modifierMensurations,
  supprimerClient,
} from '../../../../lib/requetes/clients';

/**
 * Ecritures du carnet de clients.
 *
 * GARDE : une server action est un endpoint HTTP public, rejouable avec
 * n'importe quel corps. Chacune refait donc, dans cet ordre :
 *   1. l'identite — `requireUser()`, jamais `auth()` ni `currentUser()` ;
 *   2. le droit — la creation de client est libre (voir src/lib/access.ts :
 *      seule l'etude est le geste facture), il n'y a rien a compter ici ;
 *   3. l'appartenance de chaque identifiant recu — portee par le `userId` que
 *      les fonctions de `src/lib/requetes/clients.ts` posent dans leur WHERE.
 *
 * Un identifiant d'un autre atelier donne un 404, pas un 403 : on ne confirme
 * pas qu'une fiche existe ailleurs.
 */

/**
 * Cree un client. Le code est attribue par le serveur ; le formulaire ne
 * porte que les mensurations.
 *
 * `retour=etude` : le formulaire vient de la page « Nouvelle etude » (carnet
 * vide) et y ramene, client preselectionne. La valeur est comparee a une
 * constante — jamais utilisee comme URL de redirection.
 */
export async function actionCreerClient(donnees: FormData): Promise<void> {
  const utilisateur = await requireUser();

  const versEtude = donnees.get('retour') === 'etude';
  const origine = versEtude ? '/dashboard/etudes/nouvelle' : '/dashboard/clients';

  const mensurations = lireMensurations(donnees);
  if (!mensurations) redirect(`${origine}?erreur=mensurations`);

  const client = await creerClient(utilisateur.id, mensurations);

  revalidatePath('/dashboard');
  console.info(`[clients] ${client.code} cree pour ${utilisateur.id}`);

  redirect(
    versEtude
      ? `/dashboard/etudes/nouvelle?client=${client.id}`
      : `/dashboard/clients/${client.id}?cree=1`
  );
}

/** Modifie les mensurations d'un client de l'atelier. */
export async function actionModifierMensurations(donnees: FormData): Promise<void> {
  const utilisateur = await requireUser();

  const clientId = lireIdentifiant(donnees.get('id'));
  if (!clientId) notFound();

  const mensurations = lireMensurations(donnees);
  // La page cible refait elle-meme le controle d'appartenance : si la fiche
  // n'est pas a l'atelier, cette redirection aboutit a un 404.
  if (!mensurations) redirect(`/dashboard/clients/${clientId}?erreur=mensurations`);

  const modifie = await modifierMensurations(utilisateur.id, clientId, mensurations);
  if (!modifie) {
    console.warn(`[access] client ${clientId} hors perimetre de ${utilisateur.id}`);
    notFound();
  }

  revalidatePath('/dashboard/clients');
  redirect(`/dashboard/clients/${clientId}?maj=1`);
}

/** Supprime un client de l'atelier et, en cascade, toutes ses etudes. */
export async function actionSupprimerClient(donnees: FormData): Promise<void> {
  const utilisateur = await requireUser();

  const clientId = lireIdentifiant(donnees.get('id'));
  if (!clientId) notFound();

  const supprime = await supprimerClient(utilisateur.id, clientId);
  if (!supprime) {
    console.warn(`[access] client ${clientId} hors perimetre de ${utilisateur.id}`);
    notFound();
  }

  revalidatePath('/dashboard');
  console.info(`[clients] client ${clientId} supprime par ${utilisateur.id}`);

  redirect('/dashboard/clients?supprime=1');
}
