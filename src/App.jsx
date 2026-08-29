/**
 * App.jsx — l'assemblage de la page, dans l'ordre du logiciel.
 *
 * Miroir web de `main.py` : le point d'entrée ne fait rien d'autre
 * qu'enchaîner les écrans. Les apparitions au scroll sont initialisées une
 * seule fois ici, pour toute la page (voir ui/anim.js).
 */

import { useEffect, useRef } from "react";

import { initReveals } from "./ui/anim";
import Nav from "./ui/sections/Nav";
import Hero from "./ui/sections/Hero";
import Analyse from "./ui/sections/Analyse";
import Flux from "./ui/sections/Flux";
import Conseils from "./ui/sections/Conseils";
import Limites from "./ui/sections/Limites";
import Logiciel from "./ui/sections/Logiciel";
import Fin from "./ui/sections/Fin";

export default function App() {
  const rootRef = useRef(null);

  useEffect(() => initReveals(rootRef.current), []);

  return (
    <div ref={rootRef}>
      <Nav />
      <main>
        <Hero />
        <Analyse />
        <Flux />
        <Conseils />
        <Limites />
        <Logiciel />
      </main>
      <Fin />
    </div>
  );
}
