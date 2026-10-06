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

/**
 * Les six points du cote filme, en pixels (pas en coordonnees normalisees).
 * Un point mal vu est absent : chaque angle se calcule des que SES trois
 * points sont la, sans attendre le corps entier.
 */
export type NomPoint = 'epaule' | 'coude' | 'poignet' | 'hanche' | 'genou' | 'cheville';
export type PointsProfil = Partial<Record<NomPoint, Point>>;

/** Les trois points de chaque angle : [extremite, sommet, extremite]. */
export const POINTS_ANGLE: Record<Articulation, [NomPoint, NomPoint, NomPoint]> = {
  KNEE: ['hanche', 'genou', 'cheville'],
  HIP: ['epaule', 'hanche', 'genou'],
  ELBOW: ['epaule', 'coude', 'poignet'],
  SHOULDER: ['coude', 'epaule', 'hanche'],
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

/** Les angles calculables avec les points fournis ; les autres sont absents. */
export function calculerAngles(points: PointsProfil): Partial<Angles> {
  const angles: Partial<Angles> = {};
  for (const articulation of ARTICULATIONS) {
    const [a, sommet, b] = POINTS_ANGLE[articulation].map((nom) => points[nom]);
    if (!a || !sommet || !b) continue;

    const angle = calculerAngle(a, sommet, b);
    if (Number.isFinite(angle)) angles[articulation] = angle;
  }
  return angles;
}

/** Duree de la fenetre glissante : quelques tours de pedale a cadence normale. */
export const FENETRE_MS = 8000;

/**
 * En dessous, pas assez d'images pour juger un angle. Volontairement bas : sur
 * un appareil lent la detection tombe a quelques images par seconde, et un
 * seuil eleve ne serait jamais atteint dans la fenetre.
 */
export const ECHANTILLONS_MIN = 12;

type Echantillon = { instant: number; valeur: number };

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
  private series: Record<Articulation, Echantillon[]> = {
    KNEE: [],
    HIP: [],
    ELBOW: [],
    SHOULDER: [],
  };

  constructor(private readonly fenetreMs: number = FENETRE_MS) {}

  /** Chaque articulation a sa propre serie : un coude cache ne bloque pas le genou. */
  ajouter(instantMs: number, angles: Partial<Angles>): void {
    const limite = instantMs - this.fenetreMs;
    for (const articulation of ARTICULATIONS) {
      const serie = this.series[articulation];
      const valeur = angles[articulation];
      if (valeur !== undefined && Number.isFinite(valeur)) {
        serie.push({ instant: instantMs, valeur });
      }
      while (serie.length > 0 && serie[0].instant < limite) serie.shift();
    }
  }

  vider(): void {
    for (const articulation of ARTICULATIONS) this.series[articulation] = [];
  }

  /** Nombre d'images retenues pour une articulation. */
  taille(articulation: Articulation): number {
    return this.series[articulation].length;
  }

  /** Les valeurs jugees des articulations dont la serie est assez longue. */
  valeursJugees(): Partial<Angles> {
    const jugees: Partial<Angles> = {};
    for (const articulation of ARTICULATIONS) {
      const serie = this.series[articulation];
      if (serie.length < ECHANTILLONS_MIN) continue;

      const valeurs = serie.map((echantillon) => echantillon.valeur).sort((a, b) => a - b);
      jugees[articulation] =
        articulation === 'KNEE'
          ? centile(valeurs, 0.95)
          : articulation === 'HIP'
            ? centile(valeurs, 0.05)
            : valeurs.reduce((somme, valeur) => somme + valeur, 0) / valeurs.length;
    }
    return jugees;
  }
}

/** Vrai quand les quatre angles sont juges : la seance peut s'enregistrer. */
export function estComplet(angles: Partial<Angles>): angles is Angles {
  return ARTICULATIONS.every((articulation) => angles[articulation] !== undefined);
}
