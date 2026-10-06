# Axio

Analyse de position cycliste pour les ateliers vélo (B2B). Ce dépôt porte le
site vitrine et le dashboard de l'atelier : **Next.js 16 (App Router)**,
authentification **Clerk**, données **Prisma 7** sur **PostgreSQL 16**, le tout
lançable sous **Docker**.

Branches : `web` porte le site et le début du dashboard, `web_docker` ajoute
Docker et le dashboard complet. L'ancien prototype Python reste sur `main`.

## Lancer

Dans les deux cas, commencer par le fichier d'environnement :

```bash
cp .env.example .env
# puis renseigner NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY et CLERK_SECRET_KEY
# (dashboard Clerk > API keys). Le reste a des valeurs par défaut.
```

### Avec Docker : la stack complète, « comme en production »

```bash
docker compose up --build
```

L'application est sur http://localhost:3000, base migrée et jeu de
démonstration chargé. Trois services :

| Service | Rôle | État attendu |
| --- | --- | --- |
| `db` | PostgreSQL 16, volume nommé, publié sur `127.0.0.1:5433` | `healthy` |
| `migrate` | `prisma migrate deploy` puis seed, démarre quand `db` est sain | `exited (0)` |
| `web` | Next.js en build de production (serveur autonome), démarre quand `migrate` a réussi | `healthy` |

```bash
docker compose ps -a          # état des trois services
docker compose logs migrate   # migrations appliquées, seed
docker compose down           # arrêter (les données restent dans le volume)
docker compose down -v        # arrêter ET effacer la base
```

À savoir :

- Les `NEXT_PUBLIC_*` sont figées dans le bundle au build. Après avoir changé
  une clé publique, relancer avec `--build`.
