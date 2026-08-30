import { apiGet } from '@/lib/api';
import { EditorRegua } from './editor-regua';

type Regua = {
  id: string;
  nome: string;
  padrao: boolean;
  ativa: boolean;
  modeloConsolidado: { id: string; nome: string } | null;
  regras: {
    id: string;
    sequencia: number;
    diasOffset: number;
    intervaloRepeticaoDias: number | null;
    maximoRepeticoes: number | null;
    horaEnvio: string;
    apenasSeSituacao: string | null;
    ativa: boolean;
    modeloEmail: { id: string; nome: string };
  }[];
};

export default async function PaginaRegua() {
  const [reguas, modelos] = await Promise.all([
    apiGet<Regua[]>('/cobranca/reguas'),
    apiGet<{ id: string; nome: string; ativo: boolean }[]>('/cobranca/modelos'),
  ]);

  return (
    <EditorRegua
      reguas={reguas}
      modelos={modelos.filter((modelo) => modelo.ativo).map(({ id, nome }) => ({ id, nome }))}
    />
  );
}
