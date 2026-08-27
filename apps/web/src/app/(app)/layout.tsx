import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UsuarioAutenticado } from '@locafacil/contracts';
import { apiGet } from '@/lib/api';
import { sair } from '../login/acoes';
import { LinkNavegacao } from './link-navegacao';

const MENU = [
  { href: '/dashboard', rotulo: 'Visão geral' },
  { href: '/imoveis', rotulo: 'Imóveis' },
  { href: '/lancamentos', rotulo: 'Lançamentos' },
  { href: '/contratos', rotulo: 'Contratos' },
  { href: '/pessoas', rotulo: 'Pessoas' },
  { href: '/configuracoes', rotulo: 'Configurações' },
];

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const usuario = await apiGet<UsuarioAutenticado>('/auth/eu');

  return (
    <div className="aplicacao">
      <header className="cabecalho">
        <Link href="/dashboard" className="marca">
          LocaFácil
        </Link>

        <nav className="menu">
          {MENU.map((item) => (
            <LinkNavegacao key={item.href} href={item.href}>
              {item.rotulo}
            </LinkNavegacao>
          ))}
        </nav>

        <form action={sair} className="area-usuario">
          <span className="texto-suave">{usuario.nome}</span>
          <button type="submit" className="botao botao-texto">
            Sair
          </button>
        </form>
      </header>

      <main className="conteudo">{children}</main>
    </div>
  );
}
