import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';

const raizMonorepo = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

// O .env fica na raiz do monorepo; sem isso o Next so leria apps/web/.env.
nextEnv.loadEnvConfig(raizMonorepo, process.env.NODE_ENV !== 'production');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Sem isso o trace do standalone nao enxerga os pacotes do workspace.
  outputFileTracingRoot: raizMonorepo,
  transpilePackages: ['@locafacil/contracts'],
  reactStrictMode: true,
};

export default nextConfig;
