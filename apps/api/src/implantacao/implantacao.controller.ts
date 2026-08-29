import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  alvoImplantacaoSchema,
  salvarWebhooksSchema,
  type AlvoImplantacao,
  type SalvarWebhooksDto,
} from '@locafacil/contracts';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { ImplantacaoService } from './implantacao.service';

@ApiTags('implantacao')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('implantacao')
export class ImplantacaoController {
  constructor(private readonly implantacao: ImplantacaoService) {}

  @Get('webhooks')
  @ApiOperation({ summary: 'Webhooks de build configurados' })
  buscarWebhooks() {
    return this.implantacao.buscarWebhooks();
  }

  @Put('webhooks')
  @ApiOperation({ summary: 'Salva os webhooks de build do CapRover' })
  salvarWebhooks(@Body(new ZodValidationPipe(salvarWebhooksSchema)) dados: SalvarWebhooksDto) {
    return this.implantacao.salvarWebhooks(dados);
  }

  @Post('publicar/:alvo')
  @ApiOperation({ summary: 'Dispara o build do app no CapRover' })
  publicar(@Param('alvo', new ZodValidationPipe(alvoImplantacaoSchema)) alvo: AlvoImplantacao) {
    return this.implantacao.publicar(alvo);
  }
}
