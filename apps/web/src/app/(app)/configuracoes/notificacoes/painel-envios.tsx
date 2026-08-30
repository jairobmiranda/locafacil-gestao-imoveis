'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { formatarDataHora } from '@/lib/formato';
import {
  agendarRegua,
  cancelarNotificacao,
  processarFila,
  reenviarNotificacao,
  salvarEmailsGestor,
  salvarParametrosCobranca,
  testarEmail,
  type EstadoFormulario,
} from '../acoes';

type Notificacao = {
  id: string;
  lancamentoId: string | null;
  ocorrencia: number;
  destinatario: string;
  assunto: string;
  agendadoPara: string;
  enviadoEm: string | null;
  situacao: string;
  tentativas: number;
  mensagemErro: string | null;
};

function BotaoTeste() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao" disabled={pending}>
      {pending ? 'Enviando...' : 'Enviar teste'}
    </button>
  );
}

function BotaoSalvar() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  );
}

export function PainelEnvios({
  notificacoes,
  pendentes,
  envioAtivo,
  emailsGestor,
  maximoEmailsDia,
}: {
  notificacoes: Notificacao[];
  pendentes: Notificacao[];
  envioAtivo: boolean;
  emailsGestor: string[];
  maximoEmailsDia: number;
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(testarEmail, {});
  const [estadoGestor, acaoGestor] = useActionState<EstadoFormulario, FormData>(
    salvarEmailsGestor,
    {},
  );
  const [estadoParametros, acaoParametros] = useActionState<EstadoFormulario, FormData>(
    salvarParametrosCobranca,
    {},
  );
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

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
      {!envioAtivo ? (
        <p className="aviso">
          O envio está desligado (<code>EMAIL_ENVIO_ATIVO=false</code>). As mensagens são apenas
          registradas no log do servidor, nada sai de verdade.
        </p>
      ) : null}

      <div className="cartao formulario">
        <div className="cabecalho-secao">
          <h2>Disparo manual</h2>
        </div>

        <p className="texto-suave">
          Os agendadores rodam sozinhos quando <code>CRONS_ATIVOS=true</code>. Use os botões abaixo
          para executar na hora.
        </p>

        <div className="acoes-cabecalho" style={{ justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="botao"
            disabled={pendente}
            onClick={() => executar(agendarRegua)}
          >
            Executar régua
          </button>
          <button
            type="button"
            className="botao"
            disabled={pendente}
            onClick={() => executar(processarFila)}
          >
            Processar fila
          </button>
        </div>

        {erro ? <p className="alerta-erro">{erro}</p> : null}
      </div>

      <form action={acaoParametros} className="cartao formulario">
        <div className="cabecalho-secao">
          <h2>Limite de cobranças</h2>
        </div>

        <p className="texto-suave">
          Quando o inquilino tem várias parcelas em aberto, a régua agenda uma cobrança para cada
          uma. Este limite evita a enxurrada: o que passar do teto espera o dia seguinte.
        </p>

        <div className="linha-teste">
          <label className="campo">
            Máximo por destinatário por dia
            <input
              name="maximoEmailsDia"
              type="number"
              min={1}
              max={10}
              defaultValue={maximoEmailsDia}
            />
          </label>
          <BotaoSalvar />
        </div>

        {estadoParametros.erro ? <p className="alerta-erro">{estadoParametros.erro}</p> : null}
        {estadoParametros.sucesso ? (
          <p className="alerta-sucesso">{estadoParametros.sucesso}</p>
        ) : null}
      </form>

      <form action={acaoGestor} className="cartao formulario">
        <div className="cabecalho-secao">
          <h2>Avisos internos</h2>
        </div>

        <p className="texto-suave">
          Quem recebe os avisos da gestão, como o pagamento informado pelo inquilino no link
          público. Separe vários endereços por ponto e vírgula.
        </p>

        <div className="linha-teste">
          <label className={estadoGestor.campos?.emailsGestor ? 'campo com-erro' : 'campo'}>
            Destinatários
            <input
              name="emailsGestor"
              defaultValue={emailsGestor.join('; ')}
              placeholder="financeiro@exemplo.com; voce@exemplo.com"
            />
          </label>
          <BotaoSalvar />
        </div>

        {estadoGestor.erro ? <p className="alerta-erro">{estadoGestor.erro}</p> : null}
        {estadoGestor.sucesso ? <p className="alerta-sucesso">{estadoGestor.sucesso}</p> : null}
      </form>

      <form action={acao} className="cartao formulario">
        <div className="cabecalho-secao">
          <h2>Testar configuração SMTP</h2>
        </div>

        <div className="linha-teste">
          <label className="campo">
            Destinatário
            <input name="destinatario" type="email" required placeholder="voce@exemplo.com" />
          </label>
          <BotaoTeste />
        </div>

        {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
        {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}
      </form>

      <section>
        <div className="cabecalho-secao">
          <h2>Fila pendente</h2>
          <span className="texto-suave">{pendentes.length} aguardando envio</span>
        </div>

        {pendentes.length === 0 ? (
          <div className="cartao vazio">
            <p>Nada na fila.</p>
          </div>
        ) : (
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Destinatário</th>
                  <th>Assunto</th>
                  <th>Agendado</th>
                  <th>Tentativas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendentes.map((notificacao) => (
                  <tr key={notificacao.id}>
                    <td>{notificacao.destinatario}</td>
                    <td data-label="Assunto">
                      {notificacao.assunto}
                      {notificacao.ocorrencia > 1 ? ` (${notificacao.ocorrencia}ª cobrança)` : ''}
                      {notificacao.mensagemErro ? (
                        <small className="texto-suave">{notificacao.mensagemErro}</small>
                      ) : null}
                    </td>
                    <td data-label="Agendado">{formatarDataHora(notificacao.agendadoPara)}</td>
                    <td data-label="Tentativas">{notificacao.tentativas}</td>
                    <td className="direita">
                      <button
                        type="button"
                        className="botao botao-texto"
                        disabled={pendente}
                        onClick={() =>
                          executar(
                            () => cancelarNotificacao(notificacao.id),
                            'Cancelar esta notificação? Ela não será enviada.',
                          )
                        }
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="cabecalho-secao">
          <h2>Últimos envios</h2>
        </div>

        {notificacoes.length === 0 ? (
          <div className="cartao vazio">
            <p>Nenhuma notificação registrada.</p>
          </div>
        ) : (
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Destinatário</th>
                  <th>Assunto</th>
                  <th>Agendado</th>
                  <th>Enviado</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {notificacoes.map((notificacao) => (
                  <tr key={notificacao.id}>
                    <td>{notificacao.destinatario}</td>
                    <td data-label="Assunto">
                      {notificacao.assunto}
                      {notificacao.ocorrencia > 1 ? ` (${notificacao.ocorrencia}ª cobrança)` : ''}
                      {notificacao.mensagemErro ? (
                        <small className="texto-suave">{notificacao.mensagemErro}</small>
                      ) : null}
                    </td>
                    <td data-label="Agendado">{formatarDataHora(notificacao.agendadoPara)}</td>
                    <td data-label="Enviado">{formatarDataHora(notificacao.enviadoEm)}</td>
                    <td data-label="Situação">
                      <span className={`etiqueta situacao-${notificacao.situacao.toLowerCase()}`}>
                        {notificacao.situacao}
                      </span>
                    </td>
                    <td className="direita">
                      {notificacao.situacao === 'FALHOU' ? (
                        <button
                          type="button"
                          className="botao botao-texto"
                          disabled={pendente}
                          onClick={() => executar(() => reenviarNotificacao(notificacao.id))}
                        >
                          Reenviar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
