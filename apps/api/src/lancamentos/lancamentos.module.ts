import { Module } from '@nestjs/common';
import { FeriadosModule } from '../feriados/feriados.module';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';
import { LancamentosController } from './lancamentos.controller';
import { LancamentosService } from './lancamentos.service';

@Module({
  imports: [FeriadosModule],
  controllers: [LancamentosController, CategoriasController],
  providers: [LancamentosService, CategoriasService],
  exports: [LancamentosService],
})
export class LancamentosModule {}
