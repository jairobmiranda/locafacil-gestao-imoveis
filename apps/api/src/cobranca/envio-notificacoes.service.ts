import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toBuffer } from 'qrcode';
import { ENVIADOR_EMAIL, type AnexoEmail, type EnviadorEmail } from '../email/enviador-email';
import { PrismaService } from '../prisma/prisma.service';
import { CID_QRCODE, paraTextoSimples } from './renderizador';

const MAXIMO_TENTATIVAS = 3;

@Injectable()
export class EnvioNotificacoesService {
  private readonly logger = new Logger(EnvioNotificacoesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(ENVIADOR_EMAIL) private readonly enviador: EnviadorEmail,
  ) {}

  async processarFila(): Promise<{ enviadas: number; falhas: number }> {
    const lote = Number(this.config.get<string>('EMAIL_LOTE') ?? 20);

    const pendentes = await this.prisma.notificacao.findMany({
      where: {
        situacao: 'PENDENTE',
        agendadoPara: { lte: new Date() },
        tentativas: { lt: MAXIMO_TENTATIVAS },
      },
      include: { lancamento: { select: { pixPayload: true } } },
      orderBy: { agendadoPara: 'asc' },
      take: lote,
    });

    let enviadas = 0;
    let falhas = 0;

    for (const notificacao of pendentes) {
      try {
        const resultado = await this.enviador.enviar({
          destinatario: notificacao.destinatario,
          copia: notificacao.copia?.split(',').filter(Boolean),
          assunto: notificacao.assunto,
          corpoHtml: notificacao.corpoRenderizado,
          corpoTexto: paraTextoSimples(notificacao.corpoRenderizado),
          anexos: await this.montarAnexos(notificacao.lancamento?.pixPayload ?? null),
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

        enviadas += 1;
      } catch (erro) {
        falhas += 1;

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
      }
    }

    if (enviadas || falhas) {
      this.logger.log(`Fila de e-mail: ${enviadas} enviada(s), ${falhas} falha(s)`);
    }

    return { enviadas, falhas };
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
}
