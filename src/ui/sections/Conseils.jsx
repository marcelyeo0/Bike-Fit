/**
 * Conseils.jsx — les huit conseils de réglage, choisis par articulation.
 *
 * Huit conseils dans une liste à filets seraient un tableau de spécifications
 * illisible. Le contrôle segmenté du questionnaire sert ici de sélecteur :
 * on lit une articulation à la fois, ses deux directions d'écart côte à côte.
 */

import { useState } from "react";

import { DIAGNOSTICS, JOINT_LABELS } from "../../core/feedback";
import { DEFAULT_RANGES } from "../../core/ranges";
import Segmented from "../components/Segmented";

const JOINTS = ["knee", "hip", "elbow", "shoulder"];
const LABEL_TO_JOINT = Object.fromEntries(
  JOINTS.map((joint) => [JOINT_LABELS[joint], joint])
);

const DIRECTIONS = [
  { key: "high", title: "Au-dessus de la plage" },
  { key: "low", title: "En dessous de la plage" },
];

export default function Conseils() {
  const [label, setLabel] = useState(JOINT_LABELS.knee);
  const joint = LABEL_TO_JOINT[label];
  const range = DEFAULT_RANGES[joint];

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
        <div data-reveal>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
            Un écart d'angle, un réglage à faire.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
            Le logiciel ne montre pas seulement un chiffre rouge : il dit ce
            qu'il voit sur le corps, puis quoi toucher sur le vélo, et de
            combien.
          </p>
          <div className="mt-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
              Articulation
            </p>
            <Segmented
              name="Articulation"
              values={JOINTS.map((key) => JOINT_LABELS[key])}
              value={label}
              onChange={setLabel}
            />
            <p className="mt-3 text-[13px] text-ink-soft">
              Plage standard :{" "}
              <span className="font-mono font-bold tabular-nums text-ink">
                {range.minDeg}-{range.maxDeg}°
              </span>
              . En séance, elle est recalculée pour le profil du client.
            </p>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-surface bg-rule sm:grid-cols-2" data-reveal>
          {DIRECTIONS.map((direction) => {
            const advice = DIAGNOSTICS[joint][direction.key];
            return (
              <div key={direction.key} className="bg-card p-6 lg:p-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
                  {direction.title}
                </p>
                <p className="mt-4 text-[17px] leading-relaxed text-ink">
                  {advice.constat}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  {advice.action}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
