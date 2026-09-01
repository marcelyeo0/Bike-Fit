/**
 * Theme Clerk cale sur les tokens du design system Axio (tailwind.config.js).
 *
 * Les composants Clerk sont rendus dans une iframe-like isolee : ils ne voient
 * pas les classes Tailwind. On rejoue donc les memes valeurs brutes ici, une
 * seule fois, pour que SignIn, SignUp et UserButton restent coherents avec la
 * landing.
 */

// Rappel des tokens (source : tailwind.config.js)
const ENCRE = '#0C0C0C';
const ROUGE_CTA = '#CF2721'; // fond de bouton, texte blanc : 5.3:1
const ROUGE_CTA_HOVER = '#B31E19';
const ROUGE_TEXTE = '#C0241C'; // petit texte rouge sur blanc : 6:1
const TEXTE = '#3A3A3A';
const TEXTE_DOUX = '#5A5A5A';
const LIGNE = '#E9E9E9';
const CONTOUR = '#D5D5D5';

const SANS = 'Barlow, Helvetica, Arial, sans-serif';
const DISPLAY = '"Archivo Black", Helvetica, Arial, sans-serif';

/** Bouton pill de la landing (voir src/ui/components/Bouton.jsx, taille md). */
const BOUTON_PILL = {
  borderRadius: '9999px',
  minHeight: '50px',
  fontFamily: SANS,
  fontSize: '15.5px',
  fontWeight: 600,
  textTransform: 'none' as const,
  letterSpacing: '0',
};

export const apparenceAxio = {
  variables: {
    colorPrimary: ROUGE_CTA,
    colorPrimaryForeground: '#FFFFFF',
    colorForeground: ENCRE,
    colorMutedForeground: TEXTE_DOUX,
    colorBackground: '#FFFFFF',
    colorInput: '#FFFFFF',
    colorInputForeground: TEXTE,
    colorBorder: LIGNE,
    colorDanger: ROUGE_TEXTE,
    // Meme anneau de focus que le reste du site (voir globals.css).
    colorRing: ENCRE,
    fontFamily: SANS,
    fontFamilyButtons: SANS,
    borderRadius: '12px',
  },
  elements: {
    rootBox: {
      width: '100%',
    },
    // Le bloc suit la meme echelle que les cartes de la landing : 24px, un
    // filet clair, pas d'ombre portee.
    cardBox: {
      borderRadius: '24px',
      border: `1px solid ${LIGNE}`,
      boxShadow: 'none',
    },
    card: {
      backgroundColor: '#FFFFFF',
    },
    headerTitle: {
      fontFamily: DISPLAY,
      letterSpacing: '-0.01em',
      color: ENCRE,
    },
    headerSubtitle: {
      fontFamily: SANS,
      color: TEXTE_DOUX,
    },
    formButtonPrimary: {
      ...BOUTON_PILL,
      backgroundColor: ROUGE_CTA,
      color: '#FFFFFF',
      boxShadow: '0 16px 30px -14px rgba(232, 51, 42, 0.85)',
      '&:hover': {
        backgroundColor: ROUGE_CTA_HOVER,
      },
    },
    socialButtonsBlockButton: {
      ...BOUTON_PILL,
      border: `1px solid ${CONTOUR}`,
      color: ENCRE,
      '&:hover': {
        borderColor: ENCRE,
      },
    },
    formFieldLabel: {
      fontFamily: SANS,
      fontWeight: 600,
      color: ENCRE,
    },
    formFieldInput: {
      borderRadius: '12px',
      borderColor: LIGNE,
      fontFamily: SANS,
    },
    // Le lien vers l'autre page (« Pas encore de compte ? S'inscrire »).
    footerActionLink: {
      color: ROUGE_TEXTE,
      fontWeight: 600,
      '&:hover': {
        color: ROUGE_CTA_HOVER,
      },
    },
  },
};
