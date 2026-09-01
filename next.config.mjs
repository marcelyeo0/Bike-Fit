import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sans cela, Turbopack remonte jusqu'au package-lock.json du repertoire
  // utilisateur et prend une racine de projet erronee.
  turbopack: { root: racine },
};

export default nextConfig;
