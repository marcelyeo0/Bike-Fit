'use client';

import React, { useState } from 'react';
import { DeviceMobileCamera, VideoCamera, Bicycle, Browser, Plus, Minus } from '@phosphor-icons/react';

/**
 * Redesign : la liste "materiel requis" du canvas etait quatre lignes avec un
 * filet sous chacune. Elle devient une grille de quatre tuiles avec icone :
 * meme information, une seule famille d'icones, plus de filets empiles.
 */
const MATERIEL = [
  { Icone: DeviceMobileCamera, texte: 'Une webcam ou un smartphone 1080p' },
  { Icone: VideoCamera, texte: 'Un trépied ou un support stable' },
  { Icone: Bicycle, texte: 'Un home-trainer' },
  { Icone: Browser, texte: 'Un navigateur récent, rien à installer' },
];

const QUESTIONS = [
  {
    q: 'Faut-il un ordinateur puissant ?',
    a: 'Non. Le traitement se fait sur nos serveurs : un portable de bureau et une connexion correcte suffisent.',
  },
  {
    q: 'Combien de temps prend une analyse ?',
    a: "Environ deux minutes entre la fin de la vidéo et le rapport prêt à imprimer. Comptez quinze minutes pour un rendez-vous complet.",
  },
  {
    q: 'Puis-je mettre mon logo sur les rapports ?',
    a: 'Oui, à partir de la formule Atelier : logo, couleurs et coordonnées de votre magasin sur chaque page.',
  },
  {
    q: 'Les vidéos sont-elles conservées ?',
    a: 'Elles sont stockées trente jours sur des serveurs en France, puis supprimées. Vous pouvez les effacer à tout moment depuis la fiche client.',
  },
];

export default function Ressources() {
  const [ouverte, setOuverte] = useState(0);

  return (
    <section className="mx-auto grid max-w-page grid-cols-1 gap-[70px] px-7 pb-[150px] lg:grid-cols-2">
      <div className="a-reveler">
        <h2 className="m-0 mb-7 font-display text-titre-sm uppercase text-encre">Matériel requis</h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
          {MATERIEL.map(({ Icone, texte }) => (
            <li
              key={texte}
              className="flex flex-col gap-4 rounded-bloc border border-ligne bg-fond-doux p-6"
            >
              <Icone size={30} weight="regular" className="text-rouge-texte" aria-hidden="true" />
              <span className="text-[16.5px] leading-[1.45] text-texte">{texte}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="a-reveler">
        <h2 className="m-0 mb-7 font-display text-titre-sm uppercase text-encre">Questions</h2>
        <div>
          {QUESTIONS.map((item, i) => {
            const estOuverte = ouverte === i;
            return (
              <div key={item.q} className="border-b border-ligne-douce">
                <h3 className="m-0">
                  <button
                    type="button"
                    aria-expanded={estOuverte}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOuverte(estOuverte ? -1 : i)}
                    className="flex w-full items-center justify-between gap-5 py-5 text-left text-[16.5px] font-semibold text-encre"
                  >
                    {item.q}
                    {estOuverte ? (
                      <Minus size={20} weight="regular" className="shrink-0 text-rouge-texte" aria-hidden="true" />
                    ) : (
                      <Plus size={20} weight="regular" className="shrink-0 text-rouge-texte" aria-hidden="true" />
                    )}
                  </button>
                </h3>
                {estOuverte && (
                  <p
                    id={`faq-${i}`}
                    className="m-0 max-w-[520px] pb-[22px] text-base leading-[1.6] text-texte-doux"
                  >
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
