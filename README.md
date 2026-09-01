# Axio, site vitrine

Landing page d'Axio, le logiciel d'analyse de posture cycliste destiné aux
ateliers vélo. Branche `web` : ici vit uniquement le site, l'application Python
reste sur `main`.

Le site reproduit le canvas de référence `web design/Axio.dc.html` pour la
navigation, le hero et la barre de preuve. À partir de la section
« Comment ça marche », la mise en page a été retravaillée : les maquettes en
`<div>` du canvas (fausse caméra, faux rapport, faux graphiques) sont remplacées
par des photographies, et les pictogrammes viennent d'une seule famille
d'icônes.

## Lancer

```bash
npm install     # dépendances (React, GSAP, Tailwind, Phosphor)
npm start       # serveur de développement
npm run build   # build de production dans build/
```

## Structure

```
public/
  index.html          polices Google, préchargement du visuel de hero
  assets/             visuels du canvas + photos générées
src/
  index.js            point d'entrée
  index.css           base Tailwind, type fantôme, état initial des révélations
  App.jsx             assemblage des sections, branchement des deux hooks motion
  lib/
    useReveal.js      révélation au scroll (IntersectionObserver)
    useParallax.js    parallaxe douce (GSAP ScrollTrigger)
  ui/
    Nav.jsx           navigation collante, menu mobile
    Footer.jsx
    components/
      Bouton.jsx      variantes de boutons, contrastes calés AA
    sections/
      Hero.jsx            type fantôme, cailloux flottants, relevés d'angles
      Preuve.jsx          compteur d'ateliers, monogrammes d'enseignes
      Comment.jsx         trois étapes, une photo par étape
      Fonctionnalites.jsx bento cinq cellules, photo annotée
      Livrable.jsx        rapport imprimé
      Tarifs.jsx          trois formules
      Temoignage.jsx      citation client
      Ressources.jsx      matériel requis + questions fréquentes
      Cta.jsx             bloc sombre de fin de page
```

## Direction artistique

- Palette : blanc, encre `#0C0C0C`, un seul accent rouge décliné en trois
  valeurs (`rouge` pour les aplats, `rouge-cta` pour les boutons, `rouge-texte`
  pour le petit texte) afin de tenir le contraste AA partout.
- Typographie : Archivo Black en titrage, Barlow en courant, Barlow Semi
  Condensed pour les intertitres.
- Rayons : `24px` pour les blocs, `20px` pour les médias, pill pour tout ce qui
  est cliquable.
- Page en thème clair uniquement. Le hero repose sur un PNG en
  `mix-blend-multiply` qui suppose un fond clair ; un mode sombre casserait le
  visuel principal.

## Motion

Deux mécanismes seulement, tous deux désactivés sous
`prefers-reduced-motion: reduce` :

- révélation à l'entrée dans le viewport, via `IntersectionObserver` ;
- parallaxe sur les cailloux et les photos, via `GSAP ScrollTrigger`.

Aucun `window.addEventListener('scroll')`, aucune valeur continue stockée dans
un état React.

## Images

Les visuels du hero (`hero-cyclist.png`, `rock-*.png`, `portrait.png`)
proviennent du canvas de référence. Les cinq photographies des sections
suivantes (`etape-*.jpg`, `feature-pose.jpg`, `livrable-rapport.jpg`) ont été
générées avec Pixelcut (modèle `z-image-turbo`).
