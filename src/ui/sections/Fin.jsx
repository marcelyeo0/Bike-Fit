/**
 * Fin.jsx — panneau de clôture et pied de page.
 *
 * Le panneau sombre referme la page comme il l'a ouverte : même aplat
 * zinc-900, même filet accent, marque ancrée en bas. Une action forte,
 * un lien vers le code, la mention obligatoire.
 */

import Button from "../components/Button";
import { LEGAL_NOTICE } from "../../core/feedback";

const REPO = "https://github.com/marcelyeo0/Bike-Fit";

export default function Fin() {
  return (
    <footer id="telecharger" className="bg-dark">
      <div className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end" data-reveal>
          <div>
            <h2 className="max-w-[16ch] font-display text-3xl font-bold leading-tight tracking-tight text-ink-ondark md:text-4xl">
              À installer avant la prochaine séance.
            </h2>
            <p className="mt-4 max-w-measure text-[17px] leading-relaxed text-ink-ondarksoft">
              Un exécutable Windows autonome. Une webcam de profil, un
              home-trainer, et le client peut monter dessus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button href={`${REPO}/releases`} variant="onDark">
              Télécharger
            </Button>
            <a
              href={REPO}
              className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 text-[15px] font-bold text-ink-ondark transition-colors duration-200 ease-out3 hover:border-white/40"
            >
              Le code sur GitHub
            </a>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[19px] font-bold tracking-tight text-ink-ondark">
              BikeFit
            </p>
            <span className="mt-2 block h-[3px] w-12 rounded-[2px] bg-accent" aria-hidden="true" />
          </div>
          <p className="max-w-measure text-[13px] leading-relaxed text-ink-ondarksoft">
            {LEGAL_NOTICE}
          </p>
        </div>
      </div>
    </footer>
  );
}
