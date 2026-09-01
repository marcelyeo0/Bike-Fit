import React from 'react';
import Bouton from '../components/Bouton';

/**
 * Redesign : la maquette de rapport construite en <div> (fausses barres, faux
 * en-tete "VOTRE LOGO") est remplacee par une photo du livrable imprime. Les
 * deux annotations restent sous l'image, jamais posees dessus.
 */
export default function Livrable() {
  return (
    <section className="mx-auto grid max-w-page grid-cols-1 items-center gap-[70px] px-7 py-[140px] lg:grid-cols-2">
      <div className="a-reveler">
        <h2 className="m-0 mb-[22px] font-display text-titre-sm uppercase text-encre">
          Le livrable que votre client emporte
        </h2>
        <p className="m-0 mb-[18px] max-w-[46ch] text-[17px] leading-[1.65] text-texte-doux">
          Un rapport de six pages, généré en une minute : angles mesurés, écarts aux plages
          recommandées, réglages appliqués sur la selle, la potence et les cales.
        </p>
        <p className="m-0 mb-[30px] max-w-[46ch] text-[17px] leading-[1.65] text-texte-doux">
          C'est ce document qui justifie le prix de la prestation et qui fait revenir le client pour
          l'ajustement suivant.
        </p>
        <Bouton href="#inscription" variante="encre" taille="md">
          Voir un rapport type
        </Bouton>
      </div>

      <div className="a-reveler">
        <div className="overflow-hidden rounded-bloc border border-ligne bg-fond-doux shadow-media">
          <img
            src={`${process.env.PUBLIC_URL}/assets/livrable-rapport.jpg`}
            alt="Pages du rapport Axio imprimées, posées sur un établi avec une clé Allen et un stylo"
            width="1024"
            height="768"
            loading="lazy"
            decoding="async"
            data-parallax="0.08"
            className="block aspect-[4/3] w-full scale-[1.1] object-cover"
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {['Votre logo, vos couleurs', 'Écart aux plages recommandées'].map((note) => (
            <span
              key={note}
              className="rounded-full border border-rouge-texte px-[13px] py-[6px] text-[13px] font-semibold text-rouge-texte"
            >
              {note}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
