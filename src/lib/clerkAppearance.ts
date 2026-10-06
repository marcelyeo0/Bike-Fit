/**
 * Theme Clerk cale sur les tokens du design system Axio (tailwind.config.js).
 *
 * Les composants Clerk ne voient pas les classes Tailwind : on rejoue donc les
 * memes valeurs brutes ici, une seule fois, pour que SignIn, SignUp et
 * UserButton restent coherents avec la landing.
 *
 * ---------------------------------------------------------------------------
 * Systeme typographique de la surface d'authentification
 * ---------------------------------------------------------------------------
 * Deux familles, deux jobs — la grammaire du reste du site :
 *
 *   Fira Sans   le texte courant : sous-titre, champs, boutons, liens,
 *               messages.
 *   Fira Code   le titre de carte et les petits libelles en capitales
 *               (champs, separateur).
 *
 * Les deux arrivent par next/font, en variables CSS posees sur <html>
 * (voir app/layout).
 */

// Rappel des tokens (source : tailwind.config.js)
const ENCRE = '#0C0C0C';
const ROUGE_CTA = '#CF2721'; // fond de bouton, texte blanc : 5.3:1
const ROUGE_CTA_HOVER = '#B31E19';
const ROUGE_TEXTE = '#C0241C'; // petit texte rouge sur blanc : 6:1
const TEXTE = '#3A3A3A';
const TEXTE_DOUX = '#5A5A5A'; // 7.0:1 sur blanc
const LIGNE = '#E9E9E9';
const CONTOUR = '#D5D5D5';

const SANS = 'var(--police-texte), Helvetica, Arial, sans-serif';
const MONO = 'var(--police-code), ui-monospace, Consolas, monospace';

/**
 * Role « libelle » : petites capitales en chasse fixe, interlettrage ouvert.
 */
const LIBELLE_CAPS = {
  fontFamily: MONO,
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: ENCRE,
};

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

    // Clerk derive toute son echelle (xs, sm, lg, xl) de cette base, dont le
    // defaut est 0.8125rem — soit 13px. Le formulaire lisait donc un cran plus
    // petit que la landing (15–17px). 1rem le remet au plancher de lecture.
    fontSize: '1rem',

    // 600 est le poids le plus lourd du site : le `bold` de Clerk (700) est
    // ramene dessus pour rester dans la meme echelle de graisses.
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 600 },

    borderRadius: '12px',
  },

  elements: {
    // Pas de `rootBox: { width: '100%' }` ici : les pages centrent la carte
    // avec `flex justify-center`. Forcer la pleine largeur ferait occuper
    // toute la ligne au conteneur, et la carte se rangerait a gauche.

    // Meme echelle que les cartes de la landing : 24px (borderRadius.bloc),
    // un filet clair, pas d'ombre. L'elevation est declaree une seule fois.
    cardBox: {
      borderRadius: '24px',
      border: `1px solid ${LIGNE}`,
      boxShadow: 'none',
    },
    card: {
      backgroundColor: '#FFFFFF',
    },

    // Titre de page : Fira Code demi-gras serre, comme les titres du dashboard.
    headerTitle: {
      fontFamily: MONO,
      // Sur un ecran de 390px, la largeur utile dans la carte tombe a 262px.
      // En chasse fixe un caractere vaut 0,6 em : « Creez votre compte »
      // (18 caracteres) tient sur une ligne a 20px, pas au-dela.
      fontSize: 'clamp(20px, 5vw, 24px)',
      fontWeight: 600,
      letterSpacing: '-0.03em',
      lineHeight: '1.1',
      color: ENCRE,
    },
    headerSubtitle: {
      fontFamily: SANS,
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: '1.55',
      letterSpacing: '0',
      color: TEXTE_DOUX,
    },

    formFieldLabel: LIBELLE_CAPS,
    formFieldInput: {
      borderRadius: '12px',
      borderColor: LIGNE,
      fontFamily: SANS,
      // 16px : plancher de lecture, et evite le zoom automatique de Safari iOS
      // au focus d'un champ.
      fontSize: '16px',
      fontWeight: 400,
    },
    formFieldAction: {
      fontFamily: SANS,
      fontSize: '14px',
      fontWeight: 600,
      color: ROUGE_TEXTE,
    },
    formFieldHintText: {
      fontFamily: SANS,
      fontSize: '14px',
      lineHeight: '1.5',
      color: TEXTE_DOUX,
    },
    formFieldErrorText: {
      fontFamily: SANS,
      fontSize: '14px',
      lineHeight: '1.5',
      color: ROUGE_TEXTE,
    },
    formFieldSuccessText: {
      fontFamily: SANS,
      fontSize: '14px',
      lineHeight: '1.5',
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
    socialButtonsBlockButtonText: {
      fontFamily: SANS,
      fontSize: '15.5px',
      fontWeight: 600,
    },

    // Le « ou » entre les boutons sociaux et le formulaire : meme role de
    // libelle que les champs, en plus discret.
    dividerText: {
      ...LIBELLE_CAPS,
      fontSize: '12px',
      color: TEXTE_DOUX,
    },

    // Code a usage unique : chiffres a chasse tabulaire, sinon les caracteres
    // dansent d'une case a l'autre pendant la saisie.
    otpCodeFieldInput: {
      fontFamily: SANS,
      fontSize: '20px',
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
    },

    identityPreviewText: {
      fontFamily: SANS,
      fontSize: '15px',
      color: TEXTE,
    },

    // Le lien vers l'autre page (« Pas encore de compte ? S'inscrire »).
    footerActionText: {
      fontFamily: SANS,
      fontSize: '15px',
      color: TEXTE_DOUX,
    },
    footerActionLink: {
      fontFamily: SANS,
      fontSize: '15px',
      fontWeight: 600,
      color: ROUGE_TEXTE,
      '&:hover': {
        color: ROUGE_CTA_HOVER,
      },
    },
  },
};
