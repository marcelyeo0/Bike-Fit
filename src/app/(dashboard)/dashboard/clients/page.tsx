import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import { requireUser } from '../../../../lib/auth';
import { lireCarnet } from '../../../../lib/requetes/clients';
import { formaterCm, formaterDate } from '../../../../lib/libelles';
import ChampsMensurations from '../../_composants/ChampsMensurations';
import EtatVide from '../../_composants/EtatVide';
import {
  BLOC,
  BOUTON_PRIMAIRE,
  MESSAGE_ERREUR,
  MESSAGE_INFO,
  SURTITRE,
} from '../../_composants/classes';
import { actionCreerClient } from './actions';

export const metadata: Metadata = {
  title: 'Clients - Axio',
};

/**
 * Carnet de clients.
 *
 * GARDE : composant serveur. Identite par `requireUser()`, lecture par
 * `lireCarnet(userId)`. Le formulaire poste vers une server action qui refait
 * le controle d'identite.
 *
 * Un client est un code attribue par le serveur : la page ne demande ni nom
 * ni contact, et n'en affiche aucun.
 */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; supprime?: string }>;
}) {
  const utilisateur = await requireUser();
  const [clients, parametres] = await Promise.all([lireCarnet(utilisateur.id), searchParams]);

  return (
    <>
      <header>
        <h1 className="m-0 font-display text-titre-sm text-encre">Clients</h1>
        <p className="m-0 mt-3 max-w-[640px] text-[15.5px] leading-[1.6] text-texte-doux">
          Chaque cycliste est un code. Axio n’enregistre ni nom ni contact : la correspondance
          entre un code et une personne reste dans votre atelier.
        </p>
      </header>

      {parametres.supprime === '1' && (
        <p role="status" className={`${MESSAGE_INFO} mt-6`}>
          Client supprimé, avec toutes ses études.
        </p>
      )}

      <section aria-labelledby="titre-nouveau-client" className={`${BLOC} mt-8 p-7`}>
        <h2 id="titre-nouveau-client" className="m-0 text-[17px] font-semibold text-encre">
          Nouveau client
        </h2>
        <p className="m-0 mt-2 text-[14px] leading-[1.6] text-texte-doux">
          Le code est attribué automatiquement. Les mensurations sont facultatives et
          modifiables ensuite.
        </p>

        <form action={actionCreerClient} className="mt-6">
          <ChampsMensurations prefixe="nouveau" />

          {parametres.erreur === 'mensurations' && (
            <p role="alert" className={`${MESSAGE_ERREUR} mt-4`}>
              Mensurations hors limites. Saisissez des centimètres, par exemple 178 et 84,5.
            </p>
          )}

          <button type="submit" className={`${BOUTON_PRIMAIRE} mt-6`}>
            <Plus size={18} weight="bold" />
            Créer le client
          </button>
        </form>
      </section>

      <section aria-labelledby="titre-carnet" className="mt-12">
        <h2 id="titre-carnet" className={SURTITRE}>
          Carnet ({clients.length})
        </h2>

        <div className="mt-4">
          {clients.length === 0 ? (
            <EtatVide image="/assets/etape-analyse.jpg" titre="Votre carnet est vide">
              <p className="m-0">
                Créez votre premier client ci-dessus : il recevra le code AX-0001. Notez ce code
                sur votre fiche d’atelier, c’est lui qui relie le cycliste à ses études.
              </p>
            </EtatVide>
          ) : (
            <div className={`${BLOC} overflow-x-auto`}>
              <table className="w-full min-w-[620px] border-collapse text-left text-[14.5px]">
                <thead>
                  <tr className="border-b border-ligne font-mono text-[11px] uppercase tracking-[.08em] text-gris">
                    <th scope="col" className="px-6 py-4 font-semibold">
                      Code
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold">
                      Taille
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold">
                      Entrejambe
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold">
                      Études
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold">
                      Dernière étude
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-ligne-douce last:border-b-0">
                      <th scope="row" className="px-6 py-4 font-mono font-medium">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="text-encre underline decoration-ligne underline-offset-4 transition-colors hover:decoration-encre"
                        >
                          {client.code}
                        </Link>
                      </th>
                      <td className="px-6 py-4 font-mono tabular-nums text-texte">{formaterCm(client.tailleCm)}</td>
                      <td className="px-6 py-4 font-mono tabular-nums text-texte">{formaterCm(client.entrejambeCm)}</td>
                      <td className="px-6 py-4 font-mono tabular-nums text-texte">{client.nombreEtudes}</td>
                      <td className="px-6 py-4 text-texte-doux">
                        {client.derniereEtude ? formaterDate(client.derniereEtude) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
