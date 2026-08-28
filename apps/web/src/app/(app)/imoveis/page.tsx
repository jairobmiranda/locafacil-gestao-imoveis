import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarMoeda, rotular } from '@/lib/formato';
import type { Imovel, Paginado } from '@/lib/tipos';
import { Filtros } from './filtros';

const ESTRATEGIAS = ['REVENDA', 'LOCACAO', 'TERRENO', 'USO_PROPRIO'];
const SITUACOES = [
  'PROSPECCAO',
  'ADQUIRIDO',
  'EM_REFORMA',
  'A_VENDA',
  'PARA_ALUGAR',
  'ALUGADO',
  'VENDIDO',
];

export default async function PaginaImoveis({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtros = await searchParams;

  const dados = await apiGet<Paginado<Imovel>>('/imoveis', {
    busca: filtros.busca,
    estrategia: filtros.estrategia,
    situacao: filtros.situacao,
    pagina: filtros.pagina ?? 1,
    limite: 20,
  });

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Imóveis</h1>
          <p className="texto-suave">{dados.total} cadastrado(s)</p>
        </div>
        <Link href="/imoveis/novo" className="botao botao-primario">
          Novo imóvel
        </Link>
      </div>

      <Filtros estrategias={ESTRATEGIAS} situacoes={SITUACOES} />

      {dados.itens.length === 0 ? (
        <div className="cartao vazio">
          <p>Nenhum imóvel encontrado.</p>
        </div>
      ) : (
        <div className="cartao">
          <table className="tabela">
            <thead>
              <tr>
                <th>Apelido</th>
                <th>Estratégia</th>
                <th>Situação</th>
                <th>Cidade</th>
                <th className="direita">Aquisição</th>
                <th className="direita">Alvo</th>
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((imovel) => (
                <tr key={imovel.id}>
                  <td>
                    <Link href={`/imoveis/${imovel.id}`} className="link">
                      {imovel.apelido}
                    </Link>
                  </td>
                  <td data-label="Estratégia">
                    <span className={`etiqueta estrategia-${imovel.estrategia.toLowerCase()}`}>
                      {rotular(imovel.estrategia)}
                    </span>
                  </td>
                  <td data-label="Situação">{rotular(imovel.situacao)}</td>
                  <td data-label="Cidade">{imovel.cidade ?? '-'}</td>
                  <td className="direita" data-label="Aquisição">
                    {formatarMoeda(imovel.valorAquisicao)}
                  </td>
                  <td className="direita" data-label="Alvo">
                    {imovel.estrategia === 'LOCACAO'
                      ? formatarMoeda(imovel.aluguelAlvo)
                      : formatarMoeda(imovel.valorVendaAlvo)}
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
