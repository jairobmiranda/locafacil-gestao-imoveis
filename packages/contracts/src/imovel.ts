import { z } from 'zod';

import { paginacaoSchema } from './comum';

export const estrategiaSchema = z.enum(['REVENDA', 'LOCACAO', 'TERRENO', 'USO_PROPRIO']);

export const situacaoImovelSchema = z.enum([
  'PROSPECCAO',
  'ADQUIRIDO',
  'EM_REFORMA',
  'A_VENDA',
  'PARA_ALUGAR',
  'ALUGADO',
  'VENDIDO',
]);

export const tipoImovelSchema = z.enum(['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL', 'RURAL']);

export const criarImovelSchema = z.object({
  apelido: z.string().min(1).max(80),
  estrategia: estrategiaSchema,
  situacao: situacaoImovelSchema.default('PROSPECCAO'),
  tipo: tipoImovelSchema,
  cep: z.string().max(9).optional(),
  logradouro: z.string().max(150).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(80).optional(),
  bairro: z.string().max(80).optional(),
  cidade: z.string().max(80).optional(),
  uf: z.string().length(2).optional(),
  matricula: z.string().max(50).optional(),
  inscricaoMunicipal: z.string().max(50).optional(),
  areaTotal: z.number().nonnegative().optional(),
  areaConstruida: z.number().nonnegative().optional(),
  quartos: z.number().int().nonnegative().optional(),
  vagas: z.number().int().nonnegative().optional(),
  dataAquisicao: z.coerce.date().optional(),
  valorAquisicao: z.number().nonnegative().optional(),
  valorVendaAlvo: z.number().nonnegative().optional(),
  aluguelAlvo: z.number().nonnegative().optional(),
  observacoes: z.string().optional(),
});

export const atualizarImovelSchema = criarImovelSchema.partial();

export const listarImoveisSchema = paginacaoSchema.extend({
  estrategia: estrategiaSchema.optional(),
  situacao: situacaoImovelSchema.optional(),
  tipo: tipoImovelSchema.optional(),
  busca: z.string().trim().min(1).max(80).optional(),
  incluirArquivados: z.coerce.boolean().default(false),
});

export type CriarImovelDto = z.infer<typeof criarImovelSchema>;
export type AtualizarImovelDto = z.infer<typeof atualizarImovelSchema>;
export type ListarImoveisDto = z.infer<typeof listarImoveisSchema>;
export type Estrategia = z.infer<typeof estrategiaSchema>;
export type SituacaoImovel = z.infer<typeof situacaoImovelSchema>;
export type TipoImovel = z.infer<typeof tipoImovelSchema>;
