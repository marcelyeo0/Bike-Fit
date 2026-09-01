'use client';

import React, { useRef } from 'react';
import { useReveal } from '../lib/useReveal';
import { useParallax } from '../lib/useParallax';
import Nav from '../ui/Nav';
import Hero from '../ui/sections/Hero';
import Preuve from '../ui/sections/Preuve';
import Comment from '../ui/sections/Comment';
import Fonctionnalites from '../ui/sections/Fonctionnalites';
import Livrable from '../ui/sections/Livrable';
import Tarifs from '../ui/sections/Tarifs';
import Temoignage from '../ui/sections/Temoignage';
import Ressources from '../ui/sections/Ressources';
import Cta from '../ui/sections/Cta';
import Footer from '../ui/Footer';

export default function LandingPage() {
  const page = useRef<HTMLDivElement>(null);

  useReveal(page);
  useParallax(page);

  return (
    <div ref={page} className="w-full overflow-x-hidden bg-white">
      {/* React 19 remonte ce <link> dans le <head>. */}
      <link rel="preload" as="image" href="/assets/hero-cyclist.png" />
      <Nav />
      <main>
        <Hero />
        <Preuve />
        <Comment />
        <Fonctionnalites />
        <Livrable />
        <Tarifs />
        <Temoignage />
        <Ressources />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
