import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UsuarioAutenticado } from '@locafacil/contracts';
import { apiGet } from '@/lib/api';
import { sair } from '../login/acoes';
import { LinkNavegacao } from './link-navegacao';
import {
  IconeConfiguracoes,
  IconeContratos,
  IconeImoveis,
  IconeLancamentos,
  IconePessoas,
  IconeVisaoGeral,
  IconeVistorias,
} from './icones';

const MENU = [
  { href: '/dashboard', rotulo: 'Visão geral', rotuloCurto: 'Início', Icone: IconeVisaoGeral },
  { href: '/imoveis', rotulo: 'Imóveis', rotuloCurto: 'Imóveis', Icone: IconeImoveis },
  {
    href: '/lancamentos',
    rotulo: 'Lançamentos',
    rotuloCurto: 'Lanç.',
    Icone: IconeLancamentos,
  },
  { href: '/contratos', rotulo: 'Contratos', rotuloCurto: 'Contratos', Icone: IconeContratos },
  { href: '/vistorias', rotulo: 'Vistorias', rotuloCurto: 'Vistoria', Icone: IconeVistorias },
  { href: '/pessoas', rotulo: 'Pessoas', rotuloCurto: 'Pessoas', Icone: IconePessoas },
  {
    href: '/configuracoes',
    rotulo: 'Configurações',
    rotuloCurto: 'Config.',
    Icone: IconeConfiguracoes,
  },
];

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const usuario = await apiGet<UsuarioAutenticado>('/auth/eu');

  return (
    <div className="aplicacao">
      <aside className="lateral">
        <Link href="/dashboard" className="marca">
          LocaFácil
        </Link>

        <nav className="menu menu-lateral" aria-label="Navegação principal">
          {MENU.map(({ href, rotulo, Icone }) => (
            <LinkNavegacao key={href} href={href} icone={<Icone />}>
              {rotulo}
            </LinkNavegacao>
          ))}
        </nav>

        <form action={sair} className="area-usuario">
          <span className="texto-suave">{usuario.nome}</span>
          <button type="submit" className="botao botao-texto">
            Sair
          </button>
        </form>
      </aside>

      <header className="cabecalho">
        <Link href="/dashboard" className="marca">
          LocaFácil
        </Link>

        <nav className="menu" aria-label="Navegação principal">
          {MENU.map(({ href, rotulo, Icone }) => (
            <LinkNavegacao key={href} href={href} icone={<Icone />}>
              {rotulo}
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

      <div className="barra-abas">
        <nav aria-label="Navegação principal">
          {MENU.map(({ href, rotuloCurto, Icone }) => (
            <LinkNavegacao key={href} href={href} variante="aba" icone={<Icone />}>
              {rotuloCurto}
            </LinkNavegacao>
          ))}
        </nav>
      </div>
    </div>
  );
}
