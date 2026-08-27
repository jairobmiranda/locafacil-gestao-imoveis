import Link from 'next/link';
import { FormularioPessoa } from '../formulario-pessoa';

export default function PaginaNovaPessoa() {
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Nova pessoa</h1>
          <p className="texto-suave">
            <Link href="/pessoas" className="link">
              Voltar para a lista
            </Link>
          </p>
        </div>
      </div>

      <FormularioPessoa />
    </>
  );
}
