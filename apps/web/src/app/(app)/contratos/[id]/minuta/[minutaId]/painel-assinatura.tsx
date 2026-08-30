'use client';

import { useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelarMinuta, enviarParaAssinatura } from '../acoes';
import { enviarPdfAssinado, type EstadoUpload } from './acoes-assinatura';

const ASSINADOR_GOVBR = 'https://assinador.iti.br/assinatura/index.xhtml';

export function PainelAssinatura({
  contratoId,
  minutaId,
  situacao,
}: {
  contratoId: string;
  minutaId: string;
  situacao: string;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();

  const [estado, enviar, enviando] = useActionState<EstadoUpload, FormData>(
    enviarPdfAssinado.bind(null, contratoId, minutaId),
    {},
  );

  const acao = (executar: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      await executar();
      router.refresh();
    });

  return (
    <div className="cartao campo-grupo nao-imprimir">
      <h2>Assinatura</h2>
      <p className="ajuda">
        O sistema gera o documento e arquiva o assinado. A assinatura em si acontece no assinador
        oficial do gov.br, com a conta de cada signatário.
      </p>

      <ol className="passos-assinatura">
        <li>
          Abra a página de impressão e salve o PDF pelo próprio navegador, escolhendo destino
          &quot;Salvar como PDF&quot;.
        </li>
        <li>
          Envie o arquivo às partes ou assine você mesmo no{' '}
          <a href={ASSINADOR_GOVBR} target="_blank" rel="noreferrer noopener" className="link">
            assinador do gov.br
          </a>
          . Cada pessoa assina o mesmo arquivo, em sequência.
        </li>
        <li>Suba aqui o PDF final, com todas as assinaturas.</li>
      </ol>

      {situacao === 'GERADA' ? (
        <button
          type="button"
          className="botao"
          disabled={processando}
          onClick={() => acao(() => enviarParaAssinatura(contratoId, minutaId))}
        >
          Marcar como enviada para assinatura
        </button>
      ) : null}

      {situacao !== 'ASSINADA' && situacao !== 'CANCELADA' ? (
        <form action={enviar} className="campo-grupo">
          <label>
            PDF assinado
            <input type="file" name="arquivo" accept="application/pdf" required />
          </label>
          <button type="submit" className="botao botao-primario" disabled={enviando}>
            {enviando ? 'Arquivando...' : 'Arquivar contrato assinado'}
          </button>
          {estado.erro ? (
            <p className="alerta-item" data-severidade="BLOQUEIO">
              {estado.erro}
            </p>
          ) : null}
        </form>
      ) : null}

      {situacao !== 'ASSINADA' && situacao !== 'CANCELADA' ? (
        <button
          type="button"
          className="botao botao-texto"
          disabled={processando}
          onClick={() => acao(() => cancelarMinuta(contratoId, minutaId))}
        >
          Cancelar esta versão
        </button>
      ) : null}
    </div>
  );
}
