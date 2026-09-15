'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '../../../../../lib/auth';
import { canCreateStudy } from '../../../../../lib/access';
import { db } from '../../../../../lib/db';

/**
 * Creation d'une etude.
 *
 * GARDE : une server action est un endpoint HTTP public. Le bouton desactive
 * et la modale du dashboard n'empechent rien — le seul controle qui compte est
 * celui d'ici. D'ou l'ordre : identite (`requireUser`, jamais `currentUser`),
 * puis droit (`canCreateStudy`), puis seulement l'ecriture.
 *
 * En cas de refus on renvoie sur le formulaire, qui reaffiche le motif exact :
 * pas de message d'erreur duplique ici.
 */
export async function creerEtude(donnees: FormData): Promise<void> {
  const utilisateur = await requireUser();

  const autorisation = await canCreateStudy(utilisateur);
  if (!autorisation.autorise) {
    console.warn(
      `[access] creation d'etude refusee pour ${utilisateur.id} (${autorisation.motif})`
    );
    redirect('/dashboard/etudes/nouvelle');
  }

  const clientId = donnees.get('clientId');
  if (typeof clientId !== 'string' || clientId.length === 0) {
    redirect('/dashboard/etudes/nouvelle?erreur=client');
  }

  // Le clientId vient du navigateur : rien ne garantit qu'il appartient a
  // l'utilisateur. Sans cette verification, une etude pourrait etre rattachee
  // a la fiche client d'un autre atelier.
  const clientLegitime = await db.client.count({
    where: { id: clientId, userId: utilisateur.id },
  });
  if (clientLegitime === 0) {
    console.warn(`[access] client ${clientId} hors perimetre de ${utilisateur.id}`);
    redirect('/dashboard/etudes/nouvelle?erreur=client');
  }

  const etude = await db.study.create({
    data: { userId: utilisateur.id, clientId },
    select: { id: true },
  });

  revalidatePath('/dashboard');
  console.info(`[access] etude ${etude.id} creee pour ${utilisateur.id} (${autorisation.motif})`);

  redirect('/dashboard');
}
