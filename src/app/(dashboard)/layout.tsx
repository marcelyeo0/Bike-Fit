import React from 'react';
import { requireUser } from '../../lib/auth';
import BarreLaterale from './_composants/BarreLaterale';

/**
 * Coque commune a toutes les pages du dashboard.
 *
 * GARDE : cette couche appelle `requireUser()`, jamais `auth()` ni
 * `currentUser()` de Clerk. Les pages filles reappellent `requireUser()` pour
 * leur propre `userId` — un layout ne protege pas une page en Next (les deux
 * sont rendus en parallele), il ne fait que garantir la coque.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const utilisateur = await requireUser();

  return (
    <div className="min-h-screen bg-fond-doux">
      <BarreLaterale plan={utilisateur.plan} />

      <div className="lg:pl-[264px]">
        <main className="mx-auto w-full max-w-page px-5 pb-16 pt-[88px] lg:px-10 lg:pb-20 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
