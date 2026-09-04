'use client';

import { useActionState, useState } from 'react';
import { salvarAcompanhamento, type EstadoVistoria } from '../acoes';

export type ObservadorOpcao = { email: string; nome: string; papel: string };

export function AcompanhamentoVistoria({
  id,
  observadores,
  avisarInicio: inicioSalvo,
  avisarConclusao: conclusaoSalva,
  emailsSalvos,
  avisoInicioEm,
  avisoConclusaoEm,
}: {
  id: string;
  observadores: ObservadorOpcao[];
  avisarInicio: boolean;
  avisarConclusao: boolean;
  emailsSalvos: string[];
  avisoInicioEm: string | null;
  avisoConclusaoEm: string | null;
}) {
  const [estado, acao, salvando] = useActionState<EstadoVistoria, FormData>(
    salvarAcompanhamento.bind(null, id),
    {},
  );

  // Campos controlados: a action reseta o que ficar solto no formulario.
  const [avisarInicio, setAvisarInicio] = useState(inicioSalvo);
  const [avisarConclusao, setAvisarConclusao] = useState(conclusaoSalva);
  const [marcados, setMarcados] = useState<string[]>(() =>
    emailsSalvos.length > 0
      ? observadores
          .filter((pessoa) =>
            emailsSalvos.some((email) => email.toLowerCase() === pessoa.email.toLowerCase()),
          )
          .map((pessoa) => pessoa.email)
      : [],
  );

  const ligado = avisarInicio || avisarConclusao;

  return (
    <div className="cartao formulario">
      <h2>Acompanhamento</h2>
      <p className="texto-suave">
        Avisos por e-mail sobre o andamento desta vistoria. Vão só para quem você marcar aqui, nunca
        para quem está executando.
      </p>

      <form action={acao} className="formulario">
        <fieldset>
          <legend>Quando avisar</legend>
          <label className="campo-inline">
            <input
              type="checkbox"
              name="avisarInicio"
              checked={avisarInicio}
              onChange={(evento) => setAvisarInicio(evento.target.checked)}
            />
            <span>
              Quando a vistoria começar
              <small className="texto-suave">
                {avisoInicioEm
                  ? `avisado em ${new Date(avisoInicioEm).toLocaleString('pt-BR')}`
                  : 'dispara quando a primeira foto chegar'}
              </small>
            </span>
          </label>
          <label className="campo-inline">
            <input
              type="checkbox"
              name="avisarConclusao"
              checked={avisarConclusao}
              onChange={(evento) => setAvisarConclusao(evento.target.checked)}
            />
            <span>
              Quando a vistoria for concluída
              <small className="texto-suave">
                {avisoConclusaoEm
                  ? `avisado em ${new Date(avisoConclusaoEm).toLocaleString('pt-BR')}`
                  : 'dispara quando o executor enviar tudo'}
              </small>
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Quem recebe</legend>
          <div className="lista-destinatarios">
            {observadores.map((pessoa) => (
              <label className="campo-inline destinatario" key={pessoa.email}>
                <input
                  type="checkbox"
                  name="avisarEmails"
                  value={pessoa.email}
                  checked={marcados.includes(pessoa.email)}
                  onChange={(evento) =>
                    setMarcados((atual) =>
                      evento.target.checked
                        ? [...atual, pessoa.email]
                        : atual.filter((outro) => outro !== pessoa.email),
                    )
                  }
                />
                <span>
                  {pessoa.nome}
                  <small className="texto-suave">
                    {pessoa.email} · {pessoa.papel}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {ligado && marcados.length === 0 ? (
          <p className="texto-suave">Marque ao menos um e-mail para os avisos saírem.</p>
        ) : null}

        {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
        {estado.sucesso ? <p className="texto-suave">{estado.sucesso}</p> : null}

        <div className="acoes-formulario">
          <button
            type="submit"
            className="botao botao-primario"
            disabled={salvando || (ligado && marcados.length === 0)}
          >
            {salvando ? 'Salvando...' : 'Salvar avisos'}
          </button>
        </div>
      </form>
    </div>
  );
}
