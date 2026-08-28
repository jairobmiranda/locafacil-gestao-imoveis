import { z } from 'zod';
import { perfilUsuarioSchema } from './auth';

export const criarUsuarioSchema = z.object({
  nome: z.string().min(1).max(150),
  email: z.string().email().max(150),
  senha: z.string().min(8).max(72),
  perfil: perfilUsuarioSchema.default('OPERADOR'),
  ativo: z.boolean().default(true),
});

export const atualizarUsuarioSchema = z
  .object({
    nome: z.string().min(1).max(150).optional(),
    email: z.string().email().max(150).optional(),
    senha: z.string().min(8).max(72).optional(),
    perfil: perfilUsuarioSchema.optional(),
    ativo: z.boolean().optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type CriarUsuarioDto = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioDto = z.infer<typeof atualizarUsuarioSchema>;

export type UsuarioResumo = {
  id: string;
  nome: string;
  email: string;
  perfil: z.infer<typeof perfilUsuarioSchema>;
  ativo: boolean;
  criadoEm: string;
};