- Les secrets (`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `DATABASE_URL`)
  ne sont passés qu'à l'exécution : aucun n'entre dans l'image.
- Dans les conteneurs la base s'appelle `db` : `compose.yaml` construit leur
  `DATABASE_URL` à partir de `POSTGRES_*`. Le `DATABASE_URL` de `.env` reste
  celui de l'hôte (`localhost:5433`). Le même `.env` sert aux deux usages.
- Port 5433 et non 5432 : un PostgreSQL installé sur la machine occupe souvent
  5432. Se change avec `AXIO_DB_PORT` (et `AXIO_WEB_PORT` pour le 3000).

### Sans conteneur pour l'application : le développement au quotidien

Pas de rechargement à chaud dans un conteneur (les montages de dossiers sont
lents sous Windows). Seule la base tourne sous Docker, Next tourne sur l'hôte :

```bash
npm install               # dépendances + génération du client Prisma
docker compose up -d db   # la base seule
npm run db:deploy         # applique les migrations
npm run seed              # jeu de démonstration (idempotent)
npm run dev               # http://localhost:3000, rechargement à chaud
```

`DATABASE_URL` doit viser `localhost:5433` (valeur de `.env.example`). Si la
stack complète tourne déjà, arrêter son service web pour libérer le port 3000 :
`docker compose stop web`.

### Vérifier

```bash
npx tsc --noEmit          # types
npm run build             # build de production
npm run db:verify         # connexion, schéma, pseudonymisation, étude de démo
npm run db:isolation      # un atelier ne lit ni ne modifie rien d'un autre
```

`db:isolation` écrit des données de test puis les supprime ; il refuse toute
base qui n'est pas locale.

### Production

`compose.prod.yaml` + `Caddyfile` : Caddy en frontal HTTPS (certificat
automatique), `web` et `db` sur un réseau interne, base jamais publiée, seuls
80 et 443 exposés.

```bash
# .env : AXIO_DOMAINE, POSTGRES_PASSWORD, clés Clerk pk_live_/sk_live_,
# CLERK_WEBHOOK_SECRET
docker compose -f compose.prod.yaml up -d --build
```

**Non testé de bout en bout** : il faut un domaine pointant sur le serveur.
Seule la syntaxe est validée (`docker compose -f compose.prod.yaml config`,
`caddy validate`). La sauvegarde chiffrée de la base n'est pas incluse.

## Structure

```
Dockerfile            multi-étapes : deps, migrate, build, run (non root)
compose.yaml          db + migrate + web, pour la machine de développement
compose.prod.yaml     caddy + web + migrate + db, pour un serveur
Caddyfile             frontal HTTPS de production
docker/migrer.sh      tâche du service migrate (fins de ligne LF)
prisma/
  schema.prisma       modèles, enums, index
  migrations/         une migration appliquée ne se modifie jamais
  seed.ts             jeu de démonstration (1 atelier, 2 clients, 1 étude)
prisma7.config.ts     config Prisma 7 : schéma, migrations, commande de seed
scripts/
  verify-prisma.ts    npm run db:verify
  verify-isolation.ts npm run db:isolation
public/assets/        visuels de la landing, réutilisés par les états vides
src/
  middleware.ts       clerkMiddleware : /dashboard et /admin protégés
  generated/prisma/   client Prisma généré (non versionné)
  app/
    layout.tsx        ClerkProvider, polices, thème Clerk global
    page.tsx          landing
    globals.css       base Tailwind, feuille d'impression A4
    pricing/          redirige vers la grille tarifaire de la landing
    sign-in/, sign-up/
    api/
      sante/route.ts            sonde du HEALTHCHECK (interroge la base)
      webhooks/clerk/route.ts   synchronisation Clerk -> table User
    (dashboard)/
      layout.tsx                coque : barre latérale, retirée à l'impression
      _composants/              BarreLaterale, EtatVide, BoutonSuppression,
                                ChampsMensurations, classes (boutons, champs)
      dashboard/
        page.tsx                tableau de bord : compteurs, études récentes
        _composants/            CarteStat, CarteEtude, BandeauAbonnement,
                                BoutonNouvelleEtude
        clients/
          page.tsx              carnet + création d'un client
          actions.ts            créer, modifier les mensurations, supprimer
          [id]/page.tsx         fiche, historique, export, suppression
          [id]/export/route.ts  export JSON du client
        etudes/
          page.tsx              liste, filtre par statut, pagination
          actions.ts            supprimer
          nouvelle/             formulaire + action de création
          [id]/page.tsx         détail et compte rendu imprimable
          [id]/_composants/     BoutonImprimer, NomCycliste
        parametres/
          page.tsx              compte, formule, export
          export/route.ts       export JSON complet de l'atelier
  lib/
    db.ts             PrismaClient, instancié au premier accès
    auth.ts           getCurrentUser / requireUser / requireAdmin
    access.ts         canCreateStudy : le droit d'ouvrir une étude
    saisie.ts         validation de ce qui vient du navigateur
    libelles.ts       textes des enums, mises en forme (dates, cm, degrés)
    messagesAcces.ts  formulations des refus d'accès
    requetes/         dashboard, clients, etudes, export (server-only)
    clerkAppearance.ts, clerkLocalization.ts
    useReveal.js, useParallax.js
  ui/                 composants de la landing (Nav, Footer, sections)
```

## Modèle de données

PostgreSQL via Prisma 7. Le schéma vit dans `prisma/schema.prisma`.

| Modèle | Champs principaux | Remarque |
| --- | --- | --- |
| `User` | `clerkId`, `email`, `name`, `role`, `plan`, `subscriptionStatus`, `dernierNumeroClient` | L'atelier. Seules données nominatives de la base |
| `Client` | `code`, `tailleCm`, `entrejambeCm` | Un pseudonyme : aucun nom, aucun contact, aucun texte libre |
| `Study` | `clientId`, `pratique`, `objectif`, `status`, `isDemo` | Une étude de position |
| `Measurement` | `joint`, `value`, `targetMin`, `targetMax`, `status` | Un angle et la fourchette cible retenue pour cette étude |
| `Recommendation` | `joint`, `text`, `priority` | Un conseil de réglage |

Règles portées par le schéma et le code :

- **Le serveur ne connaît pas l'identité du cycliste.** Un client est un code
  (`AX-0001`), séquentiel par atelier, généré côté serveur et unique par
  atelier. La correspondance entre un code et une personne reste en boutique.
  Le nom saisi sur le compte rendu imprimé ne quitte jamais le navigateur.
- **Pas de texte libre.** Un champ de commentaire finit toujours par contenir
  un nom ou une information de santé. Les seules saisies sur un client sont
  deux mensurations en centimètres.
- **Codes sans doublon.** Le numéro vient de `User.dernierNumeroClient`,
  incrémenté dans la transaction de création : le verrou de ligne sérialise
  les créations simultanées. Un code supprimé n'est jamais réattribué.
- **Pratique et objectif** (`ROUTE` / `GRAVEL` / `CHRONO`, `CONFORT` /
  `MIXTE` / `AERO`) sont exigés à la création. Ils sont nullables en base
  pour les études antérieures à leur ajout.
- **Aucune vidéo n'est stockée.** Seuls les angles mesurés et les
  recommandations sont persistés.
- **Suppression en cascade.** Supprimer un client emporte ses études, leurs
  mesures et leurs recommandations ; supprimer un `User` emporte tout. C'est
  ce qui rend l'événement `user.deleted` du webhook sûr.

```bash
npx prisma migrate dev --name ma_migration   # créer et appliquer une migration
npm run db:deploy                            # appliquer les migrations en attente
npx prisma generate                          # régénérer le client (auto au postinstall)
npm run seed                                 # rejouer le jeu de démonstration
npm run db:studio                            # explorer la base
```

Le seed est **idempotent** (`upsert`), donc rejouable à chaque démarrage du
service `migrate`.

> La migration `20261006090000` **supprime** `Client.nom`, `Client.email` et
> `Client.notes` et renumérote les fiches existantes. Sur une base qui porte
> de vraies fiches, exporter la correspondance nom / fiche avant de l'appliquer.

## Dashboard : règles de sécurité

- Toute lecture et toute écriture passe par `src/lib/requetes/`, modules
  `server-only` dont chaque fonction prend en premier paramètre le `userId`
  de `requireUser()` et le pose dans son `WHERE`.
- Une server action et un route handler sont des endpoints publics : chacun
  refait le contrôle d'identité, de droit et d'appartenance de chaque
  identifiant reçu.
- Un identifiant d'un autre atelier donne un **404**, pas un 403.
- `@clerk/nextjs/server` n'est importé que par `src/lib/auth.ts`, le
  middleware et le webhook.
- L'étude de démonstration (`isDemo`) est lisible par tous les ateliers,
  modifiable et supprimable par aucun.

La séance de capture (caméra, détection de pose, calcul des angles) n'est pas
encore là : une étude créée reste en brouillon, sans mesure.

## Vocabulaire

L'interface et le seed parlent de **réglage**, de **position**, de
**fourchette** et de **confort**. Jamais de soin : Axio est un outil d'aide au
réglage et ne constitue pas un avis médical.

## Webhook Clerk

`src/app/api/webhooks/clerk/route.ts` maintient la table `User` en phase avec
les comptes Clerk : `user.created`, `user.updated`, `user.deleted`. La signature
est vérifiée avec `CLERK_WEBHOOK_SECRET` et les en-têtes `svix-*` ; toute requête
non signée repart en 400.

Le traitement est idempotent (`upsert` / `deleteMany`) : Svix rejoue un événement
tant qu'il n'a pas reçu de 2xx, un même message peut donc arriver plusieurs fois.

### Tester en local

Clerk ne peut pas appeler `localhost` : il faut exposer le port 3000.

**Option 1 — tunnel Clerk (le plus simple, aucun compte tiers)**

```bash
npm run dev
npx clerk tunnel --port 3000
```

La commande affiche une URL publique. Reportez-la dans le dashboard Clerk :
Configure > Webhooks > Add Endpoint, avec le chemin `/api/webhooks/clerk`.

**Option 2 — ngrok**

```bash
npm run dev
ngrok http 3000
```

ngrok affiche une URL du type `https://xxxx.ngrok-free.app`. L'endpoint à
déclarer est alors `https://xxxx.ngrok-free.app/api/webhooks/clerk`.

Dans les deux cas :

1. Dans le dashboard Clerk, cochez les événements `user.created`,
   `user.updated` et `user.deleted`.
2. Copiez le **Signing Secret** (`whsec_...`) affiché après création de
   l'endpoint dans `CLERK_WEBHOOK_SECRET`, puis **redémarrez `npm run dev`** —
   les variables d'environnement ne sont lues qu'au démarrage.
3. Créez un compte de test sur `/sign-up` et vérifiez qu'une ligne apparaît :
   `npm run db:studio`.

L'onglet **Logs** de l'endpoint dans le dashboard Clerk montre chaque tentative
et sa réponse — c'est le premier endroit où regarder si rien n'arrive en base.

Si un webhook est manqué (tunnel fermé, secret non à jour), `getCurrentUser()`
crée la ligne `User` à la volée au premier accès authentifié. Le filet évite
qu'un compte valide se retrouve bloqué, mais il ne dispense pas de configurer le
webhook : sans lui, `user.updated` et `user.deleted` ne sont jamais répercutés.

## Direction artistique

- Palette : blanc, encre `#0C0C0C`, un seul accent rouge décliné en trois
  valeurs (`rouge` pour les aplats, `rouge-cta` pour les boutons, `rouge-texte`
  pour le petit texte) afin de tenir le contraste AA partout.
- Typographie : Geist partout (titres en demi-gras serré, bas de casse), Geist
  Mono pour les valeurs mesurées, les codes client et les petits libellés.
  Servies par `next/font` : hébergées avec l'application, aucun appel à Google
  depuis le navigateur.
- Rayons : `24px` pour les blocs, `20px` pour les médias, pill pour tout ce qui
  est cliquable.
- Page en thème clair uniquement. Le hero repose sur un PNG en
  `mix-blend-multiply` qui suppose un fond clair ; un mode sombre casserait le
  visuel principal.

## Motion

Deux mécanismes seulement, tous deux désactivés sous
`prefers-reduced-motion: reduce` :

- révélation à l'entrée dans le viewport, via `IntersectionObserver` ;
- parallaxe sur les cailloux et les photos, via `GSAP ScrollTrigger`.

Aucun `window.addEventListener('scroll')`, aucune valeur continue stockée dans
un état React.

## Images

Les visuels du hero (`hero-cyclist.png`, `rock-*.png`, `portrait.png`)
proviennent du canvas de référence. Les cinq photographies des sections
suivantes (`etape-*.jpg`, `feature-pose.jpg`, `livrable-rapport.jpg`) ont été
générées avec Pixelcut (modèle `z-image-turbo`).
