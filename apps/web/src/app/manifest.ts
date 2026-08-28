import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LocaFácil',
    short_name: 'LocaFácil',
    description: 'Gestão imobiliária: imóveis, lançamentos, contratos e cobrança',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#305cde',
    lang: 'pt-BR',
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icone-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Lançamentos', url: '/lancamentos' },
      { name: 'Imóveis', url: '/imoveis' },
      { name: 'Contratos', url: '/contratos' },
    ],
  };
}
