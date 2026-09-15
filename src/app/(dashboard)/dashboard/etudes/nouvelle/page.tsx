import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Gift } from '@phosphor-icons/react/dist/ssr';
import { requireUser } from '../../../../../lib/auth';
import { canCreateStudy } from '../../../../../lib/access';
import { lireClients } from '../../../../../lib/requetes/dashboard';
import { MESSAGES_REFUS, estRefus } from '../../../../../lib/messagesAcces';
import { creerEtude } from './actions';

export const metadata: Metadata = {
  title: 'Nouvelle étude - Axio',
};

/**
 * Formulaire de creation d'etude.
 *
 * Composant serveur : l'identite vient de `requireUser()`, le droit de
 * `canCreateStudy()`, la liste des clients d'une requete filtree sur
 * `userId`. Le formulaire poste vers une server action qui refait les deux
 * controles.
 */
export default async function NouvelleEtudePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const utilisateur = await requireUser();
  const [autorisation, clients, parametres] = await Promise.all([
    canCreateStudy(utilisateur),
    lireClients(utilisateur.id),
    searchParams,
  ]);

  if (!autorisation.autorise) {
    const message = estRefus(autorisation.motif)
      ? MESSAGES_REFUS[autorisation.motif]
      : MESSAGES_REFUS.ETUDE_OFFERTE_CONSOMMEE;

    return (
      <div className="mx-auto max-w-[560px] rounded-bloc border border-ligne bg-white p-8">
        <h1 className="m-0 font-display text-[24px] leading-tight text-encre">{message.titre}</h1>
        <p className="m-0 mt-3 text-[15px] leading-[1.6] text-texte-doux">{message.phrase}</p>

        <Link
          href="/pricing"
          className="mt-6 inline-flex h-[50px] items-center justify-center rounded-full bg-rouge-cta px-[26px] text-[15.5px] font-semibold text-white shadow-rouge transition-colors duration-300 ease-doux hover:bg-rouge-cta-hover active:translate-y-px"
        >
          Voir les abonnements
        </Link>

        <Link
          href="/dashboard"
          className="mt-4 block text-[13.5px] font-medium text-gris underline underline-offset-2 transition-colors hover:text-encre"
        >
          Continuer à consulter mes études
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <h1 className="m-0 font-display text-titre-sm text-encre">Nouvelle étude</h1>
      <p className="m-0 mt-3 text-[15.5px] leading-[1.6] text-texte-doux">
        Choisissez le client analysé. L’étude s’ouvre en brouillon ; les mesures viendront de
        l’analyse vidéo.
      </p>

      {autorisation.motif === 'ETUDE_OFFERTE' && (
        <p className="m-0 mt-5 flex items-center gap-2 text-[13.5px] font-medium text-texte-doux">
          <Gift size={17} weight="regular" className="shrink-0 text-rouge" />
          Première étude, offerte.
        </p>
      )}

      <form
        action={creerEtude}
        className="mt-6 rounded-bloc border border-ligne bg-white p-7"
      >
        <label htmlFor="clientId" className="block text-[14px] font-semibold text-encre">
          Client
        </label>

        {clients.length === 0 ? (
          <p className="m-0 mt-3 text-[14px] leading-[1.6] text-texte-doux">
            Aucune fiche client pour l’instant. Créez-en une depuis la section Clients avant
            d’ouvrir une étude.
          </p>
        ) : (
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue=""
            className="mt-3 h-[50px] w-full rounded-[12px] border border-ligne bg-white px-4 text-[15px] text-encre"
          >
            <option value="" disabled>
              Sélectionner un client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.nom}
              </option>
            ))}
          </select>
        )}

        {parametres.erreur === 'client' && (
          <p className="m-0 mt-3 text-[13.5px] font-medium text-rouge-texte">
            Client introuvable. Sélectionnez une fiche de votre carnet.
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={clients.length === 0}
            className="inline-flex h-[50px] items-center justify-center rounded-full bg-rouge-cta px-[26px] text-[15.5px] font-semibold text-white shadow-rouge transition-colors duration-300 ease-doux hover:bg-rouge-cta-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            Ouvrir l’étude
          </button>

          <Link
            href="/dashboard"
            className="text-[13.5px] font-medium text-gris underline underline-offset-2 transition-colors hover:text-encre"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
