/**
 * anim.js — miroir web de `src/GUI/anim.py` (branche main).
 *
 * Sur le bureau, tkinter ne sait animer que l'alpha d'une fenêtre : chaque
 * changement de vue passe par un fondu, jamais par une téléportation. Le
 * web garde la même intention, avec le vocabulaire du navigateur : des
 * apparitions au scroll et deux séquences pilotées par la barre de
 * défilement. Rien ne bouge en boucle, rien ne bouge sans raison.
 *
 * `prefers-reduced-motion` coupe tout : le CSS rend les blocs visibles
 * (voir index.css) et les fonctions ci-dessous ne créent aucun ScrollTrigger.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Ease-out cubique de anim.py : 1 - (1 - t)³, soit power2.out chez GSAP. */
export const EASE_OUT3 = "power2.out";

/** Durées héritées du bureau : apparition 200 ms, disparition 120 ms. */
export const FADE_IN_S = 0.2;
export const FADE_OUT_S = 0.12;

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Apparition au scroll de tous les blocs marqués `data-reveal`, par lots.
 * Justification : donner l'ordre de lecture d'une section (le titre avant
 * ses détails), pas décorer. Une seule fois par bloc, jamais de retour.
 *
 * Renvoie une fonction de nettoyage (`gsap.context().revert`).
 */
export function initReveals(scope) {
  const show = (elements) =>
    gsap.to(elements, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      ease: EASE_OUT3,
      stagger: 0.06,
    });

  if (prefersReducedMotion()) return () => {};

  try {
    const ctx = gsap.context(() => {
      gsap.set("[data-reveal]", { opacity: 0, y: 16 });
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: show,
      });

      // Filet de sécurité : ce qui est DÉJÀ visible au chargement ne doit pas
      // attendre un défilement pour apparaître. ScrollTrigger ne déclenche
      // `onEnter` qu'au franchissement, jamais à la création.
      const line = window.innerHeight * 0.88;
      const visible = gsap.utils
        .toArray("[data-reveal]")
        .filter((el) => el.getBoundingClientRect().top < line);
      if (visible.length) show(visible);
    }, scope);

    return () => ctx.revert();
  } catch (error) {
    // Une page illisible est pire qu'une page sans animation : si GSAP
    // échoue, tout redevient visible immédiatement.
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "1";
    });
    return () => {};
  }
}
