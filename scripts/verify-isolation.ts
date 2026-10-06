import 'dotenv/config';

/**
 * Verification de l'isolation entre ateliers et des regles d'ecriture.
 *
 * Le script appelle les VRAIES fonctions de `src/lib/requetes/` — celles que
 * les pages et les server actions utilisent — avec deux ateliers de test, et
 * verifie qu'aucun ne lit, ne modifie ni ne supprime ce qui est a l'autre.
 * Il verifie aussi l'attribution des codes clients sous creations
 * simultanees, et que l'etude de demonstration n'est pas supprimable.
 *
 * Lance avec : npm run db:isolation
 * (`--conditions=react-server` neutralise `server-only`, comme le fait Next.)
 *
 * Il ECRIT en base, puis nettoie derriere lui (les deux ateliers de test
 * tombent en cascade). Par prudence il refuse toute base qui n'est pas locale.
 */

const ID_A = 'test-isolation-atelier-a';
const ID_B = 'test-isolation-atelier-b';

let echecs = 0;

function verifier(condition: boolean, libelle: string) {
  if (condition) {
    console.log(`   ✅ ${libelle}`);
  } else {
    echecs += 1;
    console.error(`   ❌ ${libelle}`);
  }
}

function exigerBaseLocale() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL absente. Verifiez .env.');
    process.exit(1);
  }
  const hote = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1', 'db'].includes(hote)) {
    console.error(
      `❌ Base non locale (${hote}) : ce script ecrit des donnees de test, il ne tourne que ` +
        'contre la base du conteneur `db`.'
    );
    process.exit(1);
  }
}

