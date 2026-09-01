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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  atualizarFeriadoSchema,
  criarFeriadoSchema,
  listarFeriadosSchema,
  type AtualizarFeriadoDto,
  type CriarFeriadoDto,
  type ListarFeriadosDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { FeriadosService } from './feriados.service';

@ApiTags('feriados')
@ApiBearerAuth()
@Controller('feriados')
export class FeriadosController {
  constructor(private readonly feriados: FeriadosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os feriados cadastrados' })
  listar(@Query(new ZodValidationPipe(listarFeriadosSchema)) filtros: ListarFeriadosDto) {
    return this.feriados.listar(filtros.ano);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um feriado' })
  criar(@Body(new ZodValidationPipe(criarFeriadoSchema)) dados: CriarFeriadoDto) {
    return this.feriados.criar(dados);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um feriado' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarFeriadoSchema)) dados: AtualizarFeriadoDto,
  ) {
    return this.feriados.atualizar(id, dados);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um feriado' })
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.feriados.remover(id);
  }
}
