import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Seules ces routes sont protegees. Tout le reste (landing, pages d'auth,
 * assets) reste public : on protege une liste courte plutot que d'ouvrir des
 * exceptions une par une.
 */
const routesProtegees = createRouteMatcher(['/dashboard(.*)', '/admin(.*)']);

export default clerkMiddleware(
  async (auth, request) => {
    if (!routesProtegees(request)) return;

    const { userId, redirectToSignIn } = await auth();

    if (!userId) {
      // `returnBackUrl` devient le parametre `redirect_url` lu par <SignIn/>,
      // qui ramene le visiteur sur la page qu'il demandait.
      return redirectToSignIn({ returnBackUrl: request.url });
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
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Toujours passer sur les routes d'API.
    '/(api|trpc)(.*)',
  ],
};
