import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import {
  codigoVerificacao,
  formatarCpf,
  type AceiteVistoria,
  type EnviarLaudoDto,
  type EventoVistoria,
} from '@locafacil/contracts';
import { AnexosService } from '../anexos/anexos.service';
import { ArmazenamentoService } from '../anexos/armazenamento.service';
import { escaparHtml } from '../comum/html';
import { gerarTokenPublico } from '../comum/link-assinado';
import type { ContextoRequisicao } from '../comum/requisicao';
import { ENVIADOR_EMAIL, type EnviadorEmail } from '../email/enviador-email';
import { PrismaService } from '../prisma/prisma.service';
import { EventosVistoriaService } from './eventos-vistoria.service';
import {
  alinhar,
  barraEmpilhada,
  cartao,
  chaveValor,
  COR,
  etiqueta,
  garantirEspaco,
  LARGURA_UTIL,
  MARGEM,
  PAGINA,
  paragrafo,
  titulo,
  TOM_ALERTA,
  TOM_NEUTRO,
  TOM_POSITIVO,
  TOM_PRIMARIO,
  type Tom,
} from './laudo-desenho';
import { VistoriasService } from './vistorias.service';

export const PROPOSITO_LAUDO = 'laudo';

const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Sao_Paulo',
});

const FORMATO_HORA = new Intl.DateTimeFormat('pt-BR', {
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
  SEM_RESPOSTA: 'Sem resposta',
};

/** Cor cheia do estado, usada na barra de resumo. A etiqueta usa o tom claro correspondente. */
const ESTADO_COR: Record<string, string> = {
  NOVO: '#0F7B42',
  BOM: '#3F9C6D',
  REGULAR: '#D9A441',
  RUIM: '#C0392B',
  AUSENTE: '#8B2E22',
  NAO_APLICAVEL: '#C7CBD4',
  SEM_RESPOSTA: '#9AA1AD',
};

const ESTADO_TOM: Record<string, Tom> = {
  NOVO: TOM_POSITIVO,
  BOM: TOM_POSITIVO,
  REGULAR: TOM_ALERTA,
  RUIM: { texto: COR.negativo, fundo: COR.negativoSuave },
  AUSENTE: { texto: COR.negativo, fundo: COR.negativoSuave },
  NAO_APLICAVEL: TOM_NEUTRO,
  SEM_RESPOSTA: TOM_NEUTRO,
};

const TIPO_ROTULO: Record<string, string> = {
  ENTRADA: 'Vistoria de entrada',
  SAIDA: 'Vistoria de saída',
  PERIODICA: 'Vistoria periódica',
};

const SITUACAO_ROTULO: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  CONVITE_ENVIADO: 'Convite enviado',
  EM_EXECUCAO: 'Em execução',
  ENVIADA: 'Aguardando conferência',
  APROVADA: 'Aprovada',
  RECUSADA: 'Complemento pedido',
};

const PAPEL_ROTULO: Record<string, string> = {
  EXECUTOR: 'Quem vistoriou',
  GESTOR: 'Gestão do imóvel',
};

/** Acima disso o e-mail vira problema de caixa postal: o laudo vai só pelo link. */
const LIMITE_ANEXO_BYTES = 8 * 1024 * 1024;

const ALTURA_BANDA = 138;
const ALTURA_FOTO = 148;
const ESPACO_COLUNA = 14;
const LARGURA_FOTO = (LARGURA_UTIL - ESPACO_COLUNA) / 2;

