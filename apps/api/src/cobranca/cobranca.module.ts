import { Module } from '@nestjs/common';
import { CobrancaController } from './cobranca.controller';
import { CobrancaScheduler } from './cobranca.scheduler';
import { CobrancaService } from './cobranca.service';
import { EnvioNotificacoesService } from './envio-notificacoes.service';
import { ReguaCobrancaService } from './regua-cobranca.service';

@Module({
  controllers: [CobrancaController],
  providers: [CobrancaService, ReguaCobrancaService, EnvioNotificacoesService, CobrancaScheduler],
  exports: [ReguaCobrancaService, EnvioNotificacoesService],
})
export class CobrancaModule {}
