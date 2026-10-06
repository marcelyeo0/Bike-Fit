import { requireUser } from '../../../../../../lib/auth';
import { lireIdentifiant } from '../../../../../../lib/saisie';
import { exporterClient, reponseExport } from '../../../../../../lib/requetes/export';

/**
 * Export JSON des donnees d'un client.
 *
 * GARDE : un route handler est un endpoint public au meme titre qu'une server
 * action. Identite par `requireUser()` (redirection vers /sign-in sans
 * session), appartenance par le `userId` pose dans la requete. Un client d'un
 * autre atelier donne un 404, comme s'il n'existait pas.
 */
export const dynamic = 'force-dynamic';

export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await requireUser();

  const clientId = lireIdentifiant((await params).id);
  const contenu = clientId ? await exporterClient(utilisateur.id, clientId) : null;
  if (!contenu) {
    return new Response('Introuvable', { status: 404 });
  }

  const jour = new Date().toISOString().slice(0, 10);
  return reponseExport(contenu, `axio-${contenu.client.code}-${jour}.json`);
}
