'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { formatarData } from '@/lib/formato';
import { removerFeriado, salvarFeriado, type EstadoFormulario } from '../acoes';

export type Feriado = {
  id: string;
  data: string;
  descricao: string;
};

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** A data vem como `AAAA-MM-DD...`; o input date usa exatamente esse recorte. */
function paraCampo(data: string): string {
  return data.slice(0, 10);
}

function diaDaSemana(data: string): string {
  const [ano, mes, dia] = paraCampo(data).split('-').map(Number);

  return DIAS[new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1)).getUTCDay()] ?? '';
}

function Botao({ novo }: { novo: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : novo ? 'Cadastrar feriado' : 'Salvar alterações'}
    </button>
  );
}

export function GerenciadorFeriados({ feriados }: { feriados: Feriado[] }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarFeriado, {});
  const [selecionado, setSelecionado] = useState('');
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  const emEdicao = feriados.find((item) => item.id === selecionado);
  const novo = emEdicao === undefined;

  function excluir(id: string) {
    if (!confirm('Excluir o feriado?')) {
      return;
    }

    setErro(undefined);
    iniciar(async () => {
      try {
        setSelecionado('');
        await removerFeriado(id);
      } catch (falha) {
        setErro((falha as Error).message);
      }
    });
  }

  return (
    <>
      <section>
        <div className="cabecalho-secao">
          <h2>Feriados</h2>
        </div>

        <p className="texto-suave">
          Sábados e domingos já são reconhecidos automaticamente: o vencimento que cai no fim de
          semana só passa a render multa e juros a partir da segunda-feira. Cadastre aqui apenas os
          feriados que caírem em dia de semana.
        </p>

        <div className="cartao">
          {feriados.length === 0 ? (
            <p className="texto-suave">Nenhum feriado cadastrado.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Dia da semana</th>
                  <th>Descrição</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {feriados.map((feriado) => (
                  <tr key={feriado.id}>
                    <td data-label="Data">{formatarData(feriado.data)}</td>
                    <td data-label="Dia da semana">{diaDaSemana(feriado.data)}</td>
                    <td data-label="Descrição">{feriado.descricao}</td>
                    <td className="direita acoes-linha">
                      <button
                        type="button"
                        className="botao botao-texto"
                        onClick={() => setSelecionado(feriado.id)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="botao botao-texto"
                        disabled={pendente}
                        onClick={() => excluir(feriado.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {erro ? <p className="alerta-erro">{erro}</p> : null}

      <section>
        <div className="cabecalho-secao">
          <h2>{novo ? 'Novo feriado' : `Editando ${emEdicao.descricao}`}</h2>
          {novo ? null : (
            <button type="button" className="botao botao-texto" onClick={() => setSelecionado('')}>
              Cancelar edição
            </button>
          )}
        </div>

        <form action={acao} className="cartao formulario" key={selecionado}>
          {emEdicao ? <input type="hidden" name="id" value={emEdicao.id} /> : null}

          <div className="grade">
            <label className={estado.campos?.data ? 'campo com-erro' : 'campo'}>
              Data
              <input
                type="date"
                name="data"
                defaultValue={emEdicao ? paraCampo(emEdicao.data) : undefined}
                required
              />
              {estado.campos?.data ? (
                <span className="mensagem-campo">{estado.campos.data}</span>
              ) : null}
            </label>

            <label className={estado.campos?.descricao ? 'campo com-erro' : 'campo'}>
              Descrição
              <input
                name="descricao"
                defaultValue={emEdicao?.descricao}
                required
                maxLength={120}
                placeholder="Ex.: Padroeira de Goiânia"
              />
              {estado.campos?.descricao ? (
                <span className="mensagem-campo">{estado.campos.descricao}</span>
              ) : null}
            </label>
          </div>

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
