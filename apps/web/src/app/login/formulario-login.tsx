'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { entrar, type EstadoLogin } from './acoes';

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Entrando...' : 'Entrar'}
    </button>
  );
}

export function FormularioLogin({ proximo, expirada }: { proximo: string; expirada: boolean }) {
  const [estado, acao] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <form action={acao} className="cartao formulario-login">
      <h1>LocaFácil</h1>
      <p className="texto-suave">Gestão de imóveis, contratos e cobrança</p>

      {expirada ? <p className="aviso">Sua sessão expirou. Entre novamente.</p> : null}

      <label>
        E-mail
        <input name="email" type="email" required autoComplete="email" autoFocus />
      </label>

      <label>
        Senha
        <input name="senha" type="password" required autoComplete="current-password" />
      </label>

      <input type="hidden" name="proximo" value={proximo} />

      {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}

      <Botao />
    </form>
  );
}
