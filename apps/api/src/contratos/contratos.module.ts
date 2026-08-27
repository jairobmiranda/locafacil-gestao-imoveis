import { Module } from '@nestjs/common';
import { ContratosController } from './contratos.controller';
import { ContratosScheduler } from './contratos.scheduler';
import { ContratosService } from './contratos.service';
import { GeracaoCobrancasService } from './geracao-cobrancas.service';

@Module({
  controllers: [ContratosController],
  providers: [ContratosService, GeracaoCobrancasService, ContratosScheduler],
  exports: [ContratosService, GeracaoCobrancasService],
})
export class ContratosModule {}
