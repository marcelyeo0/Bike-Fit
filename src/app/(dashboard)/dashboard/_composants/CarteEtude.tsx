import React from 'react';
import Link from 'next/link';
import type { EtudeResumee } from '../../../../lib/requetes/dashboard';
import type { MeasurementStatus, StudyStatus } from '../../../../generated/prisma/enums';
import {
  LIBELLES_JOINT,
  LIBELLES_STATUT,
  formaterCadre,
  formaterDate,
  formaterDegres,
} from '../../../../lib/libelles';

/**
 * Carte d'une etude dans une grille (tableau de bord, liste, fiche client).
 *
 * Toute la carte est un lien vers le detail de l'etude. L'etude de
 * demonstration y mene aussi : sa page est en lecture seule.
 */

// Pas de vert ni d'orange dans les tokens de la landing : le statut se lit au
// contraste (encre = abouti, rouge = probleme, gris = en attente).
export const PASTILLES: Record<StudyStatus, string> = {
  DRAFT: 'bg-gris-clair',
  PROCESSING: 'bg-gris',
  COMPLETED: 'bg-encre',
  FAILED: 'bg-rouge',
};

const PUCE_MESURE: Record<MeasurementStatus, string> = {
  OK: 'border-ligne text-texte-doux',
  WARNING: 'border-gris text-encre',
  OUT: 'border-rouge text-rouge-texte',
};

/** Les ecarts d'abord : c'est ce qu'on veut voir dans un apercu. */
function anglesCles(mesures: EtudeResumee['measurements']) {
  const rang: Record<MeasurementStatus, number> = { OUT: 0, WARNING: 1, OK: 2 };
  return [...mesures].sort((a, b) => rang[a.status] - rang[b.status]).slice(0, 4);
}

export default function CarteEtude({ etude }: { etude: EtudeResumee }) {
  const mesures = anglesCles(etude.measurements);

  // Le client est un code, jamais un nom. `client` est nullable depuis que
  // Study.clientId l'est : on retombe sur `titre`, puis sur un libelle neutre.
  const sujet = etude.client?.code ?? etude.titre ?? 'Étude sans client';
  const cadre = formaterCadre(etude.pratique, etude.objectif);

  return (
    <Link
      href={`/dashboard/etudes/${etude.id}`}
      className="group block rounded-bloc focus-visible:outline-offset-4"
    >
      <article className="flex h-full flex-col rounded-bloc border border-ligne bg-white p-6 transition-colors duration-300 ease-doux group-hover:border-encre">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-[17px] font-semibold leading-tight text-encre">{sujet}</h3>
            <p className="m-0 mt-1 text-[13px] text-gris">
              {formaterDate(etude.completedAt ?? etude.createdAt)}
              {cadre ? ` · ${cadre}` : ''}
            </p>
          </div>

          {etude.isDemo && (
            <span className="shrink-0 rounded-full bg-rouge-cta px-3 py-1 font-condensed text-[11px] uppercase tracking-[.14em] text-white">
              Démo
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${PASTILLES[etude.status]}`}
          />
          <span className="text-[13px] font-medium text-texte">
            {LIBELLES_STATUT[etude.status]}
          </span>
        </div>

        {mesures.length > 0 && (
          <ul className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
            {mesures.map((mesure) => (
              <li
                key={mesure.joint}
                title={`Fourchette ${formaterDegres(mesure.targetMin)} à ${formaterDegres(mesure.targetMax)}`}
                className={`rounded-full border px-3 py-1 text-[12.5px] font-medium ${
                  PUCE_MESURE[mesure.status]
                }`}
              >
                {LIBELLES_JOINT[mesure.joint]} {Math.round(mesure.value)}°
              </li>
            ))}
          </ul>
        )}
      </article>
    </Link>
  );
}
