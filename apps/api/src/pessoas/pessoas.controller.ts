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
  atualizarPessoaSchema,
  criarPessoaSchema,
  listarPessoasSchema,
  type AtualizarPessoaDto,
  type CriarPessoaDto,
  type ListarPessoasDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { PessoasService } from './pessoas.service';

@ApiTags('pessoas')
@ApiBearerAuth()
@Controller('pessoas')
export class PessoasController {
  constructor(private readonly pessoas: PessoasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista pessoas com busca e paginação' })
  listar(@Query(new ZodValidationPipe(listarPessoasSchema)) filtros: ListarPessoasDto) {
    return this.pessoas.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma pessoa e seus contratos' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pessoas.buscar(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra uma pessoa' })
  criar(@Body(new ZodValidationPipe(criarPessoaSchema)) dados: CriarPessoaDto) {
    return this.pessoas.criar(dados);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma pessoa' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarPessoaSchema)) dados: AtualizarPessoaDto,
  ) {
    return this.pessoas.atualizar(id, dados);
  }

  @Patch(':id/arquivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Arquiva a pessoa (exclusão lógica)' })
  arquivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pessoas.arquivar(id);
  }

  @Patch(':id/restaurar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverte o arquivamento' })
  restaurar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pessoas.restaurar(id);
  }
}
