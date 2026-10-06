/**
 * Classes Tailwind partagees par les pages du dashboard.
 *
 * Uniquement les tokens de `tailwind.config.js` : un seul accent rouge, pas de
 * vert ni d'orange. Les deux boutons reprennent a l'identique ceux deja poses
 * sur le tableau de bord (« Nouvelle etude », « Creer une etude »).
 */

/** Action principale d'une page. Une seule par ecran. */
export const BOUTON_PRIMAIRE =
  'inline-flex h-[50px] items-center justify-center gap-2 whitespace-nowrap rounded-full ' +
  'bg-rouge-cta px-[26px] text-[15.5px] font-semibold text-white shadow-rouge ' +
  'transition-colors duration-300 ease-doux hover:bg-rouge-cta-hover active:translate-y-px ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

/** Action secondaire : contour encre. */
export const BOUTON_CONTOUR =
  'inline-flex h-[42px] w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full ' +
  'border border-encre px-[18px] text-sm font-semibold text-encre ' +
  'transition-colors duration-300 ease-doux hover:bg-encre hover:text-white';

/** Action destructrice : contour rouge, jamais d'aplat avant confirmation. */
export const BOUTON_DANGER =
  'inline-flex h-[42px] w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full ' +
  'border border-rouge px-[18px] text-sm font-semibold text-rouge-texte ' +
  'transition-colors duration-300 ease-doux hover:bg-rouge-cta hover:text-white';

export const LIEN_DISCRET =
  'text-[13.5px] font-medium text-gris underline underline-offset-2 transition-colors hover:text-encre';

export const LIEN_ACCENT =
  'inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-rouge-texte underline underline-offset-2';

export const BLOC = 'rounded-bloc border border-ligne bg-white';

export const SURTITRE = 'm-0 font-mono text-[12px] uppercase tracking-[.08em] text-gris';

export const ETIQUETTE = 'block text-[14px] font-semibold text-encre';

export const CHAMP =
  'mt-2 h-[50px] w-full rounded-[12px] border border-ligne bg-white px-4 text-[15px] text-encre ' +
  'placeholder:text-gris-clair';

export const MESSAGE_ERREUR = 'm-0 text-[13.5px] font-medium text-rouge-texte';

export const MESSAGE_INFO = 'm-0 text-[13.5px] font-medium text-texte-doux';
