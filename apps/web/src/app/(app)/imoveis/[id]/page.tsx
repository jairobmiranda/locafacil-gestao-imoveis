import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarCompetencia, formatarData, formatarMoeda, rotular } from '@/lib/formato';
import type { Imovel, Lancamento, Paginado } from '@/lib/tipos';
import { FormularioImovel } from '../formulario-imovel';
import { BotoesArquivamento } from './botoes-arquivamento';

export default async function PaginaImovel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [imovel, lancamentos] = await Promise.all([
    apiGet<Imovel>(`/imoveis/${id}`),
    apiGet<Paginado<Lancamento>>('/lancamentos', { imovelId: id, limite: 10 }),
  ]);

  const entradas = lancamentos.itens
    .filter((item) => item.natureza === 'ENTRADA' && item.situacao === 'PAGO')
    .reduce((total, item) => total + (item.valorPago ?? item.valor), 0);

  const saidas = lancamentos.itens
    .filter((item) => item.natureza === 'SAIDA' && item.situacao === 'PAGO')
    .reduce((total, item) => total + (item.valorPago ?? item.valor), 0);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>{imovel.apelido}</h1>
          <p className="texto-suave">
            {rotular(imovel.estrategia)} · {rotular(imovel.situacao)}
            {imovel.arquivadoEm ? ' · arquivado' : ''}
          </p>
        </div>
        <BotoesArquivamento id={imovel.id} arquivado={Boolean(imovel.arquivadoEm)} />
      </div>

      <div className="indicadores">
        <div className="cartao indicador">
          <span className="texto-suave">Aquisição</span>
          <strong>{formatarMoeda(imovel.valorAquisicao)}</strong>
          <span className="texto-suave">{formatarData(imovel.dataAquisicao)}</span>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Recebido (últimos lançamentos)</span>
          <strong className="positivo">{formatarMoeda(entradas)}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Gasto (últimos lançamentos)</span>
          <strong className="negativo">{formatarMoeda(saidas)}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">
            {imovel.estrategia === 'LOCACAO' ? 'Aluguel alvo' : 'Venda alvo'}
          </span>
          <strong>
            {formatarMoeda(
              imovel.estrategia === 'LOCACAO' ? imovel.aluguelAlvo : imovel.valorVendaAlvo,
            )}
          </strong>
        </div>
      </div>

      <section>
        <div className="cabecalho-secao">
          <h2>Últimos lançamentos</h2>
          <Link href={`/lancamentos?imovelId=${imovel.id}`} className="link">
            Ver todos
          </Link>
        </div>

        {lancamentos.itens.length === 0 ? (
          <div className="cartao vazio">
            <p>Nenhum lançamento para este imóvel.</p>
          </div>
        ) : (
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Situação</th>
                  <th className="direita">Valor</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.itens.map((lancamento) => (
                  <tr key={lancamento.id}>
                    <td>{formatarCompetencia(lancamento.competencia)}</td>
                    <td>
                      <Link href={`/lancamentos/${lancamento.id}`} className="link">
                        {lancamento.descricao}
                      </Link>
                    </td>
                    <td>{lancamento.categoria.nome}</td>
                    <td>
                      <span className={`etiqueta situacao-${lancamento.situacao.toLowerCase()}`}>
                        {rotular(lancamento.situacao)}
                      </span>
                    </td>
                    <td
                      className={
                        lancamento.natureza === 'ENTRADA' ? 'direita positivo' : 'direita negativo'
                      }
                    >
                      {lancamento.natureza === 'ENTRADA' ? '+' : '-'}
                      {formatarMoeda(lancamento.valor)}
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
          <h2>Dados do imóvel</h2>
        </div>
        <FormularioImovel imovel={imovel} />
      </section>
    </>
  );
}
