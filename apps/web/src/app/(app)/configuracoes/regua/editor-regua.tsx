'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  alternarRegraAtiva,
  criarRegua,
  removerRegra,
  salvarRegra,
  type EstadoFormulario,
} from '../acoes';

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

function Botao({ edicao }: { edicao: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : edicao ? 'Salvar etapa' : 'Adicionar etapa'}
    </button>
  );
}

function BotaoRegua() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Criando...' : 'Criar régua'}
    </button>
  );
}

function FormularioRegua({
  estado,
  acao,
  primeira,
  aoCancelar,
}: {
  estado: EstadoFormulario;
  acao: (dados: FormData) => void;
  primeira: boolean;
  aoCancelar?: () => void;
}) {
  return (
    <section>
      <div className="cabecalho-secao">
        <h2>Nova régua</h2>
      </div>

      <form action={acao} className="cartao formulario">
        {primeira ? (
          <p className="texto-suave">
            Nenhuma régua cadastrada. Crie uma para depois configurar as etapas de cobrança.
          </p>
        ) : null}

        <label className={estado.campos?.nome ? 'campo com-erro' : 'campo'}>
          Nome
          <input name="nome" required maxLength={100} placeholder="Régua padrão" />
        </label>

        <label className="campo-inline">
          <input type="checkbox" name="padrao" defaultChecked={primeira} />
          <span>Usar como padrão nos contratos sem régua própria</span>
        </label>

        {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
        {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}

        <div className="acoes-formulario">
          {aoCancelar ? (
            <button type="button" className="botao" onClick={aoCancelar}>
              Fechar
            </button>
          ) : null}
          <BotaoRegua />
        </div>
      </form>
    </section>
  );
}

export function EditorRegua({
  reguas,
  modelos,
}: {
  reguas: Regua[];
  modelos: { id: string; nome: string }[];
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarRegra, {});
  const [estadoRegua, acaoRegua] = useActionState<EstadoFormulario, FormData>(criarRegua, {});
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  const [selecionada, setSelecionada] = useState<string>();
  const [criandoRegua, setCriandoRegua] = useState(false);
  const [edicaoId, setEdicaoId] = useState<string>();

  const regua =
    reguas.find((item) => item.id === selecionada) ??
    reguas.find((item) => item.padrao) ??
    reguas[0];

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
    return <FormularioRegua estado={estadoRegua} acao={acaoRegua} primeira />;
  }

  const { id: reguaId, regras } = regua;
  const emEdicao = regras.find((regra) => regra.id === edicaoId);

  return (
    <>
      <div className="cabecalho-pagina">
        <label className="campo">
          Régua
          <select value={regua.id} onChange={(evento) => setSelecionada(evento.target.value)}>
            {reguas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
                {item.padrao ? ' (padrão)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="botao" onClick={() => setCriandoRegua((atual) => !atual)}>
          {criandoRegua ? 'Cancelar' : 'Nova régua'}
        </button>
      </div>

      {criandoRegua ? (
        <FormularioRegua
          estado={estadoRegua}
          acao={acaoRegua}
          primeira={false}
          aoCancelar={() => setCriandoRegua(false)}
        />
      ) : null}

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
                  <td data-label="#">{regra.sequencia}</td>
                  <td data-label="Quando">{descreverMomento(regra)}</td>
                  <td data-label="Modelo">{regra.modeloEmail.nome}</td>
                  <td data-label="Hora">{regra.horaEnvio}</td>
                  <td data-label="Condição">{regra.apenasSeSituacao ?? 'qualquer'}</td>
                  <td className="direita acoes-linha">
                    <button
                      type="button"
                      className="botao botao-texto"
                      disabled={pendente}
                      onClick={() => setEdicaoId(regra.id)}
                    >
                      Editar
                    </button>
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
          <h2>{emEdicao ? `Etapa ${emEdicao.sequencia}` : 'Nova etapa'}</h2>
        </div>

        <form action={acao} className="cartao formulario" key={emEdicao?.id ?? 'nova'}>
          <input type="hidden" name="reguaId" value={regua.id} />
          {emEdicao ? <input type="hidden" name="id" value={emEdicao.id} /> : null}

          <div className="grade">
            <label className={estado.campos?.diasOffset ? 'campo com-erro' : 'campo'}>
              Dias em relação ao vencimento
              <input
                name="diasOffset"
                type="number"
                defaultValue={emEdicao?.diasOffset ?? 0}
                required
              />
              <small className="texto-suave">
                Negativo antes, 0 no dia, positivo em atraso. A ordem das etapas segue esse valor.
              </small>
            </label>

            <label className="campo">
              Modelo de e-mail
              <select
                name="modeloEmailId"
                required
                defaultValue={emEdicao?.modeloEmail.id ?? ''}
              >
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
              <input name="horaEnvio" type="time" defaultValue={emEdicao?.horaEnvio ?? '09:00'} />
            </label>

            <label className="campo">
              Repetir a cada (dias)
              <input
                name="intervaloRepeticaoDias"
                type="number"
                min={1}
                placeholder="não repete"
                defaultValue={emEdicao?.intervaloRepeticaoDias ?? ''}
              />
            </label>

            <label className="campo">
              Máximo de repetições
              <input
                name="maximoRepeticoes"
                type="number"
                min={1}
                placeholder="sem limite"
                defaultValue={emEdicao?.maximoRepeticoes ?? ''}
              />
            </label>

            <label className="campo">
              Só se a situação for
              <select name="apenasSeSituacao" defaultValue={emEdicao?.apenasSeSituacao ?? ''}>
                <option value="">Qualquer</option>
                <option value="PENDENTE">Pendente</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
            </label>
          </div>

          {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
          {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}

          <div className="acoes-formulario">
            {emEdicao ? (
              <button type="button" className="botao" onClick={() => setEdicaoId(undefined)}>
                Cancelar
              </button>
            ) : null}
            <Botao edicao={Boolean(emEdicao)} />
          </div>
        </form>
      </section>
    </>
  );
}
