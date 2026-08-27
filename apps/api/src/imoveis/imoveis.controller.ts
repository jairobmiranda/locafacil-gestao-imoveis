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
  atualizarImovelSchema,
  criarImovelSchema,
  listarImoveisSchema,
  type AtualizarImovelDto,
  type CriarImovelDto,
  type ListarImoveisDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { ImoveisService } from './imoveis.service';

@ApiTags('imoveis')
@ApiBearerAuth()
@Controller('imoveis')
export class ImoveisController {
  constructor(private readonly imoveis: ImoveisService) {}

  @Get()
  @ApiOperation({ summary: 'Lista imóveis com filtros e paginação' })
  listar(@Query(new ZodValidationPipe(listarImoveisSchema)) filtros: ListarImoveisDto) {
    return this.imoveis.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um imóvel' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.imoveis.buscar(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um imóvel' })
  criar(@Body(new ZodValidationPipe(criarImovelSchema)) dados: CriarImovelDto) {
    return this.imoveis.criar(dados);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um imóvel' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarImovelSchema)) dados: AtualizarImovelDto,
  ) {
    return this.imoveis.atualizar(id, dados);
  }

  @Patch(':id/arquivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Arquiva o imóvel (exclusão lógica)' })
  arquivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.imoveis.arquivar(id);
  }

  @Patch(':id/restaurar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverte o arquivamento' })
  restaurar(@Param('id', ParseUUIDPipe) id: string) {
    return this.imoveis.restaurar(id);
  }
}
