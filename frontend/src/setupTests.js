// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// jsdom n'implémente pas matchMedia ; gsap/ScrollTrigger l'appelle dès
// l'enregistrement du plugin. Polyfill minimal, "reduce" par défaut pour
// que les animations restent statiques en test.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
