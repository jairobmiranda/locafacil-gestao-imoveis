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
  atualizarContratoSchema,
  criarContratoSchema,
  encerrarContratoSchema,
  listarContratosSchema,
  reajustarContratoSchema,
  type AtualizarContratoDto,
  type CriarContratoDto,
  type EncerrarContratoDto,
  type ListarContratosDto,
  type ReajustarContratoDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { ContratosService } from './contratos.service';
import { GeracaoCobrancasService } from './geracao-cobrancas.service';

@ApiTags('contratos')
@ApiBearerAuth()
@Controller('contratos')
export class ContratosController {
  constructor(
    private readonly contratos: ContratosService,
    private readonly geracao: GeracaoCobrancasService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista contratos com filtros e paginação' })
  listar(@Query(new ZodValidationPipe(listarContratosSchema)) filtros: ListarContratosDto) {
    return this.contratos.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um contrato' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.contratos.buscar(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um contrato de locação' })
  criar(@Body(new ZodValidationPipe(criarContratoSchema)) dados: CriarContratoDto) {
    return this.contratos.criar(dados);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um contrato não encerrado' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarContratoSchema)) dados: AtualizarContratoDto,
  ) {
    return this.contratos.atualizar(id, dados);
  }

  @Patch(':id/ativar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativa o contrato e marca o imóvel como alugado' })
  ativar(@Param('id', ParseUUIDPipe) id: string) {
    return this.contratos.ativar(id);
  }

  @Patch(':id/reajustar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplica o percentual de reajuste informado' })
  reajustar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reajustarContratoSchema)) dados: ReajustarContratoDto,
  ) {
    return this.contratos.reajustar(id, dados);
  }

  @Patch(':id/encerrar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra ou rescinde o contrato e cancela cobranças futuras' })
  encerrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(encerrarContratoSchema)) dados: EncerrarContratoDto,
  ) {
    return this.contratos.encerrar(id, dados);
  }

  @Post('gerar-cobrancas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispara a geração de cobranças manualmente' })
  gerarCobrancas() {
    return this.geracao.gerar();
  }
}
