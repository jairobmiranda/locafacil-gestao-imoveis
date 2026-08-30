import { z } from 'zod';

import { paginacaoSchema } from './comum';

export const naturezaSchema = z.enum(['ENTRADA', 'SAIDA']);

export const situacaoLancamentoSchema = z.enum([
  'PENDENTE',
  'PAGO',
  'ATRASADO',
  'PARCIAL',
  'CANCELADO',
]);

export const formaPagamentoSchema = z.enum(['PIX', 'TED', 'DINHEIRO', 'BOLETO', 'CARTAO']);

export const itemLancamentoSchema = z.object({
  categoriaId: z.string().uuid(),
  descricao: z.string().min(1).max(150),
  valor: z.number().positive(),
  ordem: z.number().int().nonnegative().default(0),
});

const somaDosItensConfere = (dados: {
  valor?: number;
  itens?: { valor: number }[];
}) =>
  dados.itens === undefined ||
  dados.valor === undefined ||
  Math.abs(dados.itens.reduce((total, item) => total + item.valor, 0) - dados.valor) < 0.01;

const lancamentoBaseSchema = z.object({
  imovelId: z.string().uuid(),
  contratoId: z.string().uuid().optional(),
  categoriaId: z.string().uuid(),
  pessoaId: z.string().uuid().optional(),
  natureza: naturezaSchema,
  descricao: z.string().min(1).max(200),
  valor: z.number().positive(),
  competencia: z.coerce.date(),
  vencimento: z.coerce.date().optional(),
  capitalizavel: z.boolean().default(false),
  formaPagamento: formaPagamentoSchema.optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemLancamentoSchema).optional(),
});

export const criarLancamentoSchema = lancamentoBaseSchema.refine(somaDosItensConfere, {
  message: 'A soma dos itens deve ser igual ao valor do lançamento',
  path: ['itens'],
});

export const atualizarLancamentoSchema = lancamentoBaseSchema
  .omit({ imovelId: true })
  .partial()
  .refine(somaDosItensConfere, {
    message: 'A soma dos itens deve ser igual ao valor do lançamento',
    path: ['itens'],
  });

export const listarLancamentosSchema = paginacaoSchema.extend({
  imovelId: z.string().uuid().optional(),
  contratoId: z.string().uuid().optional(),
  categoriaId: z.string().uuid().optional(),
  pessoaId: z.string().uuid().optional(),
  natureza: naturezaSchema.optional(),
  situacao: situacaoLancamentoSchema.optional(),
  capitalizavel: z.coerce.boolean().optional(),
  competenciaDe: z.coerce.date().optional(),
  competenciaAte: z.coerce.date().optional(),
  vencimentoDe: z.coerce.date().optional(),
  vencimentoAte: z.coerce.date().optional(),
});

export const baixarLancamentoSchema = z.object({
  pagoEm: z.coerce.date(),
  valorPago: z.number().positive(),
  formaPagamento: formaPagamentoSchema,
  anexoComprovanteId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

/** Enviado pelo inquilino no link publico; nao da baixa, apenas avisa. */
export const informarPagamentoSchema = z.object({
  pagoEm: z.coerce.date(),
  valor: z.coerce.number().positive(),
  formaPagamento: formaPagamentoSchema,
  observacoes: z.string().max(500).optional(),
});

export type CriarLancamentoDto = z.infer<typeof criarLancamentoSchema>;
export type AtualizarLancamentoDto = z.infer<typeof atualizarLancamentoSchema>;
export type ListarLancamentosDto = z.infer<typeof listarLancamentosSchema>;
export type BaixarLancamentoDto = z.infer<typeof baixarLancamentoSchema>;
export type InformarPagamentoDto = z.infer<typeof informarPagamentoSchema>;
export type Natureza = z.infer<typeof naturezaSchema>;
export type SituacaoLancamento = z.infer<typeof situacaoLancamentoSchema>;
export type FormaPagamento = z.infer<typeof formaPagamentoSchema>;
