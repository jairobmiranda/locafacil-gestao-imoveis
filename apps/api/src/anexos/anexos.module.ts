import { Module } from '@nestjs/common';
import { AnexosController } from './anexos.controller';
import { AnexosService } from './anexos.service';
import { ArmazenamentoService } from './armazenamento.service';

@Module({
  controllers: [AnexosController],
  providers: [AnexosService, ArmazenamentoService],
  exports: [AnexosService, ArmazenamentoService],
})
export class AnexosModule {}
