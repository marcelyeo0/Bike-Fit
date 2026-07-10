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

---

## Étape 1 — Module `pose/` (2026-07-10)

### Ce que je fais
Abstraction `PoseEstimator` (classe abstraite) + `MediaPipeEstimator` +
`VideoSource` (webcam ou fichier, même interface pour les deux modes).

### Décisions et surprises
- **MediaPipe 0.10.35 (dernière version) a supprimé l'API `mp.solutions`** —
  découvert à l'installation. Deux options : passer à l'API Tasks (impose de
  télécharger un fichier modèle `.task` à part) ou épingler la dernière
  version qui embarque encore le modèle dans le paquet pip. Choix :
  **épingler `mediapipe==0.10.21`** — zéro téléchargement au premier
  lancement chez le vélociste, et un fichier de moins à gérer pour
  PyInstaller. Effet domino : 0.10.21 exige numpy<2, donc
  `opencv-python==4.10` (les 5.x exigent numpy≥2). Tout est commenté dans
  `requirements.txt`. Leçon : figer les versions d'un écosystème ML, sinon
  le projet casse à la prochaine release.
- **Ouverture webcam Windows : `cv2.CAP_DSHOW`** au lieu du backend MSMF par
  défaut, qui met plusieurs secondes à s'ouvrir.
- **Choix du côté du corps** : en vue de profil, MediaPipe « hallucine » le
  côté caché. On score la visibilité épaule+hanche+genou+cheville de chaque
  côté et on ne garde que le meilleur.

## Étape 2 — Module `analysis/` (2026-07-10)

### Ce que je fais
`geometry.py` (angles par produit scalaire), `filters.py` (lissage EMA),
`session.py` (détection des points morts du pédalage + agrégation),
`thresholds.py` (seuils par mode, sourcés), `recommender.py` (règles →
conseils chiffrés). 29 tests pytest, tous au vert.

### Décisions
- **Convention d'angle : intérieur** (celui affiché sur image.png, genou
  134,6°), conversion flexion = 180 − intérieur documentée. Les seuils de la
  littérature (souvent en flexion) sont convertis une fois pour toutes dans
  `thresholds.py`.
- **Lissage : EMA** plutôt que moyenne glissante (latence N/2) ou One-Euro
  (plus complexe) : mémoire O(1), un paramètre. On passera à One-Euro si
  l'EMA traîne trop sur les mouvements rapides.
- **Points morts : hystérésis** sur la trajectoire y de la cheville plutôt
  que `scipy.find_peaks` (latence de fenêtre + dépendance en plus).
- **Conversion angle→réglage** : ~3,5 mm de selle par degré de genou,
  ~8 mm de cintre par degré de tronc (ordres de grandeur, arrondis au
  multiple de 5 mm — honnêteté sur la précision réelle sans calibration).
- Le recommender évite les conseils contradictoires : si « monter la selle »
  est déjà émis via le genou en bas de course, la règle du genou en haut
  (même remède) est court-circuitée.

### Bug instructif (corrigé)
Première version du `CycleTracker` : pendant l'amorçage (direction
inconnue), les deux branches de détection partageaient le même extremum
candidat — chacune le tirait dans son sens, l'écart au seuil ne se creusait
jamais, **zéro événement détecté** (les tests sinusoïde l'ont attrapé dès
que le seuil anti-bruit a été monté à 20 px). Correction : phase d'amorçage
explicite avec suivi min/max séparés, qui fixe la direction sans émettre le
premier extremum. Leçon : les états « je ne sais pas encore » méritent une
branche dédiée, pas un bricolage des branches nominales.

---

## Étape 3 — UI Phase 1 (2026-07-10)

