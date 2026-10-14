import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.dirname(fileURLToPath(import.meta.url));

/**
 * Adresses IPv4 de cette machine sur le reseau local.
 *
 * `next dev` bloque les ressources de developpement (HMR, overlay) pour toute
 * origine autre que localhost. Ouverte via le lien « Network », la page
 * arrive rendue par le serveur mais ne s'hydrate jamais : plus d'animations
 * GSAP, plus de Clerk, des sections restees invisibles. On autorise donc les
 * seules adresses de la machine elle-meme, plus celles listees dans
 * AXIO_DEV_ORIGINS (separees par des virgules) pour un nom d'hote local.
 */
function originesDev() {
  const adresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  const supplementaires = (process.env.AXIO_DEV_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return [...adresses, ...supplementaires];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sans effet en production : ne concerne que `next dev`.
  allowedDevOrigins: originesDev(),
  // Memes en-tetes que le Caddyfile, poses aussi par Next : l'application
  // reste protegee si on la sert sans Caddy (docker compose local, autre
  // frontal). HSTS reste a Caddy, seul a savoir que la connexion est en HTTPS.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // La camera sert a la seance de capture, sur ce domaine uniquement.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // Pas d'en-tete `X-Powered-By: Next.js`.
  poweredByHeader: false,
  // Serveur autonome dans `.next/standalone` : c'est ce que copie l'etape
  // d'execution du Dockerfile, sans `node_modules` complet.
  output: 'standalone',
  // Meme raison que `turbopack.root` : sans cela le tracage des fichiers
  // remonte au package-lock.json du repertoire utilisateur et `server.js` se
  // retrouve enfoui sous `.next/standalone/<chemin>/`.
  outputFileTracingRoot: racine,
  // Sans cela, Turbopack remonte jusqu'au package-lock.json du repertoire
  // utilisateur et prend une racine de projet erronee.
  turbopack: { root: racine },
};

export default nextConfig;
