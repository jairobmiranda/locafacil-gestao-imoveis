import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { InformarPagamentoDto } from '@locafacil/contracts';
import { AnexosService } from '../anexos/anexos.service';
import { lerTokenPublico } from '../comum/link-assinado';
import { DestinatariosInternosService } from '../email/destinatarios-internos.service';
import { ENVIADOR_EMAIL, type EnviadorEmail } from '../email/enviador-email';
import { calcularEncargos } from '../lancamentos/encargos';
import { PrismaService } from '../prisma/prisma.service';

export const PROPOSITO_PAGAMENTO = 'pagamento';

type ArquivoRecebido = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class PublicoService {
  private readonly logger = new Logger(PublicoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anexos: AnexosService,
    private readonly config: ConfigService,
    private readonly destinatarios: DestinatariosInternosService,
    @Inject(ENVIADOR_EMAIL) private readonly enviador: EnviadorEmail,
  ) {}

  async resumoPagamento(token: string) {
    const cobranca = await this.buscarPorToken(token);

    const encargos = calcularEncargos(
      cobranca.valor,
      cobranca.vencimento,
      new Date(),
      cobranca.contrato,
    );

    const aviso = await this.prisma.avisoPagamento.findFirst({
      where: { lancamentoId: cobranca.id, situacao: 'PENDENTE' },
      orderBy: { criadoEm: 'desc' },
      select: { criadoEm: true },
    });

    return {
      descricao: cobranca.descricao,
      imovel: cobranca.imovel.apelido,
      competencia: cobranca.competencia,
      vencimento: cobranca.vencimento,
      valor: cobranca.valor,
      valorTotal: encargos.totalDevido,
      diasAtraso: encargos.diasAtraso,
      situacao: cobranca.situacao,
      pixPayload: cobranca.pixPayload,
      avisoEnviadoEm: aviso?.criadoEm ?? null,
    };
  }

  async informarPagamento(
    token: string,
    dados: InformarPagamentoDto,
    arquivo: ArquivoRecebido | undefined,
  ) {
    const cobranca = await this.buscarPorToken(token);

    if (cobranca.situacao === 'PAGO' || cobranca.situacao === 'CANCELADO') {
      throw new BadRequestException(`Esta cobrança já está ${cobranca.situacao.toLowerCase()}`);
    }

    const anexo = arquivo
      ? await this.anexos.enviar(
          { entidadeTipo: 'LANCAMENTO', entidadeId: cobranca.id, especie: 'COMPROVANTE' },
          arquivo,
        )
      : null;

    const aviso = await this.prisma.$transaction(async (tx) => {
      // Enquanto o gestor nao confere, nao faz sentido continuar cobrando.
      await tx.notificacao.updateMany({
        where: { lancamentoId: cobranca.id, situacao: 'PENDENTE' },
        data: { situacao: 'CANCELADO' },
      });

      return tx.avisoPagamento.create({
        data: {
          lancamentoId: cobranca.id,
          pagoEm: dados.pagoEm,
          valor: dados.valor,
          formaPagamento: dados.formaPagamento,
          observacoes: dados.observacoes,
          anexoId: anexo?.id,
        },
        select: { id: true, criadoEm: true },
      });
    });

    this.logger.log(`Pagamento informado no link público da cobrança ${cobranca.id}`);

    await this.avisarGestor(cobranca.id, cobranca.descricao, cobranca.imovel.apelido, dados);

    return aviso;
  }

  /** Falha no aviso nao pode derrubar o registro que o inquilino acabou de fazer. */
  private async avisarGestor(
    lancamentoId: string,
    descricao: string,
    imovel: string,
    dados: InformarPagamentoDto,
  ): Promise<void> {
    const [destinatario, ...copia] = await this.destinatarios.listar();

    if (!destinatario) {
      return;
    }

    const link = `${(this.config.get<string>('APP_URL') ?? '').replace(/\/$/, '')}/lancamentos/${lancamentoId}`;
    const valor = dados.valor.toFixed(2).replace('.', ',');
    const pagoEm = dados.pagoEm.toISOString().slice(0, 10).split('-').reverse().join('/');

    try {
      await this.enviador.enviar({
        destinatario,
        copia,
        assunto: `Pagamento informado: ${descricao} (${imovel})`,
        corpoHtml:
          `<p>O inquilino informou o pagamento de <strong>R$ ${valor}</strong> em ${pagoEm}.</p>` +
          `<p><a href="${link}">Conferir e confirmar a baixa</a></p>`,
        corpoTexto: `Pagamento informado: R$ ${valor} em ${pagoEm}. Confira em ${link}`,
      });
    } catch (erro) {
      this.logger.error(`Falha ao avisar o gestor: ${(erro as Error).message}`);
    }
  }

  private async buscarPorToken(token: string) {
    const id = lerTokenPublico(PROPOSITO_PAGAMENTO, token);

    if (!id) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    const cobranca = await this.prisma.lancamento.findUnique({
      where: { id },
      include: {
        imovel: { select: { apelido: true } },
        contrato: {
          select: {
            percentualMulta: true,
            percentualJurosDia: true,
            descontoPontualidade: true,
          },
        },
      },
    });

    if (!cobranca || cobranca.natureza !== 'ENTRADA') {
      throw new NotFoundException('Cobrança não encontrada');
    }

    return cobranca;
  }
}
