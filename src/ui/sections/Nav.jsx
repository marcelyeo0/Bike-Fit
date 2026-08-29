/**
 * Nav.jsx — barre haute, 64 px, une seule ligne.
 *
 * Pas de verre dépoli, pas d'ombre : un aplat zinc et un filet 1 px, comme
 * les séparateurs de l'application. Trois destinations, une action.
 */

import Button from "../components/Button";

const LINKS = [
  { href: "#analyse", label: "La mesure" },
  { href: "#flux", label: "Le flux" },
  { href: "#logiciel", label: "Le logiciel" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-bg/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-6 lg:px-10">
        <a href="#top" className="flex items-baseline gap-2">
          <span className="font-display text-[19px] font-bold tracking-tight text-ink">
            BikeFit
          </span>
          {/* Filet accent : le repère de marque du panneau sombre, en petit. */}
          <span className="h-[3px] w-6 rounded-[2px] bg-accent" aria-hidden="true" />
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[14px] text-ink-soft transition-colors duration-200 ease-out3 hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Button href="#telecharger" className="h-10 px-5 text-[14px]">
          Télécharger
        </Button>
      </nav>
    </header>
  );
}
