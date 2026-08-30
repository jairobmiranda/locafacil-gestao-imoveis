import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  metadadosFotoSchema,
  responderItemSchema,
  type MetadadosFotoDto,
  type ResponderItemDto,
} from '@locafacil/contracts';
import { Publico } from '../auth/publico.decorator';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { lerTokenPublico } from '../comum/link-assinado';
import { PROPOSITO_VISTORIA } from './convite-vistoria.service';
import { VistoriasService } from './vistorias.service';

const LIMITE_FOTO_BYTES = 6 * 1024 * 1024;

/**
 * Fronteira hostil: tudo aqui e anonimo. O token HMAC e a unica autorizacao,
 * e a resposta nunca inclui dados do contrato ou das pessoas.
 */
@ApiTags('publico')
@Publico()
@Controller('publico')
export class VistoriaPublicaController {
  constructor(private readonly vistorias: VistoriasService) {}

  private idPorToken(token: string): string {
    const id = lerTokenPublico(PROPOSITO_VISTORIA, token);

    if (!id) {
      throw new NotFoundException('Link de vistoria inválido');
    }

    return id;
  }

  @Get('vistoria/:token')
  @ApiOperation({ summary: 'Roteiro e progresso da vistoria' })
  async abrir(@Param('token') token: string) {
    const id = this.idPorToken(token);
    const vistoria = await this.vistorias.buscar(id);

    return {
      ...(await this.vistorias.paraExecucao(id)),
      expirado: Boolean(vistoria.conviteExpiraEm && vistoria.conviteExpiraEm < new Date()),
      pendencias: this.vistorias.pendencias(vistoria),
    };
  }

  @Patch('vistoria/:token/itens/:itemId')
  @ApiOperation({ summary: 'Salva estado e observação de um item' })
  responder(
    @Param('token') token: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body(new ZodValidationPipe(responderItemSchema)) dados: ResponderItemDto,
  ) {
    return this.vistorias.responderItem(this.idPorToken(token), itemId, dados);
  }

  @Post('vistoria/:token/itens/:itemId/fotos')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: LIMITE_FOTO_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envia uma foto do item' })
  enviarFoto(
    @Param('token') token: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body(new ZodValidationPipe(metadadosFotoSchema)) metadados: MetadadosFotoDto,
    @UploadedFile() arquivo: Express.Multer.File | undefined,
  ) {
    return this.vistorias.enviarFoto(this.idPorToken(token), itemId, arquivo, metadados);
  }

  @Post('vistoria/:token/concluir')
  @ApiOperation({ summary: 'Valida os mínimos e finaliza a vistoria' })
  concluir(@Param('token') token: string) {
    return this.vistorias.concluir(this.idPorToken(token));
  }

  @Get('vistoria-foto/:fotoId')
  @ApiOperation({ summary: 'Miniatura da foto já enviada' })
  async foto(
    @Param('fotoId', ParseUUIDPipe) fotoId: string,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<StreamableFile> {
    const { foto, conteudo } = await this.vistorias.conteudoFoto(fotoId);

    resposta.set({
      'Content-Type': foto.tipoConteudo,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });

    return new StreamableFile(conteudo);
  }
}
