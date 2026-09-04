import { Module } from '@nestjs/common';
import { CobrancaModule } from '../cobranca/cobranca.module';
import { FeriadosModule } from '../feriados/feriados.module';
import { ContratosController } from './contratos.controller';
import { ContratosScheduler } from './contratos.scheduler';
import { ContratosService } from './contratos.service';
import { GeracaoCobrancasService } from './geracao-cobrancas.service';

@Module({
  imports: [FeriadosModule, CobrancaModule],
  controllers: [ContratosController],
  providers: [ContratosService, GeracaoCobrancasService, ContratosScheduler],
  exports: [ContratosService, GeracaoCobrancasService],
})
export class ContratosModule {}
