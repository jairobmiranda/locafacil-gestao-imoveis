import type { ContextoMinuta } from '../contexto';

export type GrupoClausula =
  | 'OBJETO'
  | 'PRAZO'
  | 'ALUGUEL'
  | 'REAJUSTE'
  | 'ENCARGOS'
  | 'GARANTIA'
  | 'SOLIDARIEDADE'
  | 'CONSERVACAO'
  | 'VISTORIA'
  | 'USO'
  | 'RESCISAO'
  | 'PREFERENCIA'
  | 'GERAIS'
  | 'FORO';

/** Ordem em que os grupos aparecem no documento. */
export const ORDEM_GRUPOS: GrupoClausula[] = [
  'OBJETO',
  'PRAZO',
  'ALUGUEL',
  'REAJUSTE',
  'ENCARGOS',
  'GARANTIA',
  'SOLIDARIEDADE',
  'CONSERVACAO',
  'VISTORIA',
  'USO',
  'RESCISAO',
  'PREFERENCIA',
  'GERAIS',
  'FORO',
];

export type Clausula = {
  id: string;
  versao: number;
  titulo: string;
  grupo: GrupoClausula;
  /** Entra sempre, independente das respostas do wizard. */
  obrigatoria?: boolean;
  baseLegal?: string;
  /** 0 a 3. Alimenta o medidor de proteção do wizard. */
  nivelProtecao?: number;
  /** Ids que não podem coexistir com esta cláusula. */
  incompativelCom?: string[];
  condicao?: (ctx: ContextoMinuta) => boolean;
  caput: (ctx: ContextoMinuta) => string;
  paragrafos?: (ctx: ContextoMinuta) => string[];
};
