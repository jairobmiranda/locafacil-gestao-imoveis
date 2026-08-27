import Link from 'next/link';
import { FormularioImovel } from '../formulario-imovel';

export default function PaginaNovoImovel() {
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Novo imóvel</h1>
          <p className="texto-suave">
            <Link href="/imoveis" className="link">
              Voltar para a lista
            </Link>
          </p>
        </div>
      </div>

      <FormularioImovel />
    </>
  );
}
