export type ItemRoteiro = {
  chave: string;
  nome: string;
  dica?: string;
  minimoFotos?: number;
};

export type AmbienteRoteiro = {
  chave: string;
  nome: string;
  itens: ItemRoteiro[];
  /** Repete o ambiente conforme um campo do imovel, ex.: quartos e vagas. */
  repetirPor?: 'quartos' | 'vagas';
};

export type Roteiro = {
  chave: string;
  versao: number;
  nome: string;
  ambientes: AmbienteRoteiro[];
};

const ACABAMENTO: ItemRoteiro[] = [
  { chave: 'PISO', nome: 'Piso', dica: 'Fotografe o piso inteiro e depois qualquer trinca ou mancha' },
  { chave: 'PAREDES', nome: 'Paredes e pintura', dica: 'Uma foto por parede, incluindo cantos' },
  { chave: 'TETO', nome: 'Teto e forro', dica: 'Procure manchas de infiltração' },
  { chave: 'RODAPE', nome: 'Rodapés' },
  { chave: 'PORTAS', nome: 'Portas, fechaduras e chaves', dica: 'Teste se abre, fecha e tranca' },
  { chave: 'JANELAS', nome: 'Janelas e vidros' },
  { chave: 'ELETRICA', nome: 'Tomadas, interruptores e iluminação', dica: 'Acenda todas as lâmpadas' },
];

const ambiente = (
  chave: string,
  nome: string,
  extras: ItemRoteiro[] = [],
  repetirPor?: AmbienteRoteiro['repetirPor'],
): AmbienteRoteiro => ({
  chave,
  nome,
  itens: [...ACABAMENTO, ...extras],
  ...(repetirPor ? { repetirPor } : {}),
});

const COZINHA_EXTRAS: ItemRoteiro[] = [
  { chave: 'BANCADA', nome: 'Bancada e pia' },
  { chave: 'ARMARIOS', nome: 'Armários e gavetas', dica: 'Abra todas as portas' },
  { chave: 'TORNEIRA', nome: 'Torneira e sifão', dica: 'Abra a água e olhe embaixo da pia' },
  { chave: 'AZULEJOS', nome: 'Azulejos e rejunte' },
  { chave: 'GAS', nome: 'Ponto de gás e exaustor' },
];

const BANHEIRO_EXTRAS: ItemRoteiro[] = [
  { chave: 'LOUCAS', nome: 'Vaso, tampa e cuba' },
  { chave: 'BOX', nome: 'Box e vedação' },
  { chave: 'CHUVEIRO', nome: 'Chuveiro e registro', dica: 'Ligue e confira a pressão' },
  { chave: 'RALO', nome: 'Ralo e escoamento' },
  { chave: 'ESPELHO', nome: 'Espelho e acessórios' },
  { chave: 'REJUNTE', nome: 'Rejunte e silicone' },
];

const AREA_SERVICO_EXTRAS: ItemRoteiro[] = [
  { chave: 'TANQUE', nome: 'Tanque e torneira' },
  { chave: 'MAQUINA', nome: 'Ponto de máquina de lavar' },
  { chave: 'VARAL', nome: 'Varal e prateleiras' },
];

const MEDIDORES: AmbienteRoteiro = {
  chave: 'MEDIDORES',
  nome: 'Medidores e chaves',
  itens: [
    { chave: 'AGUA', nome: 'Hidrômetro', dica: 'Foto com os números legíveis', minimoFotos: 1 },
    { chave: 'ENERGIA', nome: 'Relógio de energia', dica: 'Foto com os números legíveis' },
    { chave: 'GAS_MEDIDOR', nome: 'Medidor de gás', minimoFotos: 0 },
    { chave: 'CHAVES', nome: 'Chaves entregues', dica: 'Fotografe o molho completo sobre a bancada' },
  ],
};

const FACHADA: AmbienteRoteiro = {
  chave: 'FACHADA',
  nome: 'Fachada e entrada',
  itens: [
    { chave: 'FACHADA_FRENTE', nome: 'Frente do imóvel' },
    { chave: 'PORTAO', nome: 'Portão e campainha' },
    { chave: 'NUMERO', nome: 'Numeração', minimoFotos: 0 },
  ],
};