### Ce que je fais
Application Qt complète : accueil → choix du mode → analyse live
(vidéo annotée + console + « Terminer l'analyse ») → rapport de session.

### Décisions
- **QStackedWidget** (pages empilées dans une fenêtre) plutôt que fenêtres
  multiples : une seule boucle d'événements, pas de fenêtres orphelines,
  navigation triviale. La « fenêtre de sortie texte séparée » du cahier des
  charges est un panneau latéral (comme la maquette) — même service, moins
  de gestion de fenêtres.
- **FitWorker en QThread** : la boucle caméra+MediaPipe (~30 ms/frame)
  gèlerait l'UI dans le thread principal. Les signaux Qt font la
  communication inter-threads sans file d'attente maison. Équivalent C++ :
  std::thread + queue de messages — la découpe se transposera.
- **Anti-spam de la console** : la maquette montre 7× le même message ;
  volontairement non imité. Une reco n'est répétée qu'après 8 s, et
  seulement aux points morts du cycle (là où les mesures ont un sens).
- **QImage.copy() obligatoire** dans VideoView : sans copie, Qt pointe vers
  le buffer NumPy réutilisé à la frame suivante → crash aléatoire (piège
  classique OpenCV/Qt, documenté dans le code).
- Le rapport de session est dans `analysis/report.py` (chaîne pure, testée)
  et pas dans l'UI : réutilisable pour un futur export PDF.

## Étape 4 — Module `windtunnel/` (2026-07-10)

### Ce que je fais
Silhouette (nettoyage du masque MediaPipe), solveur d'écoulement potentiel
2D, score de traînée relatif, rendu (iso-lignes + particules + zones
rouges). 20 tests sur des cas à solution connue.

### Décisions
- **Fonction de courant ψ + relaxation red-black (SOR)** : les iso-lignes
  de ψ SONT les lignes de courant — pas de tracé approximatif, la physique
  donne directement le visuel. Grille ~200 de large : 0,55 s sur une image
  720p, dans la promesse « < 1 s » du README. Écarté : matplotlib pour les
  contours (dépendance lourde à empaqueter) — extraction par
  `cv2.findContours` sur seuils successifs.
- **Limites assumées et écrites dans les docstrings** : pas de viscosité →
  pas de vrai sillage ; les « zones de traînée » rouges sont une heuristique
  (cellules lentes derrière le corps), le score est RELATIF (hauteur +
  compacité de la silhouette), jamais des watts.
- **Score de traînée** : 65 % hauteur de silhouette (levier n°1 d'une
  position aéro, visible de profil) + 35 % compacité. Pas de pénalité
  d'angle séparée : la hauteur EST déjà le signal postural de profil.

### Bugs/leçons
- Test « les particules avancent » d'abord écrit sur la moyenne des x :
  faux — les particules réinjectées à gauche font baisser la moyenne.
  Réécrit sur des particules loin des bords (toutes doivent avancer).
  Leçon : tester l'invariant exact, pas un agrégat qui le noie.
- `cv2.findContours` referme les iso-lignes le long du cadre de l'image →
  filtrage des tronçons de bord (découpe du contour en runs intérieurs).

## Étape 5 — UI soufflerie (2026-07-10)

### Décisions
- **Deux emplacements A/B** avec vidéo, curseur de frame et score chacun :
  l'usage vélociste est comparatif (avant/après réglage). Scrubber la
  vidéo invalide le calcul du slot (le score correspond toujours à la
  frame affichée).
- **model_complexity=2 (heavy) pour la soufflerie** : sur frame statique,
  le modèle léger échoue là où le heavy réussit (constaté sur image.png).
  ⚠ Le heavy n'est PAS dans le paquet pip : MediaPipe le télécharge au
  premier usage (cache dans site-packages). **Conséquence empaquetage :
  lancer la soufflerie une fois sur la machine de build avant PyInstaller.**
  L'analyse live garde le modèle 1 (30 fps requis).
- Animation par QTimer 40 ms dans le thread UI : après le calcul lourd
  (thread), chaque tick ne coûte qu'une advection de particules + un rendu
  OpenCV (~5 ms) — pas besoin d'un second thread.
