import { z } from 'zod';

/** Data pura (sem hora): o vencimento e comparado em dia, nao em instante. */
const dataSchema = z.coerce.date();

export const criarFeriadoSchema = z.object({
  data: dataSchema,
  descricao: z.string().min(1).max(120),
});

export const atualizarFeriadoSchema = z.object({
  data: dataSchema.optional(),
  descricao: z.string().min(1).max(120).optional(),
});

export const listarFeriadosSchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type CriarFeriadoDto = z.infer<typeof criarFeriadoSchema>;
export type AtualizarFeriadoDto = z.infer<typeof atualizarFeriadoSchema>;
export type ListarFeriadosDto = z.infer<typeof listarFeriadosSchema>;
