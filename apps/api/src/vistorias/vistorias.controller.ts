import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  criarVistoriaSchema,
  enviarConviteSchema,
  listarVistoriasSchema,
  recusarVistoriaSchema,
  responderItemSchema,
  type CriarVistoriaDto,
  type EnviarConviteDto,
  type ListarVistoriasDto,
  type RecusarVistoriaDto,
  type ResponderItemDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { ConviteVistoriaService } from './convite-vistoria.service';
import { LaudoService } from './laudo.service';
import { VistoriasService } from './vistorias.service';

@ApiTags('vistorias')
@ApiBearerAuth()
@Controller('vistorias')
export class VistoriasController {
  constructor(
    private readonly vistorias: VistoriasService,
    private readonly convite: ConviteVistoriaService,
    private readonly laudo: LaudoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista vistorias' })
  listar(@Query(new ZodValidationPipe(listarVistoriasSchema)) filtros: ListarVistoriasDto) {
    return this.vistorias.listar(filtros);
  }

  @Get('roteiros')
  @ApiOperation({ summary: 'Lista os roteiros e seus ambientes, para montar a seleção' })
  roteiros() {
    return this.vistorias.roteiros();
  }

  @Post()
  @ApiOperation({ summary: 'Cria a vistoria e materializa o roteiro' })
  criar(@Body(new ZodValidationPipe(criarVistoriaSchema)) dados: CriarVistoriaDto) {
    return this.vistorias.criar(dados);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha a vistoria com ambientes, itens e fotos' })
  async buscar(@Param('id', ParseUUIDPipe) id: string) {
    const [vistoria, destinatarios] = await Promise.all([
      this.vistorias.buscar(id),
      this.vistorias.destinatariosConvite(id),
    ]);

    return {
      ...vistoria,
      link: this.convite.linkPara(id),
      pendencias: this.vistorias.pendencias(vistoria),
      destinatarios,
    };
  }

  @Post(':id/convite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispara o convite por e-mail. Sempre manual, nunca automático' })
  async enviarConvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(enviarConviteSchema)) dados: EnviarConviteDto,
  ) {
    const vistoria = await this.vistorias.registrarConvite(id, dados);
    const completa = await this.vistorias.buscar(id);

    await this.convite.enviar({
      vistoriaId: id,
      email: dados.email,
      copias: dados.copias,
      tipo: vistoria.tipo,
      imovel: completa.imovel.apelido,
      expiraEm: vistoria.conviteExpiraEm ?? new Date(),
    });

    return vistoria;
  }

  @Patch(':id/itens/:itemId')
  @ApiOperation({ summary: 'Responde um item pelo painel interno' })
  responder(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body(new ZodValidationPipe(responderItemSchema)) dados: ResponderItemDto,
  ) {
    return this.vistorias.responderItem(id, itemId, dados);
  }

  @Delete(':id/fotos/:fotoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma foto da vistoria' })
  removerFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fotoId', ParseUUIDPipe) fotoId: string,
  ) {
    return this.vistorias.removerFoto(id, fotoId);
  }

  @Post(':id/aprovar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprova a vistoria enviada' })
  aprovar(@Param('id', ParseUUIDPipe) id: string) {
    return this.vistorias.aprovar(id);
  }

  @Post(':id/recusar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recusa a vistoria e devolve para complemento' })
  recusar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(recusarVistoriaSchema)) dados: RecusarVistoriaDto,
  ) {
    return this.vistorias.recusar(id, dados.motivo);
  }

  @Post(':id/laudo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gera o laudo em PDF e arquiva como anexo' })
  gerarLaudo(@Param('id', ParseUUIDPipe) id: string) {
    return this.laudo.gerar(id);
  }

  @Get(':id/fotos/:fotoId/conteudo')
  @ApiOperation({ summary: 'Baixa uma foto da vistoria' })
  async baixarFoto(
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
