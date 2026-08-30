import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { toBuffer } from 'qrcode';
import { ENVIADOR_EMAIL, type AnexoEmail, type EnviadorEmail } from '../email/enviador-email';
import { PrismaService } from '../prisma/prisma.service';
import { ParametrosCobrancaService } from './parametros-cobranca.service';
import { CID_QRCODE, paraTextoSimples } from './renderizador';

const MAXIMO_TENTATIVAS = 3;

const INCLUI_PAYLOAD = { lancamento: { select: { pixPayload: true } } } satisfies Prisma.NotificacaoInclude;

type NotificacaoNaFila = Prisma.NotificacaoGetPayload<{ include: typeof INCLUI_PAYLOAD }>;

@Injectable()
export class EnvioNotificacoesService {
  private readonly logger = new Logger(EnvioNotificacoesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly parametros: ParametrosCobrancaService,
    @Inject(ENVIADOR_EMAIL) private readonly enviador: EnviadorEmail,
  ) {}

  async processarFila(): Promise<{ enviadas: number; falhas: number; adiadas: number }> {
    const lote = Number(this.config.get<string>('EMAIL_LOTE') ?? 20);
    const teto = await this.parametros.maximoEmailsDia();

    const pendentes = await this.prisma.notificacao.findMany({
      where: {
        situacao: 'PENDENTE',
        agendadoPara: { lte: new Date() },
        tentativas: { lt: MAXIMO_TENTATIVAS },
      },
      include: INCLUI_PAYLOAD,
      orderBy: { agendadoPara: 'asc' },
      take: lote,
    });

    const enviadasHoje = await this.contarEnviadasHoje(
      pendentes.map((notificacao) => notificacao.destinatario),
    );

    let enviadas = 0;
    let falhas = 0;
    let adiadas = 0;

    for (const notificacao of pendentes) {
      const jaEnviadas = enviadasHoje.get(notificacao.destinatario) ?? 0;

      if (jaEnviadas >= teto) {
        await this.adiar(notificacao, teto);
        adiadas += 1;
        continue;
      }

      if (await this.despachar(notificacao)) {
        enviadas += 1;
        enviadasHoje.set(notificacao.destinatario, jaEnviadas + 1);
      } else {
        falhas += 1;
      }
    }

    if (enviadas || falhas || adiadas) {
      this.logger.log(
        `Fila de e-mail: ${enviadas} enviada(s), ${falhas} falha(s), ${adiadas} adiada(s)`,
      );
    }

    return { enviadas, falhas, adiadas };
  }

  /** O teto vale por dia civil, contando o que ja saiu antes desta rodada. */
  private async contarEnviadasHoje(destinatarios: string[]): Promise<Map<string, number>> {
    if (destinatarios.length === 0) {
      return new Map();
    }

    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);

    const contagem = await this.prisma.notificacao.groupBy({
      by: ['destinatario'],
      where: {
        situacao: 'ENVIADO',
        enviadoEm: { gte: inicioDoDia },
        destinatario: { in: [...new Set(destinatarios)] },
      },
      _count: { _all: true },
    });

    return new Map(contagem.map((item) => [item.destinatario, item._count._all]));
  }

  /** Nada se perde: a cobranca excedente apenas espera o proximo dia. */
  private async adiar(notificacao: NotificacaoNaFila, teto: number): Promise<void> {
    const amanha = new Date(notificacao.agendadoPara);
    amanha.setDate(amanha.getDate() + 1);

    await this.prisma.notificacao.update({
      where: { id: notificacao.id },
      data: {
        agendadoPara: amanha,
        mensagemErro: `Adiada: o destinatário já recebeu ${teto} cobrança(s) hoje`,
      },
    });
  }

  /** Retorna false quando a tentativa falhou; o erro fica registrado na propria notificacao. */
  private async despachar(notificacao: NotificacaoNaFila): Promise<boolean> {
    // So anexa o QR quando o corpo referencia o CID, senao ele viraria um anexo solto.
    // O payload da propria notificacao vem do consolidado e tem prioridade.
    const pixPayload = notificacao.corpoRenderizado.includes(CID_QRCODE)
      ? (notificacao.pixPayload ?? notificacao.lancamento?.pixPayload ?? null)
      : null;

    try {
      const resultado = await this.enviador.enviar({
        destinatario: notificacao.destinatario,
        copia: notificacao.copia?.split(',').filter(Boolean),
        assunto: notificacao.assunto,
        corpoHtml: notificacao.corpoRenderizado,
        corpoTexto: paraTextoSimples(notificacao.corpoRenderizado),
        anexos: await this.montarAnexos(pixPayload),
      });

      await this.prisma.notificacao.update({
        where: { id: notificacao.id },
        data: {
          situacao: 'ENVIADO',
          enviadoEm: new Date(),
          tentativas: { increment: 1 },
          idProvedor: resultado.idProvedor,
          mensagemErro: null,
        },
      });

      return true;
    } catch (erro) {
      const tentativas = notificacao.tentativas + 1;
      const esgotou = tentativas >= MAXIMO_TENTATIVAS;

      await this.prisma.notificacao.update({
        where: { id: notificacao.id },
        data: {
          situacao: esgotou ? 'FALHOU' : 'PENDENTE',
          tentativas,
          mensagemErro: (erro as Error).message.slice(0, 2000),
          // Backoff exponencial: 5, 25 e 125 minutos.
          agendadoPara: esgotou
            ? notificacao.agendadoPara
            : new Date(Date.now() + 5 ** tentativas * 60_000),
        },
      });

      this.logger.error(
        `Falha ao enviar notificação ${notificacao.id} (tentativa ${tentativas}): ${(erro as Error).message}`,
      );

      return false;
    }
  }

  /** O QR vai como imagem embutida porque o MinIO nao e publico. */
  private async montarAnexos(pixPayload: string | null): Promise<AnexoEmail[] | undefined> {
    if (!pixPayload) {
      return undefined;
    }

    return [
      {
        nome: 'pix.png',
        conteudo: await toBuffer(pixPayload, { errorCorrectionLevel: 'M', margin: 1, width: 320 }),
        tipoConteudo: 'image/png',
        cid: CID_QRCODE,
      },
    ];
  }

  async reenviar(id: string): Promise<void> {
    await this.prisma.notificacao.update({
      where: { id },
      data: { situacao: 'PENDENTE', tentativas: 0, agendadoPara: new Date(), mensagemErro: null },
    });
  }

  /** Dispara uma notificacao na hora, sem esperar o proximo ciclo da fila. */
  async enviarAgora(id: string): Promise<{ enviado: boolean; mensagemErro: string | null }> {
    const notificacao = await this.prisma.notificacao.findUnique({
      where: { id },
      include: INCLUI_PAYLOAD,
    });

    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    const enviado = await this.despachar(notificacao);

    if (enviado) {
      return { enviado, mensagemErro: null };
    }

    const atualizada = await this.prisma.notificacao.findUnique({
      where: { id },
      select: { mensagemErro: true },
    });

    return { enviado, mensagemErro: atualizada?.mensagemErro ?? null };
  }
}
