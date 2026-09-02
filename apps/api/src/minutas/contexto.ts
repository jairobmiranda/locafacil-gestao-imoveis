import type { RespostasBlindagem } from '@locafacil/contracts';

export type ParteQualificada = {
  nome: string;
  /** Preambulo pronto: nacionalidade, estado civil, profissao, documentos e endereco. */
  qualificacao: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  estadoCivil: string | null;
  casado: boolean;
  participacao: number | null;
};

export type CaracteristicaImovel = {
  descricao: string;
  quantidade: number | null;
};

export type ContextoImovel = {
  apelido: string;
  tipo: string;
  endereco: string;
  cidade: string;
  uf: string;
  matricula: string | null;
  inscricaoMunicipal: string | null;
  areaConstruida: number | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  caracteristicas: CaracteristicaImovel[];
};

export type EncargoRecorrente = {
  descricao: string;
  valor: number;
};

export type ContextoMinuta = {
  locadores: ParteQualificada[];
  locatarios: ParteQualificada[];
  fiadores: ParteQualificada[];
  anuentes: ParteQualificada[];
  testemunhas: ParteQualificada[];

  imovel: ContextoImovel;
  finalidade: 'RESIDENCIAL' | 'NAO_RESIDENCIAL' | 'TEMPORADA';

  dataInicio: Date;
  dataFim: Date;
  prazoMeses: number;

  diaVencimento: number;
  valorAluguel: number;
  percentualMulta: number;
  percentualJurosDia: number;
  descontoPontualidade: number;

  indiceReajuste: 'IGPM' | 'IPCA' | 'INCC' | 'NENHUM';
  intervaloReajusteMeses: number;

  tipoGarantia: 'CAUCAO' | 'FIADOR' | 'SEGURO_FIANCA' | 'TITULO_CAPITALIZACAO' | 'NENHUMA';
  valorGarantia: number | null;

  encargos: EncargoRecorrente[];
  chavePix: { tipo: string; chave: string; titular: string } | null;

  respostas: RespostasBlindagem;
  foro: string;
  emitidaEm: Date;
};

const FORMATO_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const FORMATO_DATA_EXTENSO = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const moeda = (valor: number): string => FORMATO_MOEDA.format(valor);
export const data = (valor: Date): string => FORMATO_DATA.format(valor);
export const dataExtenso = (valor: Date): string => FORMATO_DATA_EXTENSO.format(valor);

export function lista(itens: string[]): string {
  if (itens.length <= 1) {
    return itens[0] ?? '';
  }

  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1] as string}`;
}

/** "o LOCADOR" ou "os LOCADORES", conforme a quantidade de partes. */
export function tratamento(
  partes: unknown[],
  singular: string,
  plural: string,
  artigo: 'o' | 'a' = 'o',
): string {
  return partes.length > 1 ? `${artigo}s ${plural}` : `${artigo} ${singular}`;
}

export const oLocador = (ctx: ContextoMinuta): string =>
  tratamento(ctx.locadores, 'LOCADOR', 'LOCADORES');
export const oLocatario = (ctx: ContextoMinuta): string =>
  tratamento(ctx.locatarios, 'LOCATÁRIO', 'LOCATÁRIOS');
export const doLocador = (ctx: ContextoMinuta): string =>
  ctx.locadores.length > 1 ? 'dos LOCADORES' : 'do LOCADOR';
export const doLocatario = (ctx: ContextoMinuta): string =>
  ctx.locatarios.length > 1 ? 'dos LOCATÁRIOS' : 'do LOCATÁRIO';
export const aoLocador = (ctx: ContextoMinuta): string =>
  ctx.locadores.length > 1 ? 'aos LOCADORES' : 'ao LOCADOR';
export const aoLocatario = (ctx: ContextoMinuta): string =>
  ctx.locatarios.length > 1 ? 'aos LOCATÁRIOS' : 'ao LOCATÁRIO';
export const peloLocatario = (ctx: ContextoMinuta): string =>
  ctx.locatarios.length > 1 ? 'pelos LOCATÁRIOS' : 'pelo LOCATÁRIO';

/** Concorda o verbo com a quantidade de partes: "obriga-se" ou "obrigam-se". */
export const verbo = (partes: unknown[], singular: string, plural: string): string =>
  partes.length > 1 ? plural : singular;

/** O tratamento comeca minusculo ("os LOCADORES"), mas inicio de frase pede maiuscula. */
export const capitalizar = (texto: string): string =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

export const numero = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(valor);

export const plural = (quantidade: number, singular: string, formaPlural: string): string =>
  quantidade > 1 ? formaPlural : singular;
