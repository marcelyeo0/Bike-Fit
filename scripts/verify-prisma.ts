import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Verification de bout en bout de la couche donnees.
 *
 * Script autonome : il ne passe pas par src/lib/db.ts, qui importe
 * `server-only` et n'est chargeable que depuis un contexte serveur Next.
 *
 * Lance avec : npx tsx scripts/verify-prisma.ts
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL absente. Verifiez .env.');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  // Une lecture reelle : si la connexion, le schema ou le client sont casses,
  // c'est ici que ca se voit.
  const utilisateurs = await db.user.count();
  const clients = await db.client.count();
  const etudes = await db.study.count();

  const demo = await db.study.findFirst({
    where: { isDemo: true },
    include: {
      client: true,
      measurements: { orderBy: { joint: 'asc' } },
      recommendations: { orderBy: { priority: 'asc' } },
    },
  });

  console.log('✅ Connected');
  console.log(`   ${utilisateurs} utilisateur(s), ${clients} client(s), ${etudes} etude(s).`);

  if (!demo) {
    console.log('   Aucune etude de demonstration — lancez `npm run seed`.');
    return;
  }

  console.log(`   Etude de demonstration pour ${demo.client.nom} (${demo.status}) :`);
  for (const m of demo.measurements) {
    const cible = `${m.targetMin}-${m.targetMax}`;
    console.log(
      `     ${m.joint.padEnd(9)} ${String(m.value).padStart(5)}°  cible ${cible.padEnd(8)} ${m.status}`
    );
  }
  for (const r of demo.recommendations) {
    console.log(`     [${r.priority}] ${r.joint ?? 'GENERAL'} : ${r.text.slice(0, 70)}...`);
  }
}

main()
  .catch((erreur) => {
    console.error('❌ Echec de la verification.');
    console.error(erreur);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
