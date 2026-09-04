import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  aceitarVistoriaSchema,
  metadadosFotoSchema,
  responderItemSchema,
  type AceitarVistoriaDto,
  type MetadadosFotoDto,
  type ResponderItemDto,
} from '@locafacil/contracts';
import { Publico } from '../auth/publico.decorator';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { lerTokenPublico } from '../comum/link-assinado';
import { contextoDaRequisicao } from '../comum/requisicao';
import { PROPOSITO_VISTORIA } from './convite-vistoria.service';
import { EventosVistoriaService } from './eventos-vistoria.service';
import { LaudoService, PROPOSITO_LAUDO } from './laudo.service';
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
  constructor(
    private readonly vistorias: VistoriasService,
    private readonly eventos: EventosVistoriaService,
    private readonly laudo: LaudoService,
  ) {}

  private idPorToken(token: string, proposito = PROPOSITO_VISTORIA): string {
    const id = lerTokenPublico(proposito, token);

    if (!id) {
      throw new NotFoundException('Link de vistoria inválido');
    }

    return id;
  }

  @Get('vistoria/:token')
  @ApiOperation({ summary: 'Roteiro e progresso da vistoria' })
  async abrir(@Param('token') token: string, @Req() requisicao: Request) {
    const id = this.idPorToken(token);
    const vistoria = await this.vistorias.buscar(id);

    await this.eventos.registrarAcesso(id, contextoDaRequisicao(requisicao));

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
    @Req() requisicao: Request,
  ) {
    return this.vistorias.responderItem(
      this.idPorToken(token),
      itemId,
      dados,
      contextoDaRequisicao(requisicao),
    );
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
    @Req() requisicao: Request,
  ) {
    return this.vistorias.enviarFoto(
      this.idPorToken(token),
      itemId,
      arquivo,
      metadados,
      contextoDaRequisicao(requisicao),
    );
  }

  @Delete('vistoria/:token/fotos/:fotoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma foto que quem vistoriou enviou por engano' })
  removerFoto(
    @Param('token') token: string,
    @Param('fotoId', ParseUUIDPipe) fotoId: string,
    @Req() requisicao: Request,
  ) {
    return this.vistorias.removerFoto(this.idPorToken(token), fotoId, {
      origem: 'LINK_PUBLICO',
      contexto: contextoDaRequisicao(requisicao),
    });
  }

  @Post('vistoria/:token/concluir')
  @ApiOperation({ summary: 'Valida os mínimos, registra o aceite e finaliza a vistoria' })
  concluir(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(aceitarVistoriaSchema)) aceite: AceitarVistoriaDto,
    @Req() requisicao: Request,
  ) {
    return this.vistorias.concluir(
      this.idPorToken(token),
      aceite,
      contextoDaRequisicao(requisicao),
    );
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

  /** Link do e-mail do laudo. Token próprio: o do convite não abre o PDF nem o contrário. */
  @Get('laudo/:token')
  @ApiOperation({ summary: 'Baixa o laudo vigente pelo link assinado' })
  async baixarLaudo(
    @Param('token') token: string,
    @Req() requisicao: Request,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<StreamableFile> {
    const id = this.idPorToken(token, PROPOSITO_LAUDO);
    const { anexo, conteudo } = await this.laudo.conteudoPorVistoria(id);

    await this.eventos.registrarAcesso(id, contextoDaRequisicao(requisicao), 'LAUDO_ABERTO');

    resposta.set({
      'Content-Type': anexo.tipoConteudo,
      'Content-Disposition': `inline; filename="${anexo.nomeArquivo}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    return new StreamableFile(conteudo);
  }
}
