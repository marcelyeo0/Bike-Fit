# Notes de développement — BikeFit AI

> Journal des décisions techniques. Chaque entrée : ce qu'on fait, pourquoi ce choix,
> et ce qu'on a écarté. À relire pour comprendre le raisonnement, pas juste le code.

---

## Étape 0 — Cadrage et feuille de route (2026-07-10)

### Ce que je fais
Rédaction du `README_PERSO.md` (feuille de route) avant toute ligne de code,
comme demandé. Analyse des trois références fournies :

- `image.png` : rendu cible Phase 1 — overlay vert semi-transparent sur le cycliste,
  étiquettes d'angles (épaule 72,2°, genou 134,6°, pied 25,1°) **et une cote
  linéaire** (« Genou/Pédale −14,8 mm ») avec ligne verticale en pointillés.
  À retenir : le rendu cible ne se limite pas aux angles, il y a aussi des
  mesures de distance (alignement genou/axe de pédale = réglage recul de selle).
- `assets/Gemini_Generated_Image_*.png` : maquette 4 écrans — accueil avec choix
  de mode, analyse live avec console de recommandations à droite + bouton rouge
  « Terminer l'analyse », import vidéo, soufflerie avec lignes de flux + « Drag
  score » comparatif Position A/B. Thème sombre, squelette en dégradé de couleurs.
- `GUIDE_PROJET.md` : le savoir métier est déjà là (méthode Holmes, seuils
  d'angles, points anatomiques). Je le réutilise comme source pour le moteur de
  règles au lieu de re-chercher.

### Choix techniques posés dans le README (résumé du raisonnement)

**Pose : MediaPipe Pose (Python) plutôt que RTMPose/ONNX.**
MediaPipe tourne en temps réel sur CPU (indispensable : un vélociste n'a pas de
GPU), s'installe en un `pip install`, et donne 33 landmarks + un masque de
segmentation — ce masque servira directement à la Phase 2 (silhouette pour la
soufflerie), ce qui fait d'une pierre deux coups. RTMPose est plus précis sur
les poses penchées mais exige un pipeline à deux étages (détection de personne
+ pose) via ONNX Runtime : plus de code d'intégration, pas de masque de
segmentation, gain de précision non critique pour une vue de profil sur
home-trainer. Écarté pour la v1, mais l'interface `PoseEstimator` (classe
abstraite dans `pose/`) permettra de le brancher plus tard sans toucher au reste.

**UI : PySide6 plutôt qu'OpenCV+overlay ou Streamlit.**
Le GUIDE_PROJET suggérait Streamlit — écarté : Streamlit est une appli web
rechargée à chaque interaction, inadaptée à la vidéo 30 fps, aux fenêtres
côte à côte, et surtout à l'empaquetage PyInstaller demandé. OpenCV `imshow`
seul ne fait ni boutons corrects, ni panneau texte défilant, ni écran
d'accueil. PySide6 (Qt officiel, licence LGPL) donne le look pro de la
maquette, un vrai système de widgets/layouts, et s'empaquette bien. Coût :
courbe d'apprentissage Qt — assumé, c'est aussi un investissement pour le
portage C++ (Qt existe en C++, la logique d'UI sera transposable quasi 1:1).

**Aéro Phase 2 : approximation 2D silhouette + rendu de flux stylisé, pas de CFD.**
Détail complet dans le README (§ Phase 2). En deux mots : la valeur pour le
client est *comparative* (posture A vs B) et *visuelle*. Un proxy de CdA basé
sur l'aire projetée de la silhouette + les angles de posture donne un score
comparatif honnête ; les lignes de flux sont calculées par un écoulement
potentiel 2D autour du masque (physiquement plausible, calculable en < 1 s),
pas par un solveur Navier-Stokes. OpenFOAM écarté : maillage 3D par frame,
heures de calcul, dépendance impossible à empaqueter — disproportionné.

### Alternatives écartées (trace)
- Streamlit (web, pas temps réel, pas packageable) — cf. ci-dessus.
- OpenPose (lourd, abandonné, licence restrictive usage commercial).
- YOLOv8/11-pose : bon candidat mais 17 keypoints COCO (pas de pied détaillé),
  licence AGPL problématique pour un logiciel vendu à des vélocistes.
- LBM (lattice-Boltzmann) 2D pour la soufflerie : envisagé comme « vrai mini
  solveur », gardé en extension optionnelle (jalon P2.5) car l'écoulement
  potentiel suffit pour le rendu et coûte 10× moins d'effort.

### Prochaine étape
Attendre la validation du `README_PERSO.md` par Marcel avant de coder.
Ensuite : jalon P1.1 (squelette du projet + venv + fenêtre d'accueil vide).
