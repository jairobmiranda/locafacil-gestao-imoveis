import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AtualizarModeloEmailDto,
  AtualizarRegraCobrancaDto,
  AtualizarReguaCobrancaDto,
  CriarModeloEmailDto,
  CriarRegraCobrancaDto,
  CriarReguaCobrancaDto,
  ListarNotificacoesDto,
  Paginado,
} from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CobrancaService {
  constructor(private readonly prisma: PrismaService) {}

  // ----- Modelos de e-mail -----

  listarModelos() {
    return this.prisma.modeloEmail.findMany({ orderBy: { nome: 'asc' } });
  }

  criarModelo(dados: CriarModeloEmailDto) {
    return this.prisma.modeloEmail.create({ data: dados });
  }

  async atualizarModelo(id: string, dados: AtualizarModeloEmailDto) {
    await this.garantirModelo(id);

    return this.prisma.modeloEmail.update({ where: { id }, data: dados });
  }

  async removerModelo(id: string): Promise<void> {
    const emUso = await this.prisma.regraCobranca.count({ where: { modeloEmailId: id } });

    if (emUso) {
      throw new ConflictException('Modelo usado por regras da régua. Desative-o em vez de excluir');
    }

    await this.garantirModelo(id);
    await this.prisma.modeloEmail.delete({ where: { id } });
  }

  // ----- Reguas -----

  listarReguas() {
    return this.prisma.reguaCobranca.findMany({
      include: { regras: { include: { modeloEmail: { select: { id: true, nome: true } } }, orderBy: { sequencia: 'asc' } } },
      orderBy: [{ padrao: 'desc' }, { nome: 'asc' }],
    });
  }

  criarRegua(dados: CriarReguaCobrancaDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dados.padrao) {
        await tx.reguaCobranca.updateMany({ where: { padrao: true }, data: { padrao: false } });
      }

      return tx.reguaCobranca.create({ data: dados });
    });
  }

  async atualizarRegua(id: string, dados: AtualizarReguaCobrancaDto) {
    await this.garantirRegua(id);

    return this.prisma.$transaction(async (tx) => {
      if (dados.padrao) {
        await tx.reguaCobranca.updateMany({ where: { padrao: true }, data: { padrao: false } });
      }

      return tx.reguaCobranca.update({ where: { id }, data: dados });
    });
  }

  // ----- Regras -----

  async criarRegra(reguaId: string, dados: CriarRegraCobrancaDto) {
    await this.garantirRegua(reguaId);

    // Sequencia provisoria fora da faixa usada; a ordem real vem do renumerar.
    const criada = await this.prisma.regraCobranca.create({
      data: { ...dados, reguaId, sequencia: -1 },
    });

    await this.renumerar(reguaId);

    return this.prisma.regraCobranca.findUniqueOrThrow({ where: { id: criada.id } });
  }

  async atualizarRegra(id: string, dados: AtualizarRegraCobrancaDto) {
    const regra = await this.prisma.regraCobranca.findUnique({ where: { id } });

    if (!regra) {
      throw new NotFoundException('Regra não encontrada');
    }

    await this.prisma.regraCobranca.update({ where: { id }, data: dados });
    await this.renumerar(regra.reguaId);

    return this.prisma.regraCobranca.findUniqueOrThrow({ where: { id } });
  }

  async removerRegra(id: string): Promise<void> {
    const regra = await this.prisma.regraCobranca.findUnique({ where: { id } });

    if (!regra) {
      throw new NotFoundException('Regra não encontrada');
    }

    await this.prisma.regraCobranca.delete({ where: { id } });
    await this.renumerar(regra.reguaId);
  }

  /** A ordem das etapas e cronologica: quem dispara antes vem antes. */
  private async renumerar(reguaId: string): Promise<void> {
    const regras = await this.prisma.regraCobranca.findMany({
      where: { reguaId },
      select: { id: true },
      orderBy: [{ diasOffset: 'asc' }, { horaEnvio: 'asc' }],
    });

    await this.prisma.$transaction(async (tx) => {
      // O indice [reguaId, sequencia] e unico, entao a ordem passa por valores livres antes.
      for (const [indice, regra] of regras.entries()) {
        await tx.regraCobranca.update({
          where: { id: regra.id },
          data: { sequencia: -(indice + 1) },
        });
      }

      for (const [indice, regra] of regras.entries()) {
        await tx.regraCobranca.update({
          where: { id: regra.id },
          data: { sequencia: indice + 1 },
        });
      }
    });
  }

  // ----- Notificacoes -----

  async listarNotificacoes(filtros: ListarNotificacoesDto): Promise<Paginado<unknown>> {
    const where = {
      lancamentoId: filtros.lancamentoId,
      contratoId: filtros.contratoId,
      situacao: filtros.situacao,
    };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.notificacao.findMany({
        where,
        select: {
          id: true,
          lancamentoId: true,
          contratoId: true,
          ocorrencia: true,
          destinatario: true,
          assunto: true,
          agendadoPara: true,
          enviadoEm: true,
          situacao: true,
          tentativas: true,
          mensagemErro: true,
        },
        orderBy: { agendadoPara: 'desc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      this.prisma.notificacao.count({ where }),
    ]);

    return { itens, total, pagina: filtros.pagina, limite: filtros.limite };
  }

  async buscarNotificacao(id: string) {
    const notificacao = await this.prisma.notificacao.findUnique({ where: { id } });

    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    return notificacao;
  }

  private async garantirModelo(id: string): Promise<void> {
    const existe = await this.prisma.modeloEmail.count({ where: { id } });

    if (!existe) {
      throw new NotFoundException('Modelo de e-mail não encontrado');
    }
  }

  private async garantirRegua(id: string): Promise<void> {
    const existe = await this.prisma.reguaCobranca.count({ where: { id } });

    if (!existe) {
      throw new NotFoundException('Régua não encontrada');
    }
  }
}
