import { useEffect } from 'react';

/**
 * Revele les elements portant la classe `a-reveler` quand ils entrent dans le
 * viewport. IntersectionObserver plutot qu'un listener de scroll : pas de
 * travail par frame, pas de re-render React.
 *
 * Motivation motion : hierarchie de lecture. Chaque section arrive dans
 * l'ordre ou elle doit etre lue, avec un decalage court entre freres.
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
          if (!entree.isIntersecting) return;
          const el = entree.target;
          const rang = Number(el.dataset.revealIndex || 0);
          el.style.transitionDelay = `${Math.min(rang, 5) * 70}ms`;
          el.setAttribute('data-visible', 'true');
          observer.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    cibles.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef]);
}
