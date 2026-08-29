/**
 * Button.jsx — l'action du design system BikeFit.
 *
 * Forme pilule (rayon = moitié de la hauteur, theme.BTN_RADIUS), hauteur
 * 48 px, fond zinc-900 : le bouton principal est SOMBRE, pas bleu. Le Bleu
 * Cadre reste l'accent des détails. Une seule action forte par écran.
 * Retour tactile au clic : enfoncement d'1 px, comme un vrai bouton.
 */

const BASE =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full px-7 " +
  "text-[15px] font-bold transition duration-200 ease-out3 active:translate-y-[1px]";

const VARIANTS = {
  // Blanc sur zinc-900 : 15,8:1, très au-dessus du minimum AA.
  primary: "bg-dark text-ink-ondark hover:bg-[#2E2E33]",
  // Sur fond sombre, l'inverse : le même contraste, lu dans l'autre sens.
  onDark: "bg-ink-ondark text-ink hover:bg-white",
  // Secondaire : filet 1 px, jamais un deuxième aplat de couleur.
  ghost: "border border-rule bg-card text-ink hover:border-ink-soft",
};

export default function Button({ as = "a", variant = "primary", className = "", ...props }) {
  const Tag = as;
  return <Tag className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
