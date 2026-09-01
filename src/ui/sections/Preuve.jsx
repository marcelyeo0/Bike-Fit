import React from 'react';

/**
 * Marques d'ateliers fictifs. Chaque enseigne a un monogramme dessine dans le
 * style de la page plutot qu'un simple mot pose en gris : un mur de logos sans
 * logo ne prouve rien.
 */
const ENSEIGNES = [
  { nom: 'Vélocité', initiales: 'VC', forme: 'cercle' },
  { nom: 'Roule & Co', initiales: 'RC', forme: 'carre' },
  { nom: 'Atelier 14', initiales: '14', forme: 'cercle' },
  { nom: 'Cadence', initiales: 'CD', forme: 'carre' },
  { nom: 'Pignon Sud', initiales: 'PS', forme: 'cercle' },
];

function Monogramme({ initiales, forme }) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      {forme === 'cercle' ? (
        <circle cx="15" cy="15" r="14" fill="none" stroke="#2B2B2B" strokeWidth="1.6" />
      ) : (
        <rect x="1" y="1" width="28" height="28" rx="7" fill="none" stroke="#2B2B2B" strokeWidth="1.6" />
      )}
      <text
        x="15"
        y="15"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Barlow Semi Condensed, Barlow, sans-serif"
        fontSize="12"
        fontWeight="700"
        fill="#2B2B2B"
      >
        {initiales}
      </text>
    </svg>
  );
}

export default function Preuve() {
  return (
    <section className="border-y border-[#ECECEC] bg-fond-doux">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-10 px-7 py-[34px]">
        <div className="a-reveler flex items-baseline gap-[14px]">
          <span className="font-display text-[40px] tracking-[-.02em] text-encre">340</span>
          <span className="max-w-[210px] text-[14.5px] leading-[1.4] text-[#6A6A6A]">
            ateliers équipés en France et en Belgique
          </span>
        </div>

        <ul className="a-reveler m-0 flex list-none flex-wrap items-center gap-9 p-0 opacity-60">
          {ENSEIGNES.map((enseigne) => (
            <li key={enseigne.nom} className="flex items-center gap-[10px]">
              <Monogramme initiales={enseigne.initiales} forme={enseigne.forme} />
              <span className="font-condensed text-[17px] font-bold uppercase tracking-[.1em] text-[#2B2B2B]">
                {enseigne.nom}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
