import { apiGet } from '@/lib/api';
import { GerenciadorChavesPix } from './gerenciador-chaves-pix';

type ChavePix = {
  id: string;
  tipoChave: string;
  chave: string;
  nomeBeneficiario: string;
  cidadeBeneficiario: string;
  padrao: boolean;
  ativa: boolean;
};

export default async function PaginaChavesPix() {
  const chaves = await apiGet<ChavePix[]>('/pix/chaves');

  return <GerenciadorChavesPix chaves={chaves} />;
}
