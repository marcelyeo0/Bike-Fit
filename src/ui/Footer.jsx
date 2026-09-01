import React from 'react';

const COLONNES = [
  {
    titre: 'Produit',
    liens: [
      { href: '#fonctionnalites', label: 'Fonctionnalités' },
      { href: '#tarifs', label: 'Tarifs' },
      { href: '#comment', label: 'Comment ça marche' },
    ],
  },
  {
    titre: 'Assistance',
    liens: [
      { href: '#contact', label: "Centre d'aide" },
      { href: '#contact', label: 'Nous contacter' },
      { href: '#contact', label: 'Formation à distance' },
    ],
  },
  {
    titre: 'Suivez-nous',
    liens: [
      { href: '#contact', label: 'Instagram' },
      { href: '#contact', label: 'LinkedIn' },
      { href: '#contact', label: 'YouTube' },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-ligne-douce bg-white">
      <div className="mx-auto grid max-w-page grid-cols-1 gap-11 px-7 pb-10 pt-20 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="m-0 font-display text-[22px] tracking-[.06em] text-encre">AXIO</p>
          <p className="m-0 mt-[14px] max-w-[220px] text-[15px] leading-[1.6] text-gris">
            Logiciel d'analyse de posture cycliste pour les professionnels du vélo.
          </p>
        </div>

        {COLONNES.map((colonne) => (
          <nav key={colonne.titre} aria-label={colonne.titre} className="flex flex-col gap-3">
            <h2 className="m-0 text-[13px] font-semibold tracking-[.1em] text-encre">
              {colonne.titre.toUpperCase()}
            </h2>
            {colonne.liens.map((lien) => (
              <a
                key={lien.label}
                href={lien.href}
                className="text-[15px] text-[#6A6A6A] transition-colors hover:text-encre"
              >
                {lien.label}
              </a>
            ))}
          </nav>
        ))}
      </div>

      <div className="mx-auto flex max-w-page flex-wrap justify-between gap-5 border-t border-[#F0F0F0] px-7 pb-[50px] pt-6 text-[13.5px] text-gris-clair">
        <p className="m-0">© 2026 Axio SAS. Tous droits réservés.</p>
        <div className="flex gap-[22px]">
          <a href="#contact" className="transition-colors hover:text-encre">
            Mentions légales
          </a>
          <a href="#contact" className="transition-colors hover:text-encre">
            Confidentialité
          </a>
          <a href="#contact" className="transition-colors hover:text-encre">
            CGV
          </a>
        </div>
      </div>
    </footer>
  );
}
