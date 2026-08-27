import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarCompetencia, formatarData, formatarMoeda, rotular } from '@/lib/formato';
import type { Imovel, Lancamento, Paginado } from '@/lib/tipos';
import { FiltrosLancamentos } from './filtros-lancamentos';

export default async function PaginaLancamentos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtros = await searchParams;

  const [dados, imoveis] = await Promise.all([
    apiGet<Paginado<Lancamento>>('/lancamentos', {
      imovelId: filtros.imovelId,
      contratoId: filtros.contratoId,
      natureza: filtros.natureza,
      situacao: filtros.situacao,
      pagina: filtros.pagina ?? 1,
      limite: 30,
    }),
    apiGet<Paginado<Imovel>>('/imoveis', { limite: 100 }),
  ]);

  const totais = dados.itens.reduce(
    (acumulado, item) => {
      const valor = item.valorPago ?? item.valor;

      if (item.situacao === 'CANCELADO') {
        return acumulado;
      }

      return item.natureza === 'ENTRADA'
        ? { ...acumulado, entradas: acumulado.entradas + valor }
        : { ...acumulado, saidas: acumulado.saidas + valor };
    },
    { entradas: 0, saidas: 0 },
  );

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Lançamentos</h1>
          <p className="texto-suave">{dados.total} registro(s)</p>
        </div>
        <Link href="/lancamentos/novo" className="botao botao-primario">
          Novo lançamento
        </Link>
      </div>

      <div className="indicadores">
        <div className="cartao indicador">
          <span className="texto-suave">Entradas na página</span>
          <strong className="positivo">{formatarMoeda(totais.entradas)}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Saídas na página</span>
          <strong className="negativo">{formatarMoeda(totais.saidas)}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Resultado</span>
          <strong className={totais.entradas - totais.saidas >= 0 ? 'positivo' : 'negativo'}>
            {formatarMoeda(totais.entradas - totais.saidas)}
          </strong>
        </div>
      </div>

      <FiltrosLancamentos imoveis={imoveis.itens.map(({ id, apelido }) => ({ id, apelido }))} />

      {dados.itens.length === 0 ? (
        <div className="cartao vazio">
          <p>Nenhum lançamento encontrado.</p>
        </div>
      ) : (
        <div className="cartao">
          <table className="tabela">
            <thead>
              <tr>
                <th>Competência</th>
                <th>Imóvel</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Situação</th>
                <th className="direita">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((lancamento) => (
                <tr key={lancamento.id}>
                  <td>{formatarCompetencia(lancamento.competencia)}</td>
                  <td>
                    <Link href={`/imoveis/${lancamento.imovel.id}`} className="link">
                      {lancamento.imovel.apelido}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/lancamentos/${lancamento.id}`} className="link">
                      {lancamento.descricao}
                    </Link>
                  </td>
                  <td>{lancamento.categoria.nome}</td>
                  <td>{formatarData(lancamento.vencimento)}</td>
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
    </>
  );
}
