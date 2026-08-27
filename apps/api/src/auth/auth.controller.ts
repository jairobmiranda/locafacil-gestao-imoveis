import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { loginSchema, type LoginDto, type UsuarioAutenticado } from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { AuthService } from './auth.service';
import { Publico } from './publico.decorator';
import { UsuarioLogado } from './usuario-logado.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica e devolve o token JWT' })
  login(@Body(new ZodValidationPipe(loginSchema)) dados: LoginDto) {
    return this.auth.login(dados);
  }

  @Get('eu')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  eu(@UsuarioLogado() usuario: UsuarioAutenticado) {
    return usuario;
  }
}
