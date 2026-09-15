import type { MotifCreationEtude } from './access';

/**
 * Formulations associees aux motifs de `canCreateStudy`.
 *
 * Module volontairement sans `server-only` ni acces base : la modale du
 * dashboard est un composant client et doit lire les memes phrases que le
 * rendu serveur. Il ne contient que du texte — aucune decision d'acces ne se
 * prend ici, elle vient toujours de `src/lib/access.ts`.
 */

export const MESSAGES_REFUS: Record<'ETUDE_OFFERTE_CONSOMMEE' | 'ABONNEMENT_EXPIRE', {
  titre: string;
  phrase: string;
}> = {
  ETUDE_OFFERTE_CONSOMMEE: {
    titre: 'Votre étude offerte est utilisée',
    phrase:
      "L'abonnement débloque les études illimitées pour votre atelier, avec le rapport à votre marque.",
  },
  ABONNEMENT_EXPIRE: {
    titre: "Votre abonnement n'est plus actif",
    phrase:
      'Réactiver votre abonnement rouvre la création d’études pour votre atelier, sans rien perdre de l’historique.',
  },
};

/** Vrai si le motif est un refus — evite de dupliquer le test dans l'UI. */
export function estRefus(
  motif: MotifCreationEtude
): motif is 'ETUDE_OFFERTE_CONSOMMEE' | 'ABONNEMENT_EXPIRE' {
  return motif === 'ETUDE_OFFERTE_CONSOMMEE' || motif === 'ABONNEMENT_EXPIRE';
}
