import { Module } from '@nestjs/common';
import { ImplantacaoController } from './implantacao.controller';
import { ImplantacaoService } from './implantacao.service';

@Module({
  controllers: [ImplantacaoController],
  providers: [ImplantacaoService],
})
export class ImplantacaoModule {}
