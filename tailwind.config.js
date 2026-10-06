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
        // Une seule famille : Geist. `display` ne change que la graisse et
        // l'interlettrage (voir .font-display dans globals.css). Geist Mono
        // porte les valeurs mesurees, les codes et les petits libelles.
        display: ['var(--font-geist)', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['var(--font-geist)', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'Consolas', 'monospace'],
      },
      fontSize: {
        // echelle display calee sur le canvas de reference
        titre: ['clamp(38px, 6vw, 74px)', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'titre-sm': ['clamp(30px, 3.6vw, 44px)', { lineHeight: '1.08', letterSpacing: '-0.035em' }],
        'titre-lg': ['clamp(40px, 7vw, 92px)', { lineHeight: '0.98', letterSpacing: '-0.045em' }],
        fantome: ['clamp(64px, 13.5vw, 200px)', { lineHeight: '0.86', letterSpacing: '-0.05em' }],
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
