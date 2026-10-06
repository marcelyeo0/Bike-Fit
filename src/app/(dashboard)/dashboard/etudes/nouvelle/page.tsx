import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Gift, Plus } from '@phosphor-icons/react/dist/ssr';
import { requireUser } from '../../../../../lib/auth';
import { canCreateStudy } from '../../../../../lib/access';
import { lireCodesClients } from '../../../../../lib/requetes/clients';
import { MESSAGES_REFUS, estRefus } from '../../../../../lib/messagesAcces';
import {
  LIBELLES_OBJECTIF,
  LIBELLES_PRATIQUE,
  OBJECTIFS,
  PRATIQUES,
} from '../../../../../lib/libelles';
import ChampsMensurations from '../../../_composants/ChampsMensurations';
import {
  BLOC,
  BOUTON_CONTOUR,
  BOUTON_PRIMAIRE,
  CHAMP,
  ETIQUETTE,
  LIEN_DISCRET,
  MESSAGE_ERREUR,
} from '../../../_composants/classes';
import { actionCreerClient } from '../../clients/actions';
import { actionCreerEtude } from './actions';

export const metadata: Metadata = {
  title: 'Nouvelle étude - Axio',
};

/**
 * Un groupe de boutons radio rendus en pilules. Le `<input>` reste dans le
 * DOM (`sr-only`) : clavier, lecteur d'ecran et validation `required` du
 * navigateur fonctionnent sans JavaScript, donc sans `'use client'`.
 */
function ChoixPilules({
  legende,
  nom,
  choix,
}: {
  legende: string;
  nom: string;
  choix: { valeur: string; libelle: string }[];
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className={`${ETIQUETTE} p-0`}>{legende}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {choix.map(({ valeur, libelle }) => (
          <label key={valeur} className="cursor-pointer">
            <input type="radio" name={nom} value={valeur} required className="peer sr-only" />
            <span className="inline-flex h-[42px] items-center rounded-full border border-ligne bg-white px-[18px] text-sm font-semibold text-texte-doux transition-colors duration-300 ease-doux hover:border-encre hover:text-encre peer-checked:border-encre peer-checked:bg-encre peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-encre">
              {libelle}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Formulaire de creation d'etude.
 *
 * Composant serveur : l'identite vient de `requireUser()`, le droit de
 * `canCreateStudy()`, la liste des clients d'une requete filtree sur
 * `userId`. Le formulaire poste vers une server action qui refait les
 * controles.
 *
 * Carnet vide : la page propose de creer le premier client sur place, puis
 * revient ici avec ce client preselectionne (`?client=`).
 */
export default async function NouvelleEtudePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; client?: string }>;
}) {
  const utilisateur = await requireUser();
  const [autorisation, clients, parametres] = await Promise.all([
    canCreateStudy(utilisateur),
    lireCodesClients(utilisateur.id),
    searchParams,
  ]);

  if (!autorisation.autorise) {
    const message = estRefus(autorisation.motif)
      ? MESSAGES_REFUS[autorisation.motif]
      : MESSAGES_REFUS.ETUDE_OFFERTE_CONSOMMEE;

    return (
      <div className={`${BLOC} mx-auto max-w-[560px] p-8`}>
        <h1 className="m-0 font-display text-[24px] leading-tight text-encre">{message.titre}</h1>
        <p className="m-0 mt-3 text-[15px] leading-[1.6] text-texte-doux">{message.phrase}</p>

        <Link href="/pricing" className={`${BOUTON_PRIMAIRE} mt-6`}>
          Voir les abonnements
        </Link>

        <Link href="/dashboard/etudes" className={`${LIEN_DISCRET} mt-4 block`}>
          Continuer à consulter mes études
        </Link>
      </div>
    );
  }

  // `?client=` vient de l'URL : il ne preselectionne que s'il figure dans le
  // carnet de l'atelier. Sinon il est ignore — et la server action recontrole.
  const preselection = clients.find((client) => client.id === parametres.client)?.id ?? '';
  const carnetVide = clients.length === 0;

  return (
    <div className="mx-auto max-w-[560px]">
      <h1 className="m-0 font-display text-titre-sm text-encre">Nouvelle étude</h1>
      <p className="m-0 mt-3 text-[15.5px] leading-[1.6] text-texte-doux">
        Choisissez le client, sa pratique et l’objectif du réglage. L’étude s’ouvre en brouillon ;
        les mesures s’y ajoutent lors de la séance.
      </p>

      {autorisation.motif === 'ETUDE_OFFERTE' && (
        <p className="m-0 mt-5 flex items-center gap-2 text-[13.5px] font-medium text-texte-doux">
          <Gift size={17} weight="regular" className="shrink-0 text-rouge" />
          Première étude, offerte.
        </p>
      )}

      {carnetVide ? (
        <section aria-labelledby="titre-premier-client" className={`${BLOC} mt-6 p-7`}>
          <h2 id="titre-premier-client" className="m-0 text-[17px] font-semibold text-encre">
            Commencez par créer un client
          </h2>
          <p className="m-0 mt-2 text-[14px] leading-[1.6] text-texte-doux">
            Une étude se rattache à un client, et votre carnet est vide. Le client reçoit un code
            (AX-0001) ; Axio n’enregistre ni nom ni contact.
          </p>

          <form action={actionCreerClient} className="mt-6">
            <input type="hidden" name="retour" value="etude" />
            <ChampsMensurations prefixe="premier" />

            {parametres.erreur === 'mensurations' && (
              <p role="alert" className={`${MESSAGE_ERREUR} mt-4`}>
                Mensurations hors limites. Saisissez des centimètres, par exemple 178 et 84,5.
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button type="submit" className={BOUTON_PRIMAIRE}>
                <Plus size={18} weight="bold" />
                Créer le client et continuer
              </button>
              <Link href="/dashboard" className={LIEN_DISCRET}>
                Annuler
              </Link>
            </div>
          </form>
        </section>
      ) : (
        <form action={actionCreerEtude} className={`${BLOC} mt-6 p-7`}>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="clientId" className={ETIQUETTE}>
              Code client
            </label>
            <Link href="/dashboard/clients" className={LIEN_DISCRET}>
              Nouveau client
            </Link>
          </div>

          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={preselection}
            className={CHAMP}
          >
            <option value="" disabled>
              Sélectionner un code
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.code}
              </option>
            ))}
          </select>

          <div className="mt-7">
            <ChoixPilules
              legende="Pratique"
              nom="pratique"
              choix={PRATIQUES.map((valeur) => ({ valeur, libelle: LIBELLES_PRATIQUE[valeur] }))}
            />
          </div>

          <div className="mt-7">
            <ChoixPilules
              legende="Objectif"
              nom="objectif"
              choix={OBJECTIFS.map((valeur) => ({ valeur, libelle: LIBELLES_OBJECTIF[valeur] }))}
            />
          </div>

          {parametres.erreur === 'champs' && (
            <p role="alert" className={`${MESSAGE_ERREUR} mt-5`}>
              Sélectionnez un code client, une pratique et un objectif.
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button type="submit" className={BOUTON_PRIMAIRE}>
              Ouvrir l’étude
            </button>

            <Link href="/dashboard" className={LIEN_DISCRET}>
              Annuler
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
