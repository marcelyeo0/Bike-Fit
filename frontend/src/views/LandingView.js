/**
 * LandingView — page marketing BikeFit (surface Persuade), en amont de
 * l'app opérateur. Thème sombre verrouillé sur toute la page, langage de
 * marque conservé (zinc, accent bleu, pilules).
 *
 * Motion : GSAP + ScrollTrigger, deux paradigmes seulement, motivés :
 *  - section « méthode » : titre épinglé à gauche, étapes qui défilent
 *    à droite (le pinning raconte la séquence, il ne décore pas) ;
 *  - images du bento : scale 0.92 -> 1 à l'entrée (profondeur d'arrivée).
 * Tout est coupé sous prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './Landing.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BENTO = [
  {
    id: 'angles',
    className: 'bento-cell--wide bento-cell--image',
    seed: 'cyclist-studio-profile',
    title: 'Angles articulaires en direct',
    body: 'Genou, hanche, coude, épaule : mesurés à chaque coup de pédale, comparés à des plages issues de la littérature bike fitting.',
  },
  {
    id: 'plages',
    className: '',
    title: 'Plages personnalisées',
    body: 'Six questions de profil. L\'IA adapte les cibles au vélo, à la souplesse et aux douleurs signalées.',
  },
  {
    id: 'conseils',
    className: '',
    title: 'Réglages chiffrés',
    body: 'Pas de « selle trop haute » vague : une direction et un ordre de grandeur en millimètres.',
  },
  {
    id: 'bilan',
    className: 'bento-cell--wide bento-cell--image',
    seed: 'bicycle-workshop-tools',
    title: 'Bilan de séance',
    body: 'Un compte-rendu clair à discuter avec le client, réglage par réglage.',
  },
];

const STEPS = [
  {
    n: 'Installer',
    body: 'Le client pédale sur home-trainer. Une webcam de profil, à hauteur de hanche, à 3 ou 4 mètres. Aucun capteur, aucun marqueur.',
  },
  {
    n: 'Mesurer',
    body: 'La détection de pose suit six points du corps et calcule les angles articulaires en continu, sur un portable sans GPU.',
  },
  {
    n: 'Comparer',
    body: 'Chaque angle est jugé sur la bonne statistique : extension maximale du genou, fermeture minimale de la hanche, moyennes du haut du corps.',
  },
  {
    n: 'Régler',
    body: 'Hauteur et recul de selle, potence, cintre : chaque écart se traduit en réglage concret, en millimètres, priorisé selle d\'abord.',
  },
];

/**
 * Chips d'angles « en direct » de la carte Angles articulaires : le moment
 * focal de la page. La promesse du hero (« mesurée en direct ») est montrée,
 * pas affirmée. Vert = dans la plage, rouge = hors plage, avec le libellé
 * en toutes lettres (l'information ne repose jamais sur la couleur seule).
 * Sous prefers-reduced-motion : valeurs figées.
 */
function LiveAngles({ frozen }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, [frozen]);

  const knee = 145 + Math.round(2.5 * Math.sin(tick * 1.3));   // 143-148
  const elbow = 167 + Math.round(Math.sin(tick * 0.9));        // 166-168
  return (
    <div className="live-angles" aria-hidden="true">
      <span className="chip chip--ok">Genou {knee}° · dans la plage</span>
      <span className="chip chip--ko">Coude {elbow}° · trop tendu</span>
    </div>
  );
}

const MARQUEE_WORDS = [
  'Genou 140-150°', 'Hanche 45-60°', 'Coude 150-165°', 'Épaule 85-100°',
  'Point mort bas', 'Avance-recul de selle', 'Méthode Holmes', 'KOPS',
];

