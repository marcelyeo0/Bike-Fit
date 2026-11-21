import React from 'react';
import { BLOC } from '../_composants/classes';

/**
 * Ecran d'attente de toutes les pages du dashboard.
 *
 * Les pages sont dynamiques (elles lisent la base a chaque requete) : sans ce
 * fichier, un clic sur un lien ne change rien a l'ecran tant que le serveur
 * n'a pas fini, et seul l'indicateur de `next dev` trahit l'attente — absent
 * en production. Avec lui, Next affiche ce squelette des le clic, dans la
 * coque (barre laterale comprise), puis le remplace par la page.
 */
export default function Chargement() {
  return (
    <div role="status" aria-live="polite" className="motion-safe:animate-pulse">
      <span className="sr-only">Chargement…</span>

      <div aria-hidden className="h-3 w-24 rounded-full bg-ligne" />
      <div aria-hidden className="mt-4 h-9 w-72 max-w-full rounded-full bg-ligne" />
      <div aria-hidden className="mt-4 h-4 w-[28rem] max-w-full rounded-full bg-ligne-douce" />

      <div aria-hidden className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className={`${BLOC} h-40`} />
        ))}
      </div>
    </div>
  );
}
