'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { alternarRegraAtiva, criarRegra, removerRegra, type EstadoFormulario } from '../acoes';

type Regra = {
  id: string;
  sequencia: number;
  diasOffset: number;
  intervaloRepeticaoDias: number | null;
  maximoRepeticoes: number | null;
  horaEnvio: string;
  apenasSeSituacao: string | null;
  ativa: boolean;
  modeloEmail: { id: string; nome: string };
};

type Regua = {
  id: string;
  nome: string;
  padrao: boolean;
  ativa: boolean;
  regras: Regra[];
};

function descreverMomento(regra: Regra): string {
  const base =
    regra.diasOffset < 0
      ? `${Math.abs(regra.diasOffset)} dia(s) antes do vencimento`
      : regra.diasOffset === 0
        ? 'no dia do vencimento'
        : `${regra.diasOffset} dia(s) após o vencimento`;

  if (!regra.intervaloRepeticaoDias) {
    return base;
  }

  const teto = regra.maximoRepeticoes ? `, até ${regra.maximoRepeticoes}x` : '';

  return `${base}, repetindo a cada ${regra.intervaloRepeticaoDias} dia(s)${teto}`;
}

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Adicionando...' : 'Adicionar etapa'}
    </button>
  );
}

export function EditorRegua({
  reguas,
  modelos,
}: {
  reguas: Regua[];
  modelos: { id: string; nome: string }[];
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(criarRegra, {});
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  const regua = reguas.find((item) => item.padrao) ?? reguas[0];

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

  if (!regua) {
    return (
      <p className="aviso">
        Nenhuma régua cadastrada. Rode o seed do banco para criar a régua padrão.
      </p>
    );
  }

  const proximaSequencia = Math.max(0, ...regua.regras.map((regra) => regra.sequencia)) + 1;

  return (
    <>
      <div className="cartao">
        <div className="cabecalho-secao">
          <h2>{regua.nome}</h2>
          {regua.padrao ? <span className="etiqueta situacao-ativo">padrão</span> : null}
        </div>

        {regua.regras.length === 0 ? (
          <p className="texto-suave">Nenhuma etapa configurada.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>#</th>
                <th>Quando</th>
                <th>Modelo</th>
                <th>Hora</th>
                <th>Condição</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {regua.regras.map((regra) => (
                <tr key={regra.id} className={regra.ativa ? undefined : 'inativo'}>
                  <td>{regra.sequencia}</td>
                  <td>{descreverMomento(regra)}</td>
                  <td>{regra.modeloEmail.nome}</td>
                  <td>{regra.horaEnvio}</td>
                  <td>{regra.apenasSeSituacao ?? 'qualquer'}</td>
                  <td className="direita acoes-linha">
                    <button
                      type="button"
                      className="botao botao-texto"
                      disabled={pendente}
                      onClick={() => executar(() => alternarRegraAtiva(regra.id, !regra.ativa))}
                    >
                      {regra.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      className="botao botao-texto"
                      disabled={pendente}
                      onClick={() =>
                        executar(() => removerRegra(regra.id), 'Remover esta etapa da régua?')
                      }
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {erro ? <p className="alerta-erro">{erro}</p> : null}

      <section>
        <div className="cabecalho-secao">
          <h2>Nova etapa</h2>
        </div>

        <form action={acao} className="cartao formulario">
          <input type="hidden" name="reguaId" value={regua.id} />

          <div className="grade">
            <label className="campo">
              Sequência
              <input name="sequencia" type="number" min={1} defaultValue={proximaSequencia} />
            </label>

            <label className={estado.campos?.diasOffset ? 'campo com-erro' : 'campo'}>
              Dias em relação ao vencimento
              <input name="diasOffset" type="number" defaultValue={0} required />
              <small className="texto-suave">Negativo antes, 0 no dia, positivo em atraso</small>
            </label>

            <label className="campo">
              Modelo de e-mail
              <select name="modeloEmailId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {modelos.map((modelo) => (
                  <option key={modelo.id} value={modelo.id}>
                    {modelo.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              Hora do envio
              <input name="horaEnvio" type="time" defaultValue="09:00" />
            </label>

            <label className="campo">
              Repetir a cada (dias)
              <input name="intervaloRepeticaoDias" type="number" min={1} placeholder="não repete" />
            </label>

            <label className="campo">
              Máximo de repetições
              <input name="maximoRepeticoes" type="number" min={1} placeholder="sem limite" />
            </label>

            <label className="campo">
              Só se a situação for
              <select name="apenasSeSituacao" defaultValue="">
                <option value="">Qualquer</option>
                <option value="PENDENTE">Pendente</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
            </label>
          </div>

          {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
          {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}

          <div className="acoes-formulario">
            <Botao />
          </div>
        </form>
      </section>
    </>
  );
}
