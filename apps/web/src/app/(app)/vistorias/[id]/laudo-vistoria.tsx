'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DestinatarioConvite } from '@locafacil/contracts';
import { enviarLaudo, gerarLaudo, type EstadoVistoria } from '../acoes';

export type DestinoLaudo = { email: string; nome: string | null; papel: string };

/** Papéis do contrato viram texto curto; o resto (você, proprietário) já vem pronto. */
const ROTULO_PAPEL: Record<string, string> = {
  CONVITE_ANTERIOR: 'quem vistoriou',
  RESPONSAVEL: 'responsável',
  LOCATARIO: 'locatário',
  CONJUGE: 'cônjuge',
  FIADOR: 'fiador',
  LOCADOR: 'locador',
  ANUENTE: 'anuente',
  TESTEMUNHA: 'testemunha',
  COPIA: 'cópia do contrato',
};

export function LaudoVistoria({
  id,
  situacao,
  pendencias,
  laudoAnexoId,
  destinos,
  marcadosIniciais,
  ultimoEnvio,
}: {
  id: string;
  situacao: string;
  pendencias: number;
  laudoAnexoId: string | null;
  destinos: DestinoLaudo[];
  marcadosIniciais: string[];
  /** Frase do último envio, montada na página a partir da linha do tempo. */
  ultimoEnvio: string | null;
}) {
  const router = useRouter();
  const [gerando, iniciar] = useTransition();
  const [outroEmail, setOutroEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [marcados, setMarcados] = useState<string[]>(marcadosIniciais);

  const [estado, acao, enviando] = useActionState<EstadoVistoria, FormData>(
    enviarLaudo.bind(null, id),
    {},
  );

  const concluida = situacao === 'ENVIADA' || situacao === 'APROVADA';
  const temDestino = marcados.length > 0 || outroEmail.trim() !== '';

  function alternar(email: string, marcado: boolean) {
    setMarcados((atual) => (marcado ? [...atual, email] : atual.filter((outro) => outro !== email)));
  }

  return (
    <div className="cartao formulario">
      <h2>Laudo</h2>
      <p className="texto-suave">
        {concluida
          ? 'O laudo sai sempre do estado atual da vistoria: capa, aceites, linha do tempo, fotos e ' +
            'manifesto das imagens. Enviar por e-mail gera uma versão nova antes de mandar.'
          : 'O laudo fica disponível quando a vistoria for concluída por quem está executando.'}
      </p>

      <div className="acoes-formulario">
        <button
          type="button"
          className="botao"
          disabled={gerando || !concluida || pendencias > 0}
          onClick={() =>
            iniciar(async () => {
              await gerarLaudo(id);
              router.refresh();
            })
          }
        >
          {gerando ? 'Gerando...' : laudoAnexoId ? 'Gerar de novo' : 'Gerar laudo em PDF'}
        </button>

        {laudoAnexoId ? (
          <a className="botao botao-primario" href={`/api/anexos/${laudoAnexoId}`}>
            Baixar laudo em PDF
          </a>
        ) : null}
      </div>

      {concluida ? (
        <form action={acao} className="formulario">
          <fieldset>
            <legend>Enviar por e-mail</legend>
            <p className="texto-suave">
              O primeiro marcado é o destinatário, os demais vão em cópia. O PDF vai anexado; se
              ficar grande demais, só o link, que sempre abre a versão mais recente.
            </p>
            <div className="lista-destinatarios">
              {destinos.map((pessoa) => (
                <label className="campo-inline destinatario" key={pessoa.email}>
                  <input
                    type="checkbox"
                    name="destinatariosLaudo"
                    value={pessoa.email}
                    checked={marcados.includes(pessoa.email)}
                    onChange={(evento) => alternar(pessoa.email, evento.target.checked)}
                  />
                  <span>
                    {pessoa.nome ?? pessoa.email}
                    <small className="texto-suave">
                      {pessoa.nome ? `${pessoa.email} · ` : ''}
                      {ROTULO_PAPEL[pessoa.papel] ?? pessoa.papel}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="campos-convite">
            <label className="campo-email">
              Outro e-mail (opcional)
              <input
                type="email"
                name="outroEmailLaudo"
                placeholder="nome@exemplo.com"
                value={outroEmail}
                onChange={(evento) => setOutroEmail(evento.target.value)}
              />
            </label>
          </div>

          <label>
            Recado no e-mail (opcional)
            <textarea
              name="mensagem"
              rows={2}
              maxLength={1000}
              value={mensagem}
              onChange={(evento) => setMensagem(evento.target.value)}
              placeholder="Ex.: qualquer divergência, responda este e-mail em até 5 dias."
            />
          </label>

          <div className="acoes-formulario">
            <button
              type="submit"
              className="botao botao-primario"
              disabled={enviando || !temDestino}
            >
              {enviando ? 'Gerando e enviando...' : 'Enviar laudo por e-mail'}
            </button>
          </div>

          {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
          {estado.sucesso ? <p className="texto-suave">{estado.sucesso}</p> : null}
          {!estado.sucesso && ultimoEnvio ? <p className="texto-suave">{ultimoEnvio}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
