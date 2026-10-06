'use client';

import React, { useState } from 'react';
import { CHAMP, ETIQUETTE } from '../../../../_composants/classes';

/**
 * Nom du cycliste, pour le compte rendu imprime uniquement.
 *
 * GARDE : ce nom ne quitte jamais le navigateur. Le champ n'a pas d'attribut
 * `name`, il n'est dans aucun `<form>`, aucune server action ne le lit et
 * rien ne l'ecrit dans le stockage local : il vit dans l'etat de ce composant
 * et disparait au rechargement. Le serveur ne connait le cycliste que par son
 * code — ne jamais brancher ce champ sur une requete.
 *
 * A l'ecran : un champ de saisie. A l'impression : la valeur saisie, ou une
 * ligne a remplir a la main si le champ est reste vide.
 */
export default function NomCycliste() {
  const [nom, setNom] = useState('');

  return (
    <>
      <div className="print:hidden">
        <label htmlFor="nom-cycliste" className={ETIQUETTE}>
          Nom du cycliste <span className="font-normal text-gris">(pour l’impression)</span>
        </label>
        <input
          id="nom-cycliste"
          type="text"
          value={nom}
          onChange={(evenement) => setNom(evenement.target.value)}
          autoComplete="off"
          maxLength={80}
          placeholder="Prénom Nom"
          className={CHAMP}
        />
        <p className="m-0 mt-2 text-[13px] leading-[1.5] text-gris">
          Reste sur cet appareil : le nom figure sur la page imprimée, il n’est ni envoyé ni
          enregistré.
        </p>
      </div>

      <p className="m-0 hidden text-[15px] text-encre print:block">
        <span className="font-semibold">Cycliste :</span>{' '}
        {nom.trim().length > 0 ? (
          nom.trim()
        ) : (
          <span className="inline-block w-[70mm] border-b border-encre align-bottom">&nbsp;</span>
        )}
      </p>
    </>
  );
}
