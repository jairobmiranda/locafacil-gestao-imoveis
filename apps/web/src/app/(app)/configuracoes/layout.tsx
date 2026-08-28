import type { ReactNode } from 'react';
import type { UsuarioAutenticado } from '@locafacil/contracts';
import { apiGet } from '@/lib/api';
import { LinkNavegacao } from '../link-navegacao';

const ABAS = [
  { href: '/configuracoes/pix', rotulo: 'Chaves Pix' },
  { href: '/configuracoes/categorias', rotulo: 'Categorias' },
  { href: '/configuracoes/modelos', rotulo: 'Modelos de e-mail' },
  { href: '/configuracoes/regua', rotulo: 'Régua de cobrança' },
  { href: '/configuracoes/notificacoes', rotulo: 'Envios' },
  { href: '/configuracoes/usuarios', rotulo: 'Usuários', somenteAdmin: true },
];

export default async function LayoutConfiguracoes({ children }: { children: ReactNode }) {
  const usuario = await apiGet<UsuarioAutenticado>('/auth/eu');
  const abas = ABAS.filter((aba) => !aba.somenteAdmin || usuario.perfil === 'ADMIN');

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Configurações</h1>
          <p className="texto-suave">
            Pix, categorias, modelos de e-mail, automação da cobrança e usuários
          </p>
        </div>
      </div>

      <nav className="abas">
        {abas.map((aba) => (
          <LinkNavegacao key={aba.href} href={aba.href}>
            {aba.rotulo}
          </LinkNavegacao>
        ))}
      </nav>

      {children}
    </>
  );
}
