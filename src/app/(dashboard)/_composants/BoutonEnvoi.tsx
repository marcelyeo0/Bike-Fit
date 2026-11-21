'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { CircleNotch } from '@phosphor-icons/react';

/**
 * Bouton d'envoi d'un formulaire de server action, a poser DANS le `<form>`.
 *
 * Tant que l'action tourne, le bouton se desactive et affiche un indicateur :
 * le velociste voit que son clic a pris, et un double clic ne cree pas deux
 * fiches. Sans lui, rien ne bouge a l'ecran jusqu'a la redirection.
 */
export default function BoutonEnvoi({
  className,
  enCours,
  icone,
  children,
}: {
  className: string;
  /** Libelle pendant l'envoi, par exemple « Création… ». */
  enCours: string;
  icone?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (
        <CircleNotch size={18} weight="bold" className="motion-safe:animate-spin" aria-hidden />
      ) : (
        icone
      )}
      {pending ? enCours : children}
    </button>
  );
}
