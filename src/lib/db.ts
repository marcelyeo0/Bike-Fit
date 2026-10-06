import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Singleton PrismaClient, instancie a la premiere utilisation.
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
 *
 * Instanciation paresseuse : `next build` importe chaque route pour collecter
 * ses metadonnees, sans jamais executer de requete. Lever a l'import casserait
 * donc le build de l'image Docker, ou `DATABASE_URL` est volontairement
 * absente (un secret n'entre pas dans une image). L'erreur est conservee, mais
 * elle part au premier acces reel a la base.
 */
const globalPourPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let clientDuModule: PrismaClient | undefined;

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

function obtenirClient(): PrismaClient {
  const existant = globalPourPrisma.prisma ?? clientDuModule;
  if (existant) return existant;

  const client = creerClient();
  if (process.env.NODE_ENV !== 'production') {
    globalPourPrisma.prisma = client;
  } else {
    clientDuModule = client;
  }
  return client;
}

/**
 * Facade : meme surface que PrismaClient, mais le client reel n'est cree qu'au
 * premier acces a une propriete. Les methodes sont liees au client reel, sans
 * quoi `db.$transaction(...)` ou `db.$queryRaw` perdraient leur `this`.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_cible, propriete) {
    const client = obtenirClient();
    const valeur = Reflect.get(client, propriete, client);
    return typeof valeur === 'function' ? valeur.bind(client) : valeur;
  },
});
