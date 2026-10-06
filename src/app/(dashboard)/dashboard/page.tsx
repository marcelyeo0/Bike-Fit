import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '../../../lib/auth';
import { canCreateStudy } from '../../../lib/access';
import {
  lireEtudeDemo,
  lireEtudesRecentes,
  lireStatistiques,
} from '../../../lib/requetes/dashboard';
import BandeauAbonnement from './_composants/BandeauAbonnement';
import BoutonNouvelleEtude from './_composants/BoutonNouvelleEtude';
import CarteEtude from './_composants/CarteEtude';
import CarteStat from './_composants/CarteStat';
import { BOUTON_CONTOUR, SURTITRE } from '../_composants/classes';

export const metadata: Metadata = {
  title: 'Tableau de bord - Axio',
};

/**
 * Tableau de bord.
 *
 * GARDE : composant serveur de bout en bout. L'identite vient de
 * `requireUser()` — jamais de `currentUser()` ni de `auth()` de Clerk — et
 * toutes les lectures passent par `src/lib/requetes/dashboard.ts`, ou le
 * `userId` est obligatoire. Aucun de ces composants n'est marque `use client`,
 * donc aucun appel Prisma ne peut partir vers le navigateur.
 */
export default async function DashboardPage() {
  const utilisateur = await requireUser();

  const maintenant = new Date();
  const debutDuMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  // Lectures independantes : en parallele plutot qu'en cascade.
  const [stats, etudes, autorisation] = await Promise.all([
    lireStatistiques(utilisateur.id, debutDuMois),
    lireEtudesRecentes(utilisateur.id),
    canCreateStudy(utilisateur),
  ]);

  const vide = etudes.length === 0;
  // Requete supplementaire uniquement dans l'etat vide.
  const demo = vide ? await lireEtudeDemo() : null;

  const prenom = utilisateur.name?.split(' ')[0] ?? null;

  return (
    <>
      <BandeauAbonnement autorisation={autorisation} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 font-display text-titre-sm text-encre">Tableau de bord</h1>
          <p className="m-0 mt-3 text-[15.5px] leading-[1.6] text-texte-doux">
            {prenom ? `Bonjour ${prenom}. ` : ''}
            Vos études de position, vos clients et les écarts relevés.
          </p>
        </div>

        <BoutonNouvelleEtude autorisation={autorisation} />
      </header>

      <section aria-label="Statistiques" className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStat
          libelle="Études réalisées"
          valeur={stats.etudesRealisees}
          precision="Analyses terminées depuis la création du compte"
        />
        <CarteStat
          libelle="Clients suivis"
          valeur={stats.clientsSuivis}
          precision="Fiches clients enregistrées dans votre atelier"
        />
        <CarteStat
          libelle="Études ce mois-ci"
          valeur={stats.etudesCeMois}
          precision="Séances ouvertes depuis le 1er du mois"
        />
        <CarteStat
          libelle="Écarts détectés"
          valeur={stats.ecartsDetectes}
          precision="Angles hors de la fourchette cible, toutes études confondues"
          accent
        />
      </section>

      <section aria-label="Études récentes" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={SURTITRE}>{vide ? 'Exemple de rapport' : 'Études récentes'}</h2>
          {!vide && (
            <Link
              href="/dashboard/etudes"
              className="text-[13.5px] font-medium text-gris underline underline-offset-2 transition-colors hover:text-encre"
            >
              Toutes les études
            </Link>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vide ? (
            <>
              {demo && <CarteEtude etude={demo} />}

              {/* Invitation a demarrer : meme gabarit de carte, en pointilles
                  pour qu'elle se lise comme un emplacement a remplir. */}
              <article className="flex flex-col justify-between rounded-bloc border border-dashed border-ligne bg-white p-6">
                <div>
                  <h3 className="m-0 text-[17px] font-semibold leading-tight text-encre">
                    Votre première étude
                  </h3>
                  <p className="m-0 mt-2 text-[14px] leading-[1.6] text-texte-doux">
                    Créez un client, ouvrez son étude : Axio mesure les angles et propose les
                    réglages. Aucune vidéo n’est conservée.
                  </p>
                </div>

                {/* L'etat vide implique zero etude reelle, donc l'etude
                    offerte est encore disponible : le lien est toujours ouvert
                    ici, et la server action revalide de toute facon. */}
                <Link
                  href="/dashboard/etudes/nouvelle"
                  className={`${BOUTON_CONTOUR} mt-6`}
                >
                  Créer une étude
                </Link>
              </article>
            </>
          ) : (
            etudes.map((etude) => <CarteEtude key={etude.id} etude={etude} />)
          )}
        </div>
      </section>
    </>
  );
}
