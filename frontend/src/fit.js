/**
 * fit.js — Miroir des règles métier du backend Python.
 *
 * Plages par défaut : src/core/ranges.py (DEFAULT_RANGES).
 * Diagnostics constat + action : src/core/feedback.py (DIAGNOSTICS).
 * Statistique jugée par articulation : src/core/angles.py (JUDGE_STAT).
 *
 * Ici les angles sont SIMULÉS (cycle de pédalage sinusoïdal) tant que le
 * backend n'est pas branché : l'UI est la même, la source des chiffres non.
 */

export const JOINTS = ['knee', 'hip', 'elbow', 'shoulder'];

export const JOINT_LABELS = {
  knee: 'Genou',
  hip: 'Hanche',
  elbow: 'Coude',
  shoulder: 'Épaule',
};

export const JUDGE_STAT = {
  knee: 'max',
  hip: 'min',
  elbow: 'moyenne',
  shoulder: 'moyenne',
};

export const DEFAULT_RANGES = {
  knee: [140, 150],
  hip: [45, 60],
  elbow: [150, 165],
  shoulder: [85, 100],
};

export const DIAGNOSTICS = {
  'knee_high':
    'Extension du genou trop grande, jambe presque tendue en bas de pédale, ' +
    'selle sans doute trop haute. Abaisse-la d\'environ 3 mm par degré d\'écart.',
  'knee_low':
    'Genou trop fléchi au point mort bas, selle sans doute trop basse. ' +
    'Remonte-la d\'environ 3 mm par degré d\'écart.',
  'hip_high':
    'Hanche très ouverte, buste redressé. Recule la selle de 5 mm ou allonge le cockpit.',
  'hip_low':
    'Hanche très fermée, buste plongeant. Avance la selle de 5 mm ou remonte le cintre.',
  'elbow_high':
    'Bras quasi tendus, coudes verrouillés. Raccourcis la potence de 10 mm.',
  'elbow_low':
    'Bras très pliés, cockpit probablement trop court. Allonge la potence de 10 mm.',
  'shoulder_high':
    'Épaules très ouvertes, grande allonge. Potence plus courte ou plus haute.',
  'shoulder_low':
    'Épaules fermées, buste peu incliné. Abaisse le cintre ou allonge la potence.',
};

/**
 * Angles simulés pour un instant t (secondes) : un cycle de pédalage
 * à ~75 rpm. Le coude est volontairement légèrement hors plage pour
 * montrer l'état rouge dans la démo.
 */
export function simulatedAngles(t) {
  const phase = 2 * Math.PI * (t * 1.25);          // ~75 rpm
  return {
    knee: 110 + 37 * Math.sin(phase),              // max ~147 : dans la plage
    hip: 55 + 8 * Math.sin(phase + Math.PI / 3),   // min ~47 : dans la plage
    elbow: 167 + 1.5 * Math.sin(phase * 0.4),      // moyenne ~167 : trop tendu
    shoulder: 92 + 2 * Math.sin(phase * 0.3),      // moyenne ~92 : ok
  };
}

/** Valeur jugée depuis un historique (mêmes règles que angles.py). */
export function judgedValue(joint, history) {
  if (history.length < 20) return null;            // fenêtre pas assez pleine
  if (JUDGE_STAT[joint] === 'max') return Math.max(...history);
  if (JUDGE_STAT[joint] === 'min') return Math.min(...history);
  return history.reduce((a, b) => a + b, 0) / history.length;
}

/** Constats identiques à feedback.analyse_session (valeur, cible, écart, conseil). */
export function analyse(values, ranges) {
  return JOINTS.filter((j) => values[j] != null).map((joint) => {
    const value = values[joint];
    const [lo, hi] = ranges[joint];
    const inRange = value >= lo && value <= hi;
    let advice = '';
    let delta = 0;
    if (!inRange) {
      const dir = value > hi ? 'high' : 'low';
      delta = value - (dir === 'high' ? hi : lo);
      advice = DIAGNOSTICS[`${joint}_${dir}`] || '';
    }
    return { joint, value, target: [lo, hi], inRange, delta, advice };
  });
}
