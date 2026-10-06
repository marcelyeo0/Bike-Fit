'use server';

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '../../../../lib/auth';
import { lireIdentifiant } from '../../../../lib/saisie';
import { supprimerEtude } from '../../../../lib/requetes/etudes';

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
