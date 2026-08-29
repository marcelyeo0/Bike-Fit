/**
 * Segmented.jsx — le contrôle segmenté du questionnaire.
 *
 * Piste en Filet, segment sélectionné en Carte blanche (le texte sombre
 * reste lisible dans tous les états), hauteur 36 px, coins pilule.
 * Usage : choix exclusifs courts, jamais plus de quatre segments.
 */

export default function Segmented({ values, value, onChange, name, className = "" }) {
  const interactive = typeof onChange === "function";

  return (
    <div
      role={interactive ? "tablist" : "group"}
      aria-label={name}
      className={`flex h-9 items-center gap-1 rounded-full bg-rule p-1 ${className}`}
    >
      {values.map((option) => {
        const selected = option === value;
        const classes =
          "flex-1 rounded-full px-3 text-[13px] leading-8 transition duration-200 ease-out3 " +
          (selected ? "bg-card font-semibold text-ink" : "text-ink-soft");

        if (!interactive) {
          return (
            <span key={option} className={`${classes} text-center`}>
              {option}
            </span>
          );
        }
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={`${classes} hover:text-ink`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
