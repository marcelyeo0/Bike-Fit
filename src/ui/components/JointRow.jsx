/**
 * JointRow.jsx — la rangée d'articulation, composant signature de BikeFit.
 *
 * À gauche : le libellé et la cible en petit. À droite : la valeur en
 * chasse fixe, largeur réservée de 86 px (la ligne ne doit pas trembler
 * quand le chiffre change), puis la pastille d'état.
 *
 * La valeur et la pastille sont écrites IMPÉRATIVEMENT par la section qui
 * pilote la mesure (voir sections/Analyse.jsx) : à 4 Hz, via `data-value`
 * et `data-dot`, sans repasser par le rendu React. Un re-rendu complet de
 * l'arbre quatre fois par seconde pour deux caractères serait absurde.
 */

import { JUDGE_STAT } from "../../core/angles";
import { JOINT_LABELS } from "../../core/feedback";
import { COLORS } from "../theme";

export default function JointRow({ joint, range, last = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        last ? "" : "border-b border-rule"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[15px] leading-tight text-ink">{JOINT_LABELS[joint]}</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          cible ({JUDGE_STAT[joint]}) {range.minDeg}-{range.maxDeg}°
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          data-value={joint}
          className="w-[86px] text-right font-mono text-[22px] font-bold tabular-nums text-ink"
        >
          —
        </span>
        {/* Pastille d'état : vert dans la plage, rouge hors plage, gris sans
            mesure. La couleur est le seul canal qui change ici. */}
        <span
          data-dot={joint}
          aria-hidden="true"
          className="text-[13px] leading-none"
          style={{ color: COLORS.stateNone }}
        >
          ●
        </span>
        <span data-state={joint} className="sr-only">
          pas de mesure
        </span>
      </div>
    </div>
  );
}
