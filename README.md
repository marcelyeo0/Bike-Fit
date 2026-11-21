# Axio — logiciel de bureau

Analyse de position cycliste pour les ateliers vélo, en version **Windows
hors ligne** : le dashboard de la version web (`web_docker`) reproduit en
Python / customtkinter, avec la séance de capture webcam MediaPipe. Pas de
compte, pas de serveur : tout reste sur l'ordinateur de l'atelier.

Branches :

| Branche | Contenu |
| --- | --- |
| `feature/dashboard-bureau` | ce logiciel : dashboard + séance webcam (cette branche) |
| `main` | prototype Python d'origine (questionnaire → analyse), base de la branche ci-dessus |
| `web_docker` | version web : Next.js 16, Clerk, Prisma 7 / PostgreSQL, Docker |
| tags `archive/feature-exe`, `archive/feature-frontend` | anciennes branches archivées (script PyInstaller récupéré, essai React) |

## Lancer

Python 3.12+ (testé en 3.13), webcam pour les séances.

```bash
pip install -r requirements.txt
python main.py            # dashboard Axio
python main.py --rapide   # ancien parcours sans fiche : questionnaire → analyse
python test_dashboard.py  # tests du cœur (règles, base, séance), sans caméra
```

Ou double-clic sur **`Axio.bat`** (utilise `venv\` s'il existe).

Pour une présentation : Paramètres → **Charger les données d'exemple** (quatre
clients fictifs, cinq études). Ils se suppriment comme n'importe quel client.

### Exécutable Windows

```powershell
powershell -ExecutionPolicy Bypass -File build_exe.ps1
# -> dist/Axio/ et dist/Axio-win64.zip
```

`--onedir` (le `--onefile` est trop lent à démarrer avec mediapipe), modèle
`config/pose_landmarker.task` embarqué, `.env` jamais embarqué.

## Ce que fait le dashboard

Mêmes écrans, mêmes textes et même palette que le dashboard web :

| Écran | Contenu |
| --- | --- |
| Tableau de bord | 4 compteurs (études réalisées, clients, études du mois, écarts), études récentes ; étude de démonstration tant que l'atelier n'en a aucune |
| Études | filtre par statut, pagination |
| Étude | pratique, objectif, taille de cadre, mesures et fourchettes, sources des fourchettes, consignes par priorité, compte rendu imprimable, suppression |
| Nouvelle étude | client, pratique (route, gravel, chrono), objectif (confort, mixte, aéro) ; création du premier client si le carnet est vide |
| Clients | création (nom, taille, entrejambe facultatifs), carnet |
| Fiche client | modification, historique, export JSON, suppression en cascade |
| Paramètres | nom de l'atelier (en-tête des comptes rendus), export JSON complet, dossier des données, données d'exemple |

**Séance** : « Démarrer la séance » sur un brouillon fige les fourchettes sur
l'étude, puis ouvre la fenêtre webcam (squelette, angles en direct, conseils).
« Terminer » enregistre les angles jugés, les statuts, les consignes et la taille
de cadre ; l'étude passe à « terminée ». Sans aucun angle mesuré, elle reste en
brouillon.

**Compte rendu** : page HTML A4 écrite dans le dossier des données et ouverte
dans le navigateur, qui lance l'impression (ou « Enregistrer en PDF »).

## Fourchettes : règles fixes, pas de modèle de langage

Les fourchettes cibles sont **déterministes** (`src/core/biomeca.py`) : table
par objectif, décalage par pratique, ajustement de la hanche et de l'épaule
selon le rapport entrejambe / taille. Même profil, même cible, sur chaque poste
et à chaque séance.

Pourquoi pas un LLM (Gemini, ou les modèles du LIMOS) pour les chiffres :

- **Reproductible** : un fitter qui relance une séance retrouve la même cible.
- **Explicable** : chaque fourchette a une source affichée sur l'étude et le
  compte rendu (genou : 30–40° de flexion en bas de pédalage, Holmes et al.
  1994, Ferrer-Roca et al. 2012).
- **Fiable en démonstration** : pas de réseau, pas d'attente, pas d'erreur de
  service.
- **Défendable** : un outil d'aide au réglage s'appuie sur une règle documentée
  et testée, pas sur une sortie générée.
- La version web bornait déjà la réponse du modèle à ±15° de la table : il ne
  faisait que déplacer une table existante.

Un modèle de langage reste une piste pour **rédiger** un bilan à partir des
constats déjà calculés, jamais pour fixer les nombres.

> Hanche, coude, épaule et l'estimation de cadre restent des **ordres de
> grandeur usuels**, présentés comme tels. Le chantier utile : les sourcer et
> les faire valider par un fitter.

La version web (`web_docker`) appelle encore Gemini pour les fourchettes : à
aligner pour que les deux versions donnent les mêmes cibles.

## Données

SQLite dans `%APPDATA%\Axio\axio.db` (ou `$AXIO_DATA_DIR`), hors du dossier
d'installation : une nouvelle version ne l'écrase pas. Comptes rendus dans
`%APPDATA%\Axio\comptes-rendus\`.

Même modèle que la version web, réduit à un seul atelier :

| Table | Contenu |
| --- | --- |
| `atelier` | nom affiché sur les comptes rendus |
| `client` | nom, taille et entrejambe (cm, facultatifs) |
| `study` | pratique, objectif, statut, fourchettes figées (JSON), taille de cadre |
| `measurement` | articulation, valeur, fourchette cible copiée, statut |
| `recommendation` | consigne, priorité |

- **Aucune vidéo n'est stockée** : seulement les angles et les consignes.
- Fourchette copiée sur chaque mesure : un compte rendu ne change pas après coup.
- Suppression en cascade : un client emporte ses études, mesures et consignes.
- Étude de démonstration (lecture seule, hors compteurs) posée au premier lancement.

## Structure

```
main.py                    point d'entrée (dashboard, ou --rapide)
Axio.bat                   lanceur double-clic
build_exe.ps1              exécutable PyInstaller
test_dashboard.py          tests sans interface ni caméra
config/pose_landmarker.task  modèle MediaPipe
src/
  core/
    biomeca.py             fourchettes, statuts, consignes, cadre, sources
    angles.py              calcul des angles, fenêtre glissante, stat jugée
    pose.py                détection MediaPipe (LIVE_STREAM)
    feedback.py            conseils en direct pendant la séance
    ranges.py              fourchettes via Gemini (parcours --rapide uniquement)
  data/store.py            base SQLite, lectures et écritures, exports
  GUI/
    theme.py               palette (jetons du web) et polices
    analysis_window.py     fenêtre de séance webcam
    setup_window.py        questionnaire du parcours --rapide
    dashboard/
      app.py               fenêtre, barre latérale, navigation, séance
      pages.py             les sept écrans
      composants.py        boutons, cartes, tableaux, champs, libellés
      rapport.py           compte rendu HTML A4
```

## Vocabulaire

Réglage, position, fourchette, confort. Jamais de soin : Axio est un outil
d'aide au réglage et ne constitue pas un avis médical.
