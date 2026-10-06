import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { requireUser } from '../../../../lib/auth';
import { LIBELLES_ABONNEMENT, LIBELLES_PLAN, formaterDate } from '../../../../lib/libelles';
import { BLOC, BOUTON_CONTOUR, LIEN_ACCENT } from '../../_composants/classes';
import BoutonGererCompte from './_composants/BoutonGererCompte';

export const metadata: Metadata = {
  title: 'Paramètres - Axio',
};

function Ligne({ terme, children }: { terme: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ligne-douce py-3 last:border-b-0">
      <dt className="text-[14px] text-texte-doux">{terme}</dt>
      <dd className="m-0 text-[14.5px] font-semibold text-encre">{children}</dd>
    </div>
  );
}

/**
 * Parametres de l'atelier.
 *
 * GARDE : composant serveur, identite par `requireUser()`. Tout ce qui est
 * affiche vient de la ligne User de la session. La formule et l'etat
 * d'abonnement sont en lecture seule : ils ne changent que par le parcours
 * d'abonnement, jamais depuis cette page.
 */
export default async function ParametresPage() {
  const utilisateur = await requireUser();

  return (
    <>
      <header>
        <h1 className="m-0 font-display text-titre-sm text-encre">Paramètres</h1>
        <p className="m-0 mt-3 text-[15.5px] leading-[1.6] text-texte-doux">
          Votre compte, votre formule et les données de votre atelier.
        </p>
      </header>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="titre-compte" className={`${BLOC} p-7`}>
          <h2 id="titre-compte" className="m-0 text-[17px] font-semibold text-encre">
            Compte
          </h2>

          <dl className="m-0 mt-4">
            <Ligne terme="Atelier">{utilisateur.name ?? 'Non renseigné'}</Ligne>
            <Ligne terme="E-mail">{utilisateur.email}</Ligne>
            <Ligne terme="Compte créé le">{formaterDate(utilisateur.createdAt)}</Ligne>
          </dl>

          <p className="m-0 mt-5 mb-5 text-[14px] leading-[1.6] text-texte-doux">
            Nom, e-mail, mot de passe et sessions se modifient dans votre profil.
          </p>
          <BoutonGererCompte />
        </section>

        <section aria-labelledby="titre-abonnement" className={`${BLOC} p-7`}>
          <h2 id="titre-abonnement" className="m-0 text-[17px] font-semibold text-encre">
            Abonnement
          </h2>

          <dl className="m-0 mt-4">
            <Ligne terme="Formule">{LIBELLES_PLAN[utilisateur.plan]}</Ligne>
            <Ligne terme="État">{LIBELLES_ABONNEMENT[utilisateur.subscriptionStatus]}</Ligne>
          </dl>

          <Link href="/pricing" className={`${LIEN_ACCENT} mt-5`}>
            Voir les abonnements
            <ArrowRight size={15} weight="regular" />
          </Link>
        </section>
      </div>

      <section aria-labelledby="titre-donnees" className={`${BLOC} mt-4 p-7`}>
        <h2 id="titre-donnees" className="m-0 text-[17px] font-semibold text-encre">
          Données de l’atelier
        </h2>
        <p className="m-0 mt-2 max-w-[680px] text-[14px] leading-[1.6] text-texte-doux">
          L’export complet réunit tous vos clients (leurs codes et mensurations), leurs études,
          les mesures et les recommandations dans un fichier JSON. Axio ne conserve aucune vidéo
          et aucun nom de cycliste : il n’y en a donc pas dans l’export.
        </p>

        {/* Route handler : `<a download>`, pas `<Link>`. */}
        <a href="/dashboard/parametres/export" download className={`${BOUTON_CONTOUR} mt-5`}>
          <DownloadSimple size={17} weight="regular" />
          Exporter toutes les données en JSON
        </a>
      </section>
    </>
  );
}
