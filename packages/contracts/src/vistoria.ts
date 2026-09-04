import { z } from 'zod';
import { cpfSchema } from './comum';

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

/** Avisos internos do acompanhamento: quem recebe e em que momento. */
export const acompanharVistoriaSchema = z
  .object({
    emails: z.array(z.string().email().max(150)).max(10),
    avisarInicio: z.boolean(),
    avisarConclusao: z.boolean(),
  })
  .refine((dados) => dados.emails.length > 0 || (!dados.avisarInicio && !dados.avisarConclusao), {
    message: 'Escolha ao menos um e-mail para receber os avisos',
    path: ['emails'],
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

/** Texto rico do "pedir complemento". A API sanitiza a marcacao antes de gravar. */
export const recusarVistoriaSchema = z.object({
  motivo: z.string().min(1).max(4000),
});

/** Marcacao aceita no motivo. O editor do painel so produz isto. */
export const TAGS_MOTIVO = ['strong', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li'] as const;

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
export type AcompanharVistoriaDto = z.infer<typeof acompanharVistoriaSchema>;
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
  /** HTML ja sanitizado do ultimo "pedir complemento", para quem vai refazer saber o que falta. */
  motivoRecusa: string | null;
  /** Aceite já dado por quem executou. Preenchido depois da conclusão. */
  aceite: { nome: string; aceitoEm: string; codigo: string } | null;
  ambientes: VistoriaAmbientePublico[];
};

// ---------------------------------------------------------------------------
// Aceite eletrônico, linha do tempo e envio do laudo
// ---------------------------------------------------------------------------

/**
 * O que a pessoa marca ao concluir. Fica gravado junto do aceite porque o laudo
 * precisa reproduzir o texto exato daquele dia, mesmo que a redação mude depois.
 */
export const DECLARACAO_EXECUTOR =
  'Declaro que percorri o imóvel, que as respostas e as fotos enviadas retratam o estado em ' +
  'que ele se encontra nesta data e que este registro tem valor de assinatura eletrônica.';

export const DECLARACAO_GESTOR =
  'Confiro a vistoria recebida e aceito o laudo como registro do estado do imóvel na data em ' +
  'que foi executada. Este registro tem valor de assinatura eletrônica.';

/** Aceite de quem executou, enviado junto da conclusão pelo link público. */
export const aceitarVistoriaSchema = z.object({
  nome: z.string().trim().min(3).max(150),
  /** Sem CPF o aceite identifica um nome qualquer: é ele que amarra a declaração à pessoa. */
  documento: cpfSchema,
  confirmado: z.literal(true, {
    errorMap: () => ({ message: 'Marque a declaração para concluir a vistoria' }),
  }),
});

export const enviarLaudoSchema = z.object({
  emails: z.array(z.string().email().max(150)).min(1).max(10),
  /** Recado da gestão que entra antes do link, ex.: prazo para contestar. */
  mensagem: z.string().max(1000).optional(),
});

export type AceitarVistoriaDto = z.infer<typeof aceitarVistoriaSchema>;
export type EnviarLaudoDto = z.infer<typeof enviarLaudoSchema>;

export type PapelAceiteVistoria = 'EXECUTOR' | 'GESTOR';

export type TipoEventoVistoria =
  | 'CRIADA'
  | 'CONVITE_ENVIADO'
  | 'COMPLEMENTO_SOLICITADO'
  | 'LINK_ABERTO'
  | 'EXECUCAO_INICIADA'
  | 'FOTO_REMOVIDA'
  | 'CONCLUIDA'
  | 'APROVADA'
  | 'AVISO_ENVIADO'
  | 'LAUDO_GERADO'
  | 'LAUDO_ENVIADO'
  | 'LAUDO_ABERTO'
  /** Não existe no banco: sai das fotos, agrupadas por ambiente. */
  | 'FOTOS_RECEBIDAS';

export type OrigemEventoVistoria = 'PAINEL' | 'LINK_PUBLICO' | 'SISTEMA';

export type EventoVistoria = {
  tipo: TipoEventoVistoria;
  origem: OrigemEventoVistoria;
  ocorridoEm: string;
  descricao: string;
  autor: string | null;
  ip: string | null;
  agente: string | null;
};

export type AceiteVistoria = {
  papel: PapelAceiteVistoria;
  nome: string;
  email: string | null;
  documento: string | null;
  aceitoEm: string;
  ip: string | null;
  agente: string | null;
  /** Aparelho e navegador em uma linha, já resumidos pela API. */
  dispositivo: string;
  declaracao: string;
  hashConteudo: string;
  /** `hashConteudo` em formato curto, o que a pessoa lê e confere no laudo. */
  codigo: string;
  /** Falso quando a vistoria mudou depois do aceite: o laudo avisa em vez de esconder. */
  cobreConteudoAtual: boolean;
};

/**
 * Resumo do conteúdo vira um código curto para conferência a olho.
 * Cinco e cinco: o suficiente para comparar sem virar um enigma.
 */
export function codigoVerificacao(hash: string): string {
  const limpo = hash.replace(/[^0-9a-f]/gi, '').toUpperCase();

  return `${limpo.slice(0, 5)}-${limpo.slice(5, 10)}`;
}
