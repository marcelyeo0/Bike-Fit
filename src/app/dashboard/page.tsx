import React from 'react';
import type { Metadata } from 'next';
import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';

export const metadata: Metadata = {
  title: 'Tableau de bord - Axio',
};

/**
 * Dashboard provisoire. Il ne sert qu'a verifier que la chaine complete
 * fonctionne : landing -> /sign-up -> compte cree -> ici, connecte.
 *
 * L'acces est deja garanti par le middleware ; `currentUser()` ne peut donc
 * renvoyer null que si la session expire entre le middleware et le rendu.
 */
export default async function DashboardPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? 'Adresse e-mail indisponible';

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-ligne">
        <div className="mx-auto flex h-[70px] max-w-page items-center justify-between px-7">
          <span className="font-display text-2xl tracking-[.06em] text-encre">AXIO</span>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-page px-7 py-20">
        <h1 className="m-0 font-display text-titre-sm text-encre">Tableau de bord</h1>
        <p className="m-0 mt-5 text-[17px] leading-[1.65] text-texte-doux">
          Connecte en tant que <span className="font-semibold text-encre">{email}</span>.
        </p>
      </main>
    </div>
  );
}
