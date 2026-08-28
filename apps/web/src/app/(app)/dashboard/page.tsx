import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarData, formatarMoeda, rotular } from '@/lib/formato';

type Resumo = {
  imoveis: { total: number; porEstrategia: Record<string, number> };
  mes: { recebido: number; gasto: number; resultado: number };
  aReceber: {
    pendente: number;
    atrasado: number;
    cobrancasAtrasadas: number;
    taxaInadimplencia: number;
  };
  contratos: { ativos: number; vencendoEm90Dias: number; reajusteEm30Dias: number };
};

type Desempenho = {
  id: string;
  apelido: string;
  estrategia: string;
  situacao: string;
  custoTotal: number;
  recebido: number;
  gasto: number;
  resultado: number;
  emAtraso: number;
  lucro: number | null;
  roi: number | null;
  retornoMensal: number | null;
  mesesDecorridos: number | null;
  projetado: boolean;
  liquido12m: number | null;
  yieldLiquidoAnual: number | null;
  paybackMeses: number | null;
};

type Alertas = {
  contratos: {
    id: string;
    dataFim: string;
    proximoReajusteEm: string | null;
    indiceReajuste: string;
    imovel: { id: string; apelido: string };
  }[];
  cobrancas: {
    id: string;
    descricao: string;
    valor: number;
    vencimento: string | null;
    imovel: { id: string; apelido: string };
    pessoa: { id: string; nome: string } | null;
  }[];
};

function percentual(valor: number | null, casas = 1): string {
  return valor === null ? '-' : `${(valor * 100).toFixed(casas)}%`;
}

