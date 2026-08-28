'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function LinkNavegacao({
  href,
  icone,
  variante = 'menu',
  children,
}: {
  href: string;
  icone?: ReactNode;
  variante?: 'menu' | 'aba';
  children: ReactNode;
}) {
  const caminho = usePathname();
  const ativo = caminho.startsWith(href);
  const base = variante === 'aba' ? 'item-aba' : 'item-menu';

  return (
    <Link
      href={href}
      className={ativo ? `${base} ativo` : base}
      aria-current={ativo ? 'page' : undefined}
    >
      {icone}
      <span>{children}</span>
    </Link>
  );
}
