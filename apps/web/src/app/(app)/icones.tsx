import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

const base: Props = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function IconeVisaoGeral(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 13h5v8H3zM9.5 3h5v18h-5zM16 9h5v12h-5z" />
    </svg>
  );
}

export function IconeImoveis(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.7V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.7" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function IconeLancamentos(props: Props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19" />
      <path d="M6.5 14.5h4" />
    </svg>
  );
}

export function IconeContratos(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 2.75h7.5L19 8.25V21a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75V3.5A.75.75 0 0 1 6 2.75Z" />
      <path d="M13.25 3v5.25H18.5" />
      <path d="M8.5 13.5h7M8.5 17h4.5" />
    </svg>
  );
}

export function IconePessoas(props: Props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M2.75 20.25a6.75 6.75 0 0 1 13.5 0" />
      <path d="M16.5 5.2a3.5 3.5 0 0 1 0 6.6" />
      <path d="M18 14.4a5.5 5.5 0 0 1 3.25 5" />
    </svg>
  );
}

export function IconeConfiguracoes(props: Props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a1.9 1.9 0 1 1-2.69 2.69l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1.04-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.69-2.69l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.46-1.04 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.69-2.69l.06.06a1.6 1.6 0 0 0 1.77.32H8.8a1.6 1.6 0 0 0 .97-1.47V3a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.9 1.9 0 1 1 2.69 2.69l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97H21a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.47.97Z" />
    </svg>
  );
}
