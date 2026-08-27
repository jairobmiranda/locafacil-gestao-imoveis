import type { ReactNode } from 'react';
import { LinkNavegacao } from '../link-navegacao';

const ABAS = [
  { href: '/configuracoes/pix', rotulo: 'Chaves Pix' },
  { href: '/configuracoes/modelos', rotulo: 'Modelos de e-mail' },
  { href: '/configuracoes/regua', rotulo: 'Régua de cobrança' },
  { href: '/configuracoes/notificacoes', rotulo: 'Envios' },
];

export default function LayoutConfiguracoes({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Configurações</h1>
          <p className="texto-suave">Pix, modelos de e-mail e automação da cobrança</p>
        </div>
      </div>

      <nav className="abas">
        {ABAS.map((aba) => (
          <LinkNavegacao key={aba.href} href={aba.href}>
            {aba.rotulo}
          </LinkNavegacao>
        ))}
      </nav>

      {children}
    </>
  );
}
