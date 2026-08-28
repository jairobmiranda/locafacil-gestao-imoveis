'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  alternarCategoriaAtiva,
  removerCategoria,
  salvarCategoria,
  type EstadoFormulario,
} from '../acoes';

export type Categoria = {
  id: string;
  nome: string;
  natureza: 'ENTRADA' | 'SAIDA';
  categoriaPaiId: string | null;
  capitalizavelPadrao: boolean;
  codigoFiscal: string | null;
  doSistema: boolean;
  ativa: boolean;
};

const NATUREZAS = [
  { valor: 'SAIDA', rotulo: 'Saída' },
  { valor: 'ENTRADA', rotulo: 'Entrada' },
] as const;

function Botao({ novo }: { novo: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : novo ? 'Cadastrar categoria' : 'Salvar alterações'}
    </button>
  );
}

export function GerenciadorCategorias({ categorias }: { categorias: Categoria[] }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarCategoria, {});
  const [selecionado, setSelecionado] = useState('');
  const [natureza, setNatureza] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  const emEdicao = categorias.find((item) => item.id === selecionado);
  const novo = emEdicao === undefined;
  const naturezaAtual = emEdicao?.natureza ?? natureza;

  const nomePorId = new Map(categorias.map((item) => [item.id, item.nome]));
  const paisDisponiveis = categorias.filter(
    (item) => item.natureza === naturezaAtual && item.id !== emEdicao?.id,
  );

  function executar(tarefa: () => Promise<void>, confirmacao?: string) {
    if (confirmacao && !confirm(confirmacao)) {
      return;
    }

    setErro(undefined);
    iniciar(async () => {
      try {
        await tarefa();
      } catch (falha) {
        setErro((falha as Error).message);
      }
    });
  }

  return (
    <>
      {NATUREZAS.map(({ valor, rotulo }) => {
        const lista = categorias.filter((item) => item.natureza === valor);

        if (lista.length === 0) {
          return null;
        }

        return (
          <section key={valor}>
            <div className="cabecalho-secao">
              <h2>{rotulo}</h2>
            </div>

            <div className="cartao">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Categoria pai</th>
                    <th>Capitalizável</th>
                    <th>Código fiscal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((categoria) => (
                    <tr key={categoria.id} className={categoria.ativa ? undefined : 'inativo'}>
                      <td data-label="Nome">
                        {categoria.nome}
                        {categoria.doSistema ? (
                          <span className="etiqueta"> do sistema</span>
                        ) : null}
                      </td>
                      <td data-label="Categoria pai">
                        {categoria.categoriaPaiId
                          ? (nomePorId.get(categoria.categoriaPaiId) ?? '—')
                          : '—'}
                      </td>
                      <td data-label="Capitalizável">
                        {categoria.capitalizavelPadrao ? 'Sim' : 'Não'}
                      </td>
                      <td data-label="Código fiscal">{categoria.codigoFiscal ?? '—'}</td>
                      <td className="direita acoes-linha">
                        <button
                          type="button"
                          className="botao botao-texto"
                          onClick={() => setSelecionado(categoria.id)}
                        >
                          Editar
                        </button>
                        {categoria.doSistema ? null : (
                          <>
                            <button
                              type="button"
                              className="botao botao-texto"
                              disabled={pendente}
                              onClick={() =>
                                executar(() =>
                                  alternarCategoriaAtiva(categoria.id, !categoria.ativa),
                                )
                              }
                            >
                              {categoria.ativa ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              type="button"
                              className="botao botao-texto"
                              disabled={pendente}
                              onClick={() =>
                                executar(() => {
                                  setSelecionado('');
                                  return removerCategoria(categoria.id);
                                }, 'Excluir a categoria? Só é possível se ela ainda não tiver sido usada.')
                              }
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {erro ? <p className="alerta-erro">{erro}</p> : null}

      <section>
        <div className="cabecalho-secao">
          <h2>{novo ? 'Nova categoria' : `Editando ${emEdicao.nome}`}</h2>
          {novo ? null : (
            <button type="button" className="botao botao-texto" onClick={() => setSelecionado('')}>
              Cancelar edição
            </button>
          )}
        </div>

        <form action={acao} className="cartao formulario" key={selecionado}>
          {emEdicao ? <input type="hidden" name="id" value={emEdicao.id} /> : null}

          <div className="grade">
            <label className={estado.campos?.nome ? 'campo com-erro' : 'campo'}>
              Nome
              <input
                name="nome"
                defaultValue={emEdicao?.nome}
                required
                maxLength={80}
                readOnly={emEdicao?.doSistema}
              />
              {emEdicao?.doSistema ? (
                <small className="texto-suave">
                  Categoria do sistema: o nome é usado por rotinas automáticas
                </small>
              ) : null}
              {estado.campos?.nome ? (
                <span className="mensagem-campo">{estado.campos.nome}</span>
              ) : null}
            </label>

            <label className="campo">
              Natureza
              {novo ? (
                <select
                  name="natureza"
                  value={natureza}
                  onChange={(evento) => setNatureza(evento.target.value as 'ENTRADA' | 'SAIDA')}
                >
                  {NATUREZAS.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.rotulo}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={NATUREZAS.find((item) => item.valor === naturezaAtual)?.rotulo}
                  readOnly
                />
              )}
              {novo ? null : (
                <small className="texto-suave">
                  Não pode mudar depois: inverteria o sinal dos lançamentos já registrados
                </small>
              )}
            </label>

            <label className="campo">
              Categoria pai
              <select name="categoriaPaiId" defaultValue={emEdicao?.categoriaPaiId ?? ''}>
                <option value="">Nenhuma</option>
                {paisDisponiveis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              Código fiscal
              <input name="codigoFiscal" defaultValue={emEdicao?.codigoFiscal ?? ''} maxLength={20} />
            </label>
          </div>

          <label className="campo-inline">
            <input
              type="checkbox"
              name="capitalizavelPadrao"
              defaultChecked={emEdicao?.capitalizavelPadrao}
            />
            <span>
              Capitalizável por padrão
              <small className="texto-suave">
                Soma ao custo do imóvel em vez de entrar como despesa do período
              </small>
            </span>
          </label>

          {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
          {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}

          <div className="acoes-formulario">
            <Botao novo={novo} />
          </div>
        </form>
      </section>
    </>
  );
}
