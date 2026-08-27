import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarData, formatarMoeda, rotular } from '@/lib/formato';
import type { Contrato, Paginado } from '@/lib/tipos';
import { BotaoGerarCobrancas } from './botao-gerar-cobrancas';

export default async function PaginaContratos() {
  const dados = await apiGet<Paginado<Contrato>>('/contratos', { limite: 50 });

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Contratos</h1>
          <p className="texto-suave">{dados.total} contrato(s)</p>
        </div>
        <div className="acoes-cabecalho">
          <BotaoGerarCobrancas />
          <Link href="/contratos/novo" className="botao botao-primario">
            Novo contrato
          </Link>
        </div>
      </div>

      {dados.itens.length === 0 ? (
        <div className="cartao vazio">
          <p>Nenhum contrato cadastrado.</p>
        </div>
      ) : (
        <div className="cartao">
          <table className="tabela">
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Inquilino</th>
                <th>Vigência</th>
                <th>Venc.</th>
                <th>Situação</th>
                <th>Reajuste</th>
                <th className="direita">Aluguel</th>
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((contrato) => {
                const inquilino = contrato.partes.find((parte) => parte.contatoPrincipal);

                return (
                  <tr key={contrato.id}>
                    <td>
                      <Link href={`/contratos/${contrato.id}`} className="link">
                        {contrato.imovel.apelido}
                      </Link>
                    </td>
                    <td>{inquilino?.pessoa.nome ?? '-'}</td>
                    <td>
                      {formatarData(contrato.dataInicio)} a {formatarData(contrato.dataFim)}
                    </td>
                    <td>dia {contrato.diaVencimento}</td>
                    <td>
                      <span className={`etiqueta situacao-${contrato.situacao.toLowerCase()}`}>
                        {rotular(contrato.situacao)}
                      </span>
                    </td>
                    <td>{formatarData(contrato.proximoReajusteEm)}</td>
                    <td className="direita">{formatarMoeda(contrato.valorAluguel)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
