import { verifyWebhook } from '@clerk/nextjs/webhooks';
import type { NextRequest } from 'next/server';
import type { UserJSON } from '@clerk/nextjs/server';

// `EmailAddressJSON` n'est pas reexporte par @clerk/nextjs/server : on le derive
// de UserJSON, qui l'est, plutot que de dependre de @clerk/backend en direct.
type AdresseEmail = UserJSON['email_addresses'][number];
import { db } from '../../../../lib/db';

/**
 * Webhook Clerk : maintient la table User en phase avec les comptes Clerk.
 *
 * Clerk reste la source de verite de l'identite ; la table User n'en est qu'un
 * miroir local, indispensable pour porter les relations (clients, etudes) et
 * les champs metier (role, plan, abonnement) que Clerk ne connait pas.
 *
 * Signature verifiee par `verifyWebhook`, qui lit les en-tetes `svix-id`,
 * `svix-timestamp` et `svix-signature` et rejette tout ce qui ne correspond pas
 * au secret. Inutile d'ajouter `svix` en dependance directe : Clerk embarque
 * deja l'implementation.
 *
 * Idempotence : Svix rejoue un evenement tant qu'il n'a pas recu de 2xx, et
 * peut le livrer plusieurs fois. Tout passe donc par `upsert` / `deleteMany`,
 * jamais par `create` ou `delete` — un rejeu ne doit rien casser.
 */

/** L'adresse marquee comme principale, a defaut la premiere connue. */
function emailPrincipal(
  adresses: AdresseEmail[] | undefined,
  idPrincipal: string | null | undefined
): string | null {
  if (!adresses?.length) return null;
  const principale = idPrincipal ? adresses.find((a) => a.id === idPrincipal) : undefined;
  return (principale ?? adresses[0]).email_address ?? null;
}

/** « Prenom Nom », ou null si Clerk n'a ni l'un ni l'autre. */
function nomComplet(prenom: string | null, nom: string | null): string | null {
  const assemble = [prenom, nom].filter(Boolean).join(' ').trim();
  return assemble.length > 0 ? assemble : null;
}

export async function POST(request: NextRequest) {
  let evenement;

  try {
    evenement = await verifyWebhook(request, {
      // Le nom documente cote projet ; on retombe sur celui que Clerk lit par
      // defaut pour ne pas casser une installation deja configuree.
      signingSecret:
        process.env.CLERK_WEBHOOK_SECRET ?? process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch (erreur) {
    console.error('[webhook clerk] signature invalide :', erreur);
    return new Response('Signature invalide', { status: 400 });
  }

  try {
    switch (evenement.type) {
      case 'user.created':
      case 'user.updated': {
        const donnees = evenement.data;
        const email = emailPrincipal(donnees.email_addresses, donnees.primary_email_address_id);

        if (!email) {
          // Compte sans adresse verifiee : rien a synchroniser, mais l'evenement
          // est bien traite — on accuse reception pour couper les rejeux.
          console.warn(`[webhook clerk] ${evenement.type} sans e-mail, ignore : ${donnees.id}`);
          return new Response('OK', { status: 200 });
        }

        const nom = nomComplet(donnees.first_name, donnees.last_name);

        await db.user.upsert({
          where: { clerkId: donnees.id },
          update: { email, name: nom },
          create: { clerkId: donnees.id, email, name: nom },
        });

        console.info(`[webhook clerk] ${evenement.type} synchronise : ${donnees.id}`);
        break;
      }

      case 'user.deleted': {
        const identifiant = evenement.data.id;
        if (!identifiant) break;

        // `deleteMany` plutot que `delete` : ne leve pas si la ligne a deja ete
        // supprimee par un premier passage. Clients, etudes, mesures et
        // recommandations tombent en cascade (voir schema.prisma).
        const { count } = await db.user.deleteMany({ where: { clerkId: identifiant } });
        console.info(`[webhook clerk] user.deleted : ${count} ligne(s) supprimee(s)`);
        break;
      }

      default:
        // Les autres evenements (sessions, organisations...) ne nous concernent
        // pas encore. On accuse reception pour que Clerk arrete de les rejouer.
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (erreur) {
    // Signature valide mais traitement en echec : on renvoie 500 pour que Svix
    // reessaie. Repondre 200 ici perdrait l'evenement silencieusement.
    console.error(`[webhook clerk] echec du traitement de ${evenement.type} :`, erreur);
    return new Response('Erreur de traitement', { status: 500 });
  }
}
