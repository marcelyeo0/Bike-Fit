import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

/**
 * L'URL telle que le navigateur l'a demandee.
 *
 * En serveur autonome (image Docker), `request.url` est reconstruite depuis
 * la variable HOSTNAME du conteneur et vaut `http://0.0.0.0:3000/...` : un
 * retour apres connexion vers cette adresse n'aboutit nulle part. On repart
 * donc des en-tetes — `x-forwarded-*` poses par Caddy en production, `host`
 * en acces direct.
 */
function urlPublique(request: NextRequest): string {
  const premier = (valeur: string | null) => valeur?.split(',')[0]?.trim() || null;

  const hote = premier(request.headers.get('x-forwarded-host')) ?? request.headers.get('host');
  if (!hote) return request.url;

  const protocole =
    premier(request.headers.get('x-forwarded-proto')) ?? request.nextUrl.protocol.replace(':', '');

  return `${protocole}://${hote}${request.nextUrl.pathname}${request.nextUrl.search}`;
}

/**
 * Seules ces routes sont protegees. Tout le reste (landing, pages d'auth,
 * assets) reste public : on protege une liste courte plutot que d'ouvrir des
 * exceptions une par une.
 */
const routesProtegees = createRouteMatcher(['/dashboard(.*)', '/admin(.*)']);

/**
 * Routes explicitement publiques, verifiees AVANT la liste protegee.
 *
 * Le webhook Clerk arrive depuis les serveurs de Svix, sans cookie de session :
 * toute tentative d'authentification le ferait echouer. Il porte sa propre
 * preuve — la signature `svix-*`, verifiee dans le handler.
 *
 * Aujourd'hui la liste protegee ne le couvre pas, donc il passerait de toute
 * facon ; on le declare quand meme pour qu'un futur elargissement de
 * `routesProtegees` ne casse pas la synchronisation en silence.
 */
const routesPubliques = createRouteMatcher(['/api/webhooks(.*)']);

export default clerkMiddleware(
  async (auth, request) => {
    if (routesPubliques(request)) return;
    if (!routesProtegees(request)) return;

    const { userId, redirectToSignIn } = await auth();

    if (!userId) {
      // `returnBackUrl` devient le parametre `redirect_url` lu par <SignIn/>,
      // qui ramene le visiteur sur la page qu'il demandait.
      return redirectToSignIn({ returnBackUrl: urlPublique(request) });
    }
  },
  {
    // Sans ces deux options, `redirectToSignIn()` renvoie vers l'Account Portal
    // hebergé par Clerk (<slug>.accounts.dev) au lieu de nos pages. Les
    // variables NEXT_PUBLIC_CLERK_SIGN_IN_URL / _SIGN_UP_URL font la meme
    // chose, mais les poser ici garde la redirection correcte meme si le .env
    // local est incomplet.
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
  }
);

export const config = {
  matcher: [
    // Tout sauf les fichiers internes Next et les fichiers statiques, sauf si
    // on les retrouve dans les parametres de recherche.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Toujours passer sur les routes d'API.
    '/(api|trpc)(.*)',
    // Chemin d'auto-proxy de Clerk.
    '/__clerk/:path*',
  ],
};
