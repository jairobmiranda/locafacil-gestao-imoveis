import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarData, rotular } from '@/lib/formato';
import type { Paginado } from '@/lib/tipos';
import { FormularioVistoria } from './formulario-vistoria';

type VistoriaLista = {
  id: string;
  tipo: string;
  situacao: string;
  criadoEm: string;
  conviteEmail: string | null;
  imovel: { id: string; apelido: string };
};

type ImovelOpcao = { id: string; apelido: string };
type ContratoOpcao = {
  id: string;
  imovelId: string;
  dataInicio: string;
  dataFim: string;
  imovel: { apelido: string };
};

export default async function PaginaVistorias() {
  const [vistorias, imoveis, contratos] = await Promise.all([
    apiGet<VistoriaLista[]>('/vistorias'),
    apiGet<Paginado<ImovelOpcao>>('/imoveis', { limite: 100 }),
    apiGet<Paginado<ContratoOpcao>>('/contratos', { limite: 100 }),
  ]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Vistorias</h1>
          <p className="texto-suave">
            O cliente executa pelo celular, por um link enviado por e-mail. Você confere e gera o
            laudo.
          </p>
        </div>
      </div>

      <section>
        <div className="cabecalho-secao">
          <h2>Nova vistoria</h2>
        </div>
        <FormularioVistoria
          imoveis={imoveis.itens}
          contratos={contratos.itens.map((contrato) => ({
            id: contrato.id,
            imovelId: contrato.imovelId,
            rotulo: `${contrato.imovel.apelido} · ${formatarData(contrato.dataInicio)} a ${formatarData(contrato.dataFim)}`,
          }))}
        />
      </section>

      <section>
        <div className="cabecalho-secao">
          <h2>Em andamento e concluídas</h2>
        </div>
        <div className="cartao">
          <table className="tabela">
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Tipo</th>
                <th>Situação</th>
                <th>Convite</th>
                <th>Criada</th>
              </tr>
            </thead>
            <tbody>
              {vistorias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="texto-suave">
                    Nenhuma vistoria criada.
                  </td>
                </tr>
              ) : null}
              {vistorias.map((vistoria) => (
                <tr key={vistoria.id}>
                  <td>
                    <Link href={`/vistorias/${vistoria.id}`} className="link">
                      {vistoria.imovel.apelido}
                    </Link>
                  </td>
                  <td data-label="Tipo">{rotular(vistoria.tipo)}</td>
                  <td data-label="Situação">
                    <span className="etiqueta">{rotular(vistoria.situacao)}</span>
                  </td>
                  <td data-label="Convite">
                    {vistoria.conviteEmail ?? <span className="texto-suave">não enviado</span>}
                  </td>
                  <td data-label="Criada">{formatarData(vistoria.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
