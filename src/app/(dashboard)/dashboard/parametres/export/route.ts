import { requireUser } from '../../../../../lib/auth';
import { exporterAtelier, reponseExport } from '../../../../../lib/requetes/export';

/**
 * Export JSON complet des donnees de l'atelier.
 *
 * GARDE : endpoint public. Identite par `requireUser()` ; l'export ne porte
 * que les lignes filtrees sur ce `userId`.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const utilisateur = await requireUser();

  const contenu = await exporterAtelier(utilisateur.id);
  const jour = new Date().toISOString().slice(0, 10);

  return reponseExport(contenu, `axio-atelier-${jour}.json`);
}
