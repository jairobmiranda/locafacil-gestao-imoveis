import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  atualizarLancamentoSchema,
  baixarLancamentoSchema,
  criarLancamentoSchema,
  listarLancamentosSchema,
  type AtualizarLancamentoDto,
  type BaixarLancamentoDto,
  type CriarLancamentoDto,
  type ListarLancamentosDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { LancamentosService } from './lancamentos.service';

@ApiTags('lancamentos')
@ApiBearerAuth()
@Controller('lancamentos')
export class LancamentosController {
  constructor(private readonly lancamentos: LancamentosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista lançamentos com filtros e paginação' })
  listar(@Query(new ZodValidationPipe(listarLancamentosSchema)) filtros: ListarLancamentosDto) {
    return this.lancamentos.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um lançamento' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.lancamentos.buscar(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um lançamento ou cobrança' })
  criar(@Body(new ZodValidationPipe(criarLancamentoSchema)) dados: CriarLancamentoDto) {
    return this.lancamentos.criar(dados);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um lançamento não pago' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarLancamentoSchema)) dados: AtualizarLancamentoDto,
  ) {
    return this.lancamentos.atualizar(id, dados);
  }

  @Patch(':id/baixar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dá baixa no pagamento, calculando multa, juros e desconto' })
  baixar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(baixarLancamentoSchema)) dados: BaixarLancamentoDto,
  ) {
    return this.lancamentos.baixar(id, dados);
  }

  @Patch(':id/estornar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desfaz a baixa e volta o lançamento para pendente' })
  estornar(@Param('id', ParseUUIDPipe) id: string) {
    return this.lancamentos.estornar(id);
  }

  @Patch(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela o lançamento e a fila de cobrança' })
  cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.lancamentos.cancelar(id);
  }
}
