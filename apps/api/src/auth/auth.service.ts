import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { LoginDto, RespostaLogin } from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';

/** Hash descartavel comparado quando o e-mail nao existe, para o tempo de resposta nao denunciar contas validas. */
const HASH_NEUTRO = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dados: LoginDto): Promise<RespostaLogin> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dados.email.toLowerCase() },
    });

    const senhaConfere = await bcrypt.compare(dados.senha, usuario?.senhaHash ?? HASH_NEUTRO);

    if (!usuario || !usuario.ativo || !senhaConfere) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const token = await this.jwt.signAsync({
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  }
}
