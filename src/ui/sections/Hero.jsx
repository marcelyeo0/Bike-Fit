import React from 'react';
import Bouton from '../components/Bouton';

/** Cailloux flottants du hero. La parallaxe est portee par le conteneur,
 *  le flottement par l'enfant : les deux transforms ne se marchent pas dessus. */
const CAILLOUX = [
  { src: 'rock-1-cut.png', force: 0.18, pos: 'left-[6%] top-[24%]', taille: 'w-[150px]', r: '-14deg', duree: '7s', delai: '.3s' },
  { src: 'rock-2-cut.png', force: 0.32, pos: 'right-[8%] top-[16%]', taille: 'w-[104px]', r: '12deg', duree: '9s', delai: '.42s' },
  { src: 'rock-2-cut.png', force: 0.5, pos: 'right-[15%] bottom-[20%]', taille: 'w-[62px]', r: '-6deg', duree: '8s', delai: '.54s' },
  { src: 'rock-1-cut.png', force: 0.42, pos: 'left-[13%] bottom-[24%]', taille: 'w-[82px]', r: '20deg', duree: '10s', delai: '.66s' },
];

const ANGLES = [
  { valeur: '145°', nom: 'HANCHE', style: { left: '76%', top: '22.4%' }, ancre: '-translate-y-1/2', delai: '1.6s' },
  { valeur: '72°', nom: 'GENOU', style: { left: '25.5%', top: '49.2%' }, ancre: '-translate-x-full -translate-y-1/2', delai: '1.7s' },
  { valeur: '90°', nom: 'COUDE', style: { left: '25%', top: '22.4%' }, ancre: '-translate-x-full -translate-y-1/2', delai: '1.8s' },
  { valeur: '104°', nom: 'CHEVILLE', style: { left: '76%', top: '64.1%' }, ancre: '-translate-y-1/2', delai: '1.9s' },
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100dvh] flex-col items-center px-6 pb-[110px] pt-[70px]"
    >
      {/* Type fantome : le titre de la page, pose derriere le visuel. */}
      <h1 className="pointer-events-none absolute inset-0 flex flex-col items-center overflow-hidden pt-[60px] text-center">
        <span className="type-fantome animate-monte whitespace-nowrap font-display text-fantome">
          RÉGLAGE
        </span>
        <span
          className="type-fantome-2 animate-monte whitespace-nowrap font-display text-fantome"
          style={{ animationDelay: '.13s' }}
        >
          SUR MESURE
        </span>
      </h1>

      {CAILLOUX.map((caillou, i) => (
        <div
          key={`${caillou.src}-${i}`}
          data-parallax={caillou.force}
          className={`pointer-events-none absolute hidden ${caillou.pos} ${caillou.taille} md:block`}
        >
          <div
            className="animate-flotte"
            style={{ '--r': caillou.r, animationDuration: caillou.duree }}
          >
            <img
              src={`${process.env.PUBLIC_URL}/assets/${caillou.src}`}
              alt=""
              aria-hidden="true"
              className="block w-full animate-monte drop-shadow-[0_22px_18px_rgba(0,0,0,.22)]"
              style={{ animationDelay: caillou.delai }}
              loading="eager"
            />
          </div>
        </div>
      ))}

      <div className="relative mt-[clamp(24px,5vw,64px)] flex w-full max-w-[680px] justify-center">
        <div className="relative w-full">
          <div className="relative w-full">
            <img
              src={`${process.env.PUBLIC_URL}/assets/hero-cyclist.png`}
              alt="Cycliste sur home-trainer posé sur un îlot rocheux flottant"
              width="1000"
              height="671"
              className="block h-auto w-full animate-monte mix-blend-multiply"
              style={{ animationDelay: '.85s' }}
              fetchPriority="high"
            />
            <svg
              viewBox="0 0 1000 671"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full animate-apparait"
              style={{ animationDelay: '1.45s' }}
            >
              <g stroke="#E8332A" strokeWidth="1.5" opacity=".7">
                <path d="M565 210 L760 150" />
                <path d="M470 200 L250 150" />
                <path d="M515 285 L255 330" />
                <path d="M540 355 L760 430" />
              </g>
              <g fill="none" stroke="#E8332A" strokeWidth="4" strokeLinecap="round">
                <path d="M545 180 A36 36 0 0 0 545 240" />
                <path d="M533 258 A32 32 0 0 1 526 315" />
                <path d="M531 331 A26 26 0 0 1 562 370" />
                <path d="M492 180 A30 30 0 0 1 445 216" />
              </g>
              <g fill="#E8332A">
                <circle cx="565" cy="210" r="5" />
                <circle cx="515" cy="285" r="5" />
                <circle cx="540" cy="355" r="5" />
                <circle cx="470" cy="200" r="5" />
              </g>
            </svg>
          </div>

          {/* Les etiquettes debordent du cadre sous 768px : sur mobile on ne
              garde que le visuel et son trace SVG. */}
          {ANGLES.map((angle) => (
            <div
              key={angle.nom}
              style={{ ...angle.style, animationDelay: angle.delai }}
              className={`absolute hidden animate-apparait md:block ${angle.ancre}`}
            >
              <div className="whitespace-nowrap rounded-full border border-ligne-douce bg-white px-[14px] py-2 font-condensed text-[17px] font-bold text-rouge-texte shadow-[0_14px_26px_-14px_rgba(0,0,0,.35)]">
                {angle.valeur}
                <span className="ml-2 text-[12.5px] font-semibold tracking-[.06em] text-gris">
                  {angle.nom}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="relative z-[3] mt-9 max-w-[620px] animate-monte text-center"
        style={{ animationDelay: '1.15s' }}
      >
        <p className="m-0 text-[19px] leading-[1.55] text-[#4A4A4A] [text-wrap:pretty]">
          L'analyse de posture qui transforme votre atelier en studio de bike fit. Sans capteurs,
          sans cabine dédiée.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Bouton href="#inscription" taille="lg">
            Commencer
          </Bouton>
          <Bouton href="#contact" variante="contour" taille="lg">
            Réserver une démo
          </Bouton>
        </div>
      </div>
    </section>
  );
}