async function main() {
  exigerBaseLocale();

  // Imports dynamiques : apres le controle ci-dessus, et apres dotenv.
  const { db } = await import('../src/lib/db');
  const clients = await import('../src/lib/requetes/clients');
  const etudes = await import('../src/lib/requetes/etudes');
  const exports = await import('../src/lib/requetes/export');
  const { canCreateStudy } = await import('../src/lib/access');

  const nettoyer = () => db.user.deleteMany({ where: { id: { in: [ID_A, ID_B] } } });

  try {
    await nettoyer();
    for (const [id, lettre] of [
      [ID_A, 'a'],
      [ID_B, 'b'],
    ] as const) {
      await db.user.create({
        data: { id, clerkId: `user_test_isolation_${lettre}`, email: `${lettre}@isolation.test` },
      });
    }

    console.log('Codes clients');
    // 25 creations lancees en meme temps sur le meme atelier.
    const crees = await Promise.all(
      Array.from({ length: 25 }, () =>
        clients.creerClient(ID_A, { tailleCm: null, entrejambeCm: null })
      )
    );
    const codes = crees.map((client) => client.code).sort();
    verifier(new Set(codes).size === 25, '25 creations simultanees, 25 codes distincts');
    verifier(
      codes[0] === 'AX-0001' && codes[24] === 'AX-0025',
      `sequence continue de AX-0001 a AX-0025 (obtenu ${codes[0]} .. ${codes[24]})`
    );

    const clientB = await clients.creerClient(ID_B, { tailleCm: 180, entrejambeCm: 86.5 });
    verifier(clientB.code === 'AX-0001', 'la numerotation repart de AX-0001 pour un autre atelier');

    const supprimeA = crees[24];
    await clients.supprimerClient(ID_A, supprimeA.id);
    const suivant = await clients.creerClient(ID_A, { tailleCm: null, entrejambeCm: null });
    verifier(suivant.code === 'AX-0026', 'un code supprime n’est pas reattribue (AX-0026)');

    console.log('Isolation des clients');
    const clientA = crees[0];
    verifier(
      (await clients.lireFicheClient(ID_B, clientA.id)) === null,
      'B ne lit pas la fiche d’un client de A'
    );
    verifier(
      (await clients.modifierMensurations(ID_B, clientA.id, { tailleCm: 150, entrejambeCm: 70 })) ===
        false,
      'B ne modifie pas un client de A'
    );
    verifier(
      (await clients.supprimerClient(ID_B, clientA.id)) === false,
      'B ne supprime pas un client de A'
    );
    verifier(
      (await exports.exporterClient(ID_B, clientA.id)) === null,
      'B n’exporte pas un client de A'
    );
    const ficheA = await clients.lireFicheClient(ID_A, clientA.id);
    verifier(
      ficheA !== null && ficheA.tailleCm === null,
      'le client de A est intact apres les tentatives de B'
    );
    verifier(
      (await clients.lireCarnet(ID_B)).length === 1,
      'le carnet de B ne contient que son client'
    );

    console.log('Isolation des etudes');
    verifier(
      (await etudes.creerEtude(ID_B, {
        clientId: clientA.id,
        pratique: 'ROUTE',
        objectif: 'CONFORT',
      })) === null,
      'B n’ouvre pas d’etude sur un client de A'
    );
    const etudeA = await etudes.creerEtude(ID_A, {
      clientId: clientA.id,
      pratique: 'GRAVEL',
      objectif: 'MIXTE',
    });
    verifier(etudeA !== null, 'A ouvre une etude sur son client');
    if (!etudeA) throw new Error('etude de A non creee');

    verifier((await etudes.lireEtude(ID_B, etudeA.id)) === null, 'B ne lit pas l’etude de A');
    verifier(
      (await etudes.supprimerEtude(ID_B, etudeA.id)) === false,
      'B ne supprime pas l’etude de A'
    );
    const detail = await etudes.lireEtude(ID_A, etudeA.id);
    verifier(
      detail !== null &&
        detail.modifiable &&
        detail.status === 'DRAFT' &&
        detail.pratique === 'GRAVEL' &&
        detail.objectif === 'MIXTE' &&
        detail.measurements.length === 0,
      'A lit son etude : brouillon, pratique et objectif poses, aucune mesure inventee'
    );
    verifier(
      (await etudes.lireEtudes(ID_B, { statut: null, page: 1 })).total === 0,
      'la liste des etudes de B est vide'
    );

    const exportB = await exports.exporterAtelier(ID_B);
    const texteExportB = JSON.stringify(exportB);
    verifier(
      exportB.clients.length === 1 && !texteExportB.includes(etudeA.id),
      'l’export de l’atelier B ne contient rien de A'
    );
    const exportA = await exports.exporterClient(ID_A, clientA.id);
    verifier(
      exportA !== null && exportA.client.etudes.length === 1 && !('nom' in exportA.client),
      'l’export du client de A porte son etude et aucun nom'
    );

    console.log('Pagination et filtre');
    for (let rang = 0; rang < 13; rang += 1) {
      await etudes.creerEtude(ID_A, { clientId: clientA.id, pratique: 'ROUTE', objectif: 'AERO' });
    }
    const page1 = await etudes.lireEtudes(ID_A, { statut: null, page: 1 });
    const page2 = await etudes.lireEtudes(ID_A, { statut: null, page: 2 });
    const vus = new Set([...page1.etudes, ...page2.etudes].map((etude) => etude.id));
    verifier(
      page1.total === 14 && page1.pages === 2 && page1.etudes.length === 12 && vus.size === 14,
      '14 etudes sur 2 pages, sans doublon ni oubli'
    );
    verifier(
      (await etudes.lireEtudes(ID_A, { statut: null, page: 99 })).page === 2,
      'une page au-dela de la derniere retombe sur la derniere'
    );
    verifier(
      (await etudes.lireEtudes(ID_A, { statut: 'COMPLETED', page: 1 })).total === 0 &&
        (await etudes.lireEtudes(ID_A, { statut: 'DRAFT', page: 1 })).total === 14,
      'le filtre par statut compte juste'
    );

    console.log('Etude de demonstration');
    const demo = await db.study.findFirst({ where: { isDemo: true }, select: { id: true, userId: true } });
    if (!demo) {
      console.log('   (aucune etude de demonstration en base : lancez `npm run seed`)');
    } else {
      const vueParB = await etudes.lireEtude(ID_B, demo.id);
      verifier(
        vueParB !== null && vueParB.modifiable === false,
        'la demonstration est lisible par un autre atelier, en lecture seule'
      );
      verifier(
        (await etudes.supprimerEtude(ID_B, demo.id)) === false &&
          (await etudes.supprimerEtude(demo.userId, demo.id)) === false,
        'la demonstration n’est supprimable par personne, pas meme son proprietaire'
      );
      verifier(
        (await db.study.count({ where: { id: demo.id } })) === 1,
        'la demonstration est toujours en base'
      );
    }

    console.log('Droit de creation');
    const atelierB = await db.user.findUniqueOrThrow({ where: { id: ID_B } });
    verifier(
      (await canCreateStudy(atelierB)).motif === 'ETUDE_OFFERTE',
      'B, sans etude, a encore son etude offerte'
    );
    const atelierA = await db.user.findUniqueOrThrow({ where: { id: ID_A } });
    verifier(
      (await canCreateStudy(atelierA)).autorise === false,
      'A, sans abonnement et avec des etudes, n’a plus le droit d’en creer'
    );

    console.log('Suppression en cascade');
    await clients.supprimerClient(ID_A, clientA.id);
    verifier(
      (await db.study.count({ where: { userId: ID_A } })) === 0,
      'supprimer le client emporte ses 14 etudes'
    );
  } finally {
    await nettoyer();
    await db.$disconnect();
  }

  if (echecs > 0) {
    console.error(`\n❌ ${echecs} verification(s) en echec.`);
    process.exit(1);
  }
  console.log('\n✅ Isolation verifiee, donnees de test supprimees.');
}

main().catch((erreur) => {
  console.error('❌ Echec de la verification.');
  console.error(erreur);
  process.exit(1);
});
