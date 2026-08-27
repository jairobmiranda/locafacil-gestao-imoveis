import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  enviarAnexoSchema,
  listarAnexosSchema,
  TAMANHO_MAXIMO_ANEXO_BYTES,
  type EnviarAnexoDto,
  type ListarAnexosDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { AnexosService } from './anexos.service';

@ApiTags('anexos')
@ApiBearerAuth()
@Controller('anexos')
export class AnexosController {
  constructor(private readonly anexos: AnexosService) {}

  @Post()
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: TAMANHO_MAXIMO_ANEXO_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envia um arquivo e vincula a uma entidade' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['arquivo', 'entidadeTipo', 'entidadeId', 'especie'],
      properties: {
        arquivo: { type: 'string', format: 'binary' },
        entidadeTipo: { type: 'string', enum: ['IMOVEL', 'LANCAMENTO', 'CONTRATO', 'PESSOA'] },
        entidadeId: { type: 'string', format: 'uuid' },
        especie: {
          type: 'string',
          enum: ['COMPROVANTE', 'NOTA_FISCAL', 'CONTRATO', 'FOTO', 'ESCRITURA', 'LAUDO', 'OUTRO'],
        },
      },
    },
  })
  enviar(
    @Body(new ZodValidationPipe(enviarAnexoSchema)) dados: EnviarAnexoDto,
    @UploadedFile() arquivo: Express.Multer.File,
  ) {
    return this.anexos.enviar(dados, arquivo);
  }

  @Get()
  @ApiOperation({ summary: 'Lista anexos de uma entidade' })
  listar(@Query(new ZodValidationPipe(listarAnexosSchema)) filtros: ListarAnexosDto) {
    return this.anexos.listar(filtros);
  }

  @Get(':id/conteudo')
  @ApiOperation({ summary: 'Baixa o arquivo' })
  async baixar(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<StreamableFile> {
    const { anexo, conteudo } = await this.anexos.baixar(id);

    resposta.set({
      'Content-Type': anexo.tipoConteudo,
      'Content-Length': anexo.tamanhoBytes.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(anexo.nomeArquivo)}"`,
      // Evita que um PDF ou SVG hospedado seja interpretado como pagina no dominio da API.
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });

    return new StreamableFile(conteudo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove o anexo e o objeto no MinIO' })
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.anexos.remover(id);
  }
}
