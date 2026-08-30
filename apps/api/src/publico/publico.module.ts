import { Module } from '@nestjs/common';
import { AnexosModule } from '../anexos/anexos.module';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';

@Module({
  imports: [AnexosModule],
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
