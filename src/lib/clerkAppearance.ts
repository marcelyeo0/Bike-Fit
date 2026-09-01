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
 * Trois familles, trois jobs — exactement la grammaire de la landing :
 *
 *   Archivo Black      identite seule (le mot-marque AXIO, dans (auth)/layout).
 *                      C'est une police d'affiche : en dessous de ~24px ses
 *                      contreformes se referment. Elle n'entre pas dans la
 *                      carte.
 *   Barlow Semi Cond.  titres et libelles, toujours en capitales. C'est la voix
 *                      « label » du site (sur-titres de section, en-tetes de
 *                      colonne du footer).
 *   Barlow             tout le texte courant : sous-titre, champs, boutons,
 *                      liens, messages.
 *
 * Le contraste vient de la FAMILLE et de la CASSE, pas de la seule taille.
 * Un seul pave noir par ecran : le mot-marque.
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

const SANS = 'Barlow, Helvetica, Arial, sans-serif';
const CONDENSED = '"Barlow Semi Condensed", Barlow, Helvetica, Arial, sans-serif';

/**
 * Role « libelle » : capitales condensees, interlettrage ouvert.
 * Repris de l'en-tete de colonne du footer (13px, .1em) resserre a .08em, la
 * chasse etroite de Semi Condensed ayant besoin de moins d'air que Barlow.
 */
const LIBELLE_CAPS = {
  fontFamily: CONDENSED,
  fontSize: '13px',
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

    // Barlow n'est charge qu'en 400/500/600 (voir le <link> dans app/layout).
    // Sans ce remappage, le `bold` de Clerk vaut 700 et le navigateur
    // synthetise un faux gras. 600 est le poids le plus lourd du site.
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 600 },

    borderRadius: '12px',
  },

  elements: {
    rootBox: {
      width: '100%',
    },

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

    // Titre de page. Semi Condensed en capitales : lisible sur une carte de
    // 420px, encaisse l'expansion du francais, et laisse Archivo Black etre
    // l'unique moment display de l'ecran.
    headerTitle: {
      fontFamily: CONDENSED,
      // Sur un ecran de 390px, la largeur utile dans la carte tombe a 262px
      // alors que « Creez votre compte » en mesure 251 : 11px de marge, et
      // toute chaine un peu plus longue casse sur deux lignes. Le clamp rend
      // 22px sur telephone et garde 26px des que la place existe.
      fontSize: 'clamp(22px, 5.2vw, 26px)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
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
