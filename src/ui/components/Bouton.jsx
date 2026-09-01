import React from 'react';

const BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold ' +
  'transition-[background-color,border-color,color,transform] duration-300 ease-doux ' +
  'active:translate-y-px';

const TAILLES = {
  sm: 'h-[42px] px-[18px] text-sm',
  md: 'h-[50px] px-[26px] text-[15.5px]',
  lg: 'h-[54px] px-8 text-base',
};

const VARIANTES = {
  // Texte blanc sur #CF2721 : 5.3:1, au-dessus du seuil AA.
  primaire: 'bg-rouge-cta text-white shadow-rouge hover:bg-rouge-cta-hover',
  // Contour sur fond clair.
  contour: 'border border-[#D5D5D5] text-encre hover:border-encre',
  // Contour sur fond sombre (section CTA).
  'contour-sombre': 'border border-[#3A3A3A] text-white hover:border-white',
  // Plein encre, utilise une seule fois (lien vers le rapport type).
  encre: 'border border-encre text-encre hover:bg-encre hover:text-white',
};

export default function Bouton({
  href = '#inscription',
  variante = 'primaire',
  taille = 'md',
  className = '',
  children,
  ...reste
}) {
  return (
    <a
      href={href}
      className={`${BASE} ${TAILLES[taille]} ${VARIANTES[variante]} ${className}`}
      {...reste}
    >
      {children}
    </a>
  );
}
