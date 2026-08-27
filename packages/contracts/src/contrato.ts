import { z } from 'zod';

import { paginacaoSchema } from './comum';

export const situacaoContratoSchema = z.enum(['RASCUNHO', 'ATIVO', 'ENCERRADO', 'RESCINDIDO']);
export const indiceReajusteSchema = z.enum(['IGPM', 'IPCA', 'INCC', 'NENHUM']);
export const tipoGarantiaSchema = z.enum(['CAUCAO', 'FIADOR', 'SEGURO_FIANCA', 'NENHUMA']);
export const papelParteSchema = z.enum(['INQUILINO', 'FIADOR', 'CONJUGE']);

export const itemContratoSchema = z.object({
  categoriaId: z.string().uuid(),
  descricao: z.string().min(1).max(150),
  valor: z.number().positive(),
  ativo: z.boolean().default(true),
});

export const parteContratoSchema = z.object({
  pessoaId: z.string().uuid(),
  papel: papelParteSchema,
  contatoPrincipal: z.boolean().default(false),
});

const contratoBaseSchema = z.object({
  imovelId: z.string().uuid(),
  situacao: situacaoContratoSchema.default('RASCUNHO'),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  diaVencimento: z.number().int().min(1).max(31),
  valorAluguel: z.number().positive(),
  percentualMulta: z.number().min(0).max(100).default(2),
  percentualJurosDia: z.number().min(0).max(10).default(0.033),
  descontoPontualidade: z.number().min(0).default(0),
  indiceReajuste: indiceReajusteSchema.default('IGPM'),
  intervaloReajusteMeses: z.number().int().min(1).max(60).default(12),
  tipoGarantia: tipoGarantiaSchema.default('NENHUMA'),
  valorGarantia: z.number().min(0).optional(),
  chavePixId: z.string().uuid().optional(),
  reguaCobrancaId: z.string().uuid().optional(),
  diasAvisoEncerramento: z.number().int().min(0).max(365).default(90),
  gerarCobrancas: z.boolean().default(true),
  diasAntecedenciaGeracao: z.number().int().min(0).max(60).default(10),
  observacoes: z.string().optional(),
  itens: z.array(itemContratoSchema).default([]),
  partes: z.array(parteContratoSchema).min(1),
});

const periodoValido = (dados: { dataInicio?: Date; dataFim?: Date }) =>
  !dados.dataInicio || !dados.dataFim || dados.dataFim > dados.dataInicio;

const umContatoPrincipal = (dados: { partes?: { contatoPrincipal: boolean }[] }) =>
  !dados.partes || dados.partes.filter((parte) => parte.contatoPrincipal).length === 1;

export const criarContratoSchema = contratoBaseSchema
  .refine(periodoValido, { message: 'A data fim deve ser depois da data início', path: ['dataFim'] })
  .refine(umContatoPrincipal, {
    message: 'Defina exatamente uma parte como contato principal',
    path: ['partes'],
  });

export const atualizarContratoSchema = contratoBaseSchema
  .omit({ imovelId: true })
  .partial()
  .refine(periodoValido, { message: 'A data fim deve ser depois da data início', path: ['dataFim'] })
  .refine(umContatoPrincipal, {
    message: 'Defina exatamente uma parte como contato principal',
    path: ['partes'],
  });

export const listarContratosSchema = paginacaoSchema.extend({
  imovelId: z.string().uuid().optional(),
  pessoaId: z.string().uuid().optional(),
  situacao: situacaoContratoSchema.optional(),
  vencendoEmDias: z.coerce.number().int().min(1).max(365).optional(),
});

export const reajustarContratoSchema = z.object({
  percentual: z.number().min(-50).max(200),
  vigenteA: z.coerce.date().optional(),
});

export const encerrarContratoSchema = z.object({
  dataRescisao: z.coerce.date().optional(),
  motivo: z.string().max(500).optional(),
});

export type SituacaoContrato = z.infer<typeof situacaoContratoSchema>;
export type IndiceReajuste = z.infer<typeof indiceReajusteSchema>;
export type TipoGarantia = z.infer<typeof tipoGarantiaSchema>;
export type PapelParte = z.infer<typeof papelParteSchema>;
export type CriarContratoDto = z.infer<typeof criarContratoSchema>;
export type AtualizarContratoDto = z.infer<typeof atualizarContratoSchema>;
export type ListarContratosDto = z.infer<typeof listarContratosSchema>;
export type ReajustarContratoDto = z.infer<typeof reajustarContratoSchema>;
export type EncerrarContratoDto = z.infer<typeof encerrarContratoSchema>;
