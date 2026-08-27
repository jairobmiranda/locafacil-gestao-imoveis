import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizMonorepo = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Sem isso o trace do standalone nao enxerga os pacotes do workspace.
  outputFileTracingRoot: raizMonorepo,
  transpilePackages: ['@locafacil/contracts'],
  reactStrictMode: true,
};

export default nextConfig;
