import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UsuarioAutenticado } from '@locafacil/contracts';
import { apiGet } from '@/lib/api';
import { sair } from '../login/acoes';
import { LinkNavegacao } from './link-navegacao';
import { MenuUsuario } from './menu-usuario';
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

        <div className="area-usuario">
          <MenuUsuario nome={usuario.nome} perfil={usuario.perfil} aoSair={sair} />
        </div>
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

        <div className="area-usuario">
          <MenuUsuario nome={usuario.nome} perfil={usuario.perfil} aoSair={sair} />
        </div>
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
