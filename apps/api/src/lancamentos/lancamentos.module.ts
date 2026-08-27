import { Module } from '@nestjs/common';
import { CategoriasController } from './categorias.controller';
import { LancamentosController } from './lancamentos.controller';
import { LancamentosService } from './lancamentos.service';

@Module({
  controllers: [LancamentosController, CategoriasController],
  providers: [LancamentosService],
  exports: [LancamentosService],
})
export class LancamentosModule {}