type Dossie = Awaited<ReturnType<VistoriasService['dossie']>>;

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
    private readonly eventos: EventosVistoriaService,
    private readonly config: ConfigService,
    @Inject(ENVIADOR_EMAIL) private readonly enviador: EnviadorEmail,
  ) {}

  /** Link assinado do laudo. Sem tabela de token: o id viaja com HMAC, igual ao convite. */
  linkPara(vistoriaId: string): string {
    const base = (this.config.get<string>('APP_URL') ?? '').replace(/\/$/, '');

    return `${base}/laudo/${gerarTokenPublico(PROPOSITO_LAUDO, vistoriaId)}`;
  }

  /**
   * Gera o PDF e o arquiva como anexo da vistoria. O laudo anterior é apagado de propósito:
   * vale sempre um só, o atual. As cópias já enviadas por e-mail continuam com quem recebeu,
   * e a linha do tempo guarda quando cada uma saiu.
   */
  async gerar(vistoriaId: string, autor?: string, contexto?: ContextoRequisicao) {
    const dossie = await this.vistorias.dossie(vistoriaId);
    const { vistoria } = dossie;

    const documento = new PDFDocument({
      size: 'A4',
      margin: MARGEM,
      bufferPages: true,
      info: {
        Title: `Laudo de vistoria - ${vistoria.imovel.apelido}`,
        Author: 'Loca Fácil',
        Subject: TIPO_ROTULO[vistoria.tipo] ?? 'Vistoria',
      },
    });

    const pedacos: Buffer[] = [];

    documento.on('data', (pedaco: Buffer) => pedacos.push(pedaco));
    const finalizado = new Promise<void>((resolver) => documento.on('end', () => resolver()));

    const manifesto: { numero: number; hash: string; recebidaEm: Date }[] = [];

    this.capa(documento, dossie);
    this.aceites(documento, dossie);
    this.linhaDoTempo(documento, dossie.linhaDoTempo);
    await this.ambientes(documento, dossie, manifesto);
    this.manifesto(documento, manifesto);
    this.rodapes(documento, dossie);

    documento.end();
    await finalizado;

    const arquivo = Buffer.concat(pedacos);
    const anterior = vistoria.laudoAnexoId;

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

    if (anterior) {
      await this.anexos.remover(anterior).catch((erro: Error) => {
        this.logger.warn(`Laudo anterior ${anterior} não pôde ser removido: ${erro.message}`);
      });
    }

    await this.eventos.registrar({
      vistoriaId,
      tipo: 'LAUDO_GERADO',
      origem: 'PAINEL',
      descricao:
        `Laudo gerado com ${manifesto.length} foto(s), ` +
        `código ${codigoVerificacao(dossie.hashConteudo)}`,
      autor,
      contexto,
    });

    return anexo;
  }

  /**
   * Envia o laudo por e-mail. O PDF vai anexado quando cabe; passando do limite, só o link
   * assinado, que sempre entrega a versão atual.
   */
  async enviar(
    vistoriaId: string,
    dados: EnviarLaudoDto,
    autor?: string,
    contexto?: ContextoRequisicao,
  ) {
    const emails = dados.emails
      .map((email) => email.trim())
      .filter(
        (email, indice, lista) =>
          email !== '' &&
          lista.findIndex((outro) => outro.toLowerCase() === email.toLowerCase()) === indice,
      );

    const [destinatario, ...copia] = emails;

    if (!destinatario) {
      throw new NotFoundException('Informe ao menos um destinatário para o laudo');
    }

    // Gera na hora: o que sai por e-mail é sempre o laudo do estado atual, com os aceites de hoje.
    const anexo = await this.gerar(vistoriaId, autor, contexto);
    const dossie = await this.vistorias.dossie(vistoriaId);
    const { vistoria } = dossie;

    const conteudo = await paraBuffer(await this.armazenamento.obter(anexo.chaveObjeto));
    const cabe = conteudo.length <= LIMITE_ANEXO_BYTES;
    const link = this.linkPara(vistoriaId);
    const tipo = (TIPO_ROTULO[vistoria.tipo] ?? 'Vistoria').toLowerCase();
    const imovel = escaparHtml(vistoria.imovel.apelido);
    const recado = dados.mensagem?.trim();

    const executor = dossie.aceites.find((aceite) => aceite.papel === 'EXECUTOR');
    const gestor = dossie.aceites.find((aceite) => aceite.papel === 'GESTOR');

    const aceites = [
      executor
        ? `<li>${escaparHtml(executor.nome)} concluiu a vistoria em ` +
          `${FORMATO_DATA_HORA.format(new Date(executor.aceitoEm))}.</li>`
        : '',
      gestor
        ? `<li>${escaparHtml(gestor.nome)} aceitou pela gestão em ` +
          `${FORMATO_DATA_HORA.format(new Date(gestor.aceitoEm))}.</li>`
        : '',
    ].join('');

    const corpoHtml =
      `<p>Olá.</p>` +
      `<p>Segue o laudo da ${tipo} do imóvel <strong>${imovel}</strong>.</p>` +
      (recado
        ? `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #d3d7e0;` +
          `background:#f2f4f7;border-radius:0 8px 8px 0">${escaparHtml(recado)}</blockquote>`
        : '') +
      (aceites ? `<p><strong>Aceites registrados</strong></p><ul>${aceites}</ul>` : '') +
      `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#305CDE;` +
      `color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Abrir o laudo em PDF</a></p>` +
      (cabe
        ? `<p style="color:#6b7280;font-size:13px">O mesmo arquivo vai anexado a este e-mail.</p>`
        : `<p style="color:#6b7280;font-size:13px">O arquivo ficou grande demais para anexar: ` +
          `use o link acima.</p>`) +
      `<p style="color:#6b7280;font-size:13px">Código de verificação do conteúdo: ` +
      `<strong>${codigoVerificacao(dossie.hashConteudo)}</strong>.</p>`;

    await this.enviador.enviar({
      destinatario,
      ...(copia.length ? { copia } : {}),
      assunto: `Laudo da vistoria do imóvel ${vistoria.imovel.apelido}`,
      corpoHtml,
      corpoTexto:
        `Laudo da ${tipo} do imóvel ${vistoria.imovel.apelido}. ` +
        (recado ? `${recado} ` : '') +
        `Abra em: ${link}`,
      ...(cabe
        ? { anexos: [{ nome: anexo.nomeArquivo, conteudo, tipoConteudo: 'application/pdf' }] }
        : {}),
    });

    await this.eventos.registrar({
      vistoriaId,
      tipo: 'LAUDO_ENVIADO',
      origem: 'PAINEL',
      descricao:
        `Laudo enviado para ${emails.join(', ')}` + (cabe ? '' : ' (só o link, arquivo grande)'),
      autor,
      contexto,
    });

    this.logger.log(`Laudo da vistoria ${vistoriaId} enviado para ${emails.join(', ')}`);

    return { anexoId: anexo.id, destinatarios: emails, anexado: cabe, link };
  }

  /** Download pelo link assinado: entrega sempre o laudo vigente da vistoria. */
  async conteudoPorVistoria(vistoriaId: string) {
    const vistoria = await this.prisma.vistoria.findUnique({
      where: { id: vistoriaId },
      select: { laudoAnexoId: true },
    });

    if (!vistoria?.laudoAnexoId) {
      throw new NotFoundException('Esta vistoria ainda não tem laudo gerado');
    }

    return this.anexos.baixar(vistoria.laudoAnexoId);
  }

  // ---------------------------------------------------------------------------
  // Páginas
  // ---------------------------------------------------------------------------

  private capa(documento: PDFKit.PDFDocument, dossie: Dossie): void {
    const { vistoria } = dossie;

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

    documento.rect(0, 0, PAGINA.largura, ALTURA_BANDA).fill(COR.primaria);

    documento
      .fillColor('#C7D5FB')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('LAUDO DE VISTORIA', MARGEM, 30, { characterSpacing: 1.6 });

    documento
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(21)
      .text(vistoria.imovel.apelido, MARGEM, 46, {
        width: LARGURA_UTIL,
        lineBreak: false,
        ellipsis: true,
      });

    documento
      .fillColor('#DDE7FD')
      .font('Helvetica')
      .fontSize(9.5)
      .text(endereco, MARGEM, 76, { width: LARGURA_UTIL, lineBreak: false, ellipsis: true });

    const tomBanda: Tom = { texto: '#FFFFFF', fundo: '#4A72E6' };
    const largura = etiqueta(
      documento,
      TIPO_ROTULO[vistoria.tipo] ?? 'Vistoria',
      tomBanda,
      MARGEM,
      100,
    );

    etiqueta(
      documento,
      SITUACAO_ROTULO[vistoria.situacao] ?? vistoria.situacao,
      vistoria.situacao === 'APROVADA' ? { texto: '#0F7B42', fundo: '#D9F0E2' } : tomBanda,
      MARGEM + largura + 8,
      100,
    );

    alinhar(documento, ALTURA_BANDA + 22);

    this.cartaoDados(documento, dossie);
    this.resumoEstados(documento, dossie);
    this.resumoAmbientes(documento, dossie);

    garantirEspaco(documento, 68);

    const y = documento.y;

    cartao(documento, MARGEM, y, LARGURA_UTIL, 56, { fundo: COR.fundo, borda: COR.borda });
    alinhar(documento, y + 10);
    paragrafo(
      documento,
      'A data de captura e as coordenadas de cada foto são lidas do aparelho que a tirou e servem ' +
        'como indício, não como prova: quem envia pode alterá-las. A data que vale como registro é ' +
        'a de recebimento no servidor, listada no manifesto ao final deste laudo.',
      { tamanho: 8, largura: LARGURA_UTIL - 28, x: MARGEM + 14 },
    );
    alinhar(documento, y + 70);
  }

  private cartaoDados(documento: PDFKit.PDFDocument, dossie: Dossie): void {
    const { vistoria } = dossie;
    const y = documento.y;
    const colunas = 3;
    const espaco = 16;
    const largura = (LARGURA_UTIL - espaco * (colunas - 1) - 28) / colunas;

    const campos: [string, string][] = [
      ['Identificador', vistoria.id.slice(0, 8).toUpperCase()],
      ['Roteiro', `${vistoria.roteiroChave} v${vistoria.roteiroVersao}`],
      ['Código de verificação', codigoVerificacao(dossie.hashConteudo)],
      [
        'Iniciada em',
        vistoria.iniciadaEm ? FORMATO_DATA_HORA.format(vistoria.iniciadaEm) : 'não iniciada',
      ],
      [
        'Concluída em',
        vistoria.enviadaEm ? FORMATO_DATA_HORA.format(vistoria.enviadaEm) : 'não concluída',
      ],
      ['Executada por', vistoria.conviteEmail ?? 'gestão'],
    ];

    cartao(documento, MARGEM, y, LARGURA_UTIL, 92);

    campos.forEach(([rotulo, valor], indice) => {
      const coluna = indice % colunas;
      const linha = Math.floor(indice / colunas);

      chaveValor(
        documento,
        rotulo,
        valor,
        MARGEM + 14 + coluna * (largura + espaco),
        y + 16 + linha * 38,
        largura,
      );
    });

    alinhar(documento, y + 110);
  }

  private resumoEstados(documento: PDFKit.PDFDocument, dossie: Dossie): void {
    const itens = dossie.vistoria.ambientes.flatMap((ambiente) => ambiente.itens);
    const fotos = itens.reduce((soma, item) => soma + item.fotos.length, 0);

    const contagem = itens.reduce<Record<string, number>>((total, item) => {
      const chave = item.estado ?? 'SEM_RESPOSTA';
      total[chave] = (total[chave] ?? 0) + 1;
      return total;
    }, {});

    const ordem = ['NOVO', 'BOM', 'REGULAR', 'RUIM', 'AUSENTE', 'NAO_APLICAVEL', 'SEM_RESPOSTA'];
    const presentes = ordem.filter((estado) => (contagem[estado] ?? 0) > 0);

    titulo(
      documento,
      'Resumo do estado',
      `${itens.length} itens vistoriados · ${fotos} fotos recebidas`,
    );

    barraEmpilhada(
      documento,
      MARGEM,
      documento.y,
      LARGURA_UTIL,
      presentes.map((estado) => ({
        quantidade: contagem[estado] ?? 0,
        cor: ESTADO_COR[estado] ?? COR.tenue,
      })),
    );

    let x = MARGEM;
    const y = documento.y + 16;

    for (const estado of presentes) {
      const texto = `${ESTADO_ROTULO[estado] ?? estado}: ${contagem[estado]}`;

      x += etiqueta(documento, texto, ESTADO_TOM[estado] ?? TOM_NEUTRO, x, y) + 6;
    }

    alinhar(documento, y + 32);
  }

  private resumoAmbientes(documento: PDFKit.PDFDocument, dossie: Dossie): void {
    titulo(documento, 'Ambientes', 'Cada ambiente aparece em detalhe nas páginas seguintes.');

    for (const ambiente of dossie.vistoria.ambientes) {
      garantirEspaco(documento, 22);

      const y = documento.y;
      const fotos = ambiente.itens.reduce((soma, item) => soma + item.fotos.length, 0);
      const contagem = ambiente.itens.reduce<Record<string, number>>((total, item) => {
        const chave = item.estado ?? 'SEM_RESPOSTA';
        total[chave] = (total[chave] ?? 0) + 1;
        return total;
      }, {});

      documento
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COR.texto)
        .text(ambiente.nome, MARGEM, y, { width: 190, lineBreak: false, ellipsis: true });

      documento
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(COR.suave)
        .text(`${ambiente.itens.length} itens · ${fotos} fotos`, MARGEM + 196, y, {
          width: 110,
          lineBreak: false,
        });

      barraEmpilhada(
        documento,
        MARGEM + 316,
        y + 2,
        LARGURA_UTIL - 316,
        Object.entries(contagem).map(([estado, quantidade]) => ({
          quantidade,
          cor: ESTADO_COR[estado] ?? COR.tenue,
        })),
        7,
      );

      alinhar(documento, y + 20);
    }

    documento.y += 8;
  }

  private aceites(documento: PDFKit.PDFDocument, dossie: Dossie): void {
    documento.addPage();

    titulo(
      documento,
      'Aceite eletrônico',
      'A formalização do aceite ocorre por meio de registro eletrônico. A validade da concordância é comprovada pelas evidências da transação, que incluem a identificação do signatário, data e hora do aceite, endereço IP e o conteúdo ao qual a concordância foi manifestada.',
    );

    for (const papel of ['EXECUTOR', 'GESTOR'] as const) {
      const aceite = dossie.aceites.find((registro) => registro.papel === papel);

      if (aceite) {
        this.cartaoAceite(documento, aceite);
      } else {
        this.cartaoAceitePendente(documento, papel);
      }
    }

    garantirEspaco(documento, 60);

    paragrafo(
      documento,
      'O código de verificação resume o conteúdo aceito: ambientes, itens, estados, observações e ' +
        'o resumo de cada foto. Se o laudo for gerado de novo depois de qualquer alteração, o ' +
        'código muda e o aceite anterior passa a aparecer marcado como desatualizado.',
      { tamanho: 8 },
    );
  }

  private cartaoAceite(documento: PDFKit.PDFDocument, aceite: AceiteVistoria): void {
    const altura = 132;

    garantirEspaco(documento, altura + 14);

    const y = documento.y;
    const interna = LARGURA_UTIL - 28;

    cartao(documento, MARGEM, y, LARGURA_UTIL, altura, {
      fundo: aceite.cobreConteudoAtual ? COR.superficie : COR.alertaSuave,
      borda: aceite.cobreConteudoAtual ? COR.borda : '#FBDFAB',
    });

    const larguraEtiqueta = etiqueta(
      documento,
      PAPEL_ROTULO[aceite.papel] ?? aceite.papel,
      TOM_PRIMARIO,
      MARGEM + 14,
      y + 14,
    );

    if (!aceite.cobreConteudoAtual) {
      etiqueta(
        documento,
        'conteúdo alterado depois do aceite',
        TOM_ALERTA,
        MARGEM + 14 + larguraEtiqueta + 6,
        y + 14,
      );
    }

    documento
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(COR.texto)
      .text(aceite.nome, MARGEM + 14, y + 36, { width: interna, lineBreak: false, ellipsis: true });

    const identificacao = [
      aceite.email,
      aceite.documento ? `CPF ${formatarCpf(aceite.documento)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    documento
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COR.suave)
      .text(identificacao || 'sem outro identificador informado', MARGEM + 14, y + 54, {
        width: interna,
        lineBreak: false,
        ellipsis: true,
      });

    const colunas: [string, string][] = [
      ['Aceito em', FORMATO_DATA_HORA.format(new Date(aceite.aceitoEm))],
      ['Endereço de rede', aceite.ip ?? 'não registrado'],
      ['Dispositivo', aceite.dispositivo],
      ['Código do conteúdo', aceite.codigo],
    ];

    const largura = (interna - 12 * 3) / 4;

    colunas.forEach(([rotulo, valor], indice) => {
      chaveValor(documento, rotulo, valor, MARGEM + 14 + indice * (largura + 12), y + 72, largura);
    });

    documento
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(COR.suave)
      .text(`"${aceite.declaracao}"`, MARGEM + 14, y + 104, { width: interna, align: 'justify' });

    alinhar(documento, y + altura + 14);
  }

  private cartaoAceitePendente(documento: PDFKit.PDFDocument, papel: string): void {
    const altura = 58;

    garantirEspaco(documento, altura + 14);

    const y = documento.y;

    cartao(documento, MARGEM, y, LARGURA_UTIL, altura, { fundo: COR.fundo, borda: COR.bordaForte });

    etiqueta(documento, PAPEL_ROTULO[papel] ?? papel, TOM_NEUTRO, MARGEM + 14, y + 12);

    documento
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COR.suave)
      .text(
        papel === 'EXECUTOR'
          ? 'A vistoria ainda não foi concluída por quem a executou.'
          : 'A gestão ainda não conferiu e aceitou esta vistoria.',
        MARGEM + 14,
        y + 34,
        { width: LARGURA_UTIL - 28, lineBreak: false },
      );

    alinhar(documento, y + altura + 14);
  }

  private linhaDoTempo(documento: PDFKit.PDFDocument, eventos: EventoVistoria[]): void {
    documento.addPage();

    titulo(
      documento,
      'Linha do tempo',
      'Carimbos do servidor, na ordem em que aconteceram. Um mesmo passo pode se repetir: ' +
        'o convite pode ser reenviado e o laudo, enviado quantas vezes for preciso.',
    );

    if (eventos.length === 0) {
      paragrafo(documento, 'Nenhum evento registrado para esta vistoria.');
      return;
    }

    const trilho = MARGEM + 92;
    const textoX = trilho + 16;
    const larguraTexto = MARGEM + LARGURA_UTIL - textoX;

    for (const evento of eventos) {
      const quando = new Date(evento.ocorridoEm);
      const detalhe = [
        evento.origem === 'LINK_PUBLICO' ? 'pelo link público' : null,
        evento.autor,
        evento.ip ? `IP ${evento.ip}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      documento.font('Helvetica').fontSize(9);

      const alturaTexto = documento.heightOfString(evento.descricao, { width: larguraTexto });
      const altura = alturaTexto + (detalhe ? 12 : 0) + 12;

      garantirEspaco(documento, altura + 6);

      const y = documento.y;

      documento
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COR.texto)
        .text(FORMATO_HORA.format(quando), MARGEM, y + 1, { width: 84, align: 'right' });

      documento
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COR.tenue)
        .text(FORMATO_DATA.format(quando), MARGEM, y + 12, { width: 84, align: 'right' });

      documento
        .moveTo(trilho, y)
        .lineTo(trilho, y + altura)
        .lineWidth(1)
        .stroke(COR.borda);
      documento.circle(trilho, y + 5, 3.4).fill(COR.primaria);

      documento
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COR.texto)
        .text(evento.descricao, textoX, y, { width: larguraTexto });

      if (detalhe) {
        documento
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(COR.suave)
          .text(detalhe, textoX, y + alturaTexto + 1, { width: larguraTexto, lineBreak: false });
      }

      alinhar(documento, y + altura);
    }
  }

  private async ambientes(
    documento: PDFKit.PDFDocument,
    dossie: Dossie,
    manifesto: { numero: number; hash: string; recebidaEm: Date }[],
  ): Promise<void> {
    let numeroFoto = 0;

    for (const ambiente of dossie.vistoria.ambientes) {
      documento.addPage();

      const fotos = ambiente.itens.reduce((soma, item) => soma + item.fotos.length, 0);

      titulo(documento, ambiente.nome, `${ambiente.itens.length} itens · ${fotos} fotos`);

      for (const item of ambiente.itens) {
        // Título de item sozinho no pé da página fica órfão: com foto, exige a primeira fileira.
        garantirEspaco(documento, item.fotos.length > 0 ? 46 + ALTURA_FOTO + 26 : 46);

        const y = documento.y;
        const estado = item.estado ?? 'SEM_RESPOSTA';
        const rotulo = ESTADO_ROTULO[estado] ?? estado;

        documento.font('Helvetica-Bold').fontSize(8);

        const larguraEtiqueta = documento.widthOfString(rotulo) + 14;

        etiqueta(
          documento,
          rotulo,
          ESTADO_TOM[estado] ?? TOM_NEUTRO,
          MARGEM + LARGURA_UTIL - larguraEtiqueta,
          y,
        );

        documento
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(COR.texto)
          .text(item.nome, MARGEM, y + 1, {
            width: LARGURA_UTIL - larguraEtiqueta - 10,
            lineBreak: false,
            ellipsis: true,
          });

        alinhar(documento, y + 18);

        if (item.observacao) {
          paragrafo(documento, item.observacao, { tamanho: 8.5 });
          documento.y += 2;
        }

        for (let indice = 0; indice < item.fotos.length; indice += 2) {
          const linha = item.fotos.slice(indice, indice + 2);

          garantirEspaco(documento, ALTURA_FOTO + 26);

          const topo = documento.y;

          for (const [coluna, foto] of linha.entries()) {
            numeroFoto += 1;
            manifesto.push({
              numero: numeroFoto,
              hash: foto.hashSha256,
              recebidaEm: foto.recebidaEm,
            });

            await this.desenharFoto(documento, foto, numeroFoto, {
              x: MARGEM + coluna * (LARGURA_FOTO + ESPACO_COLUNA),
              y: topo,
            });
          }

          alinhar(documento, topo + ALTURA_FOTO + 28);
        }

        documento.y += 6;
      }
    }
  }

  private async desenharFoto(
    documento: PDFKit.PDFDocument,
    foto: {
      id: string;
      chaveObjeto: string;
      capturadaEm: Date | null;
      latitude: unknown;
      longitude: unknown;
    },
    numero: number,
    posicao: { x: number; y: number },
  ): Promise<void> {
    const { x, y } = posicao;

    cartao(documento, x, y, LARGURA_FOTO, ALTURA_FOTO, { fundo: COR.fundo, borda: COR.borda });

    try {
      // Uma imagem por vez: segurar a vistoria inteira em memória derruba a API.
      const conteudo = await paraBuffer(await this.armazenamento.obter(foto.chaveObjeto));

      documento.image(conteudo, x + 5, y + 5, {
        fit: [LARGURA_FOTO - 10, ALTURA_FOTO - 10],
        align: 'center',
        valign: 'center',
      });
    } catch (erro) {
      this.logger.warn(`Foto ${foto.id} não pôde ser embutida: ${(erro as Error).message}`);

      documento
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COR.tenue)
        .text('foto indisponível no armazenamento', x + 10, y + ALTURA_FOTO / 2 - 4, {
          width: LARGURA_FOTO - 20,
          align: 'center',
        });
    }

    const legenda = [
      foto.capturadaEm ? FORMATO_DATA_HORA.format(foto.capturadaEm) : null,
      foto.latitude && foto.longitude
        ? `${Number(foto.latitude).toFixed(5)}, ${Number(foto.longitude).toFixed(5)}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

    documento
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor(COR.suave)
      .text(`Foto ${String(numero).padStart(3, '0')}`, x + 2, y + ALTURA_FOTO + 5, {
        width: LARGURA_FOTO - 4,
        lineBreak: false,
      });

    documento
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COR.tenue)
      .text(legenda || 'sem data de captura no arquivo', x + 2, y + ALTURA_FOTO + 13, {
        width: LARGURA_FOTO - 4,
        lineBreak: false,
        ellipsis: true,
      });

    documento.fillColor(COR.texto);
  }

  private manifesto(
    documento: PDFKit.PDFDocument,
    fotos: { numero: number; hash: string; recebidaEm: Date }[],
  ): void {
    documento.addPage();

    titulo(
      documento,
      'Manifesto de integridade',
      'Cada foto tem seu resumo SHA-256 calculado no recebimento. Qualquer alteração posterior ' +
        'no arquivo muda o resumo e fica evidente na conferência.',
    );

    if (fotos.length === 0) {
      paragrafo(documento, 'Nenhuma foto foi recebida nesta vistoria.');
      return;
    }

    const cabecalho = documento.y;

    documento.rect(MARGEM, cabecalho, LARGURA_UTIL, 16).fill(COR.fundo);
    documento.font('Helvetica-Bold').fontSize(7).fillColor(COR.suave);
    documento.text('FOTO', MARGEM + 8, cabecalho + 5, { width: 34, lineBreak: false });
    documento.text('RECEBIDA EM', MARGEM + 46, cabecalho + 5, { width: 90, lineBreak: false });
    documento.text('RESUMO SHA-256', MARGEM + 142, cabecalho + 5, { width: 200, lineBreak: false });

    alinhar(documento, cabecalho + 22);

    for (const foto of fotos) {
      garantirEspaco(documento, 14);

      const y = documento.y;

      if (foto.numero % 2 === 0) {
        documento.rect(MARGEM, y - 2, LARGURA_UTIL, 13).fill('#FBFCFD');
      }

      documento
        .font('Courier-Bold')
        .fontSize(7)
        .fillColor(COR.texto)
        .text(String(foto.numero).padStart(3, '0'), MARGEM + 8, y, { width: 34, lineBreak: false });

      documento
        .font('Courier')
        .fillColor(COR.suave)
        .text(FORMATO_DATA_HORA.format(foto.recebidaEm), MARGEM + 46, y, {
          width: 90,
          lineBreak: false,
        });

      documento
        .fillColor(COR.texto)
        .text(foto.hash, MARGEM + 142, y, { width: LARGURA_UTIL - 142, lineBreak: false });

      alinhar(documento, y + 13);
    }
  }

  private rodapes(documento: PDFKit.PDFDocument, dossie: Dossie): void {
    const intervalo = documento.bufferedPageRange();
    const identificacao = `Laudo ${dossie.vistoria.id.slice(0, 8).toUpperCase()} · ${dossie.vistoria.imovel.apelido}`;
    const codigo =
      `Código ${codigoVerificacao(dossie.hashConteudo)} · ` +
      `gerado em ${FORMATO_DATA_HORA.format(new Date())}`;

    for (let pagina = intervalo.start; pagina < intervalo.start + intervalo.count; pagina += 1) {
      documento.switchToPage(pagina);

      // Texto abaixo da margem inferior faria o PDFKit abrir outra página no meio do rodapé.
      documento.page.margins.bottom = 0;

      const y = PAGINA.altura - 30;

      documento
        .moveTo(MARGEM, y - 8)
        .lineTo(MARGEM + LARGURA_UTIL, y - 8)
        .lineWidth(0.5)
        .stroke(COR.borda);

      documento
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COR.tenue)
        .text(identificacao, MARGEM, y, {
          width: LARGURA_UTIL / 2 - 10,
          lineBreak: false,
          ellipsis: true,
        });

      documento.text(codigo, MARGEM, y, { width: LARGURA_UTIL, align: 'center', lineBreak: false });

      documento.text(`${pagina + 1} de ${intervalo.count}`, MARGEM, y, {
        width: LARGURA_UTIL,
        align: 'right',
        lineBreak: false,
      });
    }
  }
}
