'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DestinatarioConvite } from '@locafacil/contracts';
import {
  aprovarVistoria,
  enviarConvite,
  gerarLaudo,
  recusarVistoria,
  type EstadoVistoria,
} from '../acoes';

const ROTULO_PAPEL: Record<DestinatarioConvite['papel'], string> = {
  CONVITE_ANTERIOR: 'convite anterior',
  RESPONSAVEL: 'responsável',
  LOCATARIO: 'locatário',
  CONJUGE: 'cônjuge',
  FIADOR: 'fiador',
  LOCADOR: 'locador',
  ANUENTE: 'anuente',
  TESTEMUNHA: 'testemunha',
  COPIA: 'cópia do contrato',
};

export function AcoesVistoria({
  id,
  situacao,
  link,
  destinatarios,
  validadeSugerida,
  pendencias,
}: {
  id: string;
  situacao: string;
  link: string;
  destinatarios: DestinatarioConvite[];
  validadeSugerida: number;
  pendencias: number;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);

  // A acao do form reseta os campos nao controlados: validade e escolhas ficam no estado.
  const [validadeDias, setValidadeDias] = useState(String(validadeSugerida));
  const [outroEmail, setOutroEmail] = useState('');
  const [marcados, setMarcados] = useState<string[]>(() =>
    destinatarios.filter((pessoa) => pessoa.principal).map((pessoa) => pessoa.email),
  );

  const [estado, acaoConvite, enviandoConvite] = useActionState<EstadoVistoria, FormData>(
    enviarConvite.bind(null, id),
    {},
  );

  const temDestino = marcados.length > 0 || outroEmail.trim() !== '';

  function alternar(email: string, marcado: boolean) {
    setMarcados((atual) =>
      marcado ? [...atual, email] : atual.filter((outro) => outro !== email),
    );
  }

  const executar = (acao: () => Promise<void>) =>
    iniciar(async () => {
      await acao();
      router.refresh();
    });

  return (
    <div className="cartao formulario">
      <h2>Convite</h2>
      <p className="texto-suave">
        O envio é manual: você decide a hora. O link abre sem login e funciona melhor no celular.
      </p>

      <form action={acaoConvite} className="formulario">
        {destinatarios.length > 0 ? (
          <fieldset>
            <legend>Quem recebe o convite</legend>
            <p className="texto-suave">
              O primeiro marcado é o destinatário, os demais vão em cópia.
            </p>
            <div className="lista-destinatarios">
              {destinatarios.map((pessoa) => (
                <label className="campo-inline destinatario" key={pessoa.email}>
                  <input
                    type="checkbox"
                    name="destinatarios"
                    value={pessoa.email}
                    checked={marcados.includes(pessoa.email)}
                    onChange={(evento) => alternar(pessoa.email, evento.target.checked)}
                  />
                  <span>
                    {pessoa.nome ?? pessoa.email}
                    <small className="texto-suave">
                      {pessoa.nome ? `${pessoa.email} · ` : ''}
                      {ROTULO_PAPEL[pessoa.papel]}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="texto-suave">
            O contrato desta vistoria não tem e-mail cadastrado. Informe o endereço abaixo.
          </p>
        )}

        <div className="campos-convite">
          <label className="campo-email">
            {destinatarios.length > 0 ? 'Outro e-mail (opcional)' : 'E-mail de quem vai vistoriar'}
            <input
              type="email"
              name="outroEmail"
              placeholder="nome@exemplo.com"
              value={outroEmail}
              onChange={(evento) => setOutroEmail(evento.target.value)}
            />
          </label>
          <label className="campo-curto">
            Validade (dias)
            <input
              type="number"
              name="validadeDias"
              min={1}
              max={60}
              value={validadeDias}
              onChange={(evento) => setValidadeDias(evento.target.value)}
            />
          </label>
          <button
            type="submit"
            className="botao botao-primario"
            disabled={enviandoConvite || !temDestino}
          >
            {enviandoConvite ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>

        {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
        {estado.sucesso ? <p className="texto-suave">{estado.sucesso}</p> : null}
      </form>

      <div className="campos-convite">
        <label className="campo-link">
          Link direto
          <input type="text" readOnly value={link} onFocus={(evento) => evento.target.select()} />
        </label>
        <button
          type="button"
          className="botao"
          onClick={() => {
            void navigator.clipboard.writeText(link).then(() => setCopiado(true));
          }}
        >
          {copiado ? 'Copiado' : 'Copiar link'}
        </button>
      </div>

      {situacao === 'ENVIADA' || situacao === 'APROVADA' ? (
        <div className="acoes-formulario">
          {situacao === 'ENVIADA' ? (
            <>
              <button
                type="button"
                className="botao"
                disabled={processando}
                onClick={() => {
                  const motivo = prompt('O que precisa ser refeito?');

                  if (motivo) {
                    executar(() => recusarVistoria(id, motivo));
                  }
                }}
              >
                Pedir complemento
              </button>
              <button
                type="button"
                className="botao botao-primario"
                disabled={processando}
                onClick={() => executar(() => aprovarVistoria(id))}
              >
                Aprovar vistoria
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="botao"
            disabled={processando || pendencias > 0}
            onClick={() => executar(() => gerarLaudo(id))}
          >
            {processando ? 'Gerando...' : 'Gerar laudo em PDF'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
