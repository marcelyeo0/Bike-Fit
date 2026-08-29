# BikeFit, site vitrine

Site de présentation du logiciel BikeFit (analyse posturale cycliste en temps
réel). Branche `web` : ici vit uniquement le site, l'application Python reste
sur `main`.

## Lancer

```bash
npm install     # dépendances (React, GSAP, Tailwind)
npm start       # serveur de développement
npm test        # banc d'essai du cœur, sans interface
npm run build   # build de production dans build/
```

## Structure

Le site reprend volontairement le découpage de l'application desktop
(branche `main`), fichier pour fichier :

| Application (`main`)    | Site (`web`)                  |
| ----------------------- | ----------------------------- |
| `main.py`               | `src/index.js` + `src/App.jsx` |
| `src/core/angles.py`    | `src/core/angles.js`          |
| `src/core/ranges.py`    | `src/core/ranges.js`          |
| `src/core/feedback.py`  | `src/core/feedback.js`        |
| `src/GUI/theme.py`      | `src/ui/theme.js` + `tailwind.config.js` |
| `src/GUI/anim.py`       | `src/ui/anim.js`              |
| `src/GUI/*_window.py`   | `src/ui/sections/*.jsx`       |
| `test_core.py`          | `src/core/core.test.js`       |

Le design system est celui de l'application : gamme zinc, un seul accent
(Bleu Cadre `#3572D6`), vert et rouge réservés à l'état des articulations,
valeurs numériques en chasse fixe. Thème clair verrouillé, comme le logiciel.

Les chiffres affichés (plages cibles, conseils de réglage) sont ceux du code
de `main` : plages standard de repli et diagnostics de `src/core/feedback.py`.
Les valeurs qui bougent sont des démonstrations, signalées comme telles.
