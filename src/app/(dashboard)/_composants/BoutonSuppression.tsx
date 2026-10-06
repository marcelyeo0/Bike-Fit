'use client';

import React, { useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { BOUTON_CONTOUR, BOUTON_DANGER } from './classes';

/**
 * Suppression en deux temps : un premier clic revele la confirmation, un
 * second envoie le formulaire.
 *
 * Composant client pour ce seul etat local. Il ne decide de rien : `action`
 * est une server action qui refait le controle d'identite et d'appartenance
 * de l'identifiant — ce bouton n'est qu'un garde-fou contre le clic de trop.
 */
export default function BoutonSuppression({
  action,
  identifiant,
  libelle,
  avertissement,
}: {
  action: (donnees: FormData) => void | Promise<void>;
  identifiant: string;
  libelle: string;
  /** Ce qui sera perdu, dit en clair. */
  avertissement: string;
}) {
  const [confirmation, setConfirmation] = useState(false);

  if (!confirmation) {
    return (
      <button type="button" onClick={() => setConfirmation(true)} className={BOUTON_DANGER}>
        <Trash size={17} weight="regular" />
        {libelle}
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={identifiant} />

      <p role="alert" className="m-0 text-[14px] leading-[1.6] text-encre">
        {avertissement} Cette action est définitive.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-[42px] w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full bg-rouge-cta px-[18px] text-sm font-semibold text-white transition-colors duration-300 ease-doux hover:bg-rouge-cta-hover"
        >
          <Trash size={17} weight="regular" />
          Confirmer la suppression
        </button>

        <button type="button" onClick={() => setConfirmation(false)} className={BOUTON_CONTOUR}>
          Annuler
        </button>
      </div>
    </form>
  );
}
