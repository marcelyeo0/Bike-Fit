import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { requireUser } from '../../../../../lib/auth';
import { lireIdentifiant } from '../../../../../lib/saisie';
import { lireEtude } from '../../../../../lib/requetes/etudes';
import {
  LIBELLES_JOINT,
  LIBELLES_MESURE,
  LIBELLES_OBJECTIF,
  LIBELLES_PRATIQUE,
  LIBELLES_STATUT,
  formaterDate,
  formaterDegres,
} from '../../../../../lib/libelles';
import type { MeasurementStatus } from '../../../../../generated/prisma/enums';
import { PASTILLES } from '../../_composants/CarteEtude';
import BoutonSuppression from '../../../_composants/BoutonSuppression';
import EtatVide from '../../../_composants/EtatVide';
import { BLOC, LIEN_DISCRET, MESSAGE_INFO, SURTITRE } from '../../../_composants/classes';
import { actionSupprimerEtude } from '../actions';
import BoutonImprimer from './_composants/BoutonImprimer';
import NomCycliste from './_composants/NomCycliste';

export const metadata: Metadata = {
  title: 'Étude - Axio',
};

// Meme lecture que sur les cartes : pas de vert ni d'orange, le statut d'une
// mesure se lit au contraste et a son libelle.
const TON_MESURE: Record<MeasurementStatus, string> = {
  OK: 'text-texte-doux',
  WARNING: 'font-semibold text-encre',
  OUT: 'font-semibold text-rouge-texte',
};

const MENTION = 'Outil d’aide au réglage, ne constitue pas un avis médical.';

/**
 * Detail d'une etude, et compte rendu imprimable.
 *
 * GARDE : l'identifiant de l'URL est lu avec le `userId` de `requireUser()`.
 * Une etude d'un autre atelier donne un 404. L'etude de demonstration est
 * lisible par tous les ateliers, en lecture seule : `etude.modifiable` est
 * faux, la page ne propose alors ni suppression ni lien vers la fiche client
 * (qui n'est pas a l'atelier et repondrait 404).
 *
 * Impression : la coque du dashboard et les elements marques `print:hidden`
 * disparaissent, un en-tete au nom de l'atelier apparait. Le format A4 est
 * pose par `@page` dans globals.css.
 */
