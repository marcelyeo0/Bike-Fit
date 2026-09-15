'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X } from '@phosphor-icons/react';
import type { AutorisationCreationEtude } from '../../../../lib/access';
import { MESSAGES_REFUS, estRefus } from '../../../../lib/messagesAcces';

/**
 * Bouton « Nouvelle étude ».
 *
 * L'autorisation arrive deja calculee par la page, qui l'obtient de
 * `canCreateStudy()`. Ce composant n'est qu'un confort : il evite a
 * l'utilisateur de traverser le formulaire pour se faire refuser au bout.
 * La server action de creation refait le controle de son cote — c'est elle
 * qui fait autorite.
 */
export default function BoutonNouvelleEtude({
  autorisation,
}: {
  autorisation: AutorisationCreationEtude;
}) {
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const fermeture = useRef<HTMLButtonElement>(null);

  // Echap ferme la modale, et le focus entre dedans a l'ouverture : sans ca le
  // clavier resterait sur le bouton, derriere le voile.
  useEffect(() => {
    if (!modaleOuverte) return;

    fermeture.current?.focus();
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') setModaleOuverte(false);
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [modaleOuverte]);

  const CLASSES_BOUTON =
    'inline-flex h-[50px] items-center justify-center whitespace-nowrap rounded-full ' +
    'bg-rouge-cta px-[26px] text-[15.5px] font-semibold text-white shadow-rouge ' +
    'transition-colors duration-300 ease-doux hover:bg-rouge-cta-hover active:translate-y-px';

  if (autorisation.autorise) {
    return (
      <Link href="/dashboard/etudes/nouvelle" className={CLASSES_BOUTON}>
        Nouvelle étude
      </Link>
    );
  }

  // Type garde : hors autorisation, le motif est forcement un refus.
  const message = estRefus(autorisation.motif)
    ? MESSAGES_REFUS[autorisation.motif]
    : MESSAGES_REFUS.ETUDE_OFFERTE_CONSOMMEE;

  return (
    <>
      <button type="button" onClick={() => setModaleOuverte(true)} className={CLASSES_BOUTON}>
        Nouvelle étude
      </button>

      {modaleOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setModaleOuverte(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-encre/50"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-modale-abonnement"
            className="relative w-full max-w-[440px] rounded-bloc border border-ligne bg-white p-7 shadow-bloc"
          >
            <button
              ref={fermeture}
              type="button"
              aria-label="Fermer"
              onClick={() => setModaleOuverte(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gris transition-colors hover:bg-fond-doux hover:text-encre"
            >
              <X size={18} weight="regular" />
            </button>

            <h2
              id="titre-modale-abonnement"
              className="m-0 pr-10 font-display text-[22px] leading-tight text-encre"
            >
              {message.titre}
            </h2>
            <p className="m-0 mt-3 text-[15px] leading-[1.6] text-texte-doux">{message.phrase}</p>

            <Link href="/pricing" className={`${CLASSES_BOUTON} mt-6 w-full`}>
              Voir les abonnements
            </Link>

            {/* Fermer suffit : les etudes deja realisees sont juste derriere,
                sur le dashboard. */}
            <button
              type="button"
              onClick={() => setModaleOuverte(false)}
              className="mt-4 block w-full text-center text-[13.5px] font-medium text-gris underline underline-offset-2 transition-colors hover:text-encre"
            >
              Continuer à consulter mes études
            </button>
          </div>
        </div>
      )}
    </>
  );
}
