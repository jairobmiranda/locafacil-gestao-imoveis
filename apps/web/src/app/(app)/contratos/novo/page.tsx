import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { Imovel, Paginado, Pessoa } from '@/lib/tipos';
import { FormularioContrato } from '../formulario-contrato';

type Categoria = { id: string; nome: string; natureza: 'ENTRADA' | 'SAIDA' };
type ChavePix = { id: string; tipoChave: string; chave: string; ativa: boolean };

export default async function PaginaNovoContrato() {
  const [imoveis, pessoas, categorias, chaves] = await Promise.all([
    apiGet<Paginado<Imovel>>('/imoveis', { limite: 100 }),
    apiGet<Paginado<Pessoa>>('/pessoas', { limite: 200 }),
    apiGet<Categoria[]>('/categorias', { natureza: 'ENTRADA' }),
    apiGet<ChavePix[]>('/pix/chaves'),
  ]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Novo contrato</h1>
          <p className="texto-suave">
            <Link href="/contratos" className="link">
              Voltar para a lista
            </Link>
          </p>
        </div>
      </div>

      {pessoas.itens.length === 0 ? (
        <p className="aviso">
          Nenhuma pessoa cadastrada.{' '}
          <Link href="/pessoas/nova" className="link">
            Cadastre o inquilino
          </Link>{' '}
          antes de criar o contrato.
        </p>
      ) : null}

      <FormularioContrato
        imoveis={imoveis.itens.map((imovel) => ({ id: imovel.id, rotulo: imovel.apelido }))}
        pessoas={pessoas.itens.map((pessoa) => ({
          id: pessoa.id,
          rotulo: pessoa.email ? `${pessoa.nome} (${pessoa.email})` : `${pessoa.nome} (sem e-mail)`,
        }))}
        categorias={categorias}
        chavesPix={chaves
          .filter((chave) => chave.ativa)
          .map((chave) => ({ id: chave.id, rotulo: `${chave.tipoChave}: ${chave.chave}` }))}
      />
    </>
  );
}
