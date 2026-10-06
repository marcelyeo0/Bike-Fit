import React from 'react';
import { BORNES_ENTREJAMBE, BORNES_TAILLE } from '../../../lib/saisie';
import { CHAMP, ETIQUETTE } from './classes';

/**
 * Les deux champs de mensurations d'une fiche client, a poser dans un
 * `<form>`. Partages par la creation et la modification.
 *
 * Ce sont les SEULS champs de saisie d'un client : pas de nom, pas de contact,
 * pas de commentaire. Les bornes `min`/`max` du navigateur sont un confort ;
 * la server action revalide avec les memes bornes.
 */
export default function ChampsMensurations({
  prefixe,
  tailleCm = null,
  entrejambeCm = null,
}: {
  /** Distingue les `id` quand deux formulaires cohabitent sur une page. */
  prefixe: string;
  tailleCm?: number | null;
  entrejambeCm?: number | null;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label htmlFor={`${prefixe}-taille`} className={ETIQUETTE}>
          Taille <span className="font-normal text-gris">(cm, facultatif)</span>
        </label>
        <input
          id={`${prefixe}-taille`}
          name="tailleCm"
          type="number"
          inputMode="decimal"
          step="0.5"
          min={BORNES_TAILLE.min}
          max={BORNES_TAILLE.max}
          defaultValue={tailleCm ?? ''}
          placeholder="178"
          className={CHAMP}
        />
      </div>

      <div>
        <label htmlFor={`${prefixe}-entrejambe`} className={ETIQUETTE}>
          Entrejambe <span className="font-normal text-gris">(cm, facultatif)</span>
        </label>
        <input
          id={`${prefixe}-entrejambe`}
          name="entrejambeCm"
          type="number"
          inputMode="decimal"
          step="0.5"
          min={BORNES_ENTREJAMBE.min}
          max={BORNES_ENTREJAMBE.max}
          defaultValue={entrejambeCm ?? ''}
          placeholder="84"
          className={CHAMP}
        />
      </div>
    </div>
  );
}
