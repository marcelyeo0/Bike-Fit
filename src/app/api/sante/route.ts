import { db } from '../../../lib/db';

/**
 * Sonde de sante, appelee par le HEALTHCHECK du conteneur `web`.
 *
 * Elle interroge la base : un serveur Next qui repond mais ne joint plus
 * Postgres n'est pas « sain » du point de vue de l'application. La reponse ne
 * porte aucun detail — ni version, ni message d'erreur — puisque la route est
 * publique.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ statut: 'ok' });
  } catch (erreur) {
    console.error('[sante] base injoignable :', erreur);
    return Response.json({ statut: 'indisponible' }, { status: 503 });
  }
}
