'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardText,
  GearSix,
  List,
  SquaresFour,
  Users,
  X,
} from '@phosphor-icons/react';
import { UserButton } from '@clerk/nextjs';
import type { Plan } from '../../../generated/prisma/enums';
import { LIBELLES_PLAN } from '../../../lib/libelles';

/**
 * Coque de navigation du dashboard.
 *
 * Composant client parce qu'il lui faut `usePathname` (element actif) et un
 * etat local (menu burger). Il ne recoit que des valeurs deja lues cote
 * serveur — jamais d'acces Prisma ici.
 */

const LIENS = [
  { href: '/dashboard', label: 'Tableau de bord', Icone: SquaresFour },
  { href: '/dashboard/etudes', label: 'Études', Icone: ClipboardText },
  { href: '/dashboard/clients', label: 'Clients', Icone: Users },
  { href: '/dashboard/parametres', label: 'Paramètres', Icone: GearSix },
];

const LARGEUR = 'w-[264px]';

function estActif(pathname: string, href: string): boolean {
  // `/dashboard` ne doit pas s'allumer sur `/dashboard/clients` : egalite
  // stricte pour la racine, prefixe pour les sections.
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BarreLaterale({ plan }: { plan: Plan }) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  // Une navigation referme le tiroir : sans ca il resterait ouvert par-dessus
  // la page demandee sur mobile.
  useEffect(() => {
    setOuvert(false);
  }, [pathname]);

  const contenu = (
    <div className="flex h-full flex-col">
      <div className="flex h-[70px] shrink-0 items-center px-6">
        <Link href="/dashboard" className="font-display text-2xl tracking-[.06em] text-encre">
          AXIO
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {LIENS.map(({ href, label, Icone }) => {
            const actif = estActif(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={actif ? 'page' : undefined}
                  className={`relative flex items-center gap-3 rounded-[10px] px-3 py-[10px] text-[14.5px] font-medium transition-colors duration-300 ease-doux ${
                    actif
                      ? 'bg-fond-doux text-encre'
                      : 'text-texte-doux hover:bg-fond-doux hover:text-encre'
                  }`}
                >
                  {/* Liseré rouge de l'element actif. */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-rouge ${
                      actif ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <Icone size={19} weight="regular" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-ligne-douce p-4">
        <div className="rounded-[14px] bg-fond-doux px-4 py-3">
          <p className="m-0 font-condensed text-[11px] uppercase tracking-[.14em] text-gris">
            Formule
          </p>
          <p className="m-0 mt-1 text-[14.5px] font-semibold text-encre">{LIBELLES_PLAN[plan]}</p>
          {plan === 'FREE' && (
            <Link
              href="/pricing"
              className="mt-2 inline-block text-[13px] font-semibold text-rouge-texte underline underline-offset-2"
            >
              Passer à un plan supérieur
            </Link>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3 px-1">
          <UserButton />
          <span className="text-[13px] text-gris">Mon compte</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Barre superieure mobile : porte le burger, sous 1024px seulement. */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-[64px] items-center justify-between border-b border-ligne bg-white px-5 lg:hidden print:hidden">
        <Link href="/dashboard" className="font-display text-xl tracking-[.06em] text-encre">
          AXIO
        </Link>
        <div className="flex items-center gap-3">
          <UserButton />
          <button
            type="button"
            aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={ouvert}
            onClick={() => setOuvert((v) => !v)}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-ligne text-encre transition-colors hover:border-encre"
          >
            {ouvert ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </header>

      {/* Tiroir mobile. Rendu seulement a l'ouverture : ferme, il ne doit pas
          rester dans l'ordre de tabulation. */}
      {ouvert && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOuvert(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-encre/40"
          />
          <aside
            className={`absolute inset-y-0 left-0 ${LARGEUR} max-w-[85vw] border-r border-ligne bg-white`}
          >
            {contenu}
          </aside>
        </div>
      )}

      {/* Sidebar fixe, a partir de 1024px. */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden ${LARGEUR} border-r border-ligne bg-white lg:block print:!hidden`}
      >
        {contenu}
      </aside>
    </>
  );
}
