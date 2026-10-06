import React from 'react';
import { BLOC } from './classes';

/**
 * Etat vide d'une liste : une photo, une phrase, une action.
 *
 * Les photos viennent de `public/assets/` (celles de la landing) : aucune
 * image n'est generee ni importee pour le dashboard. `alt` vide — la photo est
 * decorative, le sens est porte par le titre et le texte.
 */
export default function EtatVide({
  image,
  titre,
  children,
  action,
}: {
  image: string;
  titre: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${BLOC} grid overflow-hidden md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}>
      <img
        src={image}
        alt=""
        loading="lazy"
        className="h-[200px] w-full object-cover md:h-full md:min-h-[260px]"
      />

      <div className="flex flex-col justify-center p-7 md:p-9">
        <h2 className="m-0 font-display text-[22px] leading-tight text-encre">{titre}</h2>
        <div className="mt-3 text-[15px] leading-[1.6] text-texte-doux">{children}</div>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
