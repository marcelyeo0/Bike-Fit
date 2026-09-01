import React from 'react';
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { apparenceAxio } from '../lib/clerkAppearance';
import { localisationAxio } from '../lib/clerkLocalization';
import './globals.css';

export const metadata: Metadata = {
  title: 'Axio - Analyse de posture cycliste pour les ateliers',
  description:
    "Axio, l'analyse de posture cycliste pour les ateliers velo. Filmez, analysez, remettez un rapport a votre marque.",
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

/**
 * ClerkProvider est place a l'interieur de <body>, pas autour de <html> :
 * c'est la regle posee par la doc Clerk pour l'App Router.
 *
 * Il enveloppe tout l'arbre applicatif : la landing (navbar consciente de la
 * session), les pages d'auth et le dashboard. Le theme est passe une seule
 * fois ici, les composants Clerk en heritent.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Barlow:wght@400;500;600&family=Barlow+Semi+Condensed:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClerkProvider
          localization={localisationAxio}
          appearance={apparenceAxio}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