export default async function EtudePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creee?: string }>;
}) {
  const utilisateur = await requireUser();
  const [{ id }, parametres] = await Promise.all([params, searchParams]);

  const etudeId = lireIdentifiant(id);
  if (!etudeId) notFound();

  const etude = await lireEtude(utilisateur.id, etudeId);
  if (!etude) notFound();

  const sujet = etude.client?.code ?? etude.titre ?? 'Étude sans client';
  const date = formaterDate(etude.completedAt ?? etude.createdAt);
  const ecarts = etude.measurements.filter((mesure) => mesure.status === 'OUT').length;

  return (
    <article>
      {/* En-tete d'impression : le compte rendu sort au nom de l'atelier. */}
      <div className="hidden border-b border-encre pb-4 print:block">
        <p className="m-0 font-display text-[20px] text-encre">{utilisateur.name ?? 'Atelier'}</p>
        <p className="m-0 mt-1 text-[13px] text-texte">
          Compte rendu d’étude de position · {date}
        </p>
      </div>

      <div className="print:hidden">
        <Link href="/dashboard/etudes" className={`${LIEN_DISCRET} inline-flex items-center gap-1.5`}>
          <ArrowLeft size={15} weight="regular" />
          Toutes les études
        </Link>
      </div>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4 print:mt-6">
        <div>
          <p className={SURTITRE}>Étude de position</p>
          <h1 className="m-0 mt-2 font-display text-titre-sm text-encre print:text-[26px]">
            {etude.client && etude.modifiable ? (
              <Link
                href={`/dashboard/clients/${etude.client.id}`}
                className="text-encre underline decoration-ligne underline-offset-[6px] transition-colors hover:decoration-encre print:no-underline"
              >
                {sujet}
              </Link>
            ) : (
              sujet
            )}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-texte-doux">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${PASTILLES[etude.status]}`}
              />
              <span className="font-medium text-texte">{LIBELLES_STATUT[etude.status]}</span>
            </span>
            <span className="print:hidden">· {date}</span>
            {etude.isDemo && (
              <span className="rounded-full bg-rouge-cta px-3 py-1 font-condensed text-[11px] uppercase tracking-[.14em] text-white print:hidden">
                Démo
              </span>
            )}
          </div>
        </div>

        <div className="print:hidden">
          <BoutonImprimer />
        </div>
      </header>

      {parametres.creee === '1' && (
        <p role="status" className={`${MESSAGE_INFO} mt-6 print:hidden`}>
          Étude ouverte en brouillon.
        </p>
      )}
      {etude.isDemo && (
        <p className={`${MESSAGE_INFO} mt-6 print:hidden`}>
          Étude de démonstration, en lecture seule : elle montre à quoi ressemble un compte rendu.
        </p>
      )}

      <dl className="m-0 mt-8 grid gap-4 sm:grid-cols-3 print:mt-6 print:grid-cols-3">
        {[
          { terme: 'Code client', valeur: etude.client?.code ?? '—' },
          {
            terme: 'Pratique',
            valeur: etude.pratique ? LIBELLES_PRATIQUE[etude.pratique] : 'Non renseignée',
          },
          {
            terme: 'Objectif',
            valeur: etude.objectif ? LIBELLES_OBJECTIF[etude.objectif] : 'Non renseigné',
          },
        ].map(({ terme, valeur }) => (
          <div key={terme} className={`${BLOC} p-5 print:rounded-none print:border-0 print:p-0`}>
            <dt className="font-condensed text-[11px] uppercase tracking-[.14em] text-gris">
              {terme}
            </dt>
            <dd className="m-0 mt-2 text-[17px] font-semibold text-encre">{valeur}</dd>
          </div>
        ))}
      </dl>

      <div className={`${BLOC} mt-4 p-5 print:mt-5 print:rounded-none print:border-0 print:p-0`}>
        <NomCycliste />
      </div>

      <section aria-labelledby="titre-mesures" className="mt-12 print:mt-8">
        <h2 id="titre-mesures" className={SURTITRE}>
          Mesures{etude.measurements.length > 0 ? ` · ${ecarts} hors fourchette` : ''}
        </h2>

        {etude.measurements.length === 0 ? (
          <>
            <div className="mt-4 print:hidden">
              <EtatVide image="/assets/feature-pose.jpg" titre="Aucune mesure pour l’instant">
                <p className="m-0">
                  Cette étude est en brouillon. Les angles et leurs fourchettes cibles apparaîtront
                  ici une fois la séance de capture réalisée.
                </p>
              </EtatVide>
            </div>
            <p className="m-0 mt-3 hidden text-[14px] text-texte print:block">
              Aucune mesure enregistrée pour cette étude.
            </p>
          </>
        ) : (
          <div className={`${BLOC} mt-4 overflow-x-auto print:rounded-none print:border-0`}>
            <table className="w-full min-w-[560px] border-collapse text-left text-[14.5px] print:min-w-0">
              <thead>
                <tr className="border-b border-ligne font-condensed text-[11px] uppercase tracking-[.14em] text-gris print:border-encre">
                  <th scope="col" className="px-6 py-4 font-semibold print:px-0 print:py-2">
                    Articulation
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold print:px-0 print:py-2">
                    Valeur
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold print:px-0 print:py-2">
                    Fourchette cible
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold print:px-0 print:py-2">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {etude.measurements.map((mesure) => (
                  <tr
                    key={mesure.id}
                    className="sans-coupure border-b border-ligne-douce last:border-b-0"
                  >
                    <th scope="row" className="px-6 py-4 font-semibold text-encre print:px-0 print:py-2">
                      {LIBELLES_JOINT[mesure.joint]}
                    </th>
                    <td className="px-6 py-4 text-encre print:px-0 print:py-2">
                      {formaterDegres(mesure.value)}
                    </td>
                    <td className="px-6 py-4 text-texte print:px-0 print:py-2">
                      {formaterDegres(mesure.targetMin)} à {formaterDegres(mesure.targetMax)}
                    </td>
                    <td className={`px-6 py-4 print:px-0 print:py-2 ${TON_MESURE[mesure.status]}`}>
                      {LIBELLES_MESURE[mesure.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {etude.recommendations.length > 0 && (
        <section aria-labelledby="titre-recommandations" className="mt-12 print:mt-8">
          <h2 id="titre-recommandations" className={SURTITRE}>
            Recommandations de réglage, par priorité
          </h2>

          <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {etude.recommendations.map((recommandation, rang) => (
              <li
                key={recommandation.id}
                className={`${BLOC} sans-coupure flex gap-4 p-6 print:rounded-none print:border-0 print:border-b print:border-ligne print:px-0 print:py-3`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-encre font-condensed text-[14px] font-semibold text-white"
                >
                  {rang + 1}
                </span>
                <div>
                  <p className="m-0 font-condensed text-[11px] uppercase tracking-[.14em] text-gris">
                    {recommandation.joint ? LIBELLES_JOINT[recommandation.joint] : 'Position générale'}
                  </p>
                  <p className="m-0 mt-1 text-[15px] leading-[1.6] text-texte">
                    {recommandation.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="m-0 mt-12 border-t border-ligne pt-5 text-[13px] leading-[1.5] text-gris print:mt-8 print:border-encre print:text-texte">
        {MENTION}
      </p>

      {etude.modifiable && (
        <section aria-labelledby="titre-suppression" className={`${BLOC} mt-10 p-7 print:hidden`}>
          <h2 id="titre-suppression" className="m-0 text-[15px] font-semibold text-encre">
            Supprimer cette étude
          </h2>
          <p className="m-0 mt-2 mb-5 max-w-[640px] text-[14px] leading-[1.6] text-texte-doux">
            La fiche du client est conservée.
          </p>

          <BoutonSuppression
            action={actionSupprimerEtude}
            identifiant={etude.id}
            libelle="Supprimer l’étude"
            avertissement={`L’étude du ${date} pour ${sujet} sera supprimée, avec ses mesures et ses recommandations.`}
          />
        </section>
      )}
    </article>
  );
}
