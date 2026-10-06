'use server';

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '../../../../../lib/auth';
import { canCreateStudy } from '../../../../../lib/access';
import { lireIdentifiant, lireObjectif, lirePratique } from '../../../../../lib/saisie';
import { creerEtude } from '../../../../../lib/requetes/etudes';

/**
 * Creation d'une etude.
 *
 * GARDE : une server action est un endpoint HTTP public. Le bouton desactive
 * et la modale du dashboard n'empechent rien — le seul controle qui compte est
 * celui d'ici. D'ou l'ordre : identite (`requireUser`, jamais `currentUser`),
 * puis droit (`canCreateStudy`), puis appartenance du client, puis seulement
 * l'ecriture.
 *
 * En cas de refus de droit on renvoie sur le formulaire, qui reaffiche le
 * motif exact : pas de message d'erreur duplique ici.
 */
export async function actionCreerEtude(donnees: FormData): Promise<void> {
  const utilisateur = await requireUser();

  const autorisation = await canCreateStudy(utilisateur);
  if (!autorisation.autorise) {
    console.warn(
      `[access] creation d'etude refusee pour ${utilisateur.id} (${autorisation.motif})`
    );
    redirect('/dashboard/etudes/nouvelle');
  }

  // Forme des champs : un formulaire incomplet revient avec un message.
  const clientId = lireIdentifiant(donnees.get('clientId'));
  const pratique = lirePratique(donnees.get('pratique'));
  const objectif = lireObjectif(donnees.get('objectif'));
  if (!clientId || !pratique || !objectif) {
    redirect('/dashboard/etudes/nouvelle?erreur=champs');
  }

  // Le clientId vient du navigateur : rien ne garantit qu'il appartient a
  // l'atelier. `creerEtude` le verifie avec le `userId` et renvoie null sinon.
  // Un client d'un autre atelier donne un 404, comme s'il n'existait pas.
  const etude = await creerEtude(utilisateur.id, { clientId, pratique, objectif });
  if (!etude) {
    console.warn(`[access] client ${clientId} hors perimetre de ${utilisateur.id}`);
    notFound();
  }

  revalidatePath('/dashboard');
  console.info(`[access] etude ${etude.id} creee pour ${utilisateur.id} (${autorisation.motif})`);

  redirect(`/dashboard/etudes/${etude.id}?creee=1`);
}
