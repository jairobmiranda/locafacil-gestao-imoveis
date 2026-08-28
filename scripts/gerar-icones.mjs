import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLICO = join(process.cwd(), 'apps/web/public');
const MARCA = [0x30, 0x5c, 0xde];
const BRANCO = [0xff, 0xff, 0xff];

const TABELA_CRC = Array.from({ length: 256 }, (_, indice) => {
  let valor = indice;
  for (let bit = 0; bit < 8; bit += 1) {
    valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
  }
  return valor >>> 0;
});

function crc32(buffer) {
  let valor = 0xffffffff;
  for (const byte of buffer) {
    valor = TABELA_CRC[(valor ^ byte) & 0xff] ^ (valor >>> 8);
  }
  return (valor ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

function png(largura, altura, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const linhas = Buffer.alloc(altura * (largura * 4 + 1));
  for (let y = 0; y < altura; y += 1) {
    const inicio = y * (largura * 4 + 1);
    linhas[inicio] = 0;
    pixels.copy(linhas, inicio + 1, y * largura * 4, (y + 1) * largura * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

/** Cobertura do pixel por supersampling, para as bordas saírem suaves. */
function cobertura(x, y, dentro) {
  let acertos = 0;
  for (let sy = 0; sy < 4; sy += 1) {
    for (let sx = 0; sx < 4; sx += 1) {
      if (dentro(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) {
        acertos += 1;
      }
    }
  }
  return acertos / 16;
}

function desenhar(tamanho, { maskable }) {
  const pixels = Buffer.alloc(tamanho * tamanho * 4);
  const raio = maskable ? 0 : tamanho * 0.22;
  // Zona segura do maskable: o conteúdo precisa caber no círculo central de 80%.
  const escala = maskable ? 0.52 : 0.68;

  const alturaL = tamanho * escala;
  const larguraL = alturaL * 0.62;
  const traco = alturaL * 0.2;
  const esquerda = (tamanho - larguraL) / 2;
  const topo = (tamanho - alturaL) / 2;

  const dentroDoFundo = (x, y) => {
    if (raio === 0) {
      return true;
    }
    const dx = Math.max(raio - x, x - (tamanho - raio), 0);
    const dy = Math.max(raio - y, y - (tamanho - raio), 0);
    return dx * dx + dy * dy <= raio * raio;
  };

  const dentroDoL = (x, y) =>
    (x >= esquerda &&
      x <= esquerda + traco &&
      y >= topo &&
      y <= topo + alturaL) ||
    (x >= esquerda &&
      x <= esquerda + larguraL &&
      y >= topo + alturaL - traco &&
      y <= topo + alturaL);

  for (let y = 0; y < tamanho; y += 1) {
    for (let x = 0; x < tamanho; x += 1) {
      const fundo = cobertura(x, y, dentroDoFundo);
      const letra = cobertura(x, y, dentroDoL);
      const posicao = (y * tamanho + x) * 4;

      for (let canal = 0; canal < 3; canal += 1) {
        pixels[posicao + canal] = Math.round(
          MARCA[canal] * (1 - letra) + BRANCO[canal] * letra,
        );
      }

      pixels[posicao + 3] = Math.round(255 * fundo);
    }
  }

  return png(tamanho, tamanho, pixels);
}

const ARQUIVOS = [
  ['icone-192.png', 192, { maskable: false }],
  ['icone-512.png', 512, { maskable: false }],
  ['icone-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
];

for (const [nome, tamanho, opcoes] of ARQUIVOS) {
  writeFileSync(join(PUBLICO, nome), desenhar(tamanho, opcoes));
  console.log(`${nome} (${tamanho}x${tamanho})`);
}
