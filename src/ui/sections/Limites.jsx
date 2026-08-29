/**
 * Limites.jsx — ce que le logiciel fait, et ce qu'il ne fait pas.
 *
 * Principe produit repris tel quel : honnêteté sur la précision. Sans
 * calibration, on donne des fourchettes, pas une fausse précision, et on
 * dit où s'arrête l'outil. Deux colonnes, aucun filet par ligne : la
 * respiration sépare, pas la bordure.
 */

const FAIT = [
  "Mesure quatre angles de profil (genou, hanche, coude, épaule) à la webcam, côté droit du corps.",
  "Recalcule les fourchettes cibles pour le vélo, la position visée, la souplesse et l'âge du client.",
  "Traduit chaque écart en réglage : hauteur ou recul de selle, longueur de potence, en millimètres.",
  "Produit un bilan de fin de séance, à lire avec le client.",
];

const NE_FAIT_PAS = [
  "Pas de cote genou/axe de pédale, pas de vue de face : la mesure est faite de profil.",
  "Aucune calibration physique : les valeurs se lisent en fourchettes, jamais au dixième de degré.",
  "Ne remplace ni un bike fitting complet, ni un avis médical.",
  "Sans connexion, les fourchettes personnalisées ne sont pas calculées : le logiciel bascule sur ses plages standard et l'affiche à l'écran.",
];

function List({ title, items }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      <ul className="mt-5 space-y-5">
        {items.map((item) => (
          <li key={item} className="max-w-measure text-[15px] leading-relaxed text-ink-soft">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Limites() {
  return (
    <section className="border-t border-rule">
      <div className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="max-w-[46rem]" data-reveal>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
            Un outil d'orientation, pas un laboratoire.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
            Les systèmes complets, caméras à marqueurs ou capteurs embarqués,
            mesurent plus et mieux. BikeFit tient dans un portable sans carte
            graphique et donne au vélociste une première lecture chiffrée en
            quelques minutes, avant de décider s'il faut aller plus loin.
          </p>
        </div>

        <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-16" data-reveal>
          <List title="Ce que le logiciel fait" items={FAIT} />
          <List title="Ce qu'il ne fait pas" items={NE_FAIT_PAS} />
        </div>
      </div>
    </section>
  );
}
