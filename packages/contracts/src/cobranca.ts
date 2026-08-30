import { z } from 'zod';

import { paginacaoSchema } from './comum';
import { situacaoLancamentoSchema } from './lancamento';

export const situacaoNotificacaoSchema = z.enum([
  'PENDENTE',
  'ENVIADO',
  'FALHOU',
  'IGNORADO',
  'CANCELADO',
]);

export const criarModeloEmailSchema = z.object({
  chave: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e underline'),
  nome: z.string().min(1).max(100),
  assunto: z.string().min(1).max(200),
  corpoHtml: z.string().min(1),
  corpoTexto: z.string().optional(),
  ativo: z.boolean().default(true),
});

export const atualizarModeloEmailSchema = criarModeloEmailSchema.omit({ chave: true }).partial();

export const criarReguaCobrancaSchema = z.object({
  nome: z.string().min(1).max(100),
  padrao: z.boolean().default(false),
  ativa: z.boolean().default(true),
});

export const atualizarReguaCobrancaSchema = criarReguaCobrancaSchema.partial();

export const criarRegraCobrancaSchema = z.object({
  diasOffset: z.number().int().min(-90).max(365),
  intervaloRepeticaoDias: z.number().int().min(1).max(90).nullish(),
  maximoRepeticoes: z.number().int().min(1).max(50).nullish(),
  modeloEmailId: z.string().uuid(),
  horaEnvio: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:mm')
    .default('09:00'),
  apenasSeSituacao: situacaoLancamentoSchema.nullish(),
  ativa: z.boolean().default(true),
});

export const atualizarRegraCobrancaSchema = criarRegraCobrancaSchema.partial();

export const listarNotificacoesSchema = paginacaoSchema.extend({
  lancamentoId: z.string().uuid().optional(),
  contratoId: z.string().uuid().optional(),
  situacao: situacaoNotificacaoSchema.optional(),
});

export const testarEmailSchema = z.object({
  destinatario: z.string().email(),
});

export const enviarCobrancaManualSchema = z.object({
  modeloEmailId: z.string().uuid(),
  /** Sobrescreve o contato principal do contrato. */
  destinatario: z.string().email().optional(),
});

export type SituacaoNotificacao = z.infer<typeof situacaoNotificacaoSchema>;
export type CriarModeloEmailDto = z.infer<typeof criarModeloEmailSchema>;
export type AtualizarModeloEmailDto = z.infer<typeof atualizarModeloEmailSchema>;
export type CriarReguaCobrancaDto = z.infer<typeof criarReguaCobrancaSchema>;
export type AtualizarReguaCobrancaDto = z.infer<typeof atualizarReguaCobrancaSchema>;
export type CriarRegraCobrancaDto = z.infer<typeof criarRegraCobrancaSchema>;
export type AtualizarRegraCobrancaDto = z.infer<typeof atualizarRegraCobrancaSchema>;
export type ListarNotificacoesDto = z.infer<typeof listarNotificacoesSchema>;
export type TestarEmailDto = z.infer<typeof testarEmailSchema>;
export type EnviarCobrancaManualDto = z.infer<typeof enviarCobrancaManualSchema>;

/** Variaveis aceitas no assunto e no corpo dos modelos. */
export const VARIAVEIS_MODELO_EMAIL = [
  'inquilino.nome',
  'inquilino.primeiro_nome',
  'imovel.apelido',
  'imovel.endereco',
  'cobranca.competencia',
  'cobranca.descricao',
  'cobranca.vencimento',
  'cobranca.valor',
  'cobranca.valor_total',
  'cobranca.valor_multa',
  'cobranca.valor_juros',
  'cobranca.dias_atraso',
  'cobranca.itens',
  'pix.copia_e_cola',
  'pix.qrcode',
  'pix.qrcode_url',
] as const;
