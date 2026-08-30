import { Module } from '@nestjs/common';
import { AnexosModule } from '../anexos/anexos.module';
import { ComposicaoService } from './composicao.service';
import { MinutasController } from './minutas.controller';
import { MinutasService } from './minutas.service';

@Module({
  imports: [AnexosModule],
  controllers: [MinutasController],
  providers: [ComposicaoService, MinutasService],
  exports: [MinutasService],
})
export class MinutasModule {}
