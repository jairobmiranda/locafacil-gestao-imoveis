import { z } from 'zod';

import { paginacaoSchema } from './comum';

/** Aceita CPF ou CNPJ apenas com digitos. A validacao dos digitos fica no servico. */
const documentoSchema = z
  .string()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine((valor) => valor.length === 11 || valor.length === 14, {
    message: 'Informe um CPF com 11 dígitos ou CNPJ com 14',
  });

export const criarPessoaSchema = z.object({
  nome: z.string().min(1).max(150),
  documento: documentoSchema.optional(),
  email: z.string().email().max(150).optional(),
  telefone: z.string().max(20).optional(),
  dataNascimento: z.coerce.date().optional(),
  cep: z.string().max(9).optional(),
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
