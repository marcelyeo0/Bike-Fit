import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { requireUser } from '../../../../lib/auth';
import { canCreateStudy } from '../../../../lib/access';
import { lirePage, lireStatut } from '../../../../lib/saisie';
import { lireEtudes } from '../../../../lib/requetes/etudes';
import { LIBELLES_STATUT, STATUTS } from '../../../../lib/libelles';
import type { StudyStatus } from '../../../../generated/prisma/enums';
import BandeauAbonnement from '../_composants/BandeauAbonnement';
import BoutonNouvelleEtude from '../_composants/BoutonNouvelleEtude';
import CarteEtude from '../_composants/CarteEtude';
import EtatVide from '../../_composants/EtatVide';
import { BOUTON_CONTOUR, MESSAGE_INFO } from '../../_composants/classes';

export const metadata: Metadata = {
  title: 'Études - Axio',
};

/** `/dashboard/etudes`, avec le filtre et la page conserves dans l'URL. */
function adresse(statut: StudyStatus | null, page: number): string {
  const parametres = new URLSearchParams();
  if (statut) parametres.set('statut', statut);
  if (page > 1) parametres.set('page', String(page));
  const requete = parametres.toString();
  return requete ? `/dashboard/etudes?${requete}` : '/dashboard/etudes';
}

const PILULE =
  'inline-flex h-[38px] items-center rounded-full border px-4 text-[13.5px] font-semibold ' +
  'transition-colors duration-300 ease-doux';

const FLECHE =
  'inline-flex h-[42px] items-center gap-1.5 rounded-full border px-[18px] text-sm font-semibold';

/**
 * Toutes les etudes de l'atelier, les plus recentes d'abord.
 *
 * GARDE : composant serveur. Le filtre et la page viennent de l'URL, donc du
 * navigateur : ils sont valides par `lireStatut` / `lirePage` avant d'atteindre
 * la requete, elle-meme filtree sur le `userId`.
 */
export default async function EtudesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; page?: string; supprimee?: string }>;
}) {
  const utilisateur = await requireUser();
  const parametres = await searchParams;

  const statut = lireStatut(parametres.statut);

  const [resultat, autorisation] = await Promise.all([
    lireEtudes(utilisateur.id, { statut, page: lirePage(parametres.page) }),
    canCreateStudy(utilisateur),
  ]);

  const { etudes, total, page, pages } = resultat;
  const aucuneEtude = total === 0 && statut === null;

  return (
    <>
      <BandeauAbonnement autorisation={autorisation} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 font-display text-titre-sm text-encre">Études</h1>
          <p className="m-0 mt-3 text-[15.5px] leading-[1.6] text-texte-doux">
            Toutes les études de votre atelier, les plus récentes d’abord.
          </p>
        </div>

        <BoutonNouvelleEtude autorisation={autorisation} />
      </header>

      {parametres.supprimee === '1' && (
        <p role="status" className={`${MESSAGE_INFO} mt-6`}>
          Étude supprimée.
        </p>
      )}

      {aucuneEtude ? (
        <div className="mt-10">
          <EtatVide
            image="/assets/etape-film.jpg"
            titre="Aucune étude pour l’instant"
            action={
              // Zero etude reelle : l'etude offerte est encore disponible, le
              // lien est donc ouvert. La server action revalide de toute facon.
              <Link href="/dashboard/etudes/nouvelle" className={BOUTON_CONTOUR}>
                Créer une étude
              </Link>
            }
          >
            <p className="m-0">
              Une étude rattache une pratique et un objectif à un client. Elle s’ouvre en
              brouillon ; les mesures s’y ajoutent lors de la séance.
            </p>
          </EtatVide>
        </div>
      ) : (
        <>
          <nav aria-label="Filtrer par statut" className="mt-8">
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {[null, ...STATUTS].map((choix) => {
                const actif = choix === statut;
                return (
                  <li key={choix ?? 'TOUTES'}>
                    <Link
                      href={adresse(choix, 1)}
                      aria-current={actif ? 'page' : undefined}
                      className={`${PILULE} ${
                        actif
                          ? 'border-encre bg-encre text-white'
                          : 'border-ligne bg-white text-texte-doux hover:border-encre hover:text-encre'
                      }`}
                    >
                      {choix ? LIBELLES_STATUT[choix] : 'Toutes'}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="m-0 mt-5 text-[13.5px] text-gris">
            {total} étude{total > 1 ? 's' : ''}
            {statut ? ` · ${LIBELLES_STATUT[statut].toLowerCase()}` : ''}
          </p>

          {etudes.length === 0 ? (
            <p className="m-0 mt-6 text-[14.5px] leading-[1.6] text-texte-doux">
              Aucune étude avec ce statut.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {etudes.map((etude) => (
                <CarteEtude key={etude.id} etude={etude} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-4">
              {/* Sans page precedente ou suivante, l'element reste inerte : un
                  <span>, pas un lien qui ne mene nulle part. */}
              {page > 1 ? (
                <Link
                  href={adresse(statut, page - 1)}
                  rel="prev"
                  className={`${FLECHE} border-encre text-encre transition-colors duration-300 ease-doux hover:bg-encre hover:text-white`}
                >
                  <CaretLeft size={15} weight="bold" />
                  Précédentes
                </Link>
              ) : (
                <span aria-disabled="true" className={`${FLECHE} border-ligne text-gris-clair`}>
                  <CaretLeft size={15} weight="bold" />
                  Précédentes
                </span>
              )}

              <p className="m-0 text-[13.5px] text-gris">
                Page {page} sur {pages}
              </p>

              {page < pages ? (
                <Link
                  href={adresse(statut, page + 1)}
                  rel="next"
                  className={`${FLECHE} border-encre text-encre transition-colors duration-300 ease-doux hover:bg-encre hover:text-white`}
                >
                  Suivantes
                  <CaretRight size={15} weight="bold" />
                </Link>
              ) : (
                <span aria-disabled="true" className={`${FLECHE} border-ligne text-gris-clair`}>
                  Suivantes
                  <CaretRight size={15} weight="bold" />
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
