import Link from 'next/link';
import type { AlertaMinuta } from '@locafacil/contracts';
import { apiGet } from '@/lib/api';
import { formatarData, rotular } from '@/lib/formato';
import { PainelAssinatura } from './painel-assinatura';
import '../minuta.css';

type MinutaDetalhe = {
  id: string;
  contratoId: string;
  versao: number;
  situacao: string;
  modeloVersao: number;
  hashConteudo: string;
  hashAssinado: string | null;
  anexoAssinadoId: string | null;
  nivelProtecao: number;
  alertas: AlertaMinuta[] | null;
  clausulasUsadas: { id: string; versao: number; titulo: string }[];
  conteudoHtml: string;
  enviadaEm: string | null;
  assinadaEm: string | null;
  criadoEm: string;
};

export default async function PaginaMinutaDetalhe({
  params,
}: {
  params: Promise<{ id: string; minutaId: string }>;
}) {
  const { id, minutaId } = await params;
  const minuta = await apiGet<MinutaDetalhe>(`/minutas/${minutaId}`);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Minuta versão {minuta.versao}</h1>
          <p className="texto-suave">
            <span className={`etiqueta situacao-${minuta.situacao.toLowerCase()}`}>
              {rotular(minuta.situacao)}
            </span>{' '}
            · gerada em {formatarData(minuta.criadoEm)} · modelo v{minuta.modeloVersao}
          </p>
        </div>
        <div className="acoes-cabecalho nao-imprimir">
          <Link href={`/contratos/${id}/minuta/${minutaId}/imprimir`} className="botao botao-primario">
            Abrir para impressão
          </Link>
          <Link href={`/contratos/${id}/minuta`} className="botao">
            Nova versão
          </Link>
        </div>
      </div>

      <div className="indicadores nao-imprimir">
        <div className="cartao indicador">
          <span className="texto-suave">Cláusulas</span>
          <strong>{minuta.clausulasUsadas.length}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Hash do documento</span>
          <strong>
            <code>{minuta.hashConteudo.slice(0, 16)}</code>
          </strong>
          <span className="texto-suave">SHA-256, congelado na geração</span>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Enviada</span>
          <strong>{minuta.enviadaEm ? formatarData(minuta.enviadaEm) : 'não'}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Assinada</span>
          <strong>{minuta.assinadaEm ? formatarData(minuta.assinadaEm) : 'não'}</strong>
        </div>
      </div>

      {minuta.anexoAssinadoId ? (
        <div className="cartao nao-imprimir">
          <h2>Contrato assinado</h2>
          <p className="texto-suave">
            Hash do arquivo: <code>{minuta.hashAssinado ?? 'não calculado'}</code>
          </p>
          <a className="botao" href={`/api/anexos/${minuta.anexoAssinadoId}`}>
            Baixar contrato assinado
          </a>
        </div>
      ) : (
        <PainelAssinatura contratoId={id} minutaId={minutaId} situacao={minuta.situacao} />
      )}

      {minuta.alertas && minuta.alertas.length > 0 ? (
        <section className="nao-imprimir">
          <div className="cabecalho-secao">
            <h2>Avisos registrados na geração</h2>
          </div>
          <ul className="alerta-lista">
            {minuta.alertas.map((alerta, indice) => (
              <li
                className="alerta-item"
                data-severidade={alerta.severidade}
                key={`${alerta.clausulaId ?? 'geral'}-${indice}`}
              >
                {alerta.mensagem}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="cabecalho-secao nao-imprimir">
          <h2>Documento</h2>
        </div>
        <div className="cartao folha">
          <div dangerouslySetInnerHTML={{ __html: minuta.conteudoHtml }} />
        </div>
      </section>
    </>
  );
}
