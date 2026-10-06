/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        encre: '#0C0C0C',
        // Un seul accent, trois valeurs calees sur le contraste :
        // - rouge        : aplats, traits, gros chiffres (>= 3:1 sur blanc)
        // - rouge-cta    : fond de bouton avec texte blanc (5.3:1)
        // - rouge-texte  : petit texte rouge sur blanc (6:1)
        rouge: '#E8332A',
        'rouge-cta': '#CF2721',
        'rouge-cta-hover': '#B31E19',
        'rouge-texte': '#C0241C',
        texte: '#3A3A3A',
        'texte-doux': '#5A5A5A',
        gris: '#8A8A8A',
        'gris-clair': '#9A9A9A',
        ligne: '#E9E9E9',
        'ligne-douce': '#EDEDED',
        'fond-doux': '#F6F6F5',
      },
      fontFamily: {
        // Appariement « Dashboard Data » : Fira Code en titrage, Fira Sans en
        // courant. Fira Code sert aussi de chasse fixe pour les valeurs
        // mesurees, les codes et les petits libelles. La graisse et
        // l'interlettrage des titres vivent dans .font-display (globals.css).
        display: ['var(--police-code)', 'ui-monospace', 'Consolas', 'monospace'],
        sans: ['var(--police-texte)', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['var(--police-code)', 'ui-monospace', 'Consolas', 'monospace'],
      },
      fontSize: {
        // echelle display. Une chasse fixe est large : les tailles plancher
        // gardent le mot le plus long d'un titre sur une ligne de telephone.
        titre: ['clamp(30px, 5.4vw, 66px)', { lineHeight: '1.04', letterSpacing: '-0.035em' }],
        'titre-sm': ['clamp(25px, 3.2vw, 38px)', { lineHeight: '1.12', letterSpacing: '-0.03em' }],
        'titre-lg': ['clamp(32px, 6.2vw, 80px)', { lineHeight: '1.02', letterSpacing: '-0.04em' }],
        fantome: ['clamp(56px, 12vw, 180px)', { lineHeight: '0.9', letterSpacing: '-0.05em' }],
      },
      borderRadius: {
        // une seule echelle : 24px pour les blocs, pill pour l'interactif
        bloc: '24px',
        media: '20px',
      },
      maxWidth: {
        page: '1240px',
      },
      boxShadow: {
        rouge: '0 16px 30px -14px rgba(232, 51, 42, 0.85)',
        'rouge-sm': '0 8px 20px -10px rgba(232, 51, 42, 0.9)',
        bloc: '0 40px 60px -34px rgba(0, 0, 0, 0.45)',
        media: '0 50px 60px -34px rgba(0, 0, 0, 0.35)',
      },
      transitionTimingFunction: {
        doux: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        flotte: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--r, 0deg))' },
          '50%': { transform: 'translateY(-14px) rotate(var(--r, 0deg))' },
        },
        monte: {
          from: { opacity: '0', transform: 'translateY(26px)' },
          to: { opacity: '1', transform: 'none' },
        },
        apparait: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        flotte: 'flotte 8s ease-in-out infinite',
        monte: 'monte 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        apparait: 'apparait 0.7s ease-out both',
      },
    },
  },
  plugins: [],
};
