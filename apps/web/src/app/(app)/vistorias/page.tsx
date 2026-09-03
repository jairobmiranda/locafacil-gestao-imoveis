import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarData, rotular } from '@/lib/formato';

type VistoriaLista = {
  id: string;
  tipo: string;
  situacao: string;
  criadoEm: string;
  conviteEmail: string | null;
  imovel: { id: string; apelido: string };
};

// Enum tem valores compostos (CONVITE_ENVIADO, EM_EXECUCAO) que nao batem com as
// classes de cor existentes so por lowercase, entao o mapeamento e explicito.
const CLASSE_SITUACAO: Record<string, string> = {
  RASCUNHO: 'pendente',
  CONVITE_ENVIADO: 'enviado',
  EM_EXECUCAO: 'pendente',
  ENVIADA: 'pendente',
  APROVADA: 'aceito',
  RECUSADA: 'recusado',
};

const EM_ANDAMENTO = new Set(['RASCUNHO', 'CONVITE_ENVIADO', 'EM_EXECUCAO']);

export default async function PaginaVistorias() {
  const vistorias = await apiGet<VistoriaLista[]>('/vistorias');

  const emAndamento = vistorias.filter((item) => EM_ANDAMENTO.has(item.situacao)).length;
  const aguardandoAprovacao = vistorias.filter((item) => item.situacao === 'ENVIADA').length;
  const aprovadas = vistorias.filter((item) => item.situacao === 'APROVADA').length;

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
        <Link href="/vistorias/nova" className="botao botao-primario">
          Nova vistoria
        </Link>
      </div>

      <div className="indicadores">
        <div className="cartao indicador">
          <span className="texto-suave">Vistorias</span>
          <strong>{vistorias.length}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Em andamento</span>
          <strong>{emAndamento}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Aguardando aprovação</span>
          <strong>{aguardandoAprovacao}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Aprovadas</span>
          <strong>{aprovadas}</strong>
        </div>
      </div>

      {vistorias.length === 0 ? (
        <div className="cartao vazio">
          <p>Nenhuma vistoria criada.</p>
        </div>
      ) : (
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
              {vistorias.map((vistoria) => (
                <tr key={vistoria.id}>
                  <td>
                    <Link href={`/vistorias/${vistoria.id}`} className="link">
                      {vistoria.imovel.apelido}
                    </Link>
                  </td>
                  <td data-label="Tipo">{rotular(vistoria.tipo)}</td>
                  <td data-label="Situação">
                    <span className={`etiqueta situacao-${CLASSE_SITUACAO[vistoria.situacao] ?? ''}`}>
                      {rotular(vistoria.situacao)}
                    </span>
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
      )}
    </>
  );
}
