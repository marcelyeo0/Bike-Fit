/**
 * Card.jsx — la carte du design system.
 *
 * Règle de la carte méritée : une carte n'existe que pour son élévation.
 * Quatre informations sœurs vivent dans UNE carte à rangées séparées par
 * des filets 1 px, jamais dans quatre boîtes empilées. Aucune ombre :
 * la profondeur est tonale (blanc pur sur fond zinc).
 */

export function CardHeader({ children }) {
  // En-tête de groupe : petit, gras, gris. Jamais accentué, jamais grand.
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
      {children}
    </p>
  );
}

export default function Card({ dark = false, className = "", children }) {
  return (
    <div
      className={`rounded-surface p-4 ${dark ? "bg-dark2" : "bg-card"} ${className}`}
    >
      {children}
    </div>
  );
}
