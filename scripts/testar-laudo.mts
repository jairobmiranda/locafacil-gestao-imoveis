import { deflateSync } from 'node:zlib';
import { Readable } from 'node:stream';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { codigoVerificacao, DECLARACAO_EXECUTOR, DECLARACAO_GESTOR } from '@locafacil/contracts';
import { LaudoService } from '../apps/api/src/vistorias/laudo.service';

/**
 * Gera um laudo de exemplo em PDF, sem banco, sem MinIO e sem e-mail. Serve para conferir o
 * desenho das páginas (capa, aceites, linha do tempo, fotos e manifesto) depois de mexer no layout.
 *
 * Uso: npm.cmd run laudo:testar (o tsconfig da API é obrigatório: o serviço usa decorators).
 */

const TABELA_CRC = Array.from({ length: 256 }, (_todo, indice) => {
  let valor = indice;

  for (let bit = 0; bit < 8; bit += 1) {
    valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
  }

  return valor >>> 0;
});

function crc32(dados: Buffer): number {
  let valor = 0xffffffff;

  for (const byte of dados) {
    valor = TABELA_CRC[(valor ^ byte) & 0xff]! ^ (valor >>> 8);
  }

  return (valor ^ 0xffffffff) >>> 0;
}

function pedaco(tipo: string, dados: Buffer): Buffer {
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const tamanho = Buffer.alloc(4);
  const verificacao = Buffer.alloc(4);

  tamanho.writeUInt32BE(dados.length);
  verificacao.writeUInt32BE(crc32(corpo));

  return Buffer.concat([tamanho, corpo, verificacao]);
}

