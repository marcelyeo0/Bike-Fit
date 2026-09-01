import { frFR } from '@clerk/localizations';
import type { LocalizationResource } from '@clerk/shared/types';

/**
 * Le pack `frFR` de @clerk/localizations laisse 487 cles sans traduction, dont
 * 18 sur nos deux ecrans d'authentification : Clerk retombe alors sur l'anglais
 * au milieu d'un formulaire francais.
 *
 * On ne comble ici que les cles reellement atteignables avec notre
 * configuration d'instance :
 *
 *   - le placeholder du mot de passe a l'inscription — visible en permanence ;
 *   - le format attendu d'e-mail — affiche des la premiere saisie invalide ;
 *   - les titres « mot de passe compromis / non fiable » — l'instance a
 *     `enforce_hibp_on_sign_in: true` ;
 *   - l'ecran d'attente de la protection anti-bot — l'instance a
 *     `bot_protection.captcha_enabled: true`.
 *
 * Volontairement non traduites : `enterpriseConnections` (aucune connexion
 * entreprise configuree) et `emailLink.verifiedTransferable` (notre strategie
 * est `email_code`, pas le lien magique). Les ajouter serait du code mort.
 *
 * A retester a chaque montee de version : ces cles peuvent arriver en amont
 * dans le pack officiel.
 */

/**
 * L'application Clerk s'appelle encore « Bike Fit » : toutes les cles qui
 * interpolent {{applicationName}} affichaient donc « pour continuer vers Bike
 * Fit » au milieu d'un ecran Axio.
 *
 * On ecrit le nom produit en dur sur les seules cles atteignables par nos deux
 * ecrans. A SUPPRIMER des que l'application est renommee « Axio » dans le
 * dashboard Clerk — l'interpolation reprendra alors la bonne valeur toute
 * seule.
 */
const NOM_PRODUIT = 'Axio';
const SOUS_TITRE = `pour continuer vers ${NOM_PRODUIT}`;

const attenteAntiBot = {
  title: 'Vérification de votre demande',
  subtitle: 'Merci de patienter pendant la vérification.',
  loading: 'Chargement…',
  retryButton: 'Réessayer',
};

export const localisationAxio = {
  ...frFR,

  formFieldInputPlaceholder__signUpPassword: 'Choisissez un mot de passe',
  formFieldInput__emailAddress_format: 'Format attendu : nom@exemple.com',

  signIn: {
    ...frFR.signIn,
    start: {
      ...frFR.signIn?.start,
      subtitle: SOUS_TITRE,
      titleCombined: `Continuer vers ${NOM_PRODUIT}`,
    },
    password: { ...frFR.signIn?.password, subtitle: SOUS_TITRE },
    emailCode: { ...frFR.signIn?.emailCode, subtitle: SOUS_TITRE },
    passwordCompromised: {
      ...frFR.signIn?.passwordCompromised,
      title: 'Mot de passe compromis',
    },
    passwordUntrusted: {
      ...frFR.signIn?.passwordUntrusted,
      title: 'Mot de passe non fiable',
    },
    protectCheck: {
      ...frFR.signIn?.protectCheck,
      ...attenteAntiBot,
    },
  },

  signUp: {
    ...frFR.signUp,
    start: {
      ...frFR.signUp?.start,
      subtitle: SOUS_TITRE,
      subtitleCombined: SOUS_TITRE,
    },
    continue: { ...frFR.signUp?.continue, subtitle: SOUS_TITRE },
    emailCode: { ...frFR.signUp?.emailCode, subtitle: SOUS_TITRE },
    protectCheck: {
      ...frFR.signUp?.protectCheck,
      ...attenteAntiBot,
    },
  },
} as LocalizationResource;
