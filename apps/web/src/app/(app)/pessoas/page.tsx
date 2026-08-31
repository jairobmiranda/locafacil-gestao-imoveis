import Link from 'next/link';
import { Suspense } from 'react';
import { apiGet } from '@/lib/api';
import { mascararDocumento, mascararTelefone } from '@/lib/mascaras';
import type { Paginado, Pessoa } from '@/lib/tipos';
import { BuscaPessoas } from './busca-pessoas';

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

      {/* useSearchParams precisa de fronteira propria, senao suspende a pagina inteira. */}
      <Suspense fallback={<div className="filtros" />}>
        <BuscaPessoas />
      </Suspense>

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
                  <td data-label="Documento">{mascararDocumento(pessoa.documento) || '-'}</td>
                  <td data-label="E-mail">
                    {pessoa.email ?? <span className="texto-suave">sem e-mail</span>}
                  </td>
                  <td data-label="Telefone">{mascararTelefone(pessoa.telefone) || '-'}</td>
                  <td data-label="Cidade">{pessoa.cidade ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
