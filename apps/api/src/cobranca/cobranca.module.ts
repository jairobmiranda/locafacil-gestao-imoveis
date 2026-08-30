import { Module } from '@nestjs/common';
import { PixModule } from '../pix/pix.module';
import { CobrancaController } from './cobranca.controller';
import { CobrancaScheduler } from './cobranca.scheduler';
import { CobrancaService } from './cobranca.service';
import { EnvioNotificacoesService } from './envio-notificacoes.service';
import { ParametrosCobrancaService } from './parametros-cobranca.service';
import { ReguaCobrancaService } from './regua-cobranca.service';

@Module({
  imports: [PixModule],
  controllers: [CobrancaController],
  providers: [
    CobrancaService,
    ReguaCobrancaService,
    EnvioNotificacoesService,
    ParametrosCobrancaService,
    CobrancaScheduler,
  ],
  exports: [ReguaCobrancaService, EnvioNotificacoesService],
})
export class CobrancaModule {}
