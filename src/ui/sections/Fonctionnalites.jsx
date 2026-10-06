import React from 'react';
import { Compass, FilePdf, ClockCounterClockwise, ArrowsLeftRight } from '@phosphor-icons/react';

/**
 * Redesign : le canvas empilait cinq cartes blanches avec des faux graphiques
 * en <div>. Ici la cellule large porte une vraie photo annotee, et les quatre
 * autres alternent trois fonds (blanc, encre, gris doux) avec des icones d'une
 * seule famille (Phosphor, poids regular, 30px partout).
 */
const CELLULES = [
  {
    titre: "Plages d'angles par discipline",
    texte: 'Route, gravel, VTT, triathlon : les références changent selon la pratique du client.',
    Icone: Compass,
    span: 'lg:col-span-3',
    fond: 'bg-encre',
    titreClasse: 'text-white',
    texteClasse: 'text-[#A9A9A9]',
    bordure: 'border-encre',
    iconeClasse: 'text-rouge',
  },
  {
    titre: 'Rapport PDF à votre marque',
    texte:
      'Votre logo, vos couleurs, vos coordonnées. Le client repart avec un document signé de votre magasin.',
    Icone: FilePdf,
    span: 'lg:col-span-3',
    fond: 'bg-white',
    titreClasse: 'text-encre',
    texteClasse: 'text-texte-doux',
    bordure: 'border-ligne',
    iconeClasse: 'text-rouge-texte',
  },
  {
    titre: 'Historique et fiches clients',
    texte: 'Chaque analyse est rattachée à une fiche. Retrouvez les réglages posés il y a six mois.',
    Icone: ClockCounterClockwise,
    span: 'lg:col-span-2',
    fond: 'bg-fond-doux',
    titreClasse: 'text-encre',
    texteClasse: 'text-texte-doux',
    bordure: 'border-ligne',
    iconeClasse: 'text-rouge-texte',
  },
  {
    titre: 'Comparaison avant / après',
    texte:
      'Deux analyses côte à côte : la preuve visuelle que votre réglage a changé quelque chose.',
    Icone: ArrowsLeftRight,
    span: 'lg:col-span-4',
    fond: 'bg-white',
    titreClasse: 'text-encre',
    texteClasse: 'text-texte-doux',
    bordure: 'border-ligne',
    iconeClasse: 'text-rouge-texte',
  },
];

export default function Fonctionnalites() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-page px-7 pt-[130px]">
      <h2 className="a-reveler m-0 mb-[60px] font-display text-titre text-encre">
        Fonctionnalités
      </h2>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-6">
        {/* Cellule large : la photo porte le propos, pas un graphique dessine. */}
        <article className="a-reveler grid grid-cols-1 items-center gap-9 overflow-hidden rounded-bloc border border-ligne bg-gradient-to-b from-white to-[#FBFBFA] p-6 lg:col-span-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:p-11">
          <div className="max-w-[480px]">
            <h3 className="m-0 mb-[14px] text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-encre">
              Détection de posture image par image
            </h3>
            <p className="m-0 text-[16.5px] leading-[1.6] text-texte-doux">
              Le squelette est suivi sur chaque image de la vidéo. Vous obtenez les valeurs
              minimales, maximales et moyennes de chaque articulation sur le cycle de pédalage
              complet.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-media bg-[#F2F2F1]">
            <img
              src="/assets/feature-pose.jpg"
              alt="Cycliste de profil sur home-trainer, articulations relevées par l'analyse"
              width="1024"
              height="576"
              loading="lazy"
              decoding="async"
              className="block aspect-[16/9] w-full object-cover"
            />
            {/* Reperes articulaires poses sur la photo : c'est la lecture que fait
                le logiciel, pas une decoration. */}
            <svg
              viewBox="0 0 1024 576"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {/* Hanche, genou, cheville, puis coude et poignet : positions
                  relevees sur la photo, pas des points decoratifs. */}
              <g stroke="#E8332A" strokeWidth="2.5" fill="none" strokeLinecap="round">
                <path d="M464 118 L506 236" />
                <path d="M506 236 L458 386" />
                <path d="M620 40 L669 178" />
              </g>
              <g fill="#fff" stroke="#E8332A" strokeWidth="3">
                <circle cx="464" cy="118" r="7" />
                <circle cx="506" cy="236" r="7" />
                <circle cx="458" cy="386" r="7" />
                <circle cx="620" cy="40" r="7" />
                <circle cx="669" cy="178" r="7" />
              </g>
            </svg>
          </div>
        </article>

        {CELLULES.map((cellule, i) => {
          const { Icone } = cellule;
          return (
            <article
              key={cellule.titre}
              data-reveal-index={i}
              className={`a-reveler flex min-h-[210px] flex-col justify-between gap-5 rounded-bloc border p-8 ${cellule.span} ${cellule.fond} ${cellule.bordure}`}
            >
              <Icone size={30} weight="regular" className={cellule.iconeClasse} aria-hidden="true" />
              <div>
                <h3
                  className={`m-0 mb-[10px] text-[19px] font-semibold tracking-[-0.01em] ${cellule.titreClasse}`}
                >
                  {cellule.titre}
                </h3>
                <p className={`m-0 text-[15.5px] leading-[1.6] ${cellule.texteClasse}`}>
                  {cellule.texte}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
