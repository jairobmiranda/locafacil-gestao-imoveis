import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarData } from '@/lib/formato';
import type { Paginado } from '@/lib/tipos';
import { FormularioVistoria, type RoteiroOpcao } from '../formulario-vistoria';
import '../vistorias.css';

type ImovelOpcao = {
  id: string;
  apelido: string;
  tipo: string;
  quartos: number | null;
  vagas: number | null;
};
type ContratoOpcao = {
  id: string;
  imovelId: string;
  dataInicio: string;
  dataFim: string;
  imovel: { apelido: string };
};

export default async function PaginaNovaVistoria() {
  const [imoveis, contratos, roteiros] = await Promise.all([
    apiGet<Paginado<ImovelOpcao>>('/imoveis', { limite: 100 }),
    apiGet<Paginado<ContratoOpcao>>('/contratos', { limite: 100 }),
    apiGet<RoteiroOpcao[]>('/vistorias/roteiros'),
  ]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Nova vistoria</h1>
          <p className="texto-suave">
            <Link href="/vistorias" className="link">
              Voltar para a lista
            </Link>
          </p>
        </div>
      </div>

      <FormularioVistoria
        imoveis={imoveis.itens}
        roteiros={roteiros}
        contratos={contratos.itens.map((contrato) => ({
          id: contrato.id,
          imovelId: contrato.imovelId,
          rotulo: `${contrato.imovel.apelido} · ${formatarData(contrato.dataInicio)} a ${formatarData(contrato.dataFim)}`,
        }))}
      />
    </>
  );
}
