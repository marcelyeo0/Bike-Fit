/**
 * tailwind.config.js — miroir web de `src/GUI/theme.py` (branche main).
 *
 * Une seule source de verite pour les couleurs : les valeurs ci-dessous sont
 * copiees telles quelles depuis le design system de l'application desktop.
 * Regles heritees : base zinc neutre, UN seul accent (Bleu Cadre), vert/rouge
 * reserves a l'etat des articulations, jamais de #000 ni de #FFF en fond.
 */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAFA",          // fond general (zinc-50)
        card: "#FFFFFF",        // seul blanc pur autorise : elevation d'une carte
        dark: "#18181B",        // panneau de marque / cadre video (zinc-900)
        dark2: "#27272A",       // surface posee sur le panneau sombre (zinc-800)
        rule: "#E4E4E7",        // filets 1 px (zinc-200)
        accent: {
          DEFAULT: "#3572D6",   // Bleu Cadre : unique accent
          hover: "#2C5FB4",
        },
        state: {
          in: "#2FA35C",        // angle dans la plage cible
          out: "#D05353",       // angle hors plage
          outhover: "#B84545",
          none: "#A1A1AA",      // pas de mesure (zinc-400)
        },
        ink: {
          DEFAULT: "#1B1B1F",   // texte principal (off-black)
          soft: "#71717A",      // texte secondaire (zinc-500)
          ondark: "#FAFAFA",
          ondarksoft: "#A1A1AA",
        },
      },
      fontFamily: {
        // Piles systeme, comme sur le bureau : la personnalite vient de la
        // graisse et de la chasse fixe, pas d'une fonte exotique telechargee.
        display: ['"Segoe UI Variable Display"', '"SF Pro Display"', '"Segoe UI"', "system-ui", "sans-serif"],
        sans: ['"Segoe UI Variable Text"', '"SF Pro Text"', '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ['"Cascadia Mono"', '"SF Mono"', "Consolas", "ui-monospace", "monospace"],
      },
      borderRadius: {
        surface: "16px",  // cartes, boutons, cadre video (theme.RADIUS)
        field: "10px",    // champs et controle segmente
      },
      transitionTimingFunction: {
        // Ease-out cubique de `src/GUI/anim.py` : 1 - (1 - t)**3.
        out3: "cubic-bezier(0.215, 0.61, 0.355, 1)",
      },
      maxWidth: {
        measure: "65ch",
      },
    },
  },
  plugins: [],
};
