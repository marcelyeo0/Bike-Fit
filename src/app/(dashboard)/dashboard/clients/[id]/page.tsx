import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { requireUser } from '../../../../../lib/auth';
import { lireIdentifiant } from '../../../../../lib/saisie';
import { lireFicheClient } from '../../../../../lib/requetes/clients';
import { formaterCm, formaterDate } from '../../../../../lib/libelles';
import CarteEtude from '../../_composants/CarteEtude';
import BoutonSuppression from '../../../_composants/BoutonSuppression';
import ChampsClient from '../../../_composants/ChampsClient';
import {
  BLOC,
  BOUTON_CONTOUR,
  LIEN_DISCRET,
  MESSAGE_ERREUR,
  MESSAGE_INFO,
  SURTITRE,
} from '../../../_composants/classes';
import { actionModifierClient, actionSupprimerClient } from '../actions';

export const metadata: Metadata = {
  title: 'Fiche client - Axio',
};

/**
 * Fiche d'un client : mensurations, historique des etudes, export, suppression.
 *
 * GARDE : l'identifiant de l'URL est lu avec le `userId` de `requireUser()`.
 * Une fiche d'un autre atelier et une fiche inexistante donnent le meme 404.
 */
export default async function FicheClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; cree?: string; maj?: string }>;
}) {
  const utilisateur = await requireUser();
  const [{ id }, parametres] = await Promise.all([params, searchParams]);

  const clientId = lireIdentifiant(id);
  if (!clientId) notFound();

  const client = await lireFicheClient(utilisateur.id, clientId);
  if (!client) notFound();

  const nombreEtudes = client.etudes.length;

  return (
    <>
      <Link href="/dashboard/clients" className={`${LIEN_DISCRET} inline-flex items-center gap-1.5`}>
        <ArrowLeft size={15} weight="regular" />
        Tous les clients
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={SURTITRE}>Client</p>
          <h1 className="m-0 mt-2 font-display text-titre-sm text-encre">{client.nom}</h1>
          <p className="m-0 mt-3 text-[15.5px] leading-[1.6] text-texte-doux">
            Créé le {formaterDate(client.createdAt)}
            <span className="ml-2 font-mono text-[13px] text-gris">{client.code}</span>
          </p>
        </div>

        <Link href={`/dashboard/etudes/nouvelle?client=${client.id}`} className={BOUTON_CONTOUR}>
          Ouvrir une étude
        </Link>
      </header>

      {parametres.cree === '1' && (
        <p role="status" className={`${MESSAGE_INFO} mt-6`}>
          Client créé.
        </p>
      )}
      {parametres.maj === '1' && (
        <p role="status" className={`${MESSAGE_INFO} mt-6`}>
          Fiche enregistrée.
        </p>
      )}

      <section aria-labelledby="titre-mensurations" className={`${BLOC} mt-8 p-7`}>
        <h2 id="titre-mensurations" className="m-0 text-[17px] font-semibold text-encre">
          Fiche
        </h2>
        <p className="m-0 mt-2 text-[14px] leading-[1.6] text-texte-doux">
          Taille {formaterCm(client.tailleCm)}, entrejambe {formaterCm(client.entrejambeCm)}.
        </p>

        <form action={actionModifierClient} className="mt-6">
          <input type="hidden" name="id" value={client.id} />
          <ChampsClient
            prefixe="fiche"
            nom={client.nom}
            tailleCm={client.tailleCm}
            entrejambeCm={client.entrejambeCm}
          />

          {parametres.erreur === 'nom' && (
            <p role="alert" className={`${MESSAGE_ERREUR} mt-4`}>
              Saisissez le nom du cycliste, 80 caractères au plus.
            </p>
          )}
          {parametres.erreur === 'mensurations' && (
            <p role="alert" className={`${MESSAGE_ERREUR} mt-4`}>
              Mensurations hors limites. Saisissez des centimètres, par exemple 178 et 84,5.
            </p>
          )}

          <button type="submit" className={`${BOUTON_CONTOUR} mt-6`}>
            Enregistrer la fiche
          </button>
        </form>
      </section>

      <section aria-labelledby="titre-historique" className="mt-12">
        <h2 id="titre-historique" className={SURTITRE}>
          Historique des études ({nombreEtudes})
        </h2>

        {nombreEtudes === 0 ? (
          <p className="m-0 mt-4 text-[14.5px] leading-[1.6] text-texte-doux">
            Aucune étude pour ce client.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {client.etudes.map((etude) => (
              <CarteEtude key={etude.id} etude={etude} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="titre-donnees" className={`${BLOC} mt-12 p-7`}>
        <h2 id="titre-donnees" className="m-0 text-[17px] font-semibold text-encre">
          Données du client
        </h2>
        <p className="m-0 mt-2 max-w-[640px] text-[14px] leading-[1.6] text-texte-doux">
          L’export réunit les mensurations, les études, les mesures et les recommandations de
          {' '}
          {client.nom} dans un fichier JSON, à remettre au cycliste s’il demande ses données.
        </p>

        {/* Route handler, pas une page : `<a download>` et non `<Link>`, qui
            tenterait une navigation client vers du JSON. */}
        <a href={`/dashboard/clients/${client.id}/export`} download className={`${BOUTON_CONTOUR} mt-5`}>
          <DownloadSimple size={17} weight="regular" />
          Exporter en JSON
        </a>

        <div className="mt-8 border-t border-ligne-douce pt-7">
          <h3 className="m-0 text-[15px] font-semibold text-encre">Supprimer ce client</h3>
          <p className="m-0 mt-2 mb-5 max-w-[640px] text-[14px] leading-[1.6] text-texte-doux">
            La suppression emporte la fiche et son historique.
          </p>

          <BoutonSuppression
            action={actionSupprimerClient}
            identifiant={client.id}
            libelle="Supprimer le client"
            avertissement={
              nombreEtudes === 0
                ? `${client.nom} sera supprimé.`
                : `${client.nom} sera supprimé, avec ses ${nombreEtudes} étude${
                    nombreEtudes > 1 ? 's' : ''
                  }, leurs mesures et leurs recommandations.`
            }
          />
        </div>
      </section>
    </>
  );
}
