import { z } from 'zod';

export const tipoVistoriaSchema = z.enum(['ENTRADA', 'SAIDA', 'PERIODICA']);

export const situacaoVistoriaSchema = z.enum([
  'RASCUNHO',
  'CONVITE_ENVIADO',
  'EM_EXECUCAO',
  'ENVIADA',
  'APROVADA',
  'RECUSADA',
]);

export const estadoItemVistoriaSchema = z.enum([
  'NOVO',
  'BOM',
  'REGULAR',
  'RUIM',
  'AUSENTE',
  'NAO_APLICAVEL',
]);

export const criarVistoriaSchema = z.object({
  imovelId: z.string().uuid(),
  contratoId: z.string().uuid().optional(),
  tipo: tipoVistoriaSchema,
  responsavelId: z.string().uuid().optional(),
  /** Sobrescreve o roteiro deduzido do tipo do imovel. */
  roteiroChave: z.string().max(40).optional(),
  observacoes: z.string().max(2000).optional(),
});

export const enviarConviteSchema = z.object({
  email: z.string().email().max(150),
  /** Prazo de validade do link em dias. */
  validadeDias: z.number().int().min(1).max(60).default(15),
});

export const responderItemSchema = z.object({
  estado: estadoItemVistoriaSchema.nullish(),
  observacao: z.string().max(1000).nullish(),
});

/** Metadados extraidos do EXIF no cliente, antes da compressao apagar tudo. */
export const metadadosFotoSchema = z.object({
  capturadaEm: z.coerce.date().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  largura: z.coerce.number().int().positive().optional(),
  altura: z.coerce.number().int().positive().optional(),
  legenda: z.string().max(200).optional(),
});

export const recusarVistoriaSchema = z.object({
  motivo: z.string().min(1).max(500),
});

export const listarVistoriasSchema = z.object({
  imovelId: z.string().uuid().optional(),
  contratoId: z.string().uuid().optional(),
  situacao: situacaoVistoriaSchema.optional(),
});

export type TipoVistoria = z.infer<typeof tipoVistoriaSchema>;
export type SituacaoVistoria = z.infer<typeof situacaoVistoriaSchema>;
export type EstadoItemVistoria = z.infer<typeof estadoItemVistoriaSchema>;
export type CriarVistoriaDto = z.infer<typeof criarVistoriaSchema>;
export type EnviarConviteDto = z.infer<typeof enviarConviteSchema>;
export type ResponderItemDto = z.infer<typeof responderItemSchema>;
export type MetadadosFotoDto = z.infer<typeof metadadosFotoSchema>;
export type RecusarVistoriaDto = z.infer<typeof recusarVistoriaSchema>;
export type ListarVistoriasDto = z.infer<typeof listarVistoriasSchema>;

export type VistoriaFotoPublica = {
  id: string;
  url: string;
  legenda: string | null;
};

export type VistoriaItemPublico = {
  id: string;
  nome: string;
  dica: string | null;
  ordem: number;
  minimoFotos: number;
  estado: EstadoItemVistoria | null;
  observacao: string | null;
  fotos: VistoriaFotoPublica[];
};

export type VistoriaAmbientePublico = {
  id: string;
  nome: string;
  ordem: number;
  concluido: boolean;
  itens: VistoriaItemPublico[];
};

export type VistoriaPublica = {
  id: string;
  tipo: TipoVistoria;
  situacao: SituacaoVistoria;
  imovel: { apelido: string; endereco: string };
  ambientes: VistoriaAmbientePublico[];
};
