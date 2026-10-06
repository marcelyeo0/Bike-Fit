/**
 * Verification des fonctions pures de la seance : angles, fourchettes,
 * taille de cadre, consignes. Aucune base, aucune camera, aucun reseau.
 *
 * Lance avec : npm run biomeca:verify
 */
import { SuiviAngles, calculerAngle, calculerAngles } from '../src/lib/biomeca/angles';
import { estimerCadre, estimerHauteurSelle } from '../src/lib/biomeca/cadre';
import {
  decalageMorphologique,
  lirePlagesSeance,
  plagesLocales,
  statutMesure,
  validerPlagesExternes,
} from '../src/lib/biomeca/plages';
import {
  consignesParPriorite,
  correctionSelleMm,
  etablirConstats,
} from '../src/lib/biomeca/regles';

let echecs = 0;

function verifier(condition: boolean, libelle: string) {
  if (condition) {
    console.log(`   ✅ ${libelle}`);
  } else {
    echecs += 1;
    console.error(`   ❌ ${libelle}`);
  }
}

const proche = (a: number, b: number, tolerance = 0.01) => Math.abs(a - b) <= tolerance;

console.log('Angles');
verifier(
  proche(calculerAngle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }), 90),
  'angle droit = 90°'
);
verifier(
  proche(calculerAngle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }), 180),
  'points alignes = 180°'
);
verifier(
  proche(calculerAngle({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }), 45),
  'diagonale = 45°'
);
verifier(
  Number.isNaN(calculerAngle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })),
  'segment nul = NaN'
);
{
  const angles = calculerAngles({
    epaule: { x: 100, y: 100 },
    coude: { x: 200, y: 100 },
    poignet: { x: 300, y: 100 },
    hanche: { x: 100, y: 200 },
    genou: { x: 200, y: 200 },
    cheville: { x: 200, y: 300 },
  });
  verifier(
    proche(angles.KNEE, 90) && proche(angles.ELBOW, 180),
    'genou et coude sur un profil connu'
  );
  verifier(
    proche(angles.HIP, 90) && proche(angles.SHOULDER, 90),
    'hanche et epaule sur un profil connu'
  );
}
{
  const suivi = new SuiviAngles(6000);
  verifier(suivi.valeursJugees() === null, 'aucune valeur jugee sur une fenetre vide');
  // Un pedalage simule : le genou oscille de 70 a 146°, la hanche de 48 a 95°.
  for (let image = 0; image < 180; image += 1) {
    const phase = Math.sin((image / 30) * Math.PI * 2);
    suivi.ajouter(image * 33, {
      KNEE: 108 + 38 * phase,
      HIP: 71.5 - 23.5 * phase,
      ELBOW: 155,
      SHOULDER: 90,
    });
  }
  const jugees = suivi.valeursJugees();
  verifier(
    jugees !== null && jugees.KNEE > 143 && jugees.KNEE <= 146,
    'genou : extension maximale retenue'
  );
  verifier(
    jugees !== null && jugees.HIP >= 48 && jugees.HIP < 51,
    'hanche : angle le plus ferme retenu'
  );
  verifier(
    jugees !== null && proche(jugees.ELBOW, 155) && proche(jugees.SHOULDER, 90),
    'coude et epaule : moyenne'
  );
  suivi.ajouter(999_999, { KNEE: 120, HIP: 60, ELBOW: 150, SHOULDER: 90 });
  verifier(suivi.taille === 1, 'la fenetre glissante oublie les images anciennes');
  suivi.ajouter(1_000_000, { KNEE: Number.NaN, HIP: 60, ELBOW: 150, SHOULDER: 90 });
  verifier(suivi.taille === 1, 'une image a angle invalide est ignoree');
}

console.log('Fourchettes');
{
  const base = plagesLocales('ROUTE', 'MIXTE', null, null);
  verifier(
    base.KNEE.min === 140 && base.KNEE.max === 150,
    'route / mixte sans mensuration = table de base'
  );
  verifier(decalageMorphologique(178, null) === 0, 'pas d ajustement avec une seule mensuration');
  verifier(decalageMorphologique(178, 83.7) === 0, 'morphologie moyenne : aucun decalage');

  const jambesLongues = plagesLocales('ROUTE', 'MIXTE', 175, 87.5);
  const jambesCourtes = plagesLocales('ROUTE', 'MIXTE', 185, 81.4);
  verifier(
    jambesLongues.HIP.min === base.HIP.min + 3,
    'jambes longues : hanche plus ouverte, bornee a +3°'
  );
  verifier(
    jambesLongues.SHOULDER.max === base.SHOULDER.max - 3,
    'jambes longues : epaule plus fermee'
  );
  verifier(
    jambesCourtes.HIP.min === base.HIP.min - 3,
    'jambes courtes : decalage inverse, borne a -3°'
  );
  verifier(jambesLongues.KNEE.min === base.KNEE.min, 'le genou ne depend pas de la morphologie');

  const aero = plagesLocales('ROUTE', 'AERO', null, null);
  const confort = plagesLocales('ROUTE', 'CONFORT', null, null);
  verifier(aero.HIP.max < confort.HIP.max, 'aero : hanche plus fermee que confort');
  verifier(
    plagesLocales('CHRONO', 'AERO', null, null).ELBOW.max === 110,
    'chrono : coude en appui sur prolongateurs'
  );
  verifier(
    plagesLocales(null, null, null, null).HIP.min === base.HIP.min,
    'etude ancienne : repli route / mixte'
  );

  verifier(statutMesure(145, { min: 140, max: 150 }) === 'OK', 'statut : dans la fourchette');
  verifier(statutMesure(141, { min: 140, max: 150 }) === 'WARNING', 'statut : proche de la limite');
  verifier(statutMesure(151, { min: 140, max: 150 }) === 'OUT', 'statut : hors fourchette');
}

