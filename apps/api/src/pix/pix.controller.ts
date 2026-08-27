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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { toBuffer } from 'qrcode';
import {
  atualizarChavePixSchema,
  criarChavePixSchema,
  gerarCobrancaPixSchema,
  type AtualizarChavePixDto,
  type CriarChavePixDto,
  type GerarCobrancaPixDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { PixService } from './pix.service';

@ApiTags('pix')
@ApiBearerAuth()
@Controller('pix')
export class PixController {
  constructor(private readonly pix: PixService) {}

  @Get('chaves')
  @ApiOperation({ summary: 'Lista as chaves Pix cadastradas' })
  listarChaves() {
    return this.pix.listarChaves();
  }

  @Post('chaves')
  @ApiOperation({ summary: 'Cadastra uma chave Pix' })
  criarChave(@Body(new ZodValidationPipe(criarChavePixSchema)) dados: CriarChavePixDto) {
    return this.pix.criarChave(dados);
  }

  @Patch('chaves/:id')
  @ApiOperation({ summary: 'Atualiza uma chave Pix' })
  atualizarChave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarChavePixSchema)) dados: AtualizarChavePixDto,
  ) {
    return this.pix.atualizarChave(id, dados);
  }

  @Delete('chaves/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma chave Pix não vinculada a contratos' })
  removerChave(@Param('id', ParseUUIDPipe) id: string) {
    return this.pix.removerChave(id);
  }

  @Post('cobrancas/:lancamentoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gera o BR Code do lançamento e congela o payload' })
  gerarCobranca(
    @Param('lancamentoId', ParseUUIDPipe) lancamentoId: string,
    @Body(new ZodValidationPipe(gerarCobrancaPixSchema)) dados: GerarCobrancaPixDto,
  ) {
    return this.pix.gerarCobranca(lancamentoId, dados);
  }

  @Get('cobrancas/:lancamentoId/qrcode')
  @ApiOperation({ summary: 'QR Code em PNG do payload já gerado' })
  async qrcode(
    @Param('lancamentoId', ParseUUIDPipe) lancamentoId: string,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<StreamableFile> {
    const { payload } = await this.pix.gerarCobranca(lancamentoId, {});

    const png = await toBuffer(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 360,
    });

    resposta.set({ 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });

    return new StreamableFile(png);
  }
}
