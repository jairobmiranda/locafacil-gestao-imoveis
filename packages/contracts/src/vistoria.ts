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

/** Ambiente escolhido para a vistoria. `rotulos` nomeia cada copia, ex.: "Suíte", "Quarto da frente". */
export const ambienteSelecionadoSchema = z.object({
  chave: z.string().min(1).max(40),
  quantidade: z.number().int().min(0).max(20),
  rotulos: z.array(z.string().max(80)).max(20).optional(),
  /** Itens que aparecem no roteiro mas nao exigem estado nem foto para concluir. */
  itensOpcionais: z.array(z.string().max(40)).max(60).optional(),
});

export const criarVistoriaSchema = z.object({
  imovelId: z.string().uuid(),
  contratoId: z.string().uuid().optional(),
  tipo: tipoVistoriaSchema,
  responsavelId: z.string().uuid().optional(),
  /** Sobrescreve o roteiro deduzido do tipo do imovel. */
  roteiroChave: z.string().max(40).optional(),
  /** Sem esta lista o roteiro inteiro entra, com os ambientes repetidos pelo cadastro do imovel. */
  ambientes: z.array(ambienteSelecionadoSchema).max(40).optional(),
  observacoes: z.string().max(2000).optional(),
});

export const enviarConviteSchema = z.object({
  email: z.string().email().max(150),
  /** Quem recebe o mesmo convite em copia. Sai no campo Cc do e-mail. */
  copias: z.array(z.string().email().max(150)).max(10).optional(),
  /** Prazo de validade do link em dias. */
  validadeDias: z.number().int().min(1).max(60).default(15),
});

/** Papel da pessoa no contrato, ou COPIA para os enderecos avulsos do cadastro. */
export type PapelDestinatario =
  | 'LOCADOR'
  | 'LOCATARIO'
  | 'FIADOR'
  | 'CONJUGE'
  | 'ANUENTE'
  | 'TESTEMUNHA'
  | 'COPIA'
  | 'RESPONSAVEL'
  | 'CONVITE_ANTERIOR';

/** Sugestao de destino do convite, montada a partir do contrato vinculado. */
export type DestinatarioConvite = {
  email: string;
  nome: string | null;
  papel: PapelDestinatario;
  /** Contato principal do contrato: vem marcado por padrao na tela. */
  principal: boolean;
};

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
export type AmbienteSelecionadoDto = z.infer<typeof ambienteSelecionadoSchema>;
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
