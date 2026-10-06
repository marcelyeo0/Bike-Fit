import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { requireUser } from '../../../../../../lib/auth';
import { lireIdentifiant } from '../../../../../../lib/saisie';
import { lireEtude } from '../../../../../../lib/requetes/etudes';
import { ouvrirSeance } from '../../../../../../lib/requetes/plages';
import { formaterCadre } from '../../../../../../lib/libelles';
import { LIEN_DISCRET, SURTITRE } from '../../../../_composants/classes';
import SeanceCapture from './_composants/SeanceCapture';

export const metadata: Metadata = {
  title: 'Séance - Axio',
};

/**
 * Seance de capture d'une etude en brouillon.
 *
 * GARDE : l'identifiant de l'URL est lu avec le `userId` de `requireUser()`.
 * Une etude d'un autre atelier donne un 404 ; la demonstration et une etude
 * deja terminee renvoient a leur detail, il n'y a plus rien a capturer.
 *
 * La page ne fait que preparer le contexte (fourchettes figees, estimations
 * tirees des mensurations). La video, elle, ne quitte jamais le navigateur :
 * voir `SeanceCapture`.
 */
export default async function SeancePage({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await requireUser();
  const { id } = await params;

  const etudeId = lireIdentifiant(id);
  if (!etudeId) notFound();

  const etude = await lireEtude(utilisateur.id, etudeId);
  if (!etude) notFound();
  if (!etude.modifiable || etude.status !== 'DRAFT') redirect(`/dashboard/etudes/${etude.id}`);

  const contexte = await ouvrirSeance(utilisateur.id, etude.id);
  if (!contexte) notFound();

  const cadre = formaterCadre(contexte.pratique, contexte.objectif);

  return (
    <article>
      <Link
        href={`/dashboard/etudes/${etude.id}`}
        className={`${LIEN_DISCRET} inline-flex items-center gap-1.5`}
      >
        <ArrowLeft size={15} weight="regular" />
        Retour à l’étude
      </Link>

      <header className="mt-5">
        <p className={SURTITRE}>Séance de capture</p>
        <h1 className="m-0 mt-2 font-display text-titre-sm text-encre">
          {contexte.codeClient ?? 'Étude sans client'}
        </h1>
        {cadre && <p className="m-0 mt-3 text-[14px] font-medium text-texte">{cadre}</p>}
      </header>

      <SeanceCapture
        contexte={contexte}
        lienFiche={etude.client ? `/dashboard/clients/${etude.client.id}` : null}
      />
    </article>
  );
}
