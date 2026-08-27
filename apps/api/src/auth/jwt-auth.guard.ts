import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PUBLICO_KEY } from './publico.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(contexto: ExecutionContext) {
    const publico = this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    return publico ? true : super.canActivate(contexto);
  }
}
