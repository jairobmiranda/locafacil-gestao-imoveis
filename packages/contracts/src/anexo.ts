import { z } from 'zod';

export const entidadeAnexoSchema = z.enum(['IMOVEL', 'LANCAMENTO', 'CONTRATO', 'PESSOA']);

export const especieAnexoSchema = z.enum([
  'COMPROVANTE',
  'NOTA_FISCAL',
  'CONTRATO',
  'FOTO',
  'ESCRITURA',
  'LAUDO',
  'OUTRO',
]);

export const enviarAnexoSchema = z.object({
  entidadeTipo: entidadeAnexoSchema,
  entidadeId: z.string().uuid(),
  especie: especieAnexoSchema,
});

export const listarAnexosSchema = z.object({
  entidadeTipo: entidadeAnexoSchema,
  entidadeId: z.string().uuid(),
  especie: especieAnexoSchema.optional(),
});

/** Tipos aceitos no upload. Manter alinhado com a validacao da API. */
export const TIPOS_ANEXO_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

export const TAMANHO_MAXIMO_ANEXO_BYTES = 15 * 1024 * 1024;

export type EntidadeAnexo = z.infer<typeof entidadeAnexoSchema>;
export type EspecieAnexo = z.infer<typeof especieAnexoSchema>;
export type EnviarAnexoDto = z.infer<typeof enviarAnexoSchema>;
export type ListarAnexosDto = z.infer<typeof listarAnexosSchema>;
