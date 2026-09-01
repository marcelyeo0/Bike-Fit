# Axio, site vitrine

Landing page d'Axio, le logiciel d'analyse de posture cycliste destiné aux
ateliers vélo. Branche `web` : ici vit uniquement le site, l'application Python
reste sur `main`.

Le site reproduit le canvas de référence `web design/Axio.dc.html` pour la
navigation, le hero et la barre de preuve. À partir de la section
« Comment ça marche », la mise en page a été retravaillée : les maquettes en
`<div>` du canvas (fausse caméra, faux rapport, faux graphiques) sont remplacées
par des photographies, et les pictogrammes viennent d'une seule famille
d'icônes.

## Lancer

```bash
npm install       # dépendances
cp .env.example .env   # puis renseigner les clés Clerk et DATABASE_URL
npx prisma migrate dev # crée le schéma en base
npm run seed           # jeu de démonstration (facultatif)
npm run dev            # serveur de développement sur :3000
npm run build          # build de production
```

Le site tourne sur **Next.js (App Router)**. L'authentification passe par Clerk,
les données par Prisma et PostgreSQL.

## Structure

```
prisma/
  schema.prisma       modèles, enums, index
  seed.ts             jeu de démonstration (1 atelier, 2 clients, 1 étude)
prisma7.config.ts     config Prisma 7 : schéma, migrations, commande de seed
public/assets/        visuels du canvas + photos générées
src/
  app/
    layout.tsx        ClerkProvider, polices, thème Clerk global
    page.tsx          landing (client component, branche les deux hooks motion)
    globals.css       base Tailwind, type fantôme, état initial des révélations
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
    dashboard/page.tsx
    api/webhooks/clerk/route.ts   synchronisation Clerk -> table User
  middleware.ts       clerkMiddleware : /dashboard et /admin protégés
  generated/prisma/   client Prisma généré (non versionné)
  lib/
    db.ts             singleton PrismaClient
    auth.ts           getCurrentUser / requireUser / requireAdmin
    clerkAppearance.ts thème Clerk calé sur les tokens Tailwind
    clerkLocalization.ts  compléments français au pack frFR
    useReveal.js      révélation au scroll (IntersectionObserver)
    useParallax.js    parallaxe douce (GSAP ScrollTrigger)
  ui/
    Nav.jsx           navigation collante, menu mobile, consciente de la session
    Footer.jsx
    components/Bouton.jsx   variantes de boutons, contrastes calés AA
    sections/         Hero, Preuve, Comment, Fonctionnalites, Livrable,
                      Tarifs, Temoignage, Ressources, Cta
```

## Base de données

PostgreSQL via Prisma 7. Le schéma vit dans `prisma/schema.prisma`.

```bash
npx prisma migrate dev --name ma_migration   # créer et appliquer une migration
npx prisma generate                          # régénérer le client (auto au postinstall)
npm run seed                                 # rejouer le jeu de démonstration
npm run db:studio                            # explorer la base
```

Deux règles portées par le schéma :

- **Aucune vidéo n'est stockée.** Les fichiers sont traités puis supprimés ;
  seuls les angles mesurés et les recommandations sont persistés.
- **Suppression en cascade depuis `User`.** Supprimer un utilisateur emporte ses
  clients, ses études, leurs mesures et leurs recommandations. C'est ce qui rend
  l'événement `user.deleted` du webhook sûr.

Le seed est **idempotent** : identifiants fixes et `upsert`, donc rejouable après
chaque `prisma migrate reset`.

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
- Typographie : Archivo Black en titrage, Barlow en courant, Barlow Semi
  Condensed pour les intertitres.
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
