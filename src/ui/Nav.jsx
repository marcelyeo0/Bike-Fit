'use client';

import React, { useState } from 'react';
import { List, X } from '@phosphor-icons/react';
import { useAuth } from '@clerk/nextjs';
import Bouton from './components/Bouton';

const LIENS = [
  { href: '#comment', label: 'Comment ça marche' },
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#contact', label: 'Contact' },
];

export default function Nav() {
  const [ouvert, setOuvert] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  // Tant que Clerk n'a pas resolu la session, on garde l'etat visiteur : c'est
  // ce que rend le serveur, donc pas de decalage d'hydratation.
  const connecte = isLoaded && isSignedIn;
  const cta = connecte
    ? { href: '/dashboard', label: 'Accéder au dashboard' }
    : { href: '/sign-up', label: 'Commencer' };

  return (
    <nav className="sticky top-0 z-50 border-b border-ligne bg-white/[.92] backdrop-blur-[10px]">
      <div className="mx-auto flex h-[70px] max-w-page items-center justify-between gap-6 px-7">
        <a
          href="#top"
          className="font-display text-2xl tracking-[.06em] text-encre"
          onClick={() => setOuvert(false)}
        >
          AXIO
        </a>

        <div className="hidden items-center gap-[30px] text-[14.5px] font-medium text-texte lg:flex">
          {LIENS.map((lien) => (
            <a key={lien.href} href={lien.href} className="transition-colors hover:text-encre">
              {lien.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Bouton href="#contact" variante="contour" taille="sm" className="hidden lg:inline-flex">
            Réserver une démo
          </Bouton>
          <Bouton href={cta.href} taille="sm" className="shadow-rouge-sm">
            {cta.label}
          </Bouton>
          <button
            type="button"
            aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={ouvert}
            onClick={() => setOuvert((v) => !v)}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#D5D5D5] text-encre transition-colors hover:border-encre lg:hidden"
          >
            {ouvert ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </div>

      {ouvert && (
        <div className="border-t border-ligne-douce bg-white px-7 py-4 lg:hidden">
          <div className="flex flex-col">
            {LIENS.map((lien) => (
              <a
                key={lien.href}
                href={lien.href}
                onClick={() => setOuvert(false)}
                className="py-3 text-[16.5px] font-medium text-texte transition-colors hover:text-encre"
              >
                {lien.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setOuvert(false)}
              className="py-3 text-[16.5px] font-medium text-texte transition-colors hover:text-encre"
            >
              Réserver une démo
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
