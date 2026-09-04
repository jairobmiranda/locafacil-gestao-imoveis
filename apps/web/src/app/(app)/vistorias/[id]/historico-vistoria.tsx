import {
  formatarCpf,
  type AceiteVistoria,
  type EventoVistoria,
  type TipoEventoVistoria,
} from '@locafacil/contracts';
import { formatarDataHora } from '@/lib/formato';

/** Cor do marcador na trilha. O que muda a situação da vistoria ganha destaque. */
const TOM_EVENTO: Record<TipoEventoVistoria, string> = {
  CRIADA: 'neutro',
  CONVITE_ENVIADO: 'primario',
  COMPLEMENTO_SOLICITADO: 'alerta',
  LINK_ABERTO: 'neutro',
  EXECUCAO_INICIADA: 'primario',
  FOTOS_RECEBIDAS: 'neutro',
  FOTO_REMOVIDA: 'alerta',
  CONCLUIDA: 'positivo',
  APROVADA: 'positivo',
  AVISO_ENVIADO: 'neutro',
  LAUDO_GERADO: 'primario',
  LAUDO_ENVIADO: 'primario',
  LAUDO_ABERTO: 'neutro',
};

const PAPEL_ROTULO: Record<AceiteVistoria['papel'], string> = {
  EXECUTOR: 'Quem vistoriou',
  GESTOR: 'Gestão do imóvel',
};

export function LinhaDoTempoVistoria({ eventos }: { eventos: EventoVistoria[] }) {
  return (
    <div className="cartao">
      <h2>Linha do tempo</h2>
      <p className="texto-suave">
        Carimbos do servidor, do mais antigo para o mais novo. As fotos entram agrupadas por
        ambiente; o laudo lista cada uma com seu resumo.
      </p>

      {eventos.length === 0 ? (
        <p className="texto-suave">Nada aconteceu nesta vistoria ainda.</p>
      ) : (
        <ol className="linha-do-tempo">
          {eventos.map((evento, indice) => {
            const detalhe = [
              evento.origem === 'LINK_PUBLICO' ? 'pelo link público' : null,
              evento.autor,
              evento.ip ? `IP ${evento.ip}` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <li
                key={`${evento.tipo}-${evento.ocorridoEm}-${indice}`}
                data-tom={TOM_EVENTO[evento.tipo] ?? 'neutro'}
              >
                <span className="quando">{formatarDataHora(evento.ocorridoEm)}</span>
                <div>
                  <strong>{evento.descricao}</strong>
                  {detalhe ? <span className="texto-suave">{detalhe}</span> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function AceitesVistoria({ aceites }: { aceites: AceiteVistoria[] }) {
  return (
    <div className="cartao">
      <h2>Aceite eletrônico</h2>
      <p className="texto-suave">
        Sem assinatura desenhada: o que registra a concordância é o conjunto de quem declarou,
        quando, de qual endereço e sobre qual conteúdo. Tudo isso vai impresso no laudo.
      </p>

      <div className="cartoes-aceite">
        {(['EXECUTOR', 'GESTOR'] as const).map((papel) => {
          const aceite = aceites.find((registro) => registro.papel === papel);

          if (!aceite) {
            return (
              <div className="aceite" data-vazio="true" key={papel}>
                <span className="etiqueta">{PAPEL_ROTULO[papel]}</span>
                <p className="texto-suave">
                  {papel === 'EXECUTOR'
                    ? 'A vistoria ainda não foi concluída por quem está executando.'
                    : 'Aprove a vistoria para registrar o aceite da gestão.'}
                </p>
              </div>
            );
          }

          return (
            <div className="aceite" key={papel}>
              <span className="etiqueta">{PAPEL_ROTULO[papel]}</span>
              <strong className="nome">{aceite.nome}</strong>
              <span className="texto-suave">
                {[aceite.email, aceite.documento ? `CPF ${formatarCpf(aceite.documento)}` : null]
                  .filter(Boolean)
                  .join(' · ') || 'sem outro identificador'}
              </span>

              <dl>
                <div>
                  <dt>Aceito em</dt>
                  <dd>{formatarDataHora(aceite.aceitoEm)}</dd>
                </div>
                <div>
                  <dt>Endereço de rede</dt>
                  <dd>{aceite.ip ?? 'não registrado'}</dd>
                </div>
                <div>
                  <dt>Dispositivo</dt>
                  <dd>{aceite.dispositivo}</dd>
                </div>
                <div>
                  <dt>Código do conteúdo</dt>
                  <dd>{aceite.codigo}</dd>
                </div>
              </dl>

              <p className="declaracao">&ldquo;{aceite.declaracao}&rdquo;</p>

              {aceite.cobreConteudoAtual ? null : (
                <p className="alerta-erro">
                  A vistoria mudou depois deste aceite. Peça um novo aceite ou gere o laudo de novo
                  para deixar a diferença registrada.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
