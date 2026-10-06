// Copie le runtime WASM de MediaPipe depuis node_modules vers
// public/mediapipe/wasm, pour que le navigateur le charge depuis
// l'application et non depuis un CDN : aucune requete vers un tiers pendant
// une seance.
//
// Lance par `predev` et `prebuild`. Le dossier copie est ignore par git (il
// suit la version du paquet) ; le modele de pose, lui, est versionne dans
// public/mediapipe/pose_landmarker.task.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(racine, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const cible = path.join(racine, 'public', 'mediapipe', 'wasm');

if (!existsSync(source)) {
  console.error('[mediapipe] @mediapipe/tasks-vision introuvable : lancez `npm ci`.');
  process.exit(1);
}

mkdirSync(cible, { recursive: true });
// Seule la variante chargee par FilesetResolver.forVisionTasks est utile : le
// binaire SIMD et son repli sans SIMD.
const fichiers = readdirSync(source).filter((nom) =>
  /^vision_wasm(_nosimd)?_internal\.(js|wasm)$/.test(nom)
);
for (const nom of fichiers) {
  cpSync(path.join(source, nom), path.join(cible, nom));
}
console.log(`[mediapipe] ${fichiers.length} fichiers copies dans public/mediapipe/wasm`);
