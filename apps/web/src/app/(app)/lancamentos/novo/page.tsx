import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { Imovel, Paginado } from '@/lib/tipos';
import { FormularioLancamento } from '../formulario-lancamento';

type Categoria = { id: string; nome: string; natureza: 'ENTRADA' | 'SAIDA' };

export default async function PaginaNovoLancamento() {
  const [imoveis, categorias] = await Promise.all([
    apiGet<Paginado<Imovel>>('/imoveis', { limite: 100 }),
    apiGet<Categoria[]>('/categorias'),
  ]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Novo lançamento</h1>
          <p className="texto-suave">
            <Link href="/lancamentos" className="link">
              Voltar para a lista
            </Link>
          </p>
        </div>
      </div>

      <FormularioLancamento
        imoveis={imoveis.itens.map(({ id, apelido }) => ({ id, apelido }))}
        categorias={categorias}
      />
    </>
  );
}
