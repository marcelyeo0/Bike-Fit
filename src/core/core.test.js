/**
 * core.test.js — banc d'essai du cœur, sans interface.
 *
 * Équivalent web de `test_core.py` (branche main) : on vérifie le calcul
 * d'angle, la plage cible et la traduction d'un écart en conseil de réglage,
 * sans rien rendre à l'écran.
 *
 *     npm test
 */

import { angleRange, computeAngle, demoKneeAngle, JUDGE_STAT } from "./angles";
import { DEFAULT_RANGES } from "./ranges";
import { diagnose, DIAGNOSTICS, JOINT_LABELS } from "./feedback";

describe("computeAngle", () => {
  test("angle droit", () => {
    expect(computeAngle([0, 1], [0, 0], [1, 0])).toBeCloseTo(90, 5);
  });

  test("segments alignés : 180°", () => {
    expect(computeAngle([-1, 0], [0, 0], [1, 0])).toBeCloseTo(180, 5);
  });

  test("jamais au-delà de 180°", () => {
    for (let i = 0; i < 36; i += 1) {
      const rad = (i * 10 * Math.PI) / 180;
      const angle = computeAngle([Math.cos(rad), Math.sin(rad)], [0, 0], [1, 0]);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThanOrEqual(180);
    }
  });
});

describe("angleRange", () => {
  const range = angleRange(140, 150);

  test("bornes incluses", () => {
    expect(range.contains(140)).toBe(true);
    expect(range.contains(150)).toBe(true);
    expect(range.contains(139)).toBe(false);
  });

  test("direction de l'écart", () => {
    expect(range.direction(155)).toBe("high");
    expect(range.direction(120)).toBe("low");
    expect(range.direction(145)).toBeNull();
  });
});

describe("courbe de démonstration du genou", () => {
  test("le point mort bas est le maximum du tour", () => {
    const bottom = demoKneeAngle(0.5);
    for (let i = 0; i <= 100; i += 1) {
      expect(demoKneeAngle(i / 100)).toBeLessThanOrEqual(bottom + 1e-9);
    }
  });

  test("l'amplitude nominale reste dans la plage cible", () => {
    expect(DEFAULT_RANGES.knee.contains(demoKneeAngle(0.5))).toBe(true);
  });

  test("une amplitude plus grande fait sortir l'extension de la plage", () => {
    expect(DEFAULT_RANGES.knee.contains(demoKneeAngle(0.5, 1.25))).toBe(false);
  });
});

describe("diagnose", () => {
  test("dans la plage : aucun conseil", () => {
    expect(diagnose("knee", 145, DEFAULT_RANGES.knee)).toBeNull();
  });

  test("au-dessus : conseil « selle trop haute » et écart signé", () => {
    const finding = diagnose("knee", 155, DEFAULT_RANGES.knee);
    expect(finding.direction).toBe("high");
    expect(finding.delta).toBe(5);
    expect(finding.action).toBe(DIAGNOSTICS.knee.high.action);
  });

  test("en dessous : écart négatif", () => {
    expect(diagnose("knee", 130, DEFAULT_RANGES.knee).delta).toBe(-10);
  });
});

describe("couverture des articulations", () => {
  test("chaque articulation a un libellé, une plage, une statistique et deux conseils", () => {
    Object.keys(JOINT_LABELS).forEach((joint) => {
      expect(DEFAULT_RANGES[joint]).toBeDefined();
      expect(JUDGE_STAT[joint]).toBeDefined();
      expect(DIAGNOSTICS[joint].high.action).toBeTruthy();
      expect(DIAGNOSTICS[joint].low.action).toBeTruthy();
    });
  });
});
