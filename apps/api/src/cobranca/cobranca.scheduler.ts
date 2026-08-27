import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { EnvioNotificacoesService } from './envio-notificacoes.service';
import { ReguaCobrancaService } from './regua-cobranca.service';

@Injectable()
export class CobrancaScheduler {
  private readonly logger = new Logger(CobrancaScheduler.name);

  constructor(
    private readonly regua: ReguaCobrancaService,
    private readonly envio: EnvioNotificacoesService,
    private readonly config: ConfigService,
  ) {}

  @Cron(process.env.CRON_REGUA_COBRANCA ?? '0 5 * * *', { name: 'regua-cobranca' })
  async agendar(): Promise<void> {
    if (!this.habilitado()) {
      return;
    }

    try {
      await this.regua.agendar();
    } catch (erro) {
      this.logger.error(`Falha ao agendar a régua: ${(erro as Error).message}`);
    }
  }

  @Cron(process.env.CRON_ENVIO_EMAIL ?? '*/10 * * * *', { name: 'envio-email' })
  async enviar(): Promise<void> {
    if (!this.habilitado()) {
      return;
    }

    try {
      await this.envio.processarFila();
    } catch (erro) {
      this.logger.error(`Falha ao processar a fila de e-mail: ${(erro as Error).message}`);
    }
  }

  private habilitado(): boolean {
    return this.config.get<string>('CRONS_ATIVOS') === 'true';
  }
}