export default function LandingView({ onStart }) {
  const root = useRef(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : true;                     // environnement sans matchMedia : statique

  useGSAP(() => {
    if (reduce) return;

    // (Le titre de la méthode est épinglé en CSS position:sticky —
    //  plus robuste qu'un pin GSAP à l'intérieur d'une grille.)

    // Étapes : arrivée douce, une par une.
    gsap.utils.toArray('.step').forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 40,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 80%' },
      });
    });

    // Images du bento : profondeur d'arrivée (scale 0.92 -> 1).
    gsap.utils.toArray('.bento-cell--image .bento-img').forEach((el) => {
      gsap.fromTo(el, { scale: 0.92 }, {
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'top 40%',
          scrub: true,
        },
      });
    });

    // Hero : entrée unique, séquencée (un seul moment auteur).
    // Contenu seulement : le fond (.hero-bg) reste immobile.
    gsap.from('.hero-title, .hero-sub, .hero-ctas', {
      opacity: 0,
      y: 24,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power3.out',
    });
  }, { scope: root });

  return (
    <main ref={root} className="landing">
      <nav className="landing-nav">
        <span className="nav-brand">BikeFit</span>
        <div className="nav-links">
          <a href="#atelier">L'outil</a>
          <a href="#methode">La méthode</a>
        </div>
        <button type="button" className="nav-cta" onClick={onStart}>
          Lancer l'analyse
        </button>
      </nav>

      {/* ------------------------------------------------ Attention */}
      <header className="hero">
        <div
          className="hero-bg"
          style={{
            backgroundImage:
              'url(https://picsum.photos/seed/road-cyclist-dawn/1920/1080)',
          }}
        />
        <h1 className="hero-title">
          La posture de tes clients, mesurée en direct.
        </h1>
        <p className="hero-sub">
          Pré-diagnostic postural cycliste en quelques minutes, avec une
          webcam et un portable.
        </p>
        <div className="hero-ctas">
          <button type="button" className="btn-light" onClick={onStart}>
            Lancer l'analyse
          </button>
          <a className="btn-ghost" href="#methode">
            Découvrir la méthode
          </a>
        </div>
      </header>

      {/* ------------------------------------------------ Interest */}
      <section id="atelier" className="bento-section">
        <h2 className="section-title">
          Un
          <span
            className="inline-img"
            style={{
              backgroundImage:
                'url(https://picsum.photos/seed/bike-saddle-detail/400/160)',
            }}
            aria-hidden="true"
          />
          outil d'atelier, pas un labo.
        </h2>
        <div className="section-rule" />
        <div className="bento">
          {BENTO.map((c) => (
            <article key={c.id} className={`bento-cell ${c.className}`}>
              {c.seed && (
                <div
                  className="bento-img"
                  style={{
                    backgroundImage:
                      `url(https://picsum.photos/seed/${c.seed}/1200/700)`,
                  }}
                />
              )}
              <div className="bento-copy">
                {c.id === 'angles' && <LiveAngles frozen={reduce} />}
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ Desire */}
      <section id="methode" className="method">
        <div className="method-pin">
          <h2 className="section-title">
            Quatre gestes,
            <br />
            un diagnostic.
          </h2>
          <div className="section-rule" />
          <p className="method-note">
            Complément du bike fitting complet, pas concurrent : un outil
            d'orientation pour le technicien.
          </p>
        </div>
        <div className="method-steps">
          {STEPS.map((s) => (
            <article key={s.n} className="step">
              <h3>{s.n}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ Action */}
      <section className="final-cta">
        <h2 className="final-title">Mets un client en selle.</h2>
        <button type="button" className="btn-light btn-big" onClick={onStart}>
          Lancer l'analyse
        </button>
        <p className="legal-dark">
          Orientation posturale à titre indicatif. Ne remplace ni un avis
          médical ni un bike fitting complet.
        </p>
      </section>

      <footer className="landing-footer">
        <span>BikeFit</span>
        <a href="#atelier">L'outil</a>
        <a href="#methode">La méthode</a>
      </footer>
    </main>
  );
}
