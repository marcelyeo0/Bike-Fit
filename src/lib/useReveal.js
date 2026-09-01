import { useEffect } from 'react';

/**
 * Revele les elements portant la classe `a-reveler` quand ils entrent dans le
 * viewport, et rejoue l'animation a l'envers quand on remonte.
 *
 * IntersectionObserver plutot qu'un listener de scroll : pas de travail par
 * frame, pas de re-render React.
 *
 * Motivation motion : hierarchie de lecture. Chaque section arrive dans
 * l'ordre ou elle doit etre lue, avec un decalage court entre freres.
 *
 * Regle de sortie — c'est elle qui donne l'animation inverse :
 *   - sortie par le BAS du viewport (`boundingClientRect.top > 0`) : on
 *     remonte, la section repasse sous la ligne de flottaison. On retire
 *     `data-visible`, elle redescend de 22px en se fondant, puis se rejouera a
 *     la descente suivante.
 *   - sortie par le HAUT (`top <= 0`) : la section est deja lue, on la laisse
 *     visible. La masquer ferait clignoter le haut de page a chaque scroll.
 *
 * Asymetrie volontaire aller/retour :
 *   - aller  : 0.7s (valeur CSS) + escalier de 70ms entre freres. On donne le
 *              temps de lire l'ordre d'arrivee.
 *   - retour : 380ms, sans escalier. Une sortie qui dure autant que l'entree
 *              donne l'impression que la page colle au doigt.
 */
export function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const cibles = Array.from(root.querySelectorAll('.a-reveler'));
    if (!cibles.length) return undefined;

    const reduit =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduit || typeof IntersectionObserver === 'undefined') {
      cibles.forEach((el) => el.setAttribute('data-visible', 'true'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((entree) => {
          const el = entree.target;

          if (entree.isIntersecting) {
            const rang = Number(el.dataset.revealIndex || 0);
            el.style.transitionDelay = `${Math.min(rang, 5) * 70}ms`;
            el.style.transitionDuration = '';
            el.setAttribute('data-visible', 'true');
            return;
          }

          if (entree.boundingClientRect.top > 0) {
            el.style.transitionDelay = '0ms';
            el.style.transitionDuration = '380ms';
            el.removeAttribute('data-visible');
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    cibles.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef]);
}
