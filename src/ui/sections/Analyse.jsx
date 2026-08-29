/**
 * Analyse.jsx — reprise web de `AnalysisWindow` : vidéo dominante à gauche,
 * panneau d'information fixe à droite.
 *
 * Le défilement joue le rôle du pédalier : la progression dans la section
 * fait tourner une manivelle de démonstration, l'extension du genou grandit,
 * sort de sa plage cible, et le conseil de réglage apparaît. C'est
 * exactement la boucle du logiciel, jouée à la vitesse du lecteur.
 *
 * Deux règles du bureau sont conservées telles quelles :
 *   - rafraîchissement des textes à 4 Hz (REFRESH_MS), jamais à 60 Hz ;
 *   - hystérésis avant tout changement d'état (règle anti-clignotement).
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { demoKneeAngle } from "../../core/angles";
import { DEFAULT_RANGES } from "../../core/ranges";
import { ALL_IN_RANGE, diagnose } from "../../core/feedback";
import Card, { CardHeader } from "../components/Card";
import JointRow from "../components/JointRow";
import { COLORS, HYSTERESIS_FRAMES, REFRESH_MS } from "../theme";
import { prefersReducedMotion } from "../anim";

gsap.registerPlugin(ScrollTrigger);

/** Nombre de tours de manivelle parcourus sur la hauteur de la section. */
const REVOLUTIONS = 4;
const HOLD_TICKS = Math.max(1, Math.round(HYSTERESIS_FRAMES / 4));

/**
 * Coude, épaule et hanche sont quasi statiques pendant le pédalage : le
 * logiciel en juge la moyenne (ou le minimum pour la hanche). On affiche
 * des valeurs plausibles et stables, dans leur plage.
 */
const STATIC_VALUES = { hip: 52, elbow: 158, shoulder: 92 };

const JOINTS = ["knee", "hip", "elbow", "shoulder"];

export default function Analyse() {
  const rootRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const knee = DEFAULT_RANGES.knee;
    const valueEl = (joint) => root.querySelector(`[data-value="${joint}"]`);
    const dotEl = (joint) => root.querySelector(`[data-dot="${joint}"]`);
    const stateEl = (joint) => root.querySelector(`[data-state="${joint}"]`);
    const bigValue = root.querySelector("[data-big-value]");
    const adviceEl = root.querySelector("[data-advice]");

    /** Écrit une articulation : valeur, pastille, et texte pour lecteur d'écran. */
    const paint = (joint, angle, range) => {
      const inRange = range.contains(angle);
      valueEl(joint).textContent = `${Math.round(angle)}°`;
      dotEl(joint).style.color = inRange ? COLORS.stateIn : COLORS.stateOut;
      stateEl(joint).textContent = inRange ? "dans la plage" : "hors plage";
    };

    // Les articulations stables sont peintes une fois pour toutes.
    Object.entries(STATIC_VALUES).forEach(([joint, angle]) =>
      paint(joint, angle, DEFAULT_RANGES[joint])
    );

    // Mouvement réduit : une image arrêtée du logiciel, tout dans la plage.
    if (prefersReducedMotion()) {
      paint("knee", 146, knee);
      bigValue.textContent = "146°";
      adviceEl.textContent = ALL_IN_RANGE;
      return undefined;
    }

    // Première peinture : la section est lisible avant tout défilement.
    // Le panneau montre la valeur JUGÉE (le maximum d'extension sur un tour,
    // JUDGE_STAT.knee), l'incrustation vidéo montre l'angle instantané.
    paint("knee", demoKneeAngle(0.5), knee);
    bigValue.textContent = `${Math.round(demoKneeAngle(0.5))}°`;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: "top 75%",
        end: "bottom 45%",
        scrub: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    }, root);

    let shown = null;
    let candidate = null;
    let held = 0;

    const id = setInterval(() => {
      if (document.hidden) return;
      const progress = progressRef.current;
      // L'amplitude grandit avec la lecture : la selle finit trop haute,
      // l'extension dépasse la plage, et le conseil se déclenche.
      const amplitude = 1 + progress * 0.25;
      // Angle instantané : ce que l'incrustation affiche sur la vidéo.
      const angle = demoKneeAngle((progress * REVOLUTIONS) % 1, amplitude);
      bigValue.textContent = `${Math.round(angle)}°`;

      // Valeur jugée : l'extension maximale du tour, atteinte au point mort
      // bas. C'est elle que la rangée d'articulation affiche et que le
      // logiciel compare à la plage cible.
      const judged = demoKneeAngle(0.5, amplitude);
      paint("knee", judged, knee);

      const next = knee.contains(judged) ? "in" : "out";
      if (next === candidate) held += 1;
      else {
        candidate = next;
        held = 1;
      }
      if (held >= HOLD_TICKS && candidate !== shown) {
        shown = candidate;
        const finding = diagnose("knee", judged, knee);
        adviceEl.textContent = finding
          ? `${finding.constat} ${finding.action}`
          : ALL_IN_RANGE;
      }
    }, REFRESH_MS);

    return () => {
      clearInterval(id);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="analyse"
      ref={rootRef}
      className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32"
    >
      <div className="max-w-measure" data-reveal>
        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
          Ce que le vélociste lit pendant la séance.
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
          La vidéo garde sa pleine cadence, les chiffres se rafraîchissent quatre
          fois par seconde, et l'état d'une articulation ne bascule qu'après
          0,4 seconde stable.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_340px]" data-reveal>
        {/* Cadre vidéo : panneau sombre, coins 16 px, comme dans l'application. */}
        <figure className="m-0 overflow-hidden rounded-surface bg-dark">
          <img
            src={`${process.env.PUBLIC_URL}/asset/bikefit_bg.jpg`}
            alt="Cycliste de profil sur home-trainer, angles articulaires tracés sur l'image."
            className="aspect-video w-full object-cover"
            width="808"
            height="454"
          />
          {/* Valeur courante en grand + plage cible en petit, sur fond sombre :
              c'est l'incrustation que l'application dessine sur la vidéo. */}
          <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-4">
            <span className="text-[13px] text-ink-ondarksoft">
              Vue de profil, cycliste sur home-trainer.
            </span>
            <span className="flex items-baseline gap-3">
              <span className="text-[13px] text-ink-ondarksoft">Genou</span>
              <span
                data-big-value
                className="font-mono text-[26px] font-bold tabular-nums leading-none text-ink-ondark"
              >
                —
              </span>
              <span className="text-[13px] text-ink-ondarksoft">
                cible {DEFAULT_RANGES.knee.minDeg}-{DEFAULT_RANGES.knee.maxDeg}°
              </span>
            </span>
          </figcaption>
        </figure>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>Articulations</CardHeader>
            {JOINTS.map((joint, index) => (
              <JointRow
                key={joint}
                joint={joint}
                range={DEFAULT_RANGES[joint]}
                last={index === JOINTS.length - 1}
              />
            ))}
          </Card>

          <Card className="flex-1">
            <CardHeader>Conseils en direct</CardHeader>
            <p
              data-advice
              aria-live="polite"
              className="text-[15px] leading-relaxed text-ink"
            >
              Pédale normalement, j'observe ta position.
            </p>
          </Card>

          <p className="text-xs leading-relaxed text-ink-soft">
            Valeurs de démonstration, pilotées par le défilement de cette page.
            Les plages affichées sont les plages standard du logiciel, celles
            qui servent hors ligne.
          </p>
        </div>
      </div>
    </section>
  );
}
