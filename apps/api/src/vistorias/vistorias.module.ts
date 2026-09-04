import { Module } from '@nestjs/common';
import { AnexosModule } from '../anexos/anexos.module';
import { AvisoVistoriaService } from './aviso-vistoria.service';
import { ConviteVistoriaService } from './convite-vistoria.service';
import { LaudoService } from './laudo.service';
import { VistoriaPublicaController } from './vistoria-publica.controller';
import { VistoriasController } from './vistorias.controller';
import { VistoriasService } from './vistorias.service';

@Module({
  imports: [AnexosModule],
  controllers: [VistoriasController, VistoriaPublicaController],
  providers: [VistoriasService, ConviteVistoriaService, AvisoVistoriaService, LaudoService],
  exports: [VistoriasService],
})
export class VistoriasModule {}
