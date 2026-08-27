import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioAutenticado } from '@locafacil/contracts';

export const UsuarioLogado = createParamDecorator(
  (_dado: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    return contexto.switchToHttp().getRequest<{ user: UsuarioAutenticado }>().user;
  },
);
