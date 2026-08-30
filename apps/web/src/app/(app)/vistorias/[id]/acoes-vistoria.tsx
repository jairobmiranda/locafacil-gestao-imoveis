'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  aprovarVistoria,
  enviarConvite,
  gerarLaudo,
  recusarVistoria,
  type EstadoVistoria,
} from '../acoes';

export function AcoesVistoria({
  id,
  situacao,
  link,
  emailSugerido,
  pendencias,
}: {
  id: string;
  situacao: string;
  link: string;
  emailSugerido: string;
  pendencias: number;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);

  const [estado, acaoConvite, enviandoConvite] = useActionState<EstadoVistoria, FormData>(
    enviarConvite.bind(null, id),
    {},
  );

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
        <label>
          E-mail de quem vai vistoriar
          <input type="email" name="email" required defaultValue={emailSugerido} />
        </label>
        <label>
          Validade do link (dias)
          <input type="number" name="validadeDias" min={1} max={60} defaultValue={15} />
        </label>
        <button type="submit" className="botao botao-primario" disabled={enviandoConvite}>
          {enviandoConvite ? 'Enviando...' : 'Enviar convite por e-mail'}
        </button>
        {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
        {estado.sucesso ? <p className="texto-suave">{estado.sucesso}</p> : null}
      </form>

      <label>
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

      {situacao === 'ENVIADA' ? (
        <>
          <button
            type="button"
            className="botao botao-primario"
            disabled={processando}
            onClick={() => executar(() => aprovarVistoria(id))}
          >
            Aprovar vistoria
          </button>
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
        </>
      ) : null}

      {situacao === 'APROVADA' || situacao === 'ENVIADA' ? (
        <button
          type="button"
          className="botao"
          disabled={processando || pendencias > 0}
          onClick={() => executar(() => gerarLaudo(id))}
        >
          {processando ? 'Gerando...' : 'Gerar laudo em PDF'}
        </button>
      ) : null}
    </div>
  );
}
