import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
