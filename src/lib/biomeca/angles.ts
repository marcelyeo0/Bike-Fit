/**
 * Calcul et suivi des angles articulaires, vue de profil.
 *
 * Fonctions pures, sans `server-only` ni acces base : le navigateur les
 * utilise pendant la seance, le serveur pour l'enregistrement, et
 * `scripts/verify-biomeca.ts` les teste sans camera.
 *
 * Portage de l'ancien prototype (src/core/angles.py) :
 *   - genou  : on juge l'extension MAXIMALE (pedale en bas) ;
 *   - hanche : on juge l'angle le plus FERME (pedale en haut) ;
 *   - coude, epaule : quasi statiques, on juge la MOYENNE.
 */

/** Les quatre angles mesures. Sous-ensemble de l'enum `Joint` de la base. */
export type Articulation = 'KNEE' | 'HIP' | 'ELBOW' | 'SHOULDER';

export const ARTICULATIONS: Articulation[] = ['KNEE', 'HIP', 'ELBOW', 'SHOULDER'];

export type Point = { x: number; y: number };

/** Les six points du cote filme, en pixels (pas en coordonnees normalisees). */
export type PointsProfil = {
  epaule: Point;
  coude: Point;
  poignet: Point;
  hanche: Point;
  genou: Point;
  cheville: Point;
};

export type Angles = Record<Articulation, number>;

/**
 * Angle en degres au sommet, entre les segments sommet→a et sommet→b.
 * Toujours dans [0, 180]. NaN si un segment est de longueur nulle.
 */
export function calculerAngle(a: Point, sommet: Point, b: Point): number {
  const ax = a.x - sommet.x;
  const ay = a.y - sommet.y;
  const bx = b.x - sommet.x;
  const by = b.y - sommet.y;

  const normes = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (normes === 0) return Number.NaN;

  // Le produit scalaire borne par [-1, 1] : un arrondi flottant a 1.0000001
  // donnerait NaN a l'arc cosinus.
  const cosinus = Math.min(1, Math.max(-1, (ax * bx + ay * by) / normes));
  return (Math.acos(cosinus) * 180) / Math.PI;
}

export function calculerAngles(points: PointsProfil): Angles {
  return {
    KNEE: calculerAngle(points.hanche, points.genou, points.cheville),
    HIP: calculerAngle(points.epaule, points.hanche, points.genou),
    ELBOW: calculerAngle(points.epaule, points.coude, points.poignet),
    SHOULDER: calculerAngle(points.coude, points.epaule, points.hanche),
  };
}

/** Duree de la fenetre glissante : quelques tours de pedale a cadence normale. */
export const FENETRE_MS = 6000;

/** En dessous, pas assez d'images pour juger un angle. */
export const ECHANTILLONS_MIN = 30;

type Echantillon = { instant: number; angles: Angles };

function centile(valeursTriees: number[], part: number): number {
  const rang = (valeursTriees.length - 1) * part;
  const bas = Math.floor(rang);
  const haut = Math.ceil(rang);
  return valeursTriees[bas] + (valeursTriees[haut] - valeursTriees[bas]) * (rang - bas);
}

/**
 * Historique glissant des angles, et valeur « jugee » par articulation.
 *
 * Le genou et la hanche oscillent a chaque tour de pedale : la valeur
 * instantanee ne dit rien, c'est l'extreme recent qui compte. On prend le
 * 95e et le 5e centile plutot que le max et le min bruts, pour qu'une seule
 * image mal detectee ne fixe pas la mesure.
 */
export class SuiviAngles {
  private echantillons: Echantillon[] = [];

  constructor(private readonly fenetreMs: number = FENETRE_MS) {}

  ajouter(instantMs: number, angles: Angles): void {
    if (ARTICULATIONS.some((cle) => !Number.isFinite(angles[cle]))) return;

    this.echantillons.push({ instant: instantMs, angles });
    const limite = instantMs - this.fenetreMs;
    while (this.echantillons.length > 0 && this.echantillons[0].instant < limite) {
      this.echantillons.shift();
    }
  }

  vider(): void {
    this.echantillons = [];
  }

  get taille(): number {
    return this.echantillons.length;
  }

  /** Les valeurs jugees, ou null tant que la fenetre est trop courte. */
  valeursJugees(): Angles | null {
    if (this.echantillons.length < ECHANTILLONS_MIN) return null;

    const serie = (cle: Articulation) =>
      this.echantillons.map((echantillon) => echantillon.angles[cle]).sort((a, b) => a - b);
    const moyenne = (valeurs: number[]) =>
      valeurs.reduce((somme, valeur) => somme + valeur, 0) / valeurs.length;

    return {
      KNEE: centile(serie('KNEE'), 0.95),
      HIP: centile(serie('HIP'), 0.05),
      ELBOW: moyenne(serie('ELBOW')),
      SHOULDER: moyenne(serie('SHOULDER')),
    };
  }
}
