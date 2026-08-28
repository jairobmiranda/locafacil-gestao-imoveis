import { redirect } from 'next/navigation';
import type { UsuarioAutenticado } from '@locafacil/contracts';
import { apiGet } from '@/lib/api';
import { GerenciadorUsuarios, type UsuarioLista } from './gerenciador-usuarios';

export default async function PaginaUsuarios() {
  const usuario = await apiGet<UsuarioAutenticado>('/auth/eu');

  if (usuario.perfil !== 'ADMIN') {
    redirect('/configuracoes/pix');
  }

  const usuarios = await apiGet<UsuarioLista[]>('/usuarios');

  return <GerenciadorUsuarios usuarios={usuarios} usuarioAtualId={usuario.id} />;
}
