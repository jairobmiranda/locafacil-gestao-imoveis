import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AnexosService } from '../anexos/anexos.service';
import { ArmazenamentoService } from '../anexos/armazenamento.service';
import { PrismaService } from '../prisma/prisma.service';
import { VistoriasService } from './vistorias.service';

const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

const ESTADO_ROTULO: Record<string, string> = {
  NOVO: 'Novo',
  BOM: 'Bom',
  REGULAR: 'Regular',
  RUIM: 'Ruim',
  AUSENTE: 'Ausente',
  NAO_APLICAVEL: 'Não se aplica',
};

const TIPO_ROTULO: Record<string, string> = {
  ENTRADA: 'Vistoria de entrada',
  SAIDA: 'Vistoria de saída',
  PERIODICA: 'Vistoria periódica',
};

const MARGEM = 40;
const LARGURA_UTIL = 595.28 - MARGEM * 2;
const COLUNA = (LARGURA_UTIL - 12) / 2;
const ALTURA_FOTO = 150;

async function paraBuffer(fluxo: NodeJS.ReadableStream): Promise<Buffer> {
  const partes: Buffer[] = [];

  for await (const pedaco of fluxo) {
    partes.push(Buffer.isBuffer(pedaco) ? pedaco : Buffer.from(pedaco as string));
  }

  return Buffer.concat(partes);
}

@Injectable()
export class LaudoService {
  private readonly logger = new Logger(LaudoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vistorias: VistoriasService,
    private readonly armazenamento: ArmazenamentoService,
    private readonly anexos: AnexosService,
  ) {}

