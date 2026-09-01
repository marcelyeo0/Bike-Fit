import React from 'react';
import { Check } from '@phosphor-icons/react';
import Bouton from '../components/Bouton';

const FORMULES = [
  {
    nom: 'Essentiel',
    prix: '49 €',
    lignes: ['1 poste, 1 utilisateur', 'Analyses illimitées', 'Rapport PDF standard'],
    mise_en_avant: false,
    action: 'Choisir',
  },
  {
    nom: 'Atelier',
    prix: '89 €',
    lignes: [
      '3 utilisateurs',
      'Rapport à votre marque',
      'Comparaison avant / après',
      'Fiches clients illimitées',
    ],
    mise_en_avant: true,
    action: 'Commencer',
  },
  {
    nom: 'Multi-sites',
    prix: '169 €',
    lignes: [
      "Jusqu'à 5 magasins",
      'Utilisateurs illimités',
      'Base clients partagée',
      'Support prioritaire',
    ],
    mise_en_avant: false,
    action: 'Choisir',
  },
];

export default function Tarifs() {
  return (
    <section id="tarifs" className="mx-auto max-w-page px-7 pb-[140px]">
      <div className="a-reveler mb-14 max-w-[640px]">
        <h2 className="m-0 font-display text-titre uppercase text-encre">Tarifs</h2>
        <p className="mt-5 max-w-[42ch] text-[16.5px] leading-[1.6] text-texte-doux">
          Sans engagement. Analyses illimitées sur toutes les formules.
        </p>
      </div>

      <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-3">
        {FORMULES.map((formule, i) => (
          <article
            key={formule.nom}
            data-reveal-index={i}
            className={`a-reveler relative flex flex-col gap-6 rounded-bloc bg-white p-9 ${
              formule.mise_en_avant
                ? 'border border-encre py-11 shadow-bloc'
                : 'border border-ligne'
            }`}
          >
            {formule.mise_en_avant && (
              <span className="absolute -top-[13px] left-9 rounded-full bg-rouge-cta px-[14px] py-[5px] text-xs font-semibold tracking-[.04em] text-white">
                Le plus choisi
              </span>
            )}

            <div>
              <h3 className="m-0 font-condensed text-xl font-bold uppercase tracking-[.04em] text-encre">
                {formule.nom}
              </h3>
              <p className="m-0 mt-[14px] flex items-baseline gap-[6px]">
                <span
                  className={`font-display text-encre ${
                    formule.mise_en_avant ? 'text-[52px]' : 'text-[44px]'
                  }`}
                >
                  {formule.prix}
                </span>
                <span className="text-sm text-[#8E8E8E]">/ mois</span>
              </p>
            </div>

            <ul className="m-0 flex list-none flex-col gap-[11px] p-0 text-[15.5px] text-texte-doux">
              {formule.lignes.map((ligne) => (
                <li key={ligne} className="flex items-start gap-[10px]">
                  <Check
                    size={18}
                    weight="regular"
                    className="mt-[3px] shrink-0 text-rouge-texte"
                    aria-hidden="true"
                  />
                  {ligne}
                </li>
              ))}
            </ul>

            <Bouton
              href="/sign-up"
              variante={formule.mise_en_avant ? 'primaire' : 'contour'}
              taille="md"
              className="w-full"
            >
              {formule.action}
            </Bouton>
          </article>
        ))}
      </div>

      <p className="a-reveler mt-9 text-center">
        <a
          href="#contact"
          className="border-b border-rouge-texte pb-[2px] text-[15px] font-semibold text-rouge-texte transition-colors hover:text-encre hover:border-encre"
        >
          Comparer toutes les formules
        </a>
      </p>
    </section>
  );
}
