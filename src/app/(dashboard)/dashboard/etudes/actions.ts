'use server';

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '../../../../lib/auth';
import { lireIdentifiant } from '../../../../lib/saisie';
import { enregistrerSeance, lireAngles, supprimerEtude } from '../../../../lib/requetes/etudes';

/**
 * Suppression d'une etude.
 *
 * GARDE : endpoint public. Identite par `requireUser()`, appartenance par le
 * `userId` pose dans le WHERE de `supprimerEtude`. Une etude d'un autre
 * atelier, une etude inexistante et l'etude de demonstration donnent toutes
 * le meme 404 : la demonstration se consulte, elle ne se supprime pas.
 */
export async function actionSupprimerEtude(donnees: FormData): Promise<void> {
  const utilisateur = await requireUser();

  const etudeId = lireIdentifiant(donnees.get('id'));
  if (!etudeId) notFound();

  const supprimee = await supprimerEtude(utilisateur.id, etudeId);
  if (!supprimee) {
    console.warn(`[access] etude ${etudeId} hors perimetre de ${utilisateur.id}`);
    notFound();
  }

  revalidatePath('/dashboard');
  console.info(`[etudes] etude ${etudeId} supprimee par ${utilisateur.id}`);

  redirect('/dashboard/etudes?supprimee=1');
}

/**
 * Enregistrement d'une seance : les angles juges deviennent les mesures de
 * l'etude, qui passe a « terminee ».
 *
 * GARDE : endpoint public, appele par le composant de seance. Identite par
 * `requireUser()`, forme des valeurs par `lireAngles`, appartenance et statut
 * par le WHERE de `enregistrerSeance`. Le navigateur n'envoie que quatre
 * angles : fourchettes, statuts, consignes et taille de cadre sont recalcules
 * cote serveur. Une etude d'un autre atelier, deja terminee, ou la
 * demonstration donnent le meme 404.
 */
export async function actionEnregistrerSeance(
  identifiant: unknown,
  valeurs: unknown
): Promise<{ erreur: string }> {
  const utilisateur = await requireUser();

  const etudeId = lireIdentifiant(identifiant);
  if (!etudeId) notFound();

  const angles = lireAngles(valeurs);
  if (!angles) {
    return { erreur: 'Mesures incomplètes : poursuivez la séance quelques secondes puis réessayez.' };
  }

  const enregistree = await enregistrerSeance(utilisateur.id, etudeId, angles);
  if (!enregistree) {
    console.warn(`[access] seance de ${etudeId} refusee pour ${utilisateur.id}`);
    notFound();
  }

  revalidatePath('/dashboard');
  console.info(`[etudes] seance de ${etudeId} enregistree par ${utilisateur.id}`);

  redirect(`/dashboard/etudes/${etudeId}?terminee=1`);
}
