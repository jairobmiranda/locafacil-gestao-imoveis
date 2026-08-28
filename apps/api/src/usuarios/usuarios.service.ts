import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { AtualizarUsuarioDto, CriarUsuarioDto } from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';

const CAMPOS = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  criadoEm: true,
} as const;

const CUSTO_HASH = 12;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.usuario.findMany({ select: CAMPOS, orderBy: { nome: 'asc' } });
  }

  async criar(dados: CriarUsuarioDto) {
    const email = dados.email.toLowerCase();

    await this.garantirEmailLivre(email);

    return this.prisma.usuario.create({
      data: {
        nome: dados.nome,
        email,
        senhaHash: await bcrypt.hash(dados.senha, CUSTO_HASH),
        perfil: dados.perfil,
        ativo: dados.ativo,
      },
      select: CAMPOS,
    });
  }

  async atualizar(id: string, dados: AtualizarUsuarioDto, solicitanteId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: CAMPOS });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const email = dados.email?.toLowerCase();

    if (email && email !== usuario.email) {
      await this.garantirEmailLivre(email);
    }

    if (id === solicitanteId && (dados.ativo === false || (dados.perfil && dados.perfil !== 'ADMIN'))) {
      throw new BadRequestException('Não é possível inativar ou rebaixar o próprio usuário');
    }

    const perderiaAdmin =
      usuario.perfil === 'ADMIN' &&
      usuario.ativo &&
      (dados.ativo === false || (dados.perfil !== undefined && dados.perfil !== 'ADMIN'));

    if (perderiaAdmin) {
      await this.garantirOutroAdminAtivo(id);
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        nome: dados.nome,
        email,
        perfil: dados.perfil,
        ativo: dados.ativo,
        senhaHash: dados.senha ? await bcrypt.hash(dados.senha, CUSTO_HASH) : undefined,
      },
      select: CAMPOS,
    });
  }

  private async garantirEmailLivre(email: string): Promise<void> {
    const existente = await this.prisma.usuario.findUnique({ where: { email } });

    if (existente) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }
  }

  /** Evita deixar o sistema sem nenhum administrador capaz de entrar. */
  private async garantirOutroAdminAtivo(id: string): Promise<void> {
    const restantes = await this.prisma.usuario.count({
      where: { ativo: true, perfil: 'ADMIN', id: { not: id } },
    });

    if (restantes === 0) {
      throw new ConflictException('É preciso manter ao menos um administrador ativo');
    }
  }
}
