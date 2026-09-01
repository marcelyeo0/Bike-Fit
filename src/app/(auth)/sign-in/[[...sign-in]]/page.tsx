import React from 'react';
import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'Connexion - Axio',
};

/**
 * Connexion.
 *
 * Volontairement PAS de `forceRedirectUrl` ici. Clerk resout la destination
 * dans cet ordre (voir RedirectUrls#getRedirectUrl dans @clerk/shared) :
 *
 *   1. forceRedirectUrl
 *   2. le parametre `redirect_url` de l'URL
 *   3. fallbackRedirectUrl
 *
 * Le middleware ajoute `redirect_url` quand un visiteur non connecte tente
 * d'ouvrir /dashboard ou /admin. Poser `forceRedirectUrl` ecraserait ce
 * parametre et renverrait toujours sur /dashboard, ce qui casserait le retour
 * sur la page demandee. `fallbackRedirectUrl` donne /dashboard uniquement
 * quand aucune page n'a ete demandee — c'est-a-dire une connexion depuis la
 * navbar ou la landing.
 *
 * `signUpUrl` fait pointer le lien « Pas encore de compte ? » vers notre page
 * locale plutot que vers l'Account Portal hebergé par Clerk.
 */
export default function SignInPage() {
  return <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />;
}
