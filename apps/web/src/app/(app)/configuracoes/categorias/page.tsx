import { apiGet } from '@/lib/api';
import { GerenciadorCategorias, type Categoria } from './gerenciador-categorias';

export default async function PaginaCategorias() {
  const categorias = await apiGet<Categoria[]>('/categorias', { incluirInativas: true });

  return <GerenciadorCategorias categorias={categorias} />;
}
