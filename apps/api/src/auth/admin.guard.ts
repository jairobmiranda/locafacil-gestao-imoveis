import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '@locafacil/contracts';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const requisicao = contexto.switchToHttp().getRequest<{ user?: UsuarioAutenticado }>();

    if (requisicao.user?.perfil !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem gerenciar usuários');
    }

    return true;
  }
}
