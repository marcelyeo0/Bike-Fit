import React from 'react';
import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'Creer un compte - Axio',
};

/**
 * Inscription. `forceRedirectUrl` garantit l'arrivee sur /dashboard apres une
 * inscription reussie, quel que soit le chemin d'entree ; `fallbackRedirectUrl`
 * couvre les parcours ou Clerk ne passe pas par la redirection forcee
 * (verification d'email reprise dans un autre onglet, par exemple).
 *
 * `signInUrl` fait pointer le lien « Deja un compte ? » vers notre page locale
 * plutot que vers l'Account Portal hebergé par Clerk.
 */
export default function SignUpPage() {
  return (
    <SignUp
      signInUrl="/sign-in"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
