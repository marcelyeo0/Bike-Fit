import React from 'react';
import type { EtudeResumee } from '../../../../lib/requetes/dashboard';
import type { Joint, MeasurementStatus, StudyStatus } from '../../../../generated/prisma/enums';

/**
 * Carte d'une etude dans la grille des etudes recentes.
 *
 * Aucun lien pour l'instant : la page de detail d'une etude n'existe pas
 * encore, et un lien mort coute plus cher qu'une carte inerte.
 */

const LIBELLES_JOINT: Record<Joint, string> = {
  KNEE: 'Genou',
  HIP: 'Hanche',
  ELBOW: 'Coude',
  SHOULDER: 'Épaule',
  ANKLE: 'Cheville',
};

const LIBELLES_STATUT: Record<StudyStatus, string> = {
  DRAFT: 'Brouillon',
  PROCESSING: 'Analyse en cours',
  COMPLETED: 'Terminée',
  FAILED: 'Échec',
};

// Pas de vert ni d'orange dans les tokens de la landing : le statut se lit au
// contraste (encre = abouti, rouge = probleme, gris = en attente).
const PASTILLES: Record<StudyStatus, string> = {
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

const DATE_FR = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Les ecarts d'abord : c'est ce qu'on veut voir dans un apercu. */
function anglesCles(mesures: EtudeResumee['measurements']) {
  const rang: Record<MeasurementStatus, number> = { OUT: 0, WARNING: 1, OK: 2 };
  return [...mesures].sort((a, b) => rang[a.status] - rang[b.status]).slice(0, 4);
}

export default function CarteEtude({ etude }: { etude: EtudeResumee }) {
  const mesures = anglesCles(etude.measurements);

  // `client` est nullable depuis que Study.clientId l'est : on retombe sur
  // `titre`, puis sur un libelle neutre. Aucun chemin de creation ne produit
  // encore ce cas, mais la carte ne doit pas casser le jour ou il arrivera.
  const sujet = etude.client?.nom ?? etude.titre ?? 'Étude sans client';

  return (
    <article className="flex flex-col rounded-bloc border border-ligne bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-[17px] font-semibold leading-tight text-encre">
            {sujet}
          </h3>
          <p className="m-0 mt-1 text-[13px] text-gris">
            {DATE_FR.format(etude.completedAt ?? etude.createdAt)}
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
        <span className="text-[13px] font-medium text-texte">{LIBELLES_STATUT[etude.status]}</span>
      </div>

      {mesures.length > 0 && (
        <ul className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
          {mesures.map((mesure) => (
            <li
              key={mesure.joint}
              title={`Cible ${mesure.targetMin}–${mesure.targetMax}°`}
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
  );
}
