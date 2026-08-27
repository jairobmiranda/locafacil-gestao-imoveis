import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { Paginado, Pessoa } from '@/lib/tipos';
import { BuscaPessoas } from './busca-pessoas';

function formatarDocumento(documento: string | null): string {
  if (!documento) {
    return '-';
  }

  return documento.length === 11
    ? documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : documento.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export default async function PaginaPessoas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtros = await searchParams;

  const dados = await apiGet<Paginado<Pessoa>>('/pessoas', {
    busca: filtros.busca,
    pagina: filtros.pagina ?? 1,
    limite: 30,
  });

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Pessoas</h1>
          <p className="texto-suave">Inquilinos, fiadores, compradores e fornecedores</p>
        </div>
        <Link href="/pessoas/nova" className="botao botao-primario">
          Nova pessoa
        </Link>
      </div>

      <BuscaPessoas />

      {dados.itens.length === 0 ? (
        <div className="cartao vazio">
          <p>Nenhuma pessoa encontrada.</p>
        </div>
      ) : (
        <div className="cartao">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Cidade</th>
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((pessoa) => (
                <tr key={pessoa.id}>
                  <td>
                    <Link href={`/pessoas/${pessoa.id}`} className="link">
                      {pessoa.nome}
                    </Link>
                  </td>
                  <td>{formatarDocumento(pessoa.documento)}</td>
                  <td>{pessoa.email ?? <span className="texto-suave">sem e-mail</span>}</td>
                  <td>{pessoa.telefone ?? '-'}</td>
                  <td>{pessoa.cidade ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
