import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const perfilUsuarioSchema = z.enum(['ADMIN', 'OPERADOR', 'LEITURA']);

export type LoginDto = z.infer<typeof loginSchema>;
export type PerfilUsuario = z.infer<typeof perfilUsuarioSchema>;

export type UsuarioAutenticado = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
};

export type RespostaLogin = {
  token: string;
  usuario: UsuarioAutenticado;
};
