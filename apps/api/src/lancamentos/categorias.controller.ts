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
  atualizarCategoriaSchema,
  criarCategoriaSchema,
  listarCategoriasSchema,
  type AtualizarCategoriaDto,
  type CriarCategoriaDto,
  type ListarCategoriasDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { CategoriasService } from './categorias.service';

@ApiTags('categorias')
@ApiBearerAuth()
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as categorias de lançamento' })
  listar(@Query(new ZodValidationPipe(listarCategoriasSchema)) filtros: ListarCategoriasDto) {
    return this.categorias.listar(filtros);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra uma categoria' })
  criar(@Body(new ZodValidationPipe(criarCategoriaSchema)) dados: CriarCategoriaDto) {
    return this.categorias.criar(dados);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma categoria' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarCategoriaSchema)) dados: AtualizarCategoriaDto,
  ) {
    return this.categorias.atualizar(id, dados);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma categoria que ainda não foi usada' })
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.categorias.remover(id);
  }
}
