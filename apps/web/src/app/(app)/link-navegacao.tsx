'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function LinkNavegacao({ href, children }: { href: string; children: ReactNode }) {
  const caminho = usePathname();
  const ativo = caminho.startsWith(href);

  return (
    <Link href={href} className={ativo ? 'item-menu ativo' : 'item-menu'}>
      {children}
    </Link>
  );
}
