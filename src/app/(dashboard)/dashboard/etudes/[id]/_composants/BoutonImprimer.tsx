'use client';

import React from 'react';
import { Printer } from '@phosphor-icons/react';
import { BOUTON_CONTOUR } from '../../../../_composants/classes';

/**
 * Ouvre la boite d'impression du navigateur. Le compte rendu n'est pas un PDF
 * genere par le serveur : c'est cette page, mise en forme par la feuille de
 * style d'impression. « Enregistrer en PDF » se choisit dans la boite.
 *
 * Composant client pour le seul `window.print()`.
 */
export default function BoutonImprimer() {
  return (
    <button type="button" onClick={() => window.print()} className={BOUTON_CONTOUR}>
      <Printer size={17} weight="regular" />
      Imprimer
    </button>
  );
}
