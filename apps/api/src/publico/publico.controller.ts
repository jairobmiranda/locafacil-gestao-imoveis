import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  informarPagamentoSchema,
  TAMANHO_MAXIMO_ANEXO_BYTES,
  type InformarPagamentoDto,
} from '@locafacil/contracts';
import { Publico } from '../auth/publico.decorator';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { PublicoService } from './publico.service';

@ApiTags('publico')
@Publico()
@Controller('publico')
export class PublicoController {
  constructor(private readonly publico: PublicoService) {}

  @Get('pagamento/:token')
  @ApiOperation({ summary: 'Dados da cobrança para a página pública' })
  resumo(@Param('token') token: string) {
    return this.publico.resumoPagamento(token);
  }

  @Post('pagamento/:token')
  @UseInterceptors(
    FileInterceptor('comprovante', { limits: { fileSize: TAMANHO_MAXIMO_ANEXO_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Inquilino informa que pagou' })
  informar(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(informarPagamentoSchema)) dados: InformarPagamentoDto,
    @UploadedFile() comprovante: Express.Multer.File | undefined,
  ) {
    return this.publico.informarPagamento(token, dados, comprovante);
  }
}
