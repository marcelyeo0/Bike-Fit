# BikeFit AI

Logiciel d'aide au bike fitting pour vélocistes, en deux modes accessibles
depuis un écran d'accueil unique :

- **Analyse posturale** — angles articulaires en direct sur le flux webcam
  (genou, hanche, coude, dos, pied) et recommandations de réglage chiffrées
  (« genou trop tendu en bas de course : descendre la selle d'environ 10 mm »).
- **Soufflerie virtuelle** — à partir d'une vidéo (téléphone), visualisation
  de l'écoulement de l'air autour du cycliste, zones de traînée, et score
  comparatif entre deux positions (A/B).

> ⚠ Les recommandations sont une aide à l'orientation, pas un diagnostic
> médical. La soufflerie est une simulation **visuelle et pédagogique**,
> pas un calcul CFD : ses scores servent à comparer deux postures, jamais
> à annoncer des watts.

## Installation et lancement

```
py -3.12 -m venv venv
venv\Scripts\pip install -r requirements.txt
venv\Scripts\python main.py
```

Tests : `venv\Scripts\python -m pytest tests` (57 tests, aucun matériel requis).

Conditions de prise de vue (les deux modes) : cycliste **de profil strict**,
caméra à hauteur de hanche à 3–4 m, vélo sur home-trainer, fond dégagé.

## Architecture

```
bikefit-software/
├── main.py            # point d'entrée Qt
├── pose/              # capture vidéo + détection des articulations
├── analysis/          # angles, cycle de pédalage, seuils, recommandations
├── ui/                # fenêtres et affichage (seul module qui importe Qt)
├── windtunnel/        # soufflerie : silhouette, écoulement, traînée, rendu
├── tests/             # pytest — logique pure, sans caméra ni fenêtre
└── requirements.txt   # versions figées (voir commentaires dedans)
```

**Un seul logiciel, deux modes.** La fenêtre principale est un
`QStackedWidget` : l'accueil route vers l'une ou l'autre page. Le code
partagé est exactement ce que les deux modes ont en commun :

- `pose/` — le même `PoseEstimator` détecte les articulations de l'analyse
  live **et** fournit le masque de silhouette dont la soufflerie a besoin
  (un seul modèle, deux usages) ;
- `ui/video_view.py` et le thème — l'affichage vidéo et le style sont
  écrits une fois.

**Règle de dépendance** (pensée pour un futur portage C++) : `pose/`,
`analysis/` et `windtunnel/` ne connaissent pas Qt. Ils consomment des
tableaux NumPy et rendent des dataclasses — c'est pour ça que toute la
logique se teste sans caméra, et que seule `ui/` changerait si on refaisait
l'interface (en Qt C++, par exemple).

## Choix techniques et alternatives écartées

### Détection de pose : MediaPipe Pose (API solutions)

| Critère | MediaPipe | RTMPose + ONNX Runtime |
|---|---|---|
| Temps réel CPU (pas de GPU chez le client) | ✅ ~30 fps | ⚠ plus juste |
| Masque de silhouette (requis en soufflerie) | ✅ inclus | ❌ modèle séparé à ajouter |
| Points du pied (angle pied, cf. réf. visuelle) | ✅ talon + pointe | ❌ 17 pts COCO |
| Intégration | `pip install` | pipeline détection+pose à écrire |

RTMPose est plus précis sur les postures très penchées ; l'abstraction
`pose.PoseEstimator` permet de le brancher sans toucher au reste si le
besoin se confirme. Écartés aussi : OpenPose (abandonné, lourd, licence
restrictive), YOLO-pose (AGPL, incompatible avec un logiciel distribué).

Versions **figées** dans `requirements.txt` : mediapipe 0.10.21 est la
dernière version dont le modèle est embarqué dans le paquet (les 0.10.3x
imposent un téléchargement au premier lancement — rédhibitoire pour un
poste de magasin hors ligne).

### Interface : PySide6 (Qt), pas OpenCV seul ni Streamlit

L'option « OpenCV + overlay direct » a été sérieusement considérée (plus
simple pour la vidéo), mais le cahier des charges exige de vrais widgets :
écran d'accueil, panneau de recommandations défilant, bouton « Terminer
l'analyse », import de fichiers. En OpenCV pur, tout cela se redessine au
pixel à chaque frame. Qt fournit widgets, layouts, threads et signaux ;
l'affichage vidéo se fait en convertissant la frame NumPy en `QImage`
(pattern standard, largement assez rapide pour du 30 fps). Streamlit
(envisagé au tout début) est une appli web rechargée à chaque interaction :
inadapté au temps réel et à l'exécutable autonome. Bonus : Qt existe en
C++ — l'architecture de l'UI survivra au portage.

### Soufflerie : approximation 2D, pas de CFD — pourquoi

La traînée vaut ½·ρ·CdA·v² : à vitesse égale, seul **CdA** distingue deux
postures. Le score compare donc la **géométrie des silhouettes** (hauteur,
compacité) — fiable en relatif (position A vs B du même cycliste, même
caméra), sans signification absolue. La visualisation résout un **écoulement
potentiel 2D** (fonction de courant ψ, équation de Laplace, relaxation) :
les lignes de courant contournent réellement la silhouette, en ~0,5 s
sur CPU.

Un vrai solveur (OpenFOAM) résoudrait Navier-Stokes en 3D : maillage du
cycliste à refaire **par posture** (heures, par un humain formé), heures de
calcul par cas, compétences de niveau master en mécanique des fluides, et
aucune chance de tenir dans un exécutable Windows autonome. Pour comparer
deux postures en magasin, c'est disproportionné — c'est le créneau des
équipes pro (soufflerie physique, prestation CFD à plusieurs milliers
d'euros). Limites assumées du modèle réduit : pas de viscosité, donc pas de
vrai sillage ; les zones rouges sont une heuristique visuelle (cellules
lentes derrière le corps).

### Seuils d'angles (moteur de recommandations)

Sources : méthode Holmes (flexion du genou 35–40° en bas de course),
LeMond, travaux de Bini & Hume — détail et conversions dans
`analysis/thresholds.py` et `GUIDE_PROJET.md`. Trois modes : Performance,
Confort (plage genou décalée vers plus de flexion, tronc plus redressé),
Aérodynamisme (tronc 30–40°, coudes plus fléchis). Conversions
écart→réglage : ~3,5 mm de selle par degré de genou, ~8 mm de cintre par
degré de tronc, arrondis au multiple de 5 mm (la précision réelle du
système, sans calibration pixel→mm).

## Empaquetage (à faire une fois les deux phases validées)

Outil retenu : **PyInstaller** en mode `--onedir` (Nuitka écarté : nos
goulots — MediaPipe, OpenCV, NumPy — sont déjà du C compilé, Nuitka
n'accélérerait que la colle Python pour des builds bien plus longs).

Points d'attention connus :
1. Les données MediaPipe (`.tflite`, `.binarypb`) et les plugins Qt exigent
   des hooks (`collect_data_files('mediapipe')`).
2. **Lancer la soufflerie une fois sur la machine de build avant de
   packager** : le modèle « heavy » utilisé en mode statique est téléchargé
   au premier usage dans `site-packages/mediapipe/` — il doit être présent
   pour être embarqué.
3. Tester le dossier produit sur une machine sans Python.

## Journal des décisions

Chaque choix technique (et les bugs instructifs rencontrés) est documenté
au fil de l'eau dans `.claude/notes.md`.
