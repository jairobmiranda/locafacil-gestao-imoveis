import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { gerarMinutaSchema, type GerarMinutaDto } from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { MinutasService } from './minutas.service';

const LIMITE_PDF_BYTES = 25 * 1024 * 1024;

@ApiTags('minutas')
@ApiBearerAuth()
@Controller()
export class MinutasController {
  constructor(private readonly minutas: MinutasService) {}

  @Get('contratos/:id/minutas')
  @ApiOperation({ summary: 'Lista as versões de minuta de um contrato' })
  listar(@Param('id', ParseUUIDPipe) id: string) {
    return this.minutas.listar(id);
  }

  @Post('contratos/:id/minutas/previa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renderiza a minuta sem persistir, para o preview do wizard' })
  previa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(gerarMinutaSchema)) dados: GerarMinutaDto,
  ) {
    return this.minutas.previa(id, dados.respostas);
  }

  @Post('contratos/:id/minutas')
  @ApiOperation({ summary: 'Gera e congela uma nova versão da minuta' })
  gerar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(gerarMinutaSchema)) dados: GerarMinutaDto,
  ) {
    return this.minutas.gerar(id, dados.respostas);
  }

  @Get('minutas/:id')
  @ApiOperation({ summary: 'Detalha a minuta com o HTML congelado' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.minutas.buscar(id);
  }

  @Post('minutas/:id/enviar-assinatura')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca a minuta como enviada para assinatura externa' })
  enviar(@Param('id', ParseUUIDPipe) id: string) {
    return this.minutas.enviarParaAssinatura(id);
  }

  @Post('minutas/:id/assinado')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: LIMITE_PDF_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Arquiva o PDF assinado devolvido pelo assinador externo' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['arquivo'],
      properties: { arquivo: { type: 'string', format: 'binary' } },
    },
  })
  registrarAssinado(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() arquivo: Express.Multer.File,
  ) {
    return this.minutas.registrarAssinado(id, arquivo);
  }

  @Post('minutas/:id/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela uma minuta ainda não assinada' })
  cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.minutas.cancelar(id);
  }
}
