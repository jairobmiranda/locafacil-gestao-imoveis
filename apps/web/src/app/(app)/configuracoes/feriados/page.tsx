import { apiGet } from '@/lib/api';
import { GerenciadorFeriados, type Feriado } from './gerenciador-feriados';

export default async function PaginaFeriados() {
  const feriados = await apiGet<Feriado[]>('/feriados');

  return <GerenciadorFeriados feriados={feriados} />;
}
