import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarCompetencia, formatarData, formatarMoeda, rotular } from '@/lib/formato';
import { AcoesLancamento } from './acoes-lancamento';
import { CopiaECola } from './copia-e-cola';
import { FormularioBaixa } from './formulario-baixa';

type Anexo = {
  id: string;
  nomeArquivo: string;
  especie: string;
  tamanhoBytes: number;
  criadoEm: string;
};

type LancamentoDetalhe = {
  id: string;
  descricao: string;
  natureza: 'ENTRADA' | 'SAIDA';
  situacao: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'PARCIAL' | 'CANCELADO';
  valor: number;
  valorPago: number | null;
  valorMulta: number;
  valorJuros: number;
  valorDesconto: number;
  competencia: string;
  vencimento: string | null;
  pagoEm: string | null;
  formaPagamento: string | null;
  capitalizavel: boolean;
  observacoes: string | null;
  pixPayload: string | null;
  imovel: { id: string; apelido: string };
  categoria: { id: string; nome: string };
  pessoa: { id: string; nome: string } | null;
  itens: { id: string; descricao: string; valor: number }[];
};

export default async function PaginaLancamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [lancamento, anexos] = await Promise.all([
    apiGet<LancamentoDetalhe>(`/lancamentos/${id}`),
    apiGet<Anexo[]>('/anexos', { entidadeTipo: 'LANCAMENTO', entidadeId: id }),
  ]);

  const aberto = lancamento.situacao === 'PENDENTE' || lancamento.situacao === 'ATRASADO';
  const totalPago =
    (lancamento.valorPago ?? 0) > 0 ? lancamento.valorPago : null;

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>{lancamento.descricao}</h1>
          <p className="texto-suave">
            <Link href={`/imoveis/${lancamento.imovel.id}`} className="link">
              {lancamento.imovel.apelido}
            </Link>{' '}
            · {lancamento.categoria.nome} · {formatarCompetencia(lancamento.competencia)}
          </p>
        </div>
        <AcoesLancamento
          id={lancamento.id}
          situacao={lancamento.situacao}
          natureza={lancamento.natureza}
        />
      </div>

      <div className="indicadores">
        <div className="cartao indicador">
          <span className="texto-suave">Valor original</span>
          <strong className={lancamento.natureza === 'ENTRADA' ? 'positivo' : 'negativo'}>
            {formatarMoeda(lancamento.valor)}
          </strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Situação</span>
          <strong>
            <span className={`etiqueta situacao-${lancamento.situacao.toLowerCase()}`}>
              {rotular(lancamento.situacao)}
            </span>
          </strong>
          <span className="texto-suave">
            Vence em {formatarData(lancamento.vencimento)}
          </span>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Multa e juros</span>
          <strong>{formatarMoeda(lancamento.valorMulta + lancamento.valorJuros)}</strong>
          {lancamento.valorDesconto > 0 ? (
            <span className="texto-suave">
              Desconto de {formatarMoeda(lancamento.valorDesconto)}
            </span>
          ) : null}
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Pago</span>
          <strong className={totalPago ? 'positivo' : undefined}>
            {formatarMoeda(totalPago)}
          </strong>
          <span className="texto-suave">{formatarData(lancamento.pagoEm)}</span>
        </div>
      </div>

      {lancamento.itens.length > 0 ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Composição</h2>
          </div>
          <div className="cartao">
            <table className="tabela">
              <tbody>
                {lancamento.itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.descricao}</td>
                    <td className="direita">{formatarMoeda(item.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {lancamento.pixPayload ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Pix</h2>
          </div>
          <CopiaECola payload={lancamento.pixPayload} lancamentoId={lancamento.id} />
        </section>
      ) : null}

      {aberto ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Registrar pagamento</h2>
          </div>
          <FormularioBaixa
            id={lancamento.id}
            valorSugerido={lancamento.valor}
            vencimento={lancamento.vencimento}
          />
        </section>
      ) : null}

      <section>
        <div className="cabecalho-secao">
          <h2>Anexos</h2>
        </div>

        {anexos.length === 0 ? (
          <div className="cartao vazio">
            <p>Nenhum anexo.</p>
          </div>
        ) : (
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Espécie</th>
                  <th>Enviado</th>
                  <th className="direita">Tamanho</th>
                </tr>
              </thead>
              <tbody>
                {anexos.map((anexo) => (
                  <tr key={anexo.id}>
                    <td>
                      <a
                        href={`/api/anexos/${anexo.id}`}
                        className="link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {anexo.nomeArquivo}
                      </a>
                    </td>
                    <td>{rotular(anexo.especie)}</td>
                    <td>{formatarData(anexo.criadoEm)}</td>
                    <td className="direita">{Math.round(anexo.tamanhoBytes / 1024)} KB</td>
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
