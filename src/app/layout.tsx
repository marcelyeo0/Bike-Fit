import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Fira_Code, Fira_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { apparenceAxio } from '../lib/clerkAppearance';
import { localisationAxio } from '../lib/clerkLocalization';
import './globals.css';

/**
 * Polices servies par next/font : telechargees au build, hebergees avec
 * l'application, aucune requete vers Google depuis le navigateur. Elles sont
 * exposees en variables CSS, lues par tailwind.config.js et le theme Clerk.
 */
const policeTexte = Fira_Sans({
  subsets: ['latin'],
  // Fira Sans n'est pas une police variable : chaque graisse utilisee par le
  // site est declaree, sans quoi le navigateur synthetise un faux gras.
  weight: ['400', '500', '600', '700'],
  variable: '--police-texte',
  display: 'swap',
});
// Fira Code porte les titres ET tout ce qui est chiffre (valeurs mesurees,
// codes client, petits libelles) : une seule variable pour les deux roles.
const policeCode = Fira_Code({ subsets: ['latin'], variable: '--police-code', display: 'swap' });

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
    <html lang="fr" className={`${policeTexte.variable} ${policeCode.variable}`}>
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
