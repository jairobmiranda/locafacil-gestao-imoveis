import { z } from 'zod';

import { cepSchema, documentoSchema, paginacaoSchema, telefoneSchema } from './comum';

export const estadoCivilSchema = z.enum([
  'SOLTEIRO',
  'CASADO',
  'DIVORCIADO',
  'VIUVO',
  'UNIAO_ESTAVEL',
  'SEPARADO',
]);

export const criarPessoaSchema = z.object({
  nome: z.string().min(1).max(150),
  documento: documentoSchema.optional(),
  email: z.string().email().max(150).optional(),
  telefone: telefoneSchema.optional(),
  dataNascimento: z.coerce.date().optional(),
  rg: z.string().max(20).optional(),
  orgaoExpedidor: z.string().max(20).optional(),
  nacionalidade: z.string().max(40).optional(),
  estadoCivil: estadoCivilSchema.optional(),
  profissao: z.string().max(80).optional(),
  cep: cepSchema.optional(),
  logradouro: z.string().max(150).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(80).optional(),
  bairro: z.string().max(80).optional(),
  cidade: z.string().max(80).optional(),
  uf: z.string().length(2).optional(),
  observacoes: z.string().optional(),
});

export const atualizarPessoaSchema = criarPessoaSchema.partial();

export const listarPessoasSchema = paginacaoSchema.extend({
  busca: z.string().trim().min(1).max(150).optional(),
  incluirArquivadas: z.coerce.boolean().default(false),
});

export type CriarPessoaDto = z.infer<typeof criarPessoaSchema>;
export type AtualizarPessoaDto = z.infer<typeof atualizarPessoaSchema>;
export type ListarPessoasDto = z.infer<typeof listarPessoasSchema>;
export type EstadoCivil = z.infer<typeof estadoCivilSchema>;
