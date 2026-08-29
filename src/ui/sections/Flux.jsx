/**
 * Flux.jsx — les quatre écrans du logiciel, parcourus horizontalement.
 *
 * Pourquoi un défilement horizontal ici, et nulle part ailleurs : le
 * logiciel est une ligne droite, du questionnaire au bilan. Le mouvement
 * raconte cette progression, il ne décore pas. Le panneau est épinglé
 * (`start: "top top"`) et la piste glisse à la longueur exacte de son
 * débordement.
 *
 * Sous 768 px, ou en mouvement réduit, la piste redevient une simple pile
 * verticale : aucune capture du défilement sur mobile.
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { DEFAULT_RANGES, FLOW_STEPS, PROFILE_QUESTIONS } from "../../core/ranges";
import { JOINT_LABELS, LEGAL_NOTICE } from "../../core/feedback";
import { JUDGE_STAT } from "../../core/angles";
import Segmented from "../components/Segmented";

gsap.registerPlugin(ScrollTrigger);

/** Aperçu réel du composant de questionnaire (deux questions sur six). */
function ProfilPreview() {
  return (
    <div className="grid gap-4">
      {PROFILE_QUESTIONS.slice(0, 2).map((question) => (
        <div key={question.label}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            {question.label}
          </p>
          <Segmented
            name={question.label}
            values={question.values}
            value={question.value}
          />
          <p className="mt-2 text-xs text-ink-soft">{question.why}</p>
        </div>
      ))}
    </div>
  );
}

/** Les quatre fourchettes renvoyées au questionnaire. */
function PlagesPreview() {
  return (
    <div>
      {Object.entries(DEFAULT_RANGES).map(([joint, range], index, all) => (
        <div
          key={joint}
          className={`flex items-baseline justify-between gap-4 py-2.5 ${
            index === all.length - 1 ? "" : "border-b border-rule"
          }`}
        >
          <span className="text-[15px] text-ink">{JOINT_LABELS[joint]}</span>
          <span className="flex items-baseline gap-3">
            <span className="text-xs text-ink-soft">{JUDGE_STAT[joint]}</span>
            <span className="font-mono text-[15px] font-bold tabular-nums text-ink">
              {range.minDeg}-{range.maxDeg}°
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** L'incrustation de mesure, sur le fond sombre du cadre vidéo. */
function AnalysePreview() {
  return (
    <div className="rounded-surface bg-dark px-5 py-6">
      <p className="text-[13px] text-ink-ondarksoft">Genou</p>
      <p className="mt-1 font-mono text-[40px] font-bold leading-none tabular-nums text-ink-ondark">
        146°
      </p>
      <p className="mt-2 text-[13px] text-ink-ondarksoft">
        cible (max) {DEFAULT_RANGES.knee.minDeg}-{DEFAULT_RANGES.knee.maxDeg}°
      </p>
    </div>
  );
}

/** La fin de séance : un texte à lire à deux, plus la mention obligatoire. */
function BilanPreview() {
  return (
    <div className="rounded-surface border border-rule p-4">
      <p className="text-[15px] leading-relaxed text-ink">
        Genou dans la plage sur toute la séance. Hanche fermée de 4° sous la
        cible en fin d'effort : à surveiller si le bas du dos tire.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">{LEGAL_NOTICE}</p>
    </div>
  );
}

const PREVIEWS = {
  profil: ProfilPreview,
  plages: PlagesPreview,
  analyse: AnalysePreview,
  bilan: BilanPreview,
};

export default function Flux() {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return undefined;

    // L'épinglage n'existe qu'au-dessus de 768 px et hors mouvement réduit.
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      () => {
        const distance = () => track.scrollWidth - window.innerWidth;
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
        return () => tween.kill();
      }
    );

    return () => mm.revert();
  }, []);

  return (
    <section id="flux" className="bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 pt-24 lg:px-10 lg:pt-32" data-reveal>
        <h2 className="max-w-[18ch] font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
          Du questionnaire au bilan, en une ligne droite.
        </h2>
        <p className="mt-4 max-w-measure text-[17px] leading-relaxed text-ink-soft">
          Quatre écrans, dans cet ordre, sans menu ni réglage caché. Le vélociste
          garde les mains libres pendant que le client pédale.
        </p>
      </div>

      <div ref={wrapRef} className="relative overflow-hidden">
        <div
          ref={trackRef}
          className="flex flex-col gap-6 px-6 py-12 md:h-[100dvh] md:flex-row md:items-center md:gap-8 md:px-10 md:py-0"
        >
          {FLOW_STEPS.map((step) => {
            const Preview = PREVIEWS[step.key];
            return (
              <article
                key={step.key}
                className="flex w-full shrink-0 flex-col gap-5 rounded-surface bg-card p-6 md:w-[clamp(360px,34vw,520px)] md:p-8"
              >
                <div>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[15px] font-semibold text-ink">{step.lead}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </div>
                <Preview />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
