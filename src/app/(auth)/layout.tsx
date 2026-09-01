import React from 'react';
import Link from 'next/link';

/**
 * Coquille des pages d'authentification : fond blanc, logo Axio en haut,
 * formulaire Clerk centre. Rien d'autre — pas de navbar, pas de footer.
 *
 * Le logo est pour l'instant le mot-marque typographique, identique a celui de
 * la navbar et du footer. Il sera remplace par l'image quand elle sera dans
 * public/assets.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 py-10">
      <Link
        href="/"
        aria-label="Retour a l'accueil Axio"
        className="font-display text-2xl tracking-[.06em] text-encre"
      >
        AXIO
      </Link>

      <main className="flex w-full flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
