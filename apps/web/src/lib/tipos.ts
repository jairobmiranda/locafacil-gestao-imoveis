export type Imovel = {
  id: string;
  apelido: string;
  estrategia: 'REVENDA' | 'LOCACAO' | 'TERRENO' | 'USO_PROPRIO';
  situacao:
    | 'PROSPECCAO'
    | 'ADQUIRIDO'
    | 'EM_REFORMA'
    | 'A_VENDA'
    | 'PARA_ALUGAR'
    | 'ALUGADO'
    | 'VENDIDO';
  tipo: 'APARTAMENTO' | 'CASA' | 'TERRENO' | 'COMERCIAL' | 'RURAL';
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  matricula: string | null;
  inscricaoMunicipal: string | null;
  areaTotal: number | null;
  areaConstruida: number | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  caracteristicas: { id: string; descricao: string; quantidade: number | null }[];
  dataAquisicao: string | null;
  valorAquisicao: number | null;
  dataVenda: string | null;
  valorVenda: number | null;
  valorVendaAlvo: number | null;
  aluguelAlvo: number | null;
  observacoes: string | null;
  arquivadoEm: string | null;
};

export type Lancamento = {
  id: string;
  descricao: string;
  natureza: 'ENTRADA' | 'SAIDA';
  situacao: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'PARCIAL' | 'CANCELADO';
  valor: number;
  valorPago: number | null;
  valorMulta: number;
  valorJuros: number;
  competencia: string;
  vencimento: string | null;
  pagoEm: string | null;
  capitalizavel: boolean;
  imovel: { id: string; apelido: string };
  categoria: { id: string; nome: string; natureza: 'ENTRADA' | 'SAIDA' };
  pessoa: { id: string; nome: string } | null;
};

export type Contrato = {
  id: string;
  situacao: 'RASCUNHO' | 'ATIVO' | 'ENCERRADO' | 'RESCINDIDO';
  dataInicio: string;
  dataFim: string;
  diaVencimento: number;
  valorAluguel: number;
  proximoReajusteEm: string | null;
  imovel: { id: string; apelido: string };
  partes: { papel: string; contatoPrincipal: boolean; pessoa: { id: string; nome: string; email: string | null } }[];
};

export type Paginado<T> = {
  itens: T[];
  total: number;
  pagina: number;
  limite: number;
};

export type Pessoa = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  dataNascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string | null;
  arquivadoEm: string | null;
};

export type VinculoContrato = {
  papel: string;
  contatoPrincipal: boolean;
  contrato: {
    id: string;
    situacao: string;
    dataInicio: string;
    dataFim: string;
    valorAluguel: number;
    imovel: { id: string; apelido: string };
  };
};
