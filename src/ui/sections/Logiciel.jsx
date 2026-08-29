/**
 * Logiciel.jsx — les contraintes techniques, groupées en trois blocs.
 *
 * Une fiche technique en dix rangées à filets serait le pire affichage
 * possible. Trois groupes, trois largeurs différentes, un filet par groupe.
 */

const GROUPS = [
  {
    title: "La machine",
    span: "lg:col-span-5",
    lines: [
      "Windows, portable sans carte graphique : le temps réel sur processeur est une exigence, pas un confort.",
      "Une webcam placée de profil, à hauteur de hanche, à trois ou quatre mètres.",
      "Le client pédale sur home-trainer, l'écran sert aussi de support de discussion.",
    ],
  },
  {
    title: "La détection",
    span: "lg:col-span-4",
    lines: [
      "MediaPipe Pose Landmarker, en mode flux temps réel.",
      "Six points suivis sur le côté droit du corps, quatre angles calculés.",
      "Chiffres rafraîchis quatre fois par seconde, vidéo à pleine cadence.",
    ],
  },
  {
    title: "La livraison",
    span: "lg:col-span-3",
    lines: [
      "Un exécutable Windows autonome, modèle de détection embarqué.",
      "Connexion internet pour les fourchettes personnalisées et le bilan.",
      "Repli hors ligne intégral sur les plages standard.",
    ],
  },
];

export default function Logiciel() {
  return (
    <section id="logiciel" className="bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        <h2 className="max-w-[20ch] font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl" data-reveal>
          Ce qu'il faut sur l'établi.
        </h2>

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-12" data-reveal>
          {GROUPS.map((group) => (
            <div key={group.title} className={`border-t border-rule pt-6 ${group.span}`}>
              <h3 className="text-[15px] font-bold text-ink">{group.title}</h3>
              <div className="mt-4 space-y-4">
                {group.lines.map((line) => (
                  <p key={line} className="text-[15px] leading-relaxed text-ink-soft">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
