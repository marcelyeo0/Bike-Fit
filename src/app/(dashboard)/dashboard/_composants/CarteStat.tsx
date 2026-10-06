import React from 'react';

/**
 * Une des quatre tuiles de compteurs. Purement presentationnel : la valeur
 * arrive deja calculee par la requete agregee.
 */
export default function CarteStat({
  libelle,
  valeur,
  precision,
  accent = false,
}: {
  libelle: string;
  valeur: number;
  precision: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-bloc border border-ligne bg-white p-6">
      <p className="m-0 font-mono text-[11px] uppercase tracking-[.08em] text-gris">
        {libelle}
      </p>
      <p
        className={`m-0 mt-3 font-display text-[38px] leading-none tracking-[-0.02em] ${
          accent ? 'text-rouge' : 'text-encre'
        }`}
      >
        {valeur}
      </p>
      <p className="m-0 mt-2 text-[13px] leading-[1.5] text-texte-doux">{precision}</p>
    </div>
  );
}
