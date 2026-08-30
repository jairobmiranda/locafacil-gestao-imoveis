import Link from 'next/link';
import type { RespostasBlindagem } from '@locafacil/contracts';
import { apiGet } from '@/lib/api';
import { formatarData, rotular } from '@/lib/formato';
import type { Paginado } from '@/lib/tipos';
import { WizardMinuta } from './wizard-minuta';
import './minuta.css';

type ContratoMinuta = {
  id: string;
  finalidade: string;
  tipoGarantia: string;
  valorGarantia: number | null;
  valorAluguel: number;
  dataInicio: string;
  dataFim: string;
  diaVencimento: number;
  respostasBlindagem: RespostasBlindagem | null;
  imovel: { id: string; apelido: string; cidade: string | null };
  partes: {
    id: string;
    papel: string;
    contatoPrincipal: boolean;
    participacao: number | null;
    pessoa: { id: string; nome: string };
  }[];
};

type PessoaLista = {
  id: string;
  nome: string;
  documento: string | null;
  estadoCivil: string | null;
};

type MinutaResumo = {
  id: string;
  versao: number;
  situacao: string;
  hashConteudo: string;
  criadoEm: string;
};

export default async function PaginaMinuta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contrato, pessoas, minutas] = await Promise.all([
    apiGet<ContratoMinuta>(`/contratos/${id}`),
    apiGet<Paginado<PessoaLista>>('/pessoas', { limite: 100 }),
    apiGet<MinutaResumo[]>(`/contratos/${id}/minutas`),
  ]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Gerar contrato</h1>
          <p className="texto-suave">
            <Link href={`/contratos/${id}`} className="link">
              {contrato.imovel.apelido}
            </Link>{' '}
            · {formatarData(contrato.dataInicio)} a {formatarData(contrato.dataFim)}
          </p>
        </div>
      </div>

      {minutas.length > 0 ? (
        <section className="nao-imprimir">
          <div className="cabecalho-secao">
            <h2>Versões geradas</h2>
          </div>
          <div className="cartao">
            <table className="tabela">
              <tbody>
                {minutas.map((minuta) => (
                  <tr key={minuta.id}>
                    <td>
                      <Link href={`/contratos/${id}/minuta/${minuta.id}`} className="link">
                        Versão {minuta.versao}
                      </Link>
                    </td>
                    <td data-label="Situação">
                      <span className="etiqueta">{rotular(minuta.situacao)}</span>
                    </td>
                    <td data-label="Gerada em">{formatarData(minuta.criadoEm)}</td>
                    <td data-label="Hash">
                      <code>{minuta.hashConteudo.slice(0, 12)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <WizardMinuta
        contrato={{
          id: contrato.id,
          finalidade: contrato.finalidade,
          tipoGarantia: contrato.tipoGarantia,
          valorGarantia: contrato.valorGarantia,
          valorAluguel: contrato.valorAluguel,
          dataInicio: contrato.dataInicio,
          dataFim: contrato.dataFim,
          diaVencimento: contrato.diaVencimento,
          imovel: { apelido: contrato.imovel.apelido, cidade: contrato.imovel.cidade },
          respostasBlindagem: contrato.respostasBlindagem,
          partes: contrato.partes.map((parte) => ({
            pessoaId: parte.pessoa.id,
            papel: parte.papel,
            contatoPrincipal: parte.contatoPrincipal,
            participacao: parte.participacao,
          })),
        }}
        pessoas={pessoas.itens}
      />
    </>
  );
}
