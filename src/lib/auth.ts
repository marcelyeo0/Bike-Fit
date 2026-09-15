import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { db } from './db';
import { Role } from '../generated/prisma/enums';
import type { User } from '../generated/prisma/client';

/**
 * Porte d'entree de toute verification serveur.
 *
 * Regle : aucune route, action serveur ou route handler ne lit `auth()` ni
 * `currentUser()` de Clerk directement pour decider d'un acces. Tout passe par
 * ces trois fonctions, pour que la correspondance session Clerk -> ligne User
 * et le controle de role vivent a un seul endroit.
 *
 * GARDE : ce fichier est le SEUL du projet autorise a importer depuis
 * `@clerk/nextjs/server` (avec `src/middleware.ts`, qui protege les routes en
 * amont, et le webhook, qui n'a pas de session). Une page qui appelle
 * `currentUser()` court-circuite le rattrapage de ligne User ci-dessous et
 * n'a pas d'`id` interne : elle ne peut donc rien filtrer en base.
 *
 * Faute d'ESLint dans le projet, la regle tient par cette convention. Le jour
 * ou ESLint arrive, la poser comme :
 *   'no-restricted-imports': ['error', { paths: [{ name: '@clerk/nextjs/server',
 *     importNames: ['auth', 'currentUser'],
 *     message: 'Passer par requireUser()/getCurrentUser() de src/lib/auth.ts.' }] }]
 * avec une exception pour ce fichier, le middleware et le webhook.
 */

/**
 * L'enregistrement User complet de la session en cours, ou null si personne
 * n'est connecte.
 *
 * Filet de securite : si Clerk reconnait la session mais qu'aucune ligne User
 * n'existe (webhook manque, base restauree, compte cree avant la mise en place
 * du webhook), la ligne est creee a la volee depuis les donnees de session.
 * Sans ce rattrapage, un compte valide se retrouverait bloque sans recours.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existant = await db.user.findUnique({ where: { clerkId: userId } });
  if (existant) return existant;

  // Chemin de rattrapage uniquement : un appel reseau vers Clerk, donc jamais
  // sur le trajet normal ou `findUnique` a deja repondu.
  const compteClerk = await currentUser();
  if (!compteClerk) return null;

  const email =
    compteClerk.primaryEmailAddress?.emailAddress ??
    compteClerk.emailAddresses[0]?.emailAddress ??
    null;

  if (!email) {
    console.error(`[auth] session Clerk sans e-mail, User non cree : ${userId}`);
    return null;
  }

  const nom = [compteClerk.firstName, compteClerk.lastName].filter(Boolean).join(' ').trim();

  console.warn(`[auth] User absent pour ${userId} — creation de rattrapage (webhook manque ?)`);

  // `upsert` et non `create` : deux requetes concurrentes peuvent emprunter ce
  // chemin en meme temps.
  return db.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email, name: nom.length > 0 ? nom : null },
  });
}

/**
 * Identique, mais redirige vers /sign-in au lieu de renvoyer null.
 * `redirect()` leve : le code qui suit l'appel ne s'execute jamais sans
 * utilisateur.
 */
export async function requireUser(): Promise<User> {
  const utilisateur = await getCurrentUser();
  if (!utilisateur) redirect('/sign-in');
  return utilisateur;
}

/**
 * Identique, mais exige le role ADMIN.
 *
 * On renvoie 404 et non 403 : un non-administrateur ne doit meme pas apprendre
 * que la page existe.
 */
export async function requireAdmin(): Promise<User> {
  const utilisateur = await requireUser();
  if (utilisateur.role !== Role.ADMIN) {
    console.warn(`[auth] acces admin refuse pour ${utilisateur.clerkId}`);
    notFound();
  }
  return utilisateur;
}