  async gerar(vistoriaId: string) {
    const vistoria = await this.vistorias.buscar(vistoriaId);
    const documento = new PDFDocument({ size: 'A4', margin: MARGEM, bufferPages: true });
    const pedacos: Buffer[] = [];

    documento.on('data', (pedaco: Buffer) => pedacos.push(pedaco));
    const finalizado = new Promise<void>((resolver) => documento.on('end', () => resolver()));

    const identificacao = `Laudo ${vistoria.id.slice(0, 8)} · ${vistoria.imovel.apelido}`;
    const manifesto: { numero: number; hash: string; recebidaEm: Date }[] = [];
    let numeroFoto = 0;

    this.capa(documento, vistoria);

    for (const ambiente of vistoria.ambientes) {
      documento.addPage();
      documento.fontSize(14).font('Helvetica-Bold').text(ambiente.nome);
      documento.moveDown(0.5);

      for (const item of ambiente.itens) {
        documento
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`${item.nome}: `, { continued: true })
          .font('Helvetica')
          .text(item.estado ? (ESTADO_ROTULO[item.estado] ?? item.estado) : 'não informado');

        if (item.observacao) {
          documento.fontSize(9).fillColor('#444').text(item.observacao).fillColor('#000');
        }

        documento.moveDown(0.3);

        // Uma imagem por vez para nao segurar a vistoria inteira em memoria.
        for (const foto of item.fotos) {
          numeroFoto += 1;
          manifesto.push({ numero: numeroFoto, hash: foto.hashSha256, recebidaEm: foto.recebidaEm });

          const coluna = (numeroFoto - 1) % 2;
          const x = MARGEM + coluna * (COLUNA + 12);

          if (coluna === 0 && documento.y + ALTURA_FOTO + 30 > documento.page.height - MARGEM) {
            documento.addPage();
          }

          const y = documento.y;

          try {
            const conteudo = await paraBuffer(await this.armazenamento.obter(foto.chaveObjeto));

            documento.image(conteudo, x, y, {
              fit: [COLUNA, ALTURA_FOTO],
              align: 'center',
              valign: 'center',
            });
          } catch (erro) {
            this.logger.warn(`Foto ${foto.id} não pôde ser embutida: ${(erro as Error).message}`);
            documento.rect(x, y, COLUNA, ALTURA_FOTO).stroke();
          }

          const legenda = [
            `Foto ${numeroFoto}`,
            foto.capturadaEm ? FORMATO_DATA_HORA.format(foto.capturadaEm) : null,
            foto.latitude && foto.longitude
              ? `${Number(foto.latitude).toFixed(5)}, ${Number(foto.longitude).toFixed(5)}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ');

          documento.fontSize(7).fillColor('#666').text(legenda, x, y + ALTURA_FOTO + 2, {
            width: COLUNA,
          });
          documento.fillColor('#000');

          if (coluna === 1) {
            documento.y = y + ALTURA_FOTO + 18;
            documento.x = MARGEM;
          } else {
            documento.y = y;
          }
        }

        if (item.fotos.length % 2 === 1) {
          documento.y += ALTURA_FOTO + 18;
          documento.x = MARGEM;
        }
      }
    }

    this.manifesto(documento, manifesto);
    this.assinaturas(documento, vistoria);
    this.rodapes(documento, identificacao);

    documento.end();
    await finalizado;

    const arquivo = Buffer.concat(pedacos);

    const anexo = await this.anexos.enviar(
      { entidadeTipo: 'VISTORIA', entidadeId: vistoriaId, especie: 'LAUDO' },
      {
        originalname: `laudo-vistoria-${vistoria.id.slice(0, 8)}.pdf`,
        mimetype: 'application/pdf',
        size: arquivo.length,
        buffer: arquivo,
      },
    );

    await this.prisma.vistoria.update({
      where: { id: vistoriaId },
      data: { laudoAnexoId: anexo.id },
    });

    return anexo;
  }

  private capa(documento: PDFKit.PDFDocument, vistoria: Awaited<ReturnType<VistoriasService['buscar']>>) {
    const endereco = [
      vistoria.imovel.logradouro,
      vistoria.imovel.numero,
      vistoria.imovel.complemento,
      vistoria.imovel.bairro,
      vistoria.imovel.cidade,
      vistoria.imovel.uf,
    ]
      .filter(Boolean)
      .join(', ');

    documento.fontSize(20).font('Helvetica-Bold').text(TIPO_ROTULO[vistoria.tipo] ?? 'Vistoria', {
      align: 'center',
    });
    documento.moveDown(1.5);
    documento.fontSize(12).font('Helvetica-Bold').text(vistoria.imovel.apelido);
    documento.fontSize(10).font('Helvetica').text(endereco);
    documento.moveDown(1);

    const linhas = [
      ['Identificador', vistoria.id],
      ['Roteiro', `${vistoria.roteiroChave} v${vistoria.roteiroVersao}`],
      ['Iniciada em', vistoria.iniciadaEm ? FORMATO_DATA_HORA.format(vistoria.iniciadaEm) : 'não iniciada'],
      ['Enviada em', vistoria.enviadaEm ? FORMATO_DATA_HORA.format(vistoria.enviadaEm) : 'não enviada'],
      ['Executada por', vistoria.conviteEmail ?? 'gestão'],
      ['Gerado em', FORMATO_DATA_HORA.format(new Date())],
    ];

    for (const [rotulo, valor] of linhas) {
      documento
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`${rotulo}: `, { continued: true })
        .font('Helvetica')
        .text(valor as string);
    }

    documento.moveDown(1);
    documento
      .fontSize(8)
      .fillColor('#555')
      .text(
        'As datas de captura e as coordenadas são lidas do aparelho que tirou a foto e servem como indício. ' +
          'A data que vale como registro é a de recebimento no servidor, listada no manifesto ao final.',
        { align: 'justify' },
      )
      .fillColor('#000');

    documento.moveDown(1);
    documento.fontSize(11).font('Helvetica-Bold').text('Resumo por ambiente');
    documento.moveDown(0.4);

    for (const ambiente of vistoria.ambientes) {
      const contagem = ambiente.itens.reduce<Record<string, number>>((total, item) => {
        const chave = item.estado ?? 'SEM_RESPOSTA';
        total[chave] = (total[chave] ?? 0) + 1;
        return total;
      }, {});

      const resumo = Object.entries(contagem)
        .map(([estado, quantidade]) => `${ESTADO_ROTULO[estado] ?? 'Sem resposta'}: ${quantidade}`)
        .join(' · ');

      documento
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`${ambiente.nome} `, { continued: true })
        .font('Helvetica')
        .text(resumo);
    }
  }

  private manifesto(
    documento: PDFKit.PDFDocument,
    fotos: { numero: number; hash: string; recebidaEm: Date }[],
  ) {
    documento.addPage();
    documento.fontSize(14).font('Helvetica-Bold').text('Manifesto de integridade');
    documento
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#555')
      .text(
        'Cada foto tem seu resumo criptográfico SHA-256 calculado no recebimento. ' +
          'Qualquer alteração posterior no arquivo muda o resumo e fica evidente.',
      )
      .fillColor('#000');
    documento.moveDown(0.6);

    for (const foto of fotos) {
      documento
        .fontSize(7)
        .font('Courier')
        .text(`${String(foto.numero).padStart(3, '0')}  ${FORMATO_DATA_HORA.format(foto.recebidaEm)}  ${foto.hash}`);
    }
  }

  private assinaturas(
    documento: PDFKit.PDFDocument,
    vistoria: Awaited<ReturnType<VistoriasService['buscar']>>,
  ) {
    documento.addPage();
    documento.fontSize(14).font('Helvetica-Bold').text('Aceite das partes');
    documento.moveDown(0.6);
    documento
      .fontSize(9)
      .font('Helvetica')
      .text(
        `Declaro que vistoriei o imóvel ${vistoria.imovel.apelido} e que as condições registradas neste laudo ` +
          'correspondem ao estado em que ele se encontra nesta data.',
        { align: 'justify' },
      );

    documento.moveDown(4);

    const largura = (LARGURA_UTIL - 40) / 2;
    const y = documento.y;

    for (const [indice, papel] of ['Locador', 'Locatário'].entries()) {
      const x = MARGEM + indice * (largura + 40);
      documento.moveTo(x, y).lineTo(x + largura, y).stroke();
      documento.fontSize(9).text(papel, x, y + 6, { width: largura, align: 'center' });
    }
  }

  private rodapes(documento: PDFKit.PDFDocument, identificacao: string) {
    const intervalo = documento.bufferedPageRange();

    for (let pagina = intervalo.start; pagina < intervalo.start + intervalo.count; pagina += 1) {
      documento.switchToPage(pagina);
      documento
        .fontSize(7)
        .fillColor('#777')
        .text(
          `${identificacao} · página ${pagina + 1} de ${intervalo.count}`,
          MARGEM,
          documento.page.height - 28,
          { width: LARGURA_UTIL, align: 'center' },
        )
        .fillColor('#000');
    }
  }
}
