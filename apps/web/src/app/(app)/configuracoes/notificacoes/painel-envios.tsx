'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { formatarData } from '@/lib/formato';
import {
  agendarRegua,
  processarFila,
  reenviarNotificacao,
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

export function PainelEnvios({
  notificacoes,
  envioAtivo,
}: {
  notificacoes: Notificacao[];
  envioAtivo: boolean;
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(testarEmail, {});
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  function executar(operacao: () => Promise<void>) {
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
                    <td>
                      {notificacao.assunto}
                      {notificacao.ocorrencia > 1 ? ` (${notificacao.ocorrencia}ª cobrança)` : ''}
                      {notificacao.mensagemErro ? (
                        <small className="texto-suave">{notificacao.mensagemErro}</small>
                      ) : null}
                    </td>
                    <td>{formatarData(notificacao.agendadoPara)}</td>
                    <td>{formatarData(notificacao.enviadoEm)}</td>
                    <td>
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
