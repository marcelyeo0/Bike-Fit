import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  Joint,
  MeasurementStatus,
  Objectif,
  Plan,
  Pratique,
  Role,
  StudyStatus,
} from '../src/generated/prisma/enums';

/**
 * Jeu de demonstration.
 *
 * Idempotent : toutes les lignes portent un identifiant fixe et passent par
 * `upsert`. Relancer le seed remet le jeu a plat sans creer de doublons, ce qui
 * permet de le rejouer apres chaque `migrate reset`.
 *
 * Les mesures et recommandations n'ont pas de cle naturelle : on les supprime
 * puis on les recree, plutot que de tenter un upsert ligne a ligne.
 *
 * Aucune identite : les clients de demonstration sont des codes, comme ceux
 * d'un atelier reel. Ni nom, ni contact, ni texte libre.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL absente. Renseignez-la dans .env avant de lancer le seed.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

// Identifiants stables : ils rendent le seed rejouable et permettent de repérer
// la donnee de demonstration d'un coup d'oeil en base.
const ID_UTILISATEUR = 'demo-user';
const ID_ETUDE = 'demo-study';

// Les clients se retrouvent par leur code (unique par atelier), pas par un
// identifiant fixe : une base seedee avant la pseudonymisation porte deja ces
// deux fiches sous d'autres identifiants, renumerotees par la migration.
const CODE_CLIENT_A = 'AX-0001';
const CODE_CLIENT_B = 'AX-0002';

/**
 * Mesures de l'etude de demonstration.
 *
 * Deux ecarts volontaires — genou et epaule — pour que la demo montre un
 * rapport qui a quelque chose a dire, et deux articulations dans la cible pour
 * qu'elle reste credible.
 */
const MESURES = [
  {
    joint: Joint.KNEE,
    value: 156,
    targetMin: 140,
    targetMax: 150,
    status: MeasurementStatus.OUT,
  },
  {
    joint: Joint.HIP,
    value: 54,
    targetMin: 45,
    targetMax: 60,
    status: MeasurementStatus.OK,
  },
  {
    joint: Joint.ELBOW,
    value: 153,
    targetMin: 150,
    targetMax: 165,
    status: MeasurementStatus.OK,
  },
  {
    joint: Joint.SHOULDER,
    value: 73,
    targetMin: 85,
    targetMax: 100,
    status: MeasurementStatus.OUT,
  },
];

/**
 * Une recommandation par ecart constate, formulee comme un reglage chiffre.
 * Vocabulaire d'atelier uniquement : reglage, position, fourchette.
 */
const RECOMMANDATIONS = [
  {
    joint: Joint.KNEE,
    priority: 1,
    text:
      "Selle trop haute : le genou s'ouvre a 156 degres en bas de course, pour une cible de " +
      '140 a 150 degres (methode Holmes). Descendre la selle de 8 a 12 mm, puis refaire une ' +
      "mesure — 5 mm de tige de selle deplacent l'angle d'environ 2 degres.",
  },
  {
    joint: Joint.SHOULDER,
    priority: 2,
    text:
      "Buste trop ramasse : l'angle epaule tombe a 73 degres pour une cible de 85 a 100 degres. " +
      'Allonger la potence de 10 a 20 mm, ou reculer la selle de 5 a 10 mm si le recul ' +
      'genou / axe de pedale le permet. Regler la selle en premier : elle conditionne le reste.',
  },
];

async function main() {
  const utilisateur = await db.user.upsert({
    where: { id: ID_UTILISATEUR },
    update: {},
    create: {
      id: ID_UTILISATEUR,
      clerkId: 'user_demo_axio',
      email: 'demo@axio.test',
      name: 'Atelier de demonstration',
      role: Role.USER,
      plan: Plan.ATELIER,
      dernierNumeroClient: 2,
    },
  });

  const clientA = await db.client.upsert({
    where: { userId_code: { userId: utilisateur.id, code: CODE_CLIENT_A } },
    update: {},
    create: {
      userId: utilisateur.id,
      code: CODE_CLIENT_A,
      tailleCm: 178,
      entrejambeCm: 84.5,
    },
  });

  await db.client.upsert({
    where: { userId_code: { userId: utilisateur.id, code: CODE_CLIENT_B } },
    update: {},
    create: {
      userId: utilisateur.id,
      code: CODE_CLIENT_B,
      tailleCm: 171,
      entrejambeCm: 80,
    },
  });

  // Le compteur de codes ne doit jamais etre en retard sur les fiches posees
  // ici, sinon le prochain client de cet atelier tirerait un code deja pris.
  await db.user.updateMany({
    where: { id: utilisateur.id, dernierNumeroClient: { lt: 2 } },
    data: { dernierNumeroClient: 2 },
  });

  await db.study.upsert({
    where: { id: ID_ETUDE },
    update: {
      status: StudyStatus.COMPLETED,
      pratique: Pratique.ROUTE,
      objectif: Objectif.CONFORT,
    },
    create: {
      id: ID_ETUDE,
      userId: utilisateur.id,
      clientId: clientA.id,
      pratique: Pratique.ROUTE,
      objectif: Objectif.CONFORT,
      status: StudyStatus.COMPLETED,
      isDemo: true,
      completedAt: new Date(),
    },
  });

  // Pas de cle naturelle sur ces deux tables : on repart d'une ardoise propre.
  await db.measurement.deleteMany({ where: { studyId: ID_ETUDE } });
  await db.recommendation.deleteMany({ where: { studyId: ID_ETUDE } });

  await db.measurement.createMany({
    data: MESURES.map((m) => ({ ...m, studyId: ID_ETUDE })),
  });

  await db.recommendation.createMany({
    data: RECOMMANDATIONS.map((r) => ({ ...r, studyId: ID_ETUDE })),
  });

  const horsCible = MESURES.filter((m) => m.status === MeasurementStatus.OUT).length;
  console.log(
    `Seed termine : 1 utilisateur, 2 clients (${CODE_CLIENT_A}, ${CODE_CLIENT_B}), 1 etude de demonstration ` +
      `(${MESURES.length} mesures dont ${horsCible} hors cible, ${RECOMMANDATIONS.length} recommandations).`
  );
}

main()
  .catch((erreur) => {
    console.error('Seed en echec :', erreur);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
