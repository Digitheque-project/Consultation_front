import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Image de production minimale (Docker) : ne copie que les fichiers de
  // runtime nécessaires, pas node_modules entier.
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
