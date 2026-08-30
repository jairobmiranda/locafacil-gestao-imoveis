import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { AlertaMinuta, RespostasBlindagem } from '@locafacil/contracts';
import { AnexosService } from '../anexos/anexos.service';
import { PrismaService } from '../prisma/prisma.service';
import { ComposicaoService } from './composicao.service';

type ArquivoRecebido = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const TAMANHO_MAXIMO_PDF = 25 * 1024 * 1024;
const ASSINATURA_PDF = Buffer.from('%PDF-');

const RESUMO_MINUTA = {
  id: true,
  contratoId: true,
  versao: true,
  situacao: true,
  modeloVersao: true,
  hashConteudo: true,
  nivelProtecao: true,
  alertas: true,
  clausulasUsadas: true,
  enviadaEm: true,
  assinadaEm: true,
  canceladaEm: true,
  anexoAssinadoId: true,
  hashAssinado: true,
  criadoEm: true,
} satisfies Prisma.MinutaContratoSelect;

@Injectable()
export class MinutasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly composicao: ComposicaoService,
    private readonly anexos: AnexosService,
  ) {}

  /** Renderiza sem persistir. Usado pelo preview ao vivo do wizard. */
  async previa(contratoId: string, respostas: RespostasBlindagem) {
    const contrato = await this.composicao.carregarContrato(contratoId);
    const contexto = this.composicao.montarContexto(contrato, respostas);
    const { html, alertas, clausulas, nivelProtecao, protecaoMaxima } =
      this.composicao.compor(contexto);

    return { html, alertas, clausulas, nivelProtecao, protecaoMaxima };
  }

  async gerar(contratoId: string, respostas: RespostasBlindagem) {
    const contrato = await this.composicao.carregarContrato(contratoId);

    if (contrato.situacao === 'ENCERRADO' || contrato.situacao === 'RESCINDIDO') {
      throw new ConflictException('Contrato encerrado não gera nova minuta');
    }

    const contexto = this.composicao.montarContexto(contrato, respostas);
    const resultado = this.composicao.compor(contexto);

    this.composicao.garantirSemBloqueio(resultado.alertas);

    const ultima = await this.prisma.minutaContrato.findFirst({
      where: { contratoId },
      orderBy: { versao: 'desc' },
      select: { versao: true },
    });

    const { emitidaEm, ...snapshot } = contexto;

    return this.prisma.$transaction(async (tx) => {
      await tx.contrato.update({
        where: { id: contratoId },
        data: { respostasBlindagem: respostas as unknown as Prisma.InputJsonValue },
      });

      return tx.minutaContrato.create({
        data: {
          contratoId,
          versao: (ultima?.versao ?? 0) + 1,
          situacao: 'GERADA',
          modeloVersao: this.composicao.versaoModelo,
          dadosSnapshot: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
          clausulasUsadas: resultado.clausulas as unknown as Prisma.InputJsonValue,
          conteudoHtml: resultado.html,
          hashConteudo: createHash('sha256').update(resultado.html, 'utf8').digest('hex'),
          nivelProtecao: resultado.nivelProtecao,
          alertas: resultado.alertas as unknown as Prisma.InputJsonValue,
        },
        select: RESUMO_MINUTA,
      });
    });
  }

  listar(contratoId: string) {
    return this.prisma.minutaContrato.findMany({
      where: { contratoId },
      orderBy: { versao: 'desc' },
      select: RESUMO_MINUTA,
    });
  }

  async buscar(id: string) {
    const minuta = await this.prisma.minutaContrato.findUnique({
      where: { id },
      select: { ...RESUMO_MINUTA, conteudoHtml: true },
    });

    if (!minuta) {
      throw new NotFoundException('Minuta não encontrada');
    }

    return minuta;
  }

  async enviarParaAssinatura(id: string) {
    const minuta = await this.buscar(id);

    if (minuta.situacao !== 'GERADA') {
      throw new ConflictException('Somente uma minuta gerada pode ser enviada para assinatura');
    }

    const [atualizada] = await this.prisma.$transaction([
      this.prisma.minutaContrato.update({
        where: { id },
        data: { situacao: 'ENVIADA_ASSINATURA', enviadaEm: new Date() },
        select: RESUMO_MINUTA,
      }),
      this.prisma.contrato.update({
        where: { id: minuta.contratoId },
        data: { situacao: 'EM_ASSINATURA' },
      }),
    ]);

    return atualizada;
  }

  /**
   * Recebe o PDF que voltou do assinador externo. Confere os bytes magicos:
   * extensao e Content-Type do cliente nao provam nada.
   */
  async registrarAssinado(id: string, arquivo: ArquivoRecebido | undefined) {
    const minuta = await this.buscar(id);

    if (minuta.situacao === 'ASSINADA') {
      throw new ConflictException('Esta minuta já foi arquivada como assinada');
    }

    if (minuta.situacao === 'CANCELADA') {
      throw new ConflictException('Minuta cancelada não aceita arquivo assinado');
    }

    if (!arquivo) {
      throw new BadRequestException('Nenhum arquivo enviado no campo "arquivo"');
    }

    if (arquivo.size > TAMANHO_MAXIMO_PDF) {
      throw new BadRequestException(
        `Arquivo acima do limite de ${TAMANHO_MAXIMO_PDF / 1024 / 1024} MB`,
      );
    }

    if (!arquivo.buffer.subarray(0, ASSINATURA_PDF.length).equals(ASSINATURA_PDF)) {
      throw new BadRequestException('O arquivo enviado não é um PDF válido');
    }

    const anexo = await this.anexos.enviar(
      {
        entidadeTipo: 'CONTRATO',
        entidadeId: minuta.contratoId,
        especie: 'CONTRATO_ASSINADO',
      },
      { ...arquivo, mimetype: 'application/pdf' },
    );

    const [atualizada] = await this.prisma.$transaction([
      this.prisma.minutaContrato.update({
        where: { id },
        data: {
          situacao: 'ASSINADA',
          assinadaEm: new Date(),
          anexoAssinadoId: anexo.id,
          hashAssinado: anexo.checksum,
        },
        select: RESUMO_MINUTA,
      }),
      this.prisma.contrato.update({
        where: { id: minuta.contratoId },
        data: { situacao: 'ATIVO' },
      }),
      this.prisma.minutaContrato.updateMany({
        where: { contratoId: minuta.contratoId, id: { not: id }, situacao: { not: 'ASSINADA' } },
        data: { situacao: 'CANCELADA', canceladaEm: new Date() },
      }),
    ]);

    return atualizada;
  }

  async cancelar(id: string) {
    const minuta = await this.buscar(id);

    if (minuta.situacao === 'ASSINADA') {
      throw new ConflictException('Minuta assinada não pode ser cancelada');
    }

    return this.prisma.minutaContrato.update({
      where: { id },
      data: { situacao: 'CANCELADA', canceladaEm: new Date() },
      select: RESUMO_MINUTA,
    });
  }
}
