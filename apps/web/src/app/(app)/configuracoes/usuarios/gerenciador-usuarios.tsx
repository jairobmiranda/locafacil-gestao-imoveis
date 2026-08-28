'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { formatarData } from '@/lib/formato';
import {
  alterarPerfilUsuario,
  alternarUsuarioAtivo,
  criarUsuario,
  redefinirSenhaUsuario,
  type EstadoFormulario,
} from '../acoes';

export type UsuarioLista = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  criadoEm: string;
};

const PERFIS = [
  { valor: 'ADMIN', rotulo: 'Administrador', dica: 'Acesso total, inclusive a usuários' },
  { valor: 'OPERADOR', rotulo: 'Operador', dica: 'Cadastra e movimenta, sem gerenciar usuários' },
  { valor: 'LEITURA', rotulo: 'Leitura', dica: 'Apenas consulta' },
];

function Botao({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : rotulo}
    </button>
  );
}

export function GerenciadorUsuarios({
  usuarios,
  usuarioAtualId,
}: {
  usuarios: UsuarioLista[];
  usuarioAtualId: string;
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(criarUsuario, {});
  const [estadoSenha, acaoSenha] = useActionState<EstadoFormulario, FormData>(
    redefinirSenhaUsuario,
    {},
  );
  const [perfil, setPerfil] = useState('OPERADOR');
  const [redefinindo, setRedefinindo] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  const dica = PERFIS.find((item) => item.valor === perfil)?.dica;

  function executar(operacao: () => Promise<void>, confirmacao?: string) {
    if (confirmacao && !confirm(confirmacao)) {
      return;
    }

    setErro(undefined);
    iniciar(async () => {
      try {
        await operacao();
      } catch (falha) {
        setErro((falha as Error).message);
      }
    });
  }

  return (
    <>
      <div className="cartao">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Criado em</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className={usuario.ativo ? undefined : 'inativo'}>
                <td data-label="Nome">
                  {usuario.nome}
                  {usuario.id === usuarioAtualId ? (
                    <span className="etiqueta situacao-ativo"> você</span>
                  ) : null}
                </td>
                <td data-label="E-mail">{usuario.email}</td>
                <td data-label="Perfil">
                  <select
                    value={usuario.perfil}
                    disabled={pendente || usuario.id === usuarioAtualId}
                    onChange={(evento) =>
                      executar(() => alterarPerfilUsuario(usuario.id, evento.target.value))
                    }
                  >
                    {PERFIS.map((item) => (
                      <option key={item.valor} value={item.valor}>
                        {item.rotulo}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Criado em">{formatarData(usuario.criadoEm)}</td>
                <td className="direita acoes-linha">
                  <button
                    type="button"
                    className="botao botao-texto"
                    onClick={() =>
                      setRedefinindo(redefinindo === usuario.id ? undefined : usuario.id)
                    }
                  >
                    Redefinir senha
                  </button>
                  <button
                    type="button"
                    className="botao botao-texto"
                    disabled={pendente || usuario.id === usuarioAtualId}
                    onClick={() =>
                      executar(
                        () => alternarUsuarioAtivo(usuario.id, !usuario.ativo),
                        usuario.ativo
                          ? `Inativar ${usuario.nome}? A pessoa perde o acesso imediatamente.`
                          : undefined,
                      )
                    }
                  >
                    {usuario.ativo ? 'Inativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {erro ? <p className="alerta-erro">{erro}</p> : null}

      {redefinindo ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Nova senha</h2>
          </div>

          <form action={acaoSenha} className="cartao formulario">
            <input type="hidden" name="id" value={redefinindo} />

            <label className="campo">
              Senha
              <input type="password" name="senha" minLength={8} required autoComplete="new-password" />
              <small className="texto-suave">Mínimo de 8 caracteres</small>
            </label>

            {estadoSenha.erro ? <p className="alerta-erro">{estadoSenha.erro}</p> : null}
            {estadoSenha.sucesso ? <p className="alerta-sucesso">{estadoSenha.sucesso}</p> : null}

            <div className="acoes-formulario">
              <button
                type="button"
                className="botao botao-texto"
                onClick={() => setRedefinindo(undefined)}
              >
                Cancelar
              </button>
              <Botao rotulo="Redefinir senha" />
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <div className="cabecalho-secao">
          <h2>Novo usuário</h2>
        </div>

        <form action={acao} className="cartao formulario">
          <div className="grade">
            <label className={estado.campos?.nome ? 'campo com-erro' : 'campo'}>
              Nome
              <input name="nome" maxLength={150} required />
              {estado.campos?.nome ? (
                <span className="mensagem-campo">{estado.campos.nome}</span>
              ) : null}
            </label>

            <label className={estado.campos?.email ? 'campo com-erro' : 'campo'}>
              E-mail
              <input type="email" name="email" maxLength={150} required />
              {estado.campos?.email ? (
                <span className="mensagem-campo">{estado.campos.email}</span>
              ) : null}
            </label>

            <label className={estado.campos?.senha ? 'campo com-erro' : 'campo'}>
              Senha
              <input
                type="password"
                name="senha"
                minLength={8}
                required
                autoComplete="new-password"
              />
              <small className="texto-suave">Mínimo de 8 caracteres</small>
              {estado.campos?.senha ? (
                <span className="mensagem-campo">{estado.campos.senha}</span>
              ) : null}
            </label>

            <label className="campo">
              Perfil
              <select
                name="perfil"
                value={perfil}
                onChange={(evento) => setPerfil(evento.target.value)}
              >
                {PERFIS.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </select>
              <small className="texto-suave">{dica}</small>
            </label>
          </div>

          {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
          {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}

          <div className="acoes-formulario">
            <Botao rotulo="Cadastrar usuário" />
          </div>
        </form>
      </section>
    </>
  );
}
