import { z } from 'zod';

import { naturezaSchema } from './lancamento';

export const criarCategoriaSchema = z.object({
  nome: z.string().min(1).max(80),
  natureza: naturezaSchema,
  categoriaPaiId: z.string().uuid().optional(),
  capitalizavelPadrao: z.boolean().default(false),
  codigoFiscal: z.string().max(20).optional(),
  ativa: z.boolean().default(true),
});

/** A natureza fica de fora: mudar depois inverteria o sinal de lançamentos já registrados. */
export const atualizarCategoriaSchema = z.object({
  nome: z.string().min(1).max(80).optional(),
  categoriaPaiId: z.string().uuid().nullable().optional(),
  capitalizavelPadrao: z.boolean().optional(),
  codigoFiscal: z.string().max(20).nullable().optional(),
  ativa: z.boolean().optional(),
});

export const listarCategoriasSchema = z.object({
  natureza: naturezaSchema.optional(),
  incluirInativas: z.coerce.boolean().default(false),
});

export type CriarCategoriaDto = z.infer<typeof criarCategoriaSchema>;
export type AtualizarCategoriaDto = z.infer<typeof atualizarCategoriaSchema>;
export type ListarCategoriasDto = z.infer<typeof listarCategoriasSchema>;
