import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Singleton PrismaClient.
 *
 * En developpement, Next recharge les modules a chaque edition. Sans ce cache
 * sur `globalThis`, chaque rechargement instancierait un nouveau client, chacun
 * ouvrant son propre pool de connexions — Postgres finit par refuser les
 * connexions avec « too many clients already ». Le `globalThis` survit au
 * hot-reload, la variable de module non.
 *
 * En production le module n'est evalue qu'une fois : inutile de polluer le
 * global.
 *
 * Prisma 7 impose un driver adapter : le client ne bundle plus de moteur de
 * requetes, c'est `pg` qui parle a Postgres.
 */
const globalPourPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function creerClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL absente. Copiez .env.example vers .env et renseignez l'URL Postgres."
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const db = globalPourPrisma.prisma ?? creerClient();

if (process.env.NODE_ENV !== 'production') {
  globalPourPrisma.prisma = db;
}
