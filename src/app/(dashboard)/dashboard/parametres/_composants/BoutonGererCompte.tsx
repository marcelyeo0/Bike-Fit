'use client';

import React from 'react';
import { useClerk } from '@clerk/nextjs';
import { UserCircle } from '@phosphor-icons/react';
import { BOUTON_CONTOUR } from '../../../_composants/classes';

/**
 * Ouvre le profil Clerk (e-mail, mot de passe, sessions, suppression du
 * compte). Le compte est gere par Clerk : Axio n'en reproduit aucun
 * formulaire.
 *
 * Composant client pour le seul `openUserProfile()`. Il ne prend aucune
 * decision d'acces et ne lit aucune donnee — `useClerk` n'est pas `auth()`.
 */
export default function BoutonGererCompte() {
  const clerk = useClerk();

  return (
    <button type="button" onClick={() => clerk.openUserProfile()} className={BOUTON_CONTOUR}>
      <UserCircle size={18} weight="regular" />
      Gérer mon compte
    </button>
  );
}
