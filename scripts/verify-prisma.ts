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

  // Regle produit : ni contact ni texte libre sur "Client" — le nom seul. On
  // interroge le catalogue plutot que le client Prisma, qui ne verrait pas une
  // colonne restee en base apres une migration manquee.
  const interdites = await db.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Client'
      AND column_name IN ('email', 'telephone', 'notes')
  `;
  if (interdites.length > 0) {
    const noms = interdites.map((colonne) => colonne.column_name).join(', ');
    throw new Error(`Colonnes de contact ou de texte libre sur "Client" : ${noms}.`);
  }

  // Un code par client et par atelier, au format attendu, et un nom renseigne.
  const codes = await db.client.findMany({ select: { userId: true, code: true, nom: true } });
  if (codes.some((client) => client.nom.trim().length === 0)) {
    throw new Error('Client sans nom.');
  }
  const malFormes = codes.filter((client) => !/^AX-\d{4,}$/.test(client.code));
  const distincts = new Set(codes.map((client) => `${client.userId}/${client.code}`));
  if (malFormes.length > 0 || distincts.size !== codes.length) {
    throw new Error('Codes clients mal formes ou en doublon.');
  }
  console.log(`   Clients : ${codes.length} fiche(s) nommee(s), aucun code en doublon.`);

  if (!demo) {
    console.log('   Aucune etude de demonstration — lancez `npm run seed`.');
    return;
  }

  // `client` est optionnel depuis que Study.clientId est nullable.
  const sujet = demo.client?.nom ?? demo.titre ?? 'etude sans client';
  const cadre = `${demo.pratique ?? 'pratique ?'} / ${demo.objectif ?? 'objectif ?'}`;
  console.log(`   Etude de demonstration pour ${sujet} (${demo.status}, ${cadre}) :`);
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