/** PNG de teste: um degradê com faixas, só para dar volume e proporção reais às fotos. */
function imagemFalsa(largura: number, altura: number, matiz: number): Buffer {
  const linhas: Buffer[] = [];

  for (let y = 0; y < altura; y += 1) {
    const linha = Buffer.alloc(1 + largura * 3);

    for (let x = 0; x < largura; x += 1) {
      const base = 1 + x * 3;
      linha[base] = (matiz + x / 2) % 255;
      linha[base + 1] = (120 + y / 2) % 255;
      linha[base + 2] = ((x + y) / 2) % 255;
    }

    linhas.push(linha);
  }

  const cabecalho = Buffer.alloc(13);

  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho[8] = 8;
  cabecalho[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', cabecalho),
    pedaco('IDAT', deflateSync(Buffer.concat(linhas))),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

const agora = Date.now();
const minutos = (quantidade: number) => new Date(agora - quantidade * 60_000);

let contador = 0;

const foto = (minutosAtras: number) => {
  contador += 1;

  return {
    id: `foto-${contador}`,
    chaveObjeto: `vistoria/exemplo/${contador}.png`,
    hashSha256: contador.toString(16).padStart(64, 'a'),
    recebidaEm: minutos(minutosAtras),
    capturadaEm: minutos(minutosAtras + 2),
    latitude: -16.6869,
    longitude: -49.2648,
  };
};

const item = (
  nome: string,
  estado: string | null,
  quantidadeFotos: number,
  observacao: string | null = null,
) => ({
  id: `item-${nome}`,
  nome,
  estado,
  observacao,
  minimoFotos: 1,
  fotos: Array.from({ length: quantidadeFotos }, (_todo, indice) => foto(60 - indice * 3)),
});

const vistoria = {
  id: '7d3a91f0-3c2b-4f5e-9a11-6b0c2d4e8f10',
  tipo: 'ENTRADA',
  situacao: 'APROVADA',
  roteiroChave: 'apartamento',
  roteiroVersao: 3,
  conviteEmail: 'carla.lima@exemplo.com',
  iniciadaEm: minutos(180),
  enviadaEm: minutos(40),
  laudoAnexoId: null,
  imovel: {
    apelido: 'Ed. Aurora 301',
    logradouro: 'Rua das Flores',
    numero: '100',
    complemento: 'apto 301',
    bairro: 'Setor Central',
    cidade: 'Goiânia',
    uf: 'GO',
  },
  ambientes: [
    {
      id: 'amb-1',
      nome: 'Sala',
      itens: [
        item('Piso', 'BOM', 3, 'Risco de 10 cm perto da porta da varanda, já existia na entrada.'),
        item('Paredes e teto', 'NOVO', 2),
        item('Janelas', 'REGULAR', 1),
        item('Tomadas e interruptores', 'BOM', 1),
      ],
    },
    {
      id: 'amb-2',
      nome: 'Cozinha',
      itens: [
        item('Bancada', 'REGULAR', 2, 'Mancha de gordura no canto direito.'),
        item('Armários', 'RUIM', 2, 'Dobradiça da porta inferior solta.'),
        item('Torneira', 'BOM', 1),
        item('Coifa', 'AUSENTE', 0),
      ],
    },
    {
      id: 'amb-3',
      nome: 'Suíte',
      itens: [
        item('Piso', 'BOM', 2),
        item('Armários', 'NOVO', 1),
        item('Box do banheiro', 'NAO_APLICAVEL', 0),
      ],
    },
  ],
};

const hashConteudo = 'b3f1c07d'.padEnd(64, '9');

const linhaDoTempo = [
  {
    tipo: 'CRIADA',
    origem: 'PAINEL',
    ocorridoEm: minutos(600).toISOString(),
    descricao: 'Vistoria criada com o roteiro Apartamento',
    autor: 'gestao@exemplo.com',
    ip: null,
    agente: null,
  },
  {
    tipo: 'CONVITE_ENVIADO',
    origem: 'PAINEL',
    ocorridoEm: minutos(590).toISOString(),
    descricao: 'Convite enviado para carla.lima@exemplo.com, diego.lima@exemplo.com',
    autor: 'gestao@exemplo.com',
    ip: '200.150.10.4',
    agente: null,
  },
  {
    tipo: 'LINK_ABERTO',
    origem: 'LINK_PUBLICO',
    ocorridoEm: minutos(200).toISOString(),
    descricao: 'Link da vistoria aberto',
    autor: null,
    ip: '187.20.44.9',
    agente: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/605.1.15',
  },
  {
    tipo: 'EXECUCAO_INICIADA',
    origem: 'LINK_PUBLICO',
    ocorridoEm: minutos(180).toISOString(),
    descricao: 'Execução iniciada: primeira resposta registrada',
    autor: 'carla.lima@exemplo.com',
    ip: '187.20.44.9',
    agente: null,
  },
  {
    tipo: 'FOTOS_RECEBIDAS',
    origem: 'LINK_PUBLICO',
    ocorridoEm: minutos(120).toISOString(),
    descricao: '7 fotos recebidas em Sala, das 10:12 às 10:25',
    autor: null,
    ip: null,
    agente: null,
  },
  {
    tipo: 'CONCLUIDA',
    origem: 'LINK_PUBLICO',
    ocorridoEm: minutos(40).toISOString(),
    descricao: 'Vistoria concluída e aceita por Carla Lima',
    autor: 'carla.lima@exemplo.com',
    ip: '187.20.44.9',
    agente: null,
  },
  {
    tipo: 'APROVADA',
    origem: 'PAINEL',
    ocorridoEm: minutos(20).toISOString(),
    descricao: 'Vistoria aceita pela gestão, por Jairo Miranda',
    autor: 'gestao@exemplo.com',
    ip: '200.150.10.4',
    agente: null,
  },
  {
    tipo: 'LAUDO_ENVIADO',
    origem: 'PAINEL',
    ocorridoEm: minutos(10).toISOString(),
    descricao: 'Laudo enviado para carla.lima@exemplo.com, ana.souza@exemplo.com',
    autor: 'gestao@exemplo.com',
    ip: '200.150.10.4',
    agente: null,
  },
];

const aceites = [
  {
    papel: 'EXECUTOR',
    nome: 'Carla Lima',
    email: 'carla.lima@exemplo.com',
    documento: '52998224725',
    aceitoEm: minutos(40).toISOString(),
    ip: '187.20.44.9',
    agente: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/605.1.15',
    dispositivo: 'Safari 605 · iPhone',
    declaracao: DECLARACAO_EXECUTOR,
    hashConteudo,
    codigo: codigoVerificacao(hashConteudo),
    cobreConteudoAtual: true,
  },
  {
    papel: 'GESTOR',
    nome: 'Jairo Miranda',
    email: 'gestao@exemplo.com',
    documento: null,
    aceitoEm: minutos(20).toISOString(),
    ip: '200.150.10.4',
    agente: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
    dispositivo: 'Chrome 126 · Windows',
    declaracao: DECLARACAO_GESTOR,
    hashConteudo,
    codigo: codigoVerificacao(hashConteudo),
    cobreConteudoAtual: false,
  },
];

const destino = resolve(process.cwd(), 'laudo-exemplo.pdf');

const laudo = new LaudoService(
  { vistoria: { update: () => Promise.resolve({}) } } as never,
  { dossie: () => Promise.resolve({ vistoria, linhaDoTempo, aceites, hashConteudo }) } as never,
  {
    obter: (chave: string) =>
      Promise.resolve(Readable.from([imagemFalsa(320, 240, chave.length * 17)])),
  } as never,
  {
    enviar: (_dados: unknown, arquivo: { buffer: Buffer }) => {
      writeFileSync(destino, arquivo.buffer);
      return Promise.resolve({ id: 'anexo-exemplo', nomeArquivo: 'laudo-exemplo.pdf' });
    },
    remover: () => Promise.resolve(),
  } as never,
  { registrar: () => Promise.resolve() } as never,
  { get: () => 'http://localhost:3001' } as never,
  { enviar: () => Promise.resolve({}) } as never,
);

await laudo.gerar(vistoria.id, 'smoke-test');

console.log(`Laudo de exemplo gravado em ${destino}`);
