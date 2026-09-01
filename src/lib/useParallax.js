import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Parallaxe douce sur les elements `[data-parallax="0.2"]`.
 * La valeur est la force : 0.1 = discret, 0.5 = marque.
 *
 * Motivation motion : profondeur. Les cailloux flottants et les visuels de
 * section doivent se detacher du fond pendant le scroll, sinon la page parait
 * plate. Uniquement du `transform`, jamais de listener de scroll manuel.
 */
export function useParallax(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduit) return undefined;

    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-parallax]').forEach((el) => {
        const force = parseFloat(el.getAttribute('data-parallax')) || 0;
        if (!force) return;
        gsap.fromTo(
          el,
          { yPercent: force * 22 },
          {
            yPercent: force * -22,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          }
        );
      });
    }, root);

    return () => ctx.revert();
  }, [rootRef]);
}
