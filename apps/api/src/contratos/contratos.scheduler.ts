import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { GeracaoCobrancasService } from './geracao-cobrancas.service';

@Injectable()
export class ContratosScheduler {
  private readonly logger = new Logger(ContratosScheduler.name);

  constructor(
    private readonly geracao: GeracaoCobrancasService,
    private readonly config: ConfigService,
  ) {}

  @Cron(process.env.CRON_GERAR_COBRANCAS ?? '0 3 * * *', { name: 'gerar-cobrancas' })
  async gerarCobrancas(): Promise<void> {
    if (!this.habilitado()) {
      return;
    }

    try {
      await this.geracao.gerar();
    } catch (erro) {
      this.logger.error(`Falha na geração de cobranças: ${(erro as Error).message}`);
    }
  }

  @Cron(process.env.CRON_MARCAR_ATRASO ?? '0 4 * * *', { name: 'marcar-atrasos' })
  async marcarAtrasos(): Promise<void> {
    if (!this.habilitado()) {
      return;
    }

    try {
      await this.geracao.marcarAtrasos();
    } catch (erro) {
      this.logger.error(`Falha ao marcar atrasos: ${(erro as Error).message}`);
    }
  }

  /** Evita que a maquina de desenvolvimento gere cobranca no banco compartilhado. */
  private habilitado(): boolean {
    return this.config.get<string>('CRONS_ATIVOS') === 'true';
  }
}
