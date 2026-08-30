import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarCompetencia, formatarData, formatarMoeda, rotular } from '@/lib/formato';
import type { Lancamento, Paginado } from '@/lib/tipos';
import { AcoesContrato } from './acoes-contrato';

type ContratoDetalhe = {
  id: string;
  situacao: string;
  dataInicio: string;
  dataFim: string;
  dataRescisao: string | null;
  diaVencimento: number;
  valorAluguel: number;
  percentualMulta: number;
  percentualJurosDia: number;
  descontoPontualidade: number;
  indiceReajuste: string;
  proximoReajusteEm: string | null;
  tipoGarantia: string;
  valorGarantia: number | null;
  gerarCobrancas: boolean;
  diasAntecedenciaGeracao: number;
  observacoes: string | null;
  emailsCopia: string | null;
  imovel: { id: string; apelido: string };
  chavePix: { id: string; tipoChave: string; chave: string } | null;
  itens: { id: string; descricao: string; valor: number; categoria: { nome: string } }[];
  partes: {
    id: string;
    papel: string;
    contatoPrincipal: boolean;
    pessoa: { id: string; nome: string; email: string | null };
  }[];
};

export default async function PaginaContrato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contrato, cobrancas] = await Promise.all([
    apiGet<ContratoDetalhe>(`/contratos/${id}`),
    apiGet<Paginado<Lancamento>>('/lancamentos', { contratoId: id, limite: 12 }),
  ]);

  const totalMensal =
    contrato.valorAluguel + contrato.itens.reduce((soma, item) => soma + item.valor, 0);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>{contrato.imovel.apelido}</h1>
          <p className="texto-suave">
            {formatarData(contrato.dataInicio)} a {formatarData(contrato.dataFim)} · vencimento dia{' '}
            {contrato.diaVencimento}
          </p>
        </div>
        <AcoesContrato id={contrato.id} situacao={contrato.situacao} />
      </div>

      <div className="indicadores">
        <div className="cartao indicador">
          <span className="texto-suave">Situação</span>
          <strong>
            <span className={`etiqueta situacao-${contrato.situacao.toLowerCase()}`}>
              {rotular(contrato.situacao)}
            </span>
          </strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Cobrança mensal</span>
          <strong>{formatarMoeda(totalMensal)}</strong>
          <span className="texto-suave">Aluguel {formatarMoeda(contrato.valorAluguel)}</span>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Próximo reajuste</span>
          <strong>{formatarData(contrato.proximoReajusteEm)}</strong>
          <span className="texto-suave">{contrato.indiceReajuste}</span>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Geração automática</span>
          <strong>{contrato.gerarCobrancas ? 'Ligada' : 'Desligada'}</strong>
          <span className="texto-suave">
            {contrato.diasAntecedenciaGeracao} dias de antecedência
          </span>
        </div>
      </div>

      <section>
        <div className="cabecalho-secao">
          <h2>Partes</h2>
        </div>
        <div className="cartao">
          <table className="tabela">
            <tbody>
              {contrato.partes.map((parte) => (
                <tr key={parte.id}>
                  <td>
                    <Link href={`/pessoas/${parte.pessoa.id}`} className="link">
                      {parte.pessoa.nome}
                    </Link>
                  </td>
                  <td data-label="Papel">
                    {rotular(parte.papel)}
                    {parte.contatoPrincipal ? ' · contato principal' : ''}
                  </td>
                  <td data-label="E-mail">
                    {parte.pessoa.email ?? <span className="texto-suave">sem e-mail</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="texto-suave">
          Cópias das cobranças:{' '}
          {contrato.emailsCopia ? contrato.emailsCopia : 'nenhuma configurada'}
        </p>
      </section>

      {contrato.itens.length > 0 ? (
        <section>
          <div className="cabecalho-secao">
            <h2>Encargos recorrentes</h2>
          </div>
          <div className="cartao">
            <table className="tabela">
              <tbody>
                {contrato.itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.descricao}</td>
                    <td data-label="Categoria">{item.categoria.nome}</td>
                    <td className="direita" data-label="Valor">
                      {formatarMoeda(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <div className="cabecalho-secao">
          <h2>Cobranças</h2>
          <Link href={`/lancamentos?contratoId=${contrato.id}`} className="link">
            Ver todas
          </Link>
        </div>

        {cobrancas.itens.length === 0 ? (
          <div className="cartao vazio">
            <p>Nenhuma cobrança gerada ainda.</p>
          </div>
        ) : (
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Vencimento</th>
                  <th>Situação</th>
                  <th className="direita">Valor</th>
                  <th className="direita">Pago</th>
                </tr>
              </thead>
              <tbody>
                {cobrancas.itens.map((cobranca) => (
                  <tr key={cobranca.id}>
                    <td>
                      <Link href={`/lancamentos/${cobranca.id}`} className="link">
                        {formatarCompetencia(cobranca.competencia)}
                      </Link>
                    </td>
                    <td data-label="Vencimento">{formatarData(cobranca.vencimento)}</td>
                    <td data-label="Situação">
                      <span className={`etiqueta situacao-${cobranca.situacao.toLowerCase()}`}>
                        {rotular(cobranca.situacao)}
                      </span>
                    </td>
                    <td className="direita" data-label="Valor">
                      {formatarMoeda(cobranca.valor)}
                    </td>
                    <td className="direita" data-label="Pago">
                      {formatarMoeda(cobranca.valorPago)}
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
          <h2>Condições</h2>
        </div>
        <div className="cartao">
          <table className="tabela-dados">
            <tbody>
              <tr>
                <td>Multa por atraso</td>
                <td className="direita">{contrato.percentualMulta}%</td>
              </tr>
              <tr>
                <td>Juros ao dia</td>
                <td className="direita">{contrato.percentualJurosDia}%</td>
              </tr>
              <tr>
                <td>Desconto de pontualidade</td>
                <td className="direita">{formatarMoeda(contrato.descontoPontualidade)}</td>
              </tr>
              <tr>
                <td>Garantia</td>
                <td className="direita">
                  {rotular(contrato.tipoGarantia)}
                  {contrato.valorGarantia ? ` · ${formatarMoeda(contrato.valorGarantia)}` : ''}
                </td>
              </tr>
              <tr>
                <td>Chave Pix</td>
                <td className="direita">
                  {contrato.chavePix
                    ? `${contrato.chavePix.tipoChave}: ${contrato.chavePix.chave}`
                    : 'Chave padrão'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
