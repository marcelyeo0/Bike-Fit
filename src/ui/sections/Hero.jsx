/**
 * Hero.jsx — reprise fidèle du split asymétrique de `SetupWindow`.
 *
 * Panneau de marque sombre à gauche (2fr), contenu à droite (3fr). La marque
 * est ancrée EN BAS : le vide au-dessus est un choix du design system, rien
 * ne vient le combler. Sur mobile, le panneau devient une bande haute et le
 * contenu passe en colonne unique.
 *
 * La carte de démonstration reprend l'INCRUSTATION que l'application dessine
 * sur la vidéo : l'angle courant, en grand, avec sa plage cible dessous. La
 * valeur balaie donc tout un coup de pédale, de la flexion haute à
 * l'extension basse. C'est la mesure instantanée, pas la valeur jugée : le
 * verdict par articulation se lit plus bas, dans la section de mesure.
 */

import { useEffect, useRef } from "react";

import { demoKneeAngle } from "../../core/angles";
import { DEFAULT_RANGES } from "../../core/ranges";
import Button from "../components/Button";
import { CardHeader } from "../components/Card";
import { REFRESH_MS } from "../theme";
import { prefersReducedMotion } from "../anim";

/** Un tour de pédale de démonstration, ralenti pour rester lisible. */
const REVOLUTION_MS = 2400;

export default function Hero() {
  const valueRef = useRef(null);
  const knee = DEFAULT_RANGES.knee;

  useEffect(() => {
    const value = valueRef.current;
    if (!value) return undefined;

    // Point mort bas : l'extension maximale, la valeur que le logiciel juge.
    const write = (phase) => {
      value.textContent = `${Math.round(demoKneeAngle(phase))}°`;
    };
    write(0.5);

    // Mouvement réduit : la valeur reste posée sur l'extension basse.
    if (prefersReducedMotion()) return undefined;

    let elapsed = 0;
    const id = setInterval(() => {
      if (document.hidden) return;   // onglet caché : rien à animer
      elapsed += REFRESH_MS;
      write((elapsed % REVOLUTION_MS) / REVOLUTION_MS);
    }, REFRESH_MS);

    return () => clearInterval(id);
  }, []);

  return (
    <section id="top" className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[2fr_3fr]">
      {/* Panneau de marque : tout est poussé en bas, la zone haute reste vide. */}
      <div className="flex flex-col justify-end bg-dark px-6 py-12 lg:px-10 lg:py-9">
        <p className="font-display text-[34px] font-bold leading-none tracking-tight text-ink-ondark">
          BikeFit
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-ondarksoft">
          Analyse posturale en temps réel.
          <br />
          Ta position, mesurée et corrigée.
        </p>
        <span className="mt-4 h-[3px] w-12 rounded-[2px] bg-accent" aria-hidden="true" />
      </div>

      <div className="flex flex-col justify-center gap-8 px-6 py-16 lg:px-16 lg:py-24">
        <div>
          <h1 className="max-w-[22ch] font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-5xl lg:text-[54px]">
            Quatre angles, mesurés pendant qu'il pédale.
          </h1>
          <p className="mt-5 max-w-measure text-[17px] leading-relaxed text-ink-soft">
            Une webcam de profil suffit. Chaque écart devient un réglage chiffré,
            en millimètres, pendant la séance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button href="#telecharger">Télécharger</Button>
          <Button href="#flux" variant="ghost">
            Voir le flux
          </Button>
        </div>

        <div className="max-w-sm rounded-surface bg-card p-4">
          <CardHeader>Démonstration</CardHeader>
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[15px] text-ink">Genou</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                cible (max) {knee.minDeg}-{knee.maxDeg}°
              </p>
            </div>
            <span
              ref={valueRef}
              aria-hidden="true"
              className="w-[86px] text-right font-mono text-[28px] font-bold tabular-nums leading-none text-ink"
            >
              —
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
