import { Module } from '@nestjs/common';
import { AnexosModule } from '../anexos/anexos.module';
import { FeriadosModule } from '../feriados/feriados.module';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';

@Module({
  imports: [AnexosModule, FeriadosModule],
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
