import React from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import type { AutorisationCreationEtude } from '../../../../lib/access';
import { MESSAGES_REFUS, estRefus } from '../../../../lib/messagesAcces';

/**
 * Bandeau discret en tete de dashboard, affiche seulement quand la creation
 * est fermee.
 *
 * Discret et non bloquant : les etudes deja realisees restent consultables,
 * seule la creation d'une nouvelle est verrouillee. Rien ici ne decide de
 * quoi que ce soit — l'autorisation vient de `canCreateStudy()`.
 */
export default function BandeauAbonnement({
  autorisation,
}: {
  autorisation: AutorisationCreationEtude;
}) {
  if (autorisation.autorise || !estRefus(autorisation.motif)) return null;

  const message = MESSAGES_REFUS[autorisation.motif];

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-ligne bg-white px-5 py-4">
      <p className="m-0 text-[14px] leading-[1.5] text-texte-doux">
        <span className="font-semibold text-encre">{message.titre}.</span> Vos études restent
        consultables ; seule la création est suspendue.
      </p>

      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13.5px] font-semibold text-rouge-texte underline underline-offset-2"
      >
        Voir les abonnements
        <ArrowRight size={15} weight="regular" />
      </Link>
    </div>
  );
}