console.log('Reponse externe');
{
  const reference = plagesLocales('ROUTE', 'MIXTE', 178, 84);
  const saine = {
    ranges: { knee: [141, 150], hip: [46, 60], elbow: [150, 164], shoulder: [86, 100] },
    advice: {
      knee_high: 'Jambe tendue en bas de pédalage. Baisser la selle de 4 mm.',
      hip_low: 'Risque de douleur lombaire. Relever le cintre.',
      elbow_low: 42,
    },
  };
  const lue = validerPlagesExternes(saine, reference);
  verifier(lue !== null && lue.plages.KNEE.min === 141, 'reponse saine acceptee');
  verifier(lue !== null && lue.conseils.KNEE_haut !== undefined, 'conseil conforme conserve');
  verifier(
    lue !== null && lue.conseils.HIP_bas === undefined,
    'conseil au vocabulaire exclu ecarte'
  );
  verifier(lue !== null && lue.conseils.ELBOW_bas === undefined, 'conseil non textuel ecarte');

  const refuser = (brut: unknown, libelle: string) =>
    verifier(validerPlagesExternes(brut, reference) === null, libelle);
  refuser(null, 'reponse vide refusee');
  refuser({ ranges: { knee: [141, 150] } }, 'articulation manquante refusee');
  refuser({ ranges: { ...saine.ranges, knee: [150, 141] } }, 'bornes inversees refusees');
  refuser(
    { ranges: { ...saine.ranges, knee: [100, 110] } },
    'fourchette trop loin de la table refusee'
  );
  refuser({ ranges: { ...saine.ranges, hip: [45, 90] } }, 'fourchette trop large refusee');
  refuser({ ranges: { ...saine.ranges, hip: ['45', '60'] } }, 'bornes non numeriques refusees');

  const figee = {
    source: 'gemini',
    morphologie: true,
    plages: lue?.plages,
    conseils: lue?.conseils,
  };
  const relue = lirePlagesSeance(JSON.parse(JSON.stringify(figee)));
  verifier(
    relue !== null && relue.plages.HIP.max === 60 && relue.source === 'gemini',
    'fourchettes figees relues a l identique'
  );
  verifier(
    lirePlagesSeance({ source: 'autre', plages: {} }) === null,
    'colonne JSON invalide refusee'
  );
}

console.log('Cadre et selle');
verifier(estimerCadre('ROUTE', null, null) === null, 'aucune mensuration : pas d estimation');
verifier(estimerCadre('ROUTE', 176, 81.2) === 'M', 'taille et entrejambe moyens : M');
verifier(estimerCadre('ROUTE', 172, 79) === 'S–M', 'pres d une frontiere : intervalle S–M');
verifier(estimerCadre('ROUTE', 150, 65) === 'XS', 'borne basse : XS');
verifier(estimerCadre('ROUTE', 205, 98) === 'XL', 'borne haute : XL');
verifier(estimerCadre('ROUTE', 184, null) === 'L', 'taille seule : repli');
verifier(estimerCadre('ROUTE', null, 85.7) === 'L', 'entrejambe seul');
verifier(estimerCadre('CHRONO', null, 85.7) !== 'L', 'chrono : cadre choisi plus petit');
verifier(estimerHauteurSelle(84) === 74.2, 'hauteur de selle indicative = entrejambe x 0,883');
verifier(estimerHauteurSelle(null) === null, 'pas de hauteur de selle sans entrejambe');

console.log('Consignes');
{
  const plages = plagesLocales('ROUTE', 'MIXTE', 178, 84);
  const constats = etablirConstats(
    { KNEE: 156, HIP: 52, ELBOW: 170, SHOULDER: 92 },
    plages,
    { ELBOW_haut: 'Bras tendus. Raccourcir la potence de 10 mm.' },
    84
  );
  const consignes = consignesParPriorite(constats);
  verifier(constats.length === 4, 'un constat par articulation');
  verifier(
    consignes.length === 2 && consignes[0].articulation === 'KNEE',
    'la selle passe avant le poste de pilotage'
  );
  verifier(
    consignes[0].consigne?.includes('Baisser la selle') === true,
    'genou trop ouvert : baisser la selle'
  );
  verifier(/environ \d+ mm/.test(consignes[0].consigne ?? ''), 'correction de selle chiffree');
  verifier(
    consignes[1].consigne === 'Bras tendus. Raccourcir la potence de 10 mm.',
    'conseil externe prioritaire sur le standard'
  );
  verifier(
    constats.find((c) => c.articulation === 'HIP')?.consigne === null,
    'pas de consigne dans la fourchette'
  );

  const mm = correctionSelleMm(156, { min: 140, max: 150 }, 84);
  verifier(mm >= 15 && mm <= 30, `correction plausible pour 11° d ecart (${mm} mm)`);
  verifier(
    correctionSelleMm(156, { min: 140, max: 150 }, null) === 28,
    'sans entrejambe : forfait par degre'
  );
  verifier(correctionSelleMm(179, { min: 140, max: 150 }, 84) === 30, 'correction plafonnee');

  const tous = constats.map((c) => c.consigne ?? '').join(' ');
  verifier(
    !/blessure|douleur|diagnosti|prévention|patient/i.test(tous),
    'aucun terme de soin dans les consignes'
  );
}

if (echecs > 0) {
  console.error(`\n❌ ${echecs} verification(s) en echec.`);
  process.exit(1);
}
console.log('\n✅ Biomecanique verifiee.');
