import { z } from 'zod';

export const situacaoMinutaSchema = z.enum([
  'RASCUNHO',
  'GERADA',
  'ENVIADA_ASSINATURA',
  'ASSINADA',
  'CANCELADA',
]);

export const perfilBlindagemSchema = z.enum([
  'CONSERVADOR',
  'EQUILIBRADO',
  'MAXIMA_PROTECAO',
  'PERSONALIZADO',
]);

/**
 * Escolhas do wizard. Cada campo liga ou desliga um conjunto de clausulas.
 * Os nomes sao os mesmos usados nas condicoes da biblioteca de clausulas da API.
 */
export const respostasBlindagemSchema = z.object({
  perfil: perfilBlindagemSchema.default('EQUILIBRADO'),

  // Conservacao e uso
  renunciaBenfeitorias: z.boolean().default(true),
  vedarSublocacao: z.boolean().default(true),
  vedarObras: z.boolean().default(true),
  vedarAnimais: z.boolean().default(false),
  vedarMudancaDestinacao: z.boolean().default(true),
  exigirComunicacaoOcupantes: z.boolean().default(true),

  // Encargos
  iptuPorLocatario: z.boolean().default(true),
  condominioPorLocatario: z.boolean().default(true),
  seguroIncendioPorLocatario: z.boolean().default(true),
  transferirContasConsumo: z.boolean().default(true),
  prazoTransferenciaConsumoDias: z.number().int().min(1).max(90).default(30),

  // Rescisao e execucao
  /** Multa compensatoria em numero de alugueis, reduzida proporcionalmente (art. 4o). */
  multaRescisoriaAlugueis: z.number().min(0).max(6).default(3),
  duasTestemunhas: z.boolean().default(true),
  direitoPreferencia: z.boolean().default(true),

  // Vistoria
  exigirVistoriaEntrada: z.boolean().default(true),
  exigirVistoriaSaida: z.boolean().default(true),

  // Multi-parte
  clausulaSolidariedade: z.boolean().default(true),

  // Gerais
  comunicacoesEletronicas: z.boolean().default(true),
  clausulaLgpd: z.boolean().default(true),
  foroComarca: z.string().min(1).max(80).optional(),
  clausulasAdicionais: z.array(z.string().min(1).max(4000)).max(10).default([]),
});

export const gerarMinutaSchema = z.object({
  respostas: respostasBlindagemSchema,
});

export const enviarAssinaturaSchema = z.object({
  observacao: z.string().max(500).optional(),
});

export const alertaMinutaSchema = z.object({
  severidade: z.enum(['INFO', 'ATENCAO', 'BLOQUEIO']),
  mensagem: z.string(),
  clausulaId: z.string().optional(),
});

export const previaMinutaSchema = z.object({
  html: z.string(),
  nivelProtecao: z.number(),
  alertas: z.array(alertaMinutaSchema),
  clausulas: z.array(z.object({ id: z.string(), versao: z.number(), titulo: z.string() })),
});

export type SituacaoMinuta = z.infer<typeof situacaoMinutaSchema>;
export type PerfilBlindagem = z.infer<typeof perfilBlindagemSchema>;
export type RespostasBlindagem = z.infer<typeof respostasBlindagemSchema>;
export type GerarMinutaDto = z.infer<typeof gerarMinutaSchema>;
export type EnviarAssinaturaDto = z.infer<typeof enviarAssinaturaSchema>;
export type AlertaMinuta = z.infer<typeof alertaMinutaSchema>;
export type PreviaMinuta = z.infer<typeof previaMinutaSchema>;