export const ROTEIROS: Roteiro[] = [
  {
    chave: 'APARTAMENTO',
    versao: 1,
    nome: 'Apartamento',
    ambientes: [
      ambiente('SALA', 'Sala'),
      ambiente('COZINHA', 'Cozinha', COZINHA_EXTRAS),
      ambiente('QUARTO', 'Quarto', [{ chave: 'ARMARIO_EMBUTIDO', nome: 'Armário embutido', minimoFotos: 0 }], 'quartos'),
      ambiente('BANHEIRO', 'Banheiro', BANHEIRO_EXTRAS),
      ambiente('AREA_SERVICO', 'Área de serviço', AREA_SERVICO_EXTRAS),
      ambiente('VARANDA', 'Varanda', [{ chave: 'GUARDA_CORPO', nome: 'Guarda-corpo' }]),
      ambiente('GARAGEM', 'Vaga de garagem', [{ chave: 'DEMARCACAO', nome: 'Demarcação da vaga' }], 'vagas'),
      MEDIDORES,
    ],
  },
  {
    chave: 'CASA',
    versao: 1,
    nome: 'Casa',
    ambientes: [
      FACHADA,
      ambiente('SALA', 'Sala'),
      ambiente('COZINHA', 'Cozinha', COZINHA_EXTRAS),
      ambiente('QUARTO', 'Quarto', [{ chave: 'ARMARIO_EMBUTIDO', nome: 'Armário embutido', minimoFotos: 0 }], 'quartos'),
      ambiente('BANHEIRO', 'Banheiro', BANHEIRO_EXTRAS),
      ambiente('AREA_SERVICO', 'Área de serviço', AREA_SERVICO_EXTRAS),
      {
        chave: 'QUINTAL',
        nome: 'Quintal e área externa',
        itens: [
          { chave: 'PISO_EXTERNO', nome: 'Piso externo' },
          { chave: 'MUROS', nome: 'Muros e cercas' },
          { chave: 'JARDIM', nome: 'Jardim', minimoFotos: 0 },
          { chave: 'TELHADO', nome: 'Telhado visível', minimoFotos: 0 },
        ],
      },
      ambiente('GARAGEM', 'Garagem', [], 'vagas'),
      MEDIDORES,
    ],
  },
  {
    chave: 'COMERCIAL',
    versao: 1,
    nome: 'Imóvel comercial',
    ambientes: [
      FACHADA,
      ambiente('SALAO', 'Salão principal'),
      ambiente('COPA', 'Copa', COZINHA_EXTRAS),
      ambiente('BANHEIRO', 'Banheiro', BANHEIRO_EXTRAS),
      {
        chave: 'INSTALACOES',
        nome: 'Instalações e segurança',
        itens: [
          { chave: 'QUADRO', nome: 'Quadro de energia' },
          { chave: 'AR', nome: 'Ar-condicionado', minimoFotos: 0 },
          { chave: 'EXTINTOR', nome: 'Extintores e sinalização', minimoFotos: 0 },
          { chave: 'ALARME', nome: 'Alarme e câmeras', minimoFotos: 0 },
        ],
      },
      MEDIDORES,
    ],
  },
];

const POR_TIPO_IMOVEL: Record<string, string> = {
  APARTAMENTO: 'APARTAMENTO',
  CASA: 'CASA',
  COMERCIAL: 'COMERCIAL',
  RURAL: 'CASA',
  TERRENO: 'CASA',
};

export function roteiroPara(tipoImovel: string, chaveDesejada?: string): Roteiro {
  const chave = chaveDesejada ?? POR_TIPO_IMOVEL[tipoImovel] ?? 'APARTAMENTO';
  const roteiro = ROTEIROS.find((item) => item.chave === chave);

  if (!roteiro) {
    throw new Error(`Roteiro de vistoria "${chave}" não existe`);
  }

  return roteiro;
}

/** Expande os ambientes repetidos e ja devolve na forma gravada no banco. */
export function materializar(
  roteiro: Roteiro,
  imovel: { quartos: number | null; vagas: number | null },
  selecao?: { chave: string; quantidade: number; rotulos?: string[]; itensOpcionais?: string[] }[],
) {
  const ambientes: {
    chave: string;
    nome: string;
    ordem: number;
    itens: { chave: string; nome: string; dica: string | null; ordem: number; minimoFotos: number }[];
  }[] = [];

  const escolhaPorChave = new Map(selecao?.map((escolha) => [escolha.chave, escolha]));

  for (const modelo of roteiro.ambientes) {
    // Sem selecao explicita o roteiro se ajusta sozinho pelos quartos e vagas do imovel.
    const quantidade = selecao
      ? Math.max(0, escolhaPorChave.get(modelo.chave)?.quantidade ?? 0)
      : modelo.repetirPor
        ? Math.max(0, imovel[modelo.repetirPor] ?? 0)
        : 1;

    const rotulos = escolhaPorChave.get(modelo.chave)?.rotulos ?? [];
    const opcionais = new Set(escolhaPorChave.get(modelo.chave)?.itensOpcionais ?? []);

    for (let indice = 0; indice < quantidade; indice += 1) {
      const rotulo = rotulos[indice]?.trim();

      ambientes.push({
        chave: quantidade > 1 ? `${modelo.chave}_${indice + 1}` : modelo.chave,
        nome: rotulo || (quantidade > 1 ? `${modelo.nome} ${indice + 1}` : modelo.nome),
        ordem: ambientes.length,
        itens: modelo.itens.map((item, posicao) => ({
          chave: item.chave,
          nome: item.nome,
          dica: item.dica ?? null,
          ordem: posicao,
          minimoFotos: opcionais.has(item.chave) ? 0 : (item.minimoFotos ?? 1),
        })),
      });
    }
  }

  return ambientes;
}

/** Catalogo para a tela de criacao montar a lista de ambientes. */
export function roteirosDisponiveis() {
  return ROTEIROS.map((roteiro) => ({
    chave: roteiro.chave,
    nome: roteiro.nome,
    versao: roteiro.versao,
    tiposImovel: Object.entries(POR_TIPO_IMOVEL)
      .filter(([, chave]) => chave === roteiro.chave)
      .map(([tipo]) => tipo),
    ambientes: roteiro.ambientes.map((ambiente) => ({
      chave: ambiente.chave,
      nome: ambiente.nome,
      repetirPor: ambiente.repetirPor ?? null,
      itens: ambiente.itens.map((item) => ({
        chave: item.chave,
        nome: item.nome,
        obrigatorio: (item.minimoFotos ?? 1) > 0,
      })),
    })),
  }));
}
