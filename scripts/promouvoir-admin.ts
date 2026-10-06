import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Pose ou retire le role ADMIN sur un compte.
 *
 * Le role ADMIN leve la limite de creation d'etudes (voir src/lib/access.ts),
 * et rien d'autre. Il sert au compte de demonstration commerciale. C'est le
 * SEUL chemin pour le poser : aucune page, aucune variable d'environnement.
 *
 *   npm run admin:promouvoir -- adresse@exemple.fr            # passe en ADMIN
 *   npm run admin:promouvoir -- adresse@exemple.fr --retirer  # repasse en USER
 *
 * Le compte doit s'etre connecte une fois : c'est a ce moment que sa ligne
 * User est creee. Le script agit sur la base designee par DATABASE_URL.
 */

const arguments_ = process.argv.slice(2);
const retirer = arguments_.includes('--retirer');
const email = arguments_.find((argument) => !argument.startsWith('--'))?.trim().toLowerCase();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL absente. Verifiez .env.');
  process.exit(1);
}
if (!email || !email.includes('@')) {
  console.error('❌ Usage : npm run admin:promouvoir -- adresse@exemple.fr [--retirer]');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main(adresse: string) {
  const compte = await db.user.findFirst({
    where: { email: { equals: adresse, mode: 'insensitive' } },
    select: { id: true, email: true, role: true, plan: true, subscriptionStatus: true },
  });
  if (!compte) {
    console.error(
      `❌ Aucun compte pour ${adresse} dans la base ${new URL(url as string).hostname}. ` +
        'Le compte doit s’etre connecte au moins une fois.'
    );
    process.exitCode = 1;
    return;
  }

  const role = retirer ? 'USER' : 'ADMIN';
  if (compte.role === role) {
    console.log(`✅ ${compte.email} est deja ${role}. Rien a faire.`);
    return;
  }

  await db.user.update({ where: { id: compte.id }, data: { role } });
  console.log(`✅ ${compte.email} : ${compte.role} → ${role}`);
  console.log(
    `   Formule ${compte.plan}, abonnement ${compte.subscriptionStatus} : inchanges.` +
      (role === 'ADMIN' ? ' Creation d’etudes sans limite.' : ' Regles d’abonnement de nouveau appliquees.')
  );
}

main(email)
  .catch((erreur) => {
    console.error('❌ Echec.');
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
