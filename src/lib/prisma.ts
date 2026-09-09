/**
 * Point d'entree documente du client Prisma : `import { prisma } from '@/lib/prisma'`.
 *
 * L'instance vit dans ./db.ts et n'est PAS recreee ici — un second
 * `new PrismaClient()` ouvrirait un deuxieme pool de connexions vers la meme
 * base. Ce fichier ne fait qu'exposer la meme instance sous le nom `prisma`,
 * pour le code qui suit la convention Prisma.
 *
 * Serveur uniquement. Ne jamais importer depuis un composant client : le client
 * Prisma parle a Postgres, il n'a rien a faire dans un bundle navigateur.
 */
import 'server-only';

export { db as prisma, db } from './db';
