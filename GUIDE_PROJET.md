# Étude posturale cycliste alimentée par IA — Guide de projet

Analyse de posture sur vélo par vision par ordinateur : on place un cycliste (avec
points d'exosquelette) sur une fenêtre vidéo / image, et l'outil mesure les angles
articulaires puis recommande quels paramètres ajuster pour améliorer la posture.

> **Point clé à retenir dès le départ :** on n'entraîne (presque) pas de modèle.
> Le cœur repose sur des modèles de *pose estimation* déjà entraînés (MediaPipe,
> MoveNet, RTMPose…). Réentraîner from scratch demanderait des dizaines de milliers
> d'images annotées et des GPU. Le vrai travail d'ingénierie :
> **extraire les bons points → calculer les bons angles → produire une analyse
> fiable basée sur la science du bike fitting**. Et *éventuellement* entraîner un
> petit modèle de reco par-dessus.

---

## 1. Comprendre le domaine (le bike fitting)

Le bike fitting est une vraie discipline avec des références chiffrées. Les pros
utilisent **Retül** (caméra + marqueurs), **Leomo** (capteurs IMU),
**bikefitting.com**. Ce projet = une version IA / low-cost de ces systèmes.

### Points anatomiques standard (l'« exosquelette ») — vue de profil

| Point    | Repère anatomique              |
|----------|--------------------------------|
| Épaule   | Acromion                       |
| Coude    | Épicondyle latéral             |
| Poignet  | Styloïde                       |
| Hanche   | Grand trochanter               |
| Genou    | Épicondyle latéral du fémur    |
| Cheville | Malléole latérale              |
| Pied     | 5e métatarse                   |

### Angles clés et cibles validées

| Angle                      | Mesure                                  | Cible (route)                                   |
|----------------------------|-----------------------------------------|-------------------------------------------------|
| **Genou (extension basse)**| Hanche-Genou-Cheville, pédale en bas    | **35–40°** de flexion (méthode Holmes)          |
| **Genou (flexion haute)**  | pédale en haut                          | ~110–115°                                       |
| **Tronc**                  | Horizontale vs ligne hanche-épaule      | 40–45° (route, variable)                        |
| **Coude**                  | Épaule-Coude-Poignet                    | 150–160° (léger fléchi)                         |
| **Hanche**                 | Tronc-cuisse                            | > 45° en haut de course                         |

> **Intelligence métier :** ces seuils viennent de la littérature
> (méthode Holmes / LeMond, études de Bini & Hume). L'appli compare les angles
> mesurés à ces fourchettes et recommande, ex. :
> *« genou trop tendu à 28° → monte la selle de ~3-5 mm »*.

---

## 2. Stack technique

### Phase 1 — Prototype PC (commencer ICI)

```
Python 3.11
├── opencv-python        # capture vidéo / image, dessin
├── mediapipe            # pose estimation (33 points, gratuit, rapide CPU)
├── numpy                # calcul d'angles vectoriels
├── matplotlib / plotly  # visualisation, graphes d'angle dans le temps
└── streamlit            # interface web locale ultra-rapide à coder
```

**Pourquoi MediaPipe Pose pour démarrer :** temps réel sur CPU, 33 landmarks 3D,
gratuit, doc excellente.

Alternatives à connaître / citer :
- **MoveNet** (Google, ultra rapide, TF.js → idéal mobile/web)
- **YOLOv8-pose / YOLO11-pose** (Ultralytics, robuste, entraînable si besoin)
- **RTMPose** (état de l'art précision, plus lourd)
- **OpenPose** (historique, lourd, à citer mais éviter)

### Phase 2 — Production

| Cible                              | Stack                                                                 |
|------------------------------------|-----------------------------------------------------------------------|
| **Web app** (plus simple à montrer)| MoveNet + **TensorFlow.js** dans le navigateur, ou **Streamlit Cloud**|
| **Mobile natif**                   | **Flutter** + `google_mlkit_pose_detection`, ou **React Native** + MediaPipe Tasks |
| **API backend**                    | **FastAPI** + modèle Python, déployé sur Railway/Render/Fly.io        |

> **Conseil :** Prototype PC (Streamlit) → Web app (TF.js) pour le CV/démo →
> Mobile seulement pour pitcher à Decathlon. Le web app impressionne le plus pour
> un coût minimal.

---

## 3. Pipeline complet

```
[1] Acquisition          [2] Pose Estimation      [3] Extraction features
 vidéo/image profil  →    33 landmarks (x,y,z)  →   calcul angles articulaires
        ↓                                                    ↓
[6] Restitution      ←   [5] Recommandation     ←   [4] Analyse
 overlay + rapport         règles + (ML)            comparaison aux cibles
```

1. **Acquisition** — Vue de **profil strict** (perpendiculaire au plan du vélo),
   caméra à hauteur de hanche, ~3-4 m, vélo sur home-trainer. Pédalage à cadence
   stable ; on détecte le bas/haut de la course de pédale.
2. **Pose estimation** — MediaPipe sort les 33 points. Filtrer le bruit
   (moyenne glissante / filtre de Savitzky-Golay) car les landmarks tremblent.
3. **Features** — fonction de calcul d'angle entre 3 points (produit scalaire de
   vecteurs). Extraction de l'angle quand la pédale est en bas (genou min) et en haut.
4. **Analyse** — comparaison aux fourchettes du §1.
5. **Recommandation** — moteur de règles au début :
   ```
   si genou_bas < 35° : "Selle trop haute, descends de 5 mm"
   si genou_bas > 40° : "Selle trop basse, monte de 5 mm"
   ...
   ```
6. **Restitution** — image annotée (squelette + angles) + rapport texte/PDF.

---

## 4. Faut-il entraîner un modèle ?

Trois niveaux, du plus simple au plus « IA » :

1. **Niveau 0 — Règles expertes (commencer là).** Aucun entraînement. On code les
   seuils. Déjà un produit fonctionnel et défendable scientifiquement.
   **90 % de la valeur est ici.**
2. **Niveau 1 — Affiner la détection.** Si MediaPipe place mal les points sur des
   poses vélo (buste penché), **fine-tuner YOLOv8-pose** sur ~500-2000 images
   annotées. C'est là qu'intervient *réellement* l'entraînement.
   Annotation : **CVAT** ou **Roboflow**.
3. **Niveau 2 — Modèle de recommandation appris.** Avec des données
   « avant/après réglage + ressenti/perf », entraîner un petit
   classifieur/régresseur (scikit-learn) qui prédit le réglage optimal.
   **Futur** — nécessite des données labellisées pas encore disponibles.

> **Pour le CV :** Niveau 0 solide + une démo de Niveau 1 (fine-tuning) pour
> montrer qu'on sait entraîner un modèle.

---

## 5. Capteurs (budget matériel)

| Solution                                                                 | Coût      | Verdict |
|--------------------------------------------------------------------------|-----------|---------|
| **Marqueurs physiques** (gommettes réfléchissantes / pastilles colorées) | ~5 €      | ✅ À faire. Améliore la précision et donne le côté « pro ». Détectables par couleur en OpenCV. |
| **Home-trainer**                                                         | déjà eu ? | Indispensable pour vidéo stable |
| **IMU bon marché (MPU-6050)**                                            | ~3-5 €/u  | 🔶 Bonus avancé. Mesure angles/accélérations (principe du Leomo). Demande Arduino/ESP32 → complexité. |
| **Capteurs pro (Retül, Leomo, STAC)**                                    | 500–3000 €| ❌ À citer comme référence/concurrence, pas pour ce projet. |
| **Capteur de cadence/puissance**                                         | 30–300 €  | 🔶 Seulement pour corréler posture ↔ performance plus tard |

> **Recommandation :** marqueurs colorés (5 €) + home-trainer. Téléphone comme
> caméra. N'investir dans les IMU que pour un « wow » technique supplémentaire.

---

## 6. Tests & validation

- **Unitaires :** fonction de calcul d'angle (cas connus : 90°, 180°…), filtrage.
- **Validation pose estimation :** annoter manuellement quelques images, comparer
  aux points prédits (erreur en pixels / PCK).
- **Validation métier :** mesurer un angle avec un **goniomètre physique** (10 €) ou
  l'app « Angle Meter » et comparer à la sortie. *Le* test qui crédibilise le projet.
- **Robustesse :** lumière, vêtements, angles de caméra imparfaits.
- **CI :** GitHub Actions lance `pytest` à chaque push.

---

## 7. GitHub & mise en valeur CV

```
posture-cycling-ai/
├── README.md          ← LE plus important : GIF de démo en haut, schéma pipeline, références scientifiques
├── src/
│   ├── pose.py        ← wrapper MediaPipe
│   ├── angles.py      ← calcul angles (bien testé)
│   ├── analysis.py    ← moteur de règles + seuils
│   └── report.py      ← génération rapport/overlay
├── app.py             ← interface Streamlit
├── tests/
├── notebooks/         ← exploration, validation
├── requirements.txt
├── .github/workflows/ ← CI
└── data/samples/      ← quelques vidéos de démo (PAS de données perso/privées)
```

**README qui fait la diff :** GIF animé de l'analyse en temps réel + tableau des
angles + section « Méthodologie » citant Holmes/Bini.

---

## 8. Pitcher à Decathlon / vélocistes

- D'abord **un MVP qui marche + une démo vidéo de 60 s**. Personne ne reçoit sur une
  idée seule.
- Angle de pitch : *« outil de pré-diagnostic posture en 2 min, accessible, pour
  orienter vers un bike fitting complet »* — se positionner en **complément**, pas en
  concurrent des vélocistes.
- ⚠️ **Légal :** rester sur du *conseil/orientation*, pas du diagnostic médical.
  Le mentionner explicitement.
- Decathlon a des ateliers vélo → angle « outil pour leurs techniciens ».

---

## 9. Plan d'action concret

1. **Semaine 1-2 :** Script PC — webcam → MediaPipe → overlay squelette temps réel.
2. **Semaine 2-3 :** Calcul des angles + détection bas/haut de pédale.
3. **Semaine 3-4 :** Moteur de règles + rapport. → **Premier produit fonctionnel.**
4. **Semaine 4-5 :** Interface Streamlit + validation goniomètre + README/GitHub.
5. **Plus tard :** fine-tuning YOLO (CV), web app TF.js, marqueurs/IMU, pitch.

---

## Références à citer

- Méthode **Holmes** (angle de flexion du genou 25–35° / 35–40° selon protocole).
- **LeMond** (hauteur de selle = entrejambe × 0,883).
- **Bini, R. & Hume, P.** — recherches biomécaniques sur le positionnement cycliste.
- Systèmes commerciaux : **Retül**, **Leomo**, **bikefitting.com** (Shimano), **STAC**.
