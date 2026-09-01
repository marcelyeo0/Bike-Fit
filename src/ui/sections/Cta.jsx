import React from 'react';
import Bouton from '../components/Bouton';

/** Cailloux CSS de la section sombre : formes organiques, pas d'image a charger. */
const CAILLOUX = [
  {
    pos: 'left-[5%] top-[22%]',
    taille: 'h-12 w-[70px]',
    rayon: '60% 40% 55% 45% / 68% 58% 42% 32%',
    fond: 'linear-gradient(150deg,#6E655C,#3B3631)',
    r: '-12deg',
    duree: '8s',
    force: 0.22,
  },
  {
    pos: 'bottom-[20%] right-[7%]',
    taille: 'h-8 w-[46px]',
    rayon: '55% 45% 60% 40% / 60% 55% 45% 40%',
    fond: 'linear-gradient(150deg,#7A7168,#403A35)',
    r: '16deg',
    duree: '10s',
    force: 0.36,
  },
  {
    pos: 'right-[22%] top-[16%]',
    taille: 'h-5 w-7',
    rayon: '58% 42% 50% 50% / 62% 58% 42% 38%',
    fond: 'linear-gradient(150deg,#655D55,#37322E)',
    r: '-20deg',
    duree: '9s',
    force: 0.3,
  },
];

export default function Cta() {
  return (
    <section id="inscription" className="relative overflow-hidden bg-encre">
      {CAILLOUX.map((caillou, i) => (
        <div
          key={i}
          data-parallax={caillou.force}
          aria-hidden="true"
          className={`pointer-events-none absolute hidden md:block ${caillou.pos} ${caillou.taille}`}
        >
          <div
            className="h-full w-full animate-flotte shadow-[0_24px_24px_-16px_rgba(0,0,0,.7)]"
            style={{
              '--r': caillou.r,
              animationDuration: caillou.duree,
              borderRadius: caillou.rayon,
              background: caillou.fond,
            }}
          />
        </div>
      ))}

      <div className="relative mx-auto max-w-[1000px] px-7 py-[150px] text-center">
        <h2 className="a-reveler m-0 mb-[26px] font-display text-titre-lg uppercase text-white">
          Ouvrez votre
          <br />
          studio de fitting
        </h2>
        <p className="a-reveler mx-auto mb-[38px] max-w-[520px] text-[17.5px] leading-[1.6] text-[#A9A9A9]">
          Quatorze jours d'essai, sans carte bancaire. Votre premier client passe sur le
          home-trainer cette semaine.
        </p>
        <div className="a-reveler flex flex-wrap justify-center gap-3">
          <Bouton href="#inscription" taille="lg">
            Commencer
          </Bouton>
          <Bouton href="#contact" variante="contour-sombre" taille="lg">
            Réserver une démo
          </Bouton>
        </div>
      </div>
    </section>
  );
}
