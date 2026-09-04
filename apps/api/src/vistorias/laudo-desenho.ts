/**
 * Primitivas de desenho do laudo. O PDFKit só oferece texto e retângulo: tudo o que a tela
 * resolve com CSS (cartão, etiqueta, faixa, barra) é montado aqui, uma vez, para o laudo
 * ficar legível sem repetir cálculo de coordenada em cada seção.
 */

export const PAGINA = { largura: 595.28, altura: 841.89 };
export const MARGEM = 42;
export const LARGURA_UTIL = PAGINA.largura - MARGEM * 2;

/** Onde o conteúdo precisa parar para não invadir o rodapé. */
export const LIMITE_CONTEUDO = PAGINA.altura - MARGEM - 16;

/** Mesma paleta da tela: o laudo impresso e o painel não podem parecer produtos diferentes. */
export const COR = {
  primaria: '#305CDE',
  primariaForte: '#2749B4',
  primariaSuave: '#EDF2FE',
  texto: '#10131A',
  suave: '#6B7280',
  tenue: '#9AA1AD',
  borda: '#E6E8EE',
  bordaForte: '#D3D7E0',
  fundo: '#F6F7F9',
  superficie: '#FFFFFF',
  positivo: '#0F7B42',
  positivoSuave: '#E8F6EE',
  alerta: '#B45309',
  alertaSuave: '#FFF7E8',
  negativo: '#C0392B',
  negativoSuave: '#FDEEEC',
} as const;

export type Tom = { texto: string; fundo: string };

export const TOM_NEUTRO: Tom = { texto: COR.suave, fundo: COR.fundo };
export const TOM_PRIMARIO: Tom = { texto: COR.primariaForte, fundo: COR.primariaSuave };
export const TOM_POSITIVO: Tom = { texto: COR.positivo, fundo: COR.positivoSuave };
export const TOM_ALERTA: Tom = { texto: COR.alerta, fundo: COR.alertaSuave };
export const TOM_NEGATIVO: Tom = { texto: COR.negativo, fundo: COR.negativoSuave };

type Documento = PDFKit.PDFDocument;

/** Abre página nova quando o bloco não cabe inteiro. Evita cartão cortado no meio. */
export function garantirEspaco(documento: Documento, altura: number): void {
  if (documento.y + altura > LIMITE_CONTEUDO) {
    documento.addPage();
  }
}

/** Volta o cursor para a margem esquerda: desenho posicionado costuma deixá-lo perdido. */
export function alinhar(documento: Documento, y: number): void {
  documento.x = MARGEM;
  documento.y = y;
}

export function titulo(documento: Documento, texto: string, apoio?: string): void {
  garantirEspaco(documento, apoio ? 46 : 32);

  documento
    .fillColor(COR.texto)
    .font('Helvetica-Bold')
    .fontSize(15)
    .text(texto, MARGEM, documento.y, { width: LARGURA_UTIL });

  if (apoio) {
    documento
      .fillColor(COR.suave)
      .font('Helvetica')
      .fontSize(8.5)
      .text(apoio, MARGEM, documento.y + 2, { width: LARGURA_UTIL });
  }

  const y = documento.y + 6;

  documento.moveTo(MARGEM, y).lineTo(MARGEM + LARGURA_UTIL, y).lineWidth(1).stroke(COR.borda);
  alinhar(documento, y + 12);
  documento.fillColor(COR.texto);
}

/** Etiqueta arredondada, do tamanho do texto. Devolve a largura ocupada. */
export function etiqueta(
  documento: Documento,
  texto: string,
  tom: Tom,
  x: number,
  y: number,
  tamanho = 8,
): number {
  documento.font('Helvetica-Bold').fontSize(tamanho);

  const largura = documento.widthOfString(texto) + 14;
  const altura = tamanho + 8;

  documento.roundedRect(x, y, largura, altura, altura / 2).fill(tom.fundo);
  documento
    .fillColor(tom.texto)
    .text(texto, x, y + (altura - tamanho) / 2 + 0.5, { width: largura, align: 'center' });
  documento.fillColor(COR.texto);

  return largura;
}

export function cartao(
  documento: Documento,
  x: number,
  y: number,
  largura: number,
  altura: number,
  opcoes: { fundo?: string; borda?: string } = {},
): void {
  documento
    .roundedRect(x, y, largura, altura, 10)
    .fillAndStroke(opcoes.fundo ?? COR.superficie, opcoes.borda ?? COR.borda);
  documento.fillColor(COR.texto);
}

/** Rótulo pequeno em cima, valor abaixo. É a linha de dado que se repete no laudo inteiro. */
export function chaveValor(
  documento: Documento,
  rotulo: string,
  valor: string,
  x: number,
  y: number,
  largura: number,
): number {
  documento
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COR.tenue)
    .text(rotulo.toUpperCase(), x, y, { width: largura, characterSpacing: 0.4 });

  documento
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COR.texto)
    .text(valor, x, y + 9, { width: largura });

  return documento.y;
}

/** Barra empilhada do resumo por estado. Some quando não há nada a mostrar. */
export function barraEmpilhada(
  documento: Documento,
  x: number,
  y: number,
  largura: number,
  partes: { quantidade: number; cor: string }[],
  altura = 8,
): void {
  const total = partes.reduce((soma, parte) => soma + parte.quantidade, 0);

  if (total === 0) {
    return;
  }

  documento.roundedRect(x, y, largura, altura, altura / 2).fill(COR.fundo);

  let cursor = x;

  for (const parte of partes) {
    const pedaco = (parte.quantidade / total) * largura;

    if (pedaco <= 0) {
      continue;
    }

    // Só as pontas são arredondadas; no meio o retângulo reto encosta sem deixar falha.
    const arredondar = cursor === x || cursor + pedaco >= x + largura - 0.5;

    if (arredondar) {
      documento.roundedRect(cursor, y, pedaco, altura, altura / 2).fill(parte.cor);
    } else {
      documento.rect(cursor, y, pedaco, altura).fill(parte.cor);
    }

    cursor += pedaco;
  }

  documento.fillColor(COR.texto);
}

export function paragrafo(
  documento: Documento,
  texto: string,
  opcoes: { cor?: string; tamanho?: number; largura?: number; x?: number } = {},
): void {
  documento
    .font('Helvetica')
    .fontSize(opcoes.tamanho ?? 9)
    .fillColor(opcoes.cor ?? COR.suave)
    .text(texto, opcoes.x ?? MARGEM, documento.y, {
      width: opcoes.largura ?? LARGURA_UTIL,
      align: 'justify',
    });

  documento.fillColor(COR.texto);
}
