import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { PerfilUsuario, UsuarioAutenticado } from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';

type PayloadJwt = {
  sub: string;
  email: string;
  perfil: PerfilUsuario;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const segredo = config.get<string>('JWT_SECRET');

    if (!segredo || segredo.length < 32) {
      throw new Error('JWT_SECRET ausente ou com menos de 32 caracteres');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: segredo,
    });
  }

  // Reconsulta o banco para que usuario desativado perca acesso sem esperar o token expirar.
  async validate(payload: PayloadJwt): Promise<UsuarioAutenticado> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    });

    if (!usuario?.ativo) {
      throw new UnauthorizedException('Sessão inválida');
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    };
  }
}