export default async function PaginaDashboard() {
  const [resumo, desempenho, alertas] = await Promise.all([
    apiGet<Resumo>('/dashboard/resumo'),
    apiGet<Desempenho[]>('/dashboard/imoveis'),
    apiGet<Alertas>('/dashboard/alertas'),
  ]);

  const revendas = desempenho.filter((item) => item.estrategia === 'REVENDA');
  const locacoes = desempenho.filter((item) => item.estrategia === 'LOCACAO');

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Visão geral</h1>
          <p className="texto-suave">
            {resumo.imoveis.total} imóvel(is) · {resumo.contratos.ativos} contrato(s) ativo(s)
          </p>
        </div>
      </div>

      <div className="indicadores">
        <div className="cartao indicador">
          <span className="texto-suave">Recebido no mês</span>
          <strong className="positivo">{formatarMoeda(resumo.mes.recebido)}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Gasto no mês</span>
          <strong className="negativo">{formatarMoeda(resumo.mes.gasto)}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Resultado do mês</span>
          <strong className={resumo.mes.resultado >= 0 ? 'positivo' : 'negativo'}>
            {formatarMoeda(resumo.mes.resultado)}
          </strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Em atraso</span>
          <strong className={resumo.aReceber.atrasado > 0 ? 'negativo' : undefined}>
            {formatarMoeda(resumo.aReceber.atrasado)}
          </strong>
          <span className="texto-suave">
            {resumo.aReceber.cobrancasAtrasadas} cobrança(s) ·{' '}
            {percentual(resumo.aReceber.taxaInadimplencia)} de inadimplência
          </span>
        </div>
      </div>

      {locacoes.length > 0 ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Locação</h2>
            <span className="texto-suave">Yield líquido sobre o custo total, últimos 12 meses</span>
          </div>
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Imóvel</th>
                  <th className="direita">Custo total</th>
                  <th className="direita">Líquido 12m</th>
                  <th className="direita">Yield anual</th>
                  <th className="direita">Payback</th>
                  <th className="direita">Em atraso</th>
                </tr>
              </thead>
              <tbody>
                {locacoes.map((imovel) => (
                  <tr key={imovel.id}>
                    <td>
                      <Link href={`/imoveis/${imovel.id}`} className="link">
                        {imovel.apelido}
                      </Link>
                    </td>
                    <td className="direita" data-label="Custo total">
                      {formatarMoeda(imovel.custoTotal)}
                    </td>
                    <td
                      className={
                        imovel.liquido12m && imovel.liquido12m >= 0
                          ? 'direita positivo'
                          : 'direita negativo'
                      }
                      data-label="Líquido 12m"
                    >
                      {formatarMoeda(imovel.liquido12m)}
                    </td>
                    <td className="direita" data-label="Yield anual">
                      <strong>{percentual(imovel.yieldLiquidoAnual, 2)}</strong>
                    </td>
                    <td className="direita" data-label="Payback">
                      {imovel.paybackMeses
                        ? `${Math.floor(imovel.paybackMeses / 12)} a ${imovel.paybackMeses % 12} m`
                        : '-'}
                    </td>
                    <td
                      className={imovel.emAtraso > 0 ? 'direita negativo' : 'direita'}
                      data-label="Em atraso"
                    >
                      {imovel.emAtraso > 0 ? formatarMoeda(imovel.emAtraso) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {revendas.length > 0 ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Revenda</h2>
            <span className="texto-suave">
              Valores em itálico são projeções sobre o preço alvo
            </span>
          </div>
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Imóvel</th>
                  <th>Situação</th>
                  <th className="direita">Custo total</th>
                  <th className="direita">Lucro</th>
                  <th className="direita">ROI</th>
                  <th className="direita">Meses</th>
                  <th className="direita">Retorno ao mês</th>
                </tr>
              </thead>
              <tbody>
                {revendas.map((imovel) => (
                  <tr key={imovel.id} className={imovel.projetado ? 'projetado' : undefined}>
                    <td>
                      <Link href={`/imoveis/${imovel.id}`} className="link">
                        {imovel.apelido}
                      </Link>
                    </td>
                    <td data-label="Situação">{rotular(imovel.situacao)}</td>
                    <td className="direita" data-label="Custo total">
                      {formatarMoeda(imovel.custoTotal)}
                    </td>
                    <td
                      className={
                        imovel.lucro !== null && imovel.lucro >= 0
                          ? 'direita positivo'
                          : 'direita negativo'
                      }
                      data-label="Lucro"
                    >
                      {formatarMoeda(imovel.lucro)}
                    </td>
                    <td className="direita" data-label="ROI">
                      {percentual(imovel.roi)}
                    </td>
                    <td className="direita" data-label="Meses">
                      {imovel.mesesDecorridos ?? '-'}
                    </td>
                    <td className="direita" data-label="Retorno ao mês">
                      <strong>{percentual(imovel.retornoMensal, 2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="texto-suave">
            Retorno ao mês é o ROI dividido pelo tempo de capital parado. É o número que permite
            comparar um flip com uma aplicação financeira.
          </p>
        </section>
      ) : null}

      {alertas.cobrancas.length > 0 ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Cobranças em atraso</h2>
          </div>
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Imóvel</th>
                  <th>Inquilino</th>
                  <th className="direita">Valor</th>
                </tr>
              </thead>
              <tbody>
                {alertas.cobrancas.map((cobranca) => (
                  <tr key={cobranca.id}>
                    <td>
                      <Link href={`/lancamentos/${cobranca.id}`} className="link">
                        {cobranca.descricao}
                      </Link>
                    </td>
                    <td data-label="Vencimento">{formatarData(cobranca.vencimento)}</td>
                    <td data-label="Imóvel">{cobranca.imovel.apelido}</td>
                    <td data-label="Inquilino">{cobranca.pessoa?.nome ?? '-'}</td>
                    <td className="direita negativo" data-label="Valor">
                      {formatarMoeda(cobranca.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {alertas.contratos.length > 0 ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Contratos que pedem atenção</h2>
            <span className="texto-suave">
              {resumo.contratos.vencendoEm90Dias} vencendo · {resumo.contratos.reajusteEm30Dias}{' '}
              para reajustar
            </span>
          </div>
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Imóvel</th>
                  <th>Fim do contrato</th>
                  <th>Próximo reajuste</th>
                  <th>Índice</th>
                </tr>
              </thead>
              <tbody>
                {alertas.contratos.map((contrato) => (
                  <tr key={contrato.id}>
                    <td>
                      <Link href={`/contratos/${contrato.id}`} className="link">
                        {contrato.imovel.apelido}
                      </Link>
                    </td>
                    <td data-label="Fim do contrato">{formatarData(contrato.dataFim)}</td>
                    <td data-label="Próximo reajuste">{formatarData(contrato.proximoReajusteEm)}</td>
                    <td data-label="Índice">{contrato.indiceReajuste}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {desempenho.length === 0 ? (
        <div className="cartao vazio">
          <p>
            Nenhum imóvel cadastrado.{' '}
            <Link href="/imoveis/novo" className="link">
              Comece por aqui
            </Link>
            .
          </p>
        </div>
      ) : null}
    </>
  );
}
