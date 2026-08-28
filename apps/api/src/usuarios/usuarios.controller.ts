import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  type AtualizarUsuarioDto,
  type CriarUsuarioDto,
  type UsuarioAutenticado,
} from '@locafacil/contracts';
import { AdminGuard } from '../auth/admin.guard';
import { UsuarioLogado } from '../auth/usuario-logado.decorator';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os usuários do sistema' })
  listar() {
    return this.usuarios.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um usuário' })
  criar(@Body(new ZodValidationPipe(criarUsuarioSchema)) dados: CriarUsuarioDto) {
    return this.usuarios.criar(dados);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados, perfil ou situação do usuário' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarUsuarioSchema)) dados: AtualizarUsuarioDto,
    @UsuarioLogado() solicitante: UsuarioAutenticado,
  ) {
    return this.usuarios.atualizar(id, dados, solicitante.id);
  }
}
