import { Module } from '@nestjs/common';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';
import { LancamentosController } from './lancamentos.controller';
import { LancamentosService } from './lancamentos.service';

@Module({
  controllers: [LancamentosController, CategoriasController],
  providers: [LancamentosService, CategoriasService],
  exports: [LancamentosService],
})
export class LancamentosModule {}
