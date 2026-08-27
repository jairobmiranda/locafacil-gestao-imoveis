import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarLancamentoDto,
  BaixarLancamentoDto,
  CriarLancamentoDto,
  ListarLancamentosDto,
  Paginado,
} from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { calcularEncargos } from './encargos';

const INCLUI_DETALHE = {
  itens: { orderBy: { ordem: 'asc' } },
  categoria: { select: { id: true, nome: true, natureza: true } },
  imovel: { select: { id: true, apelido: true } },
  pessoa: { select: { id: true, nome: true } },
} satisfies Prisma.LancamentoInclude;

@Injectable()
export class LancamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: ListarLancamentosDto): Promise<Paginado<unknown>> {
    const where: Prisma.LancamentoWhereInput = {
      imovelId: filtros.imovelId,
      contratoId: filtros.contratoId,
      categoriaId: filtros.categoriaId,
      pessoaId: filtros.pessoaId,
      natureza: filtros.natureza,
      situacao: filtros.situacao,
      capitalizavel: filtros.capitalizavel,
      competencia: this.intervalo(filtros.competenciaDe, filtros.competenciaAte),
      vencimento: this.intervalo(filtros.vencimentoDe, filtros.vencimentoAte),
    };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.lancamento.findMany({
        where,
        include: INCLUI_DETALHE,
        orderBy: [{ competencia: 'desc' }, { criadoEm: 'desc' }],
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      this.prisma.lancamento.count({ where }),
    ]);

    return { itens, total, pagina: filtros.pagina, limite: filtros.limite };
  }

  async buscar(id: string) {
    const lancamento = await this.prisma.lancamento.findUnique({
      where: { id },
      include: INCLUI_DETALHE,
    });

    if (!lancamento) {
      throw new NotFoundException('Lançamento não encontrado');
    }

    return lancamento;
  }

  async criar(dados: CriarLancamentoDto) {
    await this.garantirNaturezaDaCategoria(dados.categoriaId, dados.natureza);

    const { itens, ...lancamento } = dados;

    return this.prisma.lancamento.create({
      data: {
        ...lancamento,
        competencia: this.primeiroDiaDoMes(dados.competencia),
        itens: itens?.length ? { create: itens } : undefined,
      },
      include: INCLUI_DETALHE,
    });
  }

  async atualizar(id: string, dados: AtualizarLancamentoDto) {
    const atual = await this.buscar(id);

    if (atual.situacao === 'PAGO' || atual.situacao === 'CANCELADO') {
      throw new ConflictException(
        `Lançamento ${atual.situacao.toLowerCase()} não pode ser editado`,
      );
    }

    if (dados.categoriaId ?? dados.natureza) {
      await this.garantirNaturezaDaCategoria(
        dados.categoriaId ?? atual.categoriaId,
        dados.natureza ?? atual.natureza,
      );
    }

    const { itens, ...lancamento } = dados;

    return this.prisma.$transaction(async (tx) => {
      if (itens) {
        await tx.itemLancamento.deleteMany({ where: { lancamentoId: id } });
      }

      return tx.lancamento.update({
        where: { id },
        data: {
          ...lancamento,
          competencia: dados.competencia ? this.primeiroDiaDoMes(dados.competencia) : undefined,
          itens: itens?.length ? { create: itens } : undefined,
        },
        include: INCLUI_DETALHE,
      });
    });
  }

  async baixar(id: string, dados: BaixarLancamentoDto) {
    const lancamento = await this.prisma.lancamento.findUnique({
      where: { id },
      include: {
        contrato: {
          select: {
            percentualMulta: true,
            percentualJurosDia: true,
            descontoPontualidade: true,
          },
        },
      },
    });

    if (!lancamento) {
      throw new NotFoundException('Lançamento não encontrado');
    }

    if (lancamento.situacao === 'PAGO' || lancamento.situacao === 'CANCELADO') {
      throw new ConflictException(`Lançamento já está ${lancamento.situacao.toLowerCase()}`);
    }

    await this.garantirComprovante(id, dados.anexoComprovanteId);

    const encargos = calcularEncargos(
      lancamento.valor,
      lancamento.vencimento,
      dados.pagoEm,
      lancamento.contrato,
    );

    const valorPago = new Prisma.Decimal(dados.valorPago);
    const quitado = valorPago.greaterThanOrEqualTo(encargos.totalDevido.minus(0.01));

    return this.prisma.$transaction(async (tx) => {
      // Pagou, entao qualquer cobranca ainda na fila perde o sentido.
      await tx.notificacao.updateMany({
        where: { lancamentoId: id, situacao: 'PENDENTE' },
        data: { situacao: 'CANCELADO' },
      });

      return tx.lancamento.update({
        where: { id },
        data: {
          situacao: quitado ? 'PAGO' : 'PARCIAL',
          pagoEm: dados.pagoEm,
          valorPago,
          valorMulta: encargos.valorMulta,
          valorJuros: encargos.valorJuros,
          valorDesconto: encargos.valorDesconto,
          formaPagamento: dados.formaPagamento,
          observacoes: dados.observacoes ?? lancamento.observacoes,
        },
        include: INCLUI_DETALHE,
      });
    });
  }

  async estornar(id: string) {
    const lancamento = await this.buscar(id);

    if (lancamento.situacao !== 'PAGO' && lancamento.situacao !== 'PARCIAL') {
      throw new ConflictException('Só é possível estornar lançamento pago ou parcial');
    }

    return this.prisma.lancamento.update({
      where: { id },
      data: {
        situacao: 'PENDENTE',
        pagoEm: null,
        valorPago: null,
        valorMulta: 0,
        valorJuros: 0,
        valorDesconto: 0,
      },
      include: INCLUI_DETALHE,
    });
  }

  async cancelar(id: string) {
    const lancamento = await this.buscar(id);

    if (lancamento.situacao === 'PAGO') {
      throw new ConflictException('Estorne o pagamento antes de cancelar');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.notificacao.updateMany({
        where: { lancamentoId: id, situacao: 'PENDENTE' },
        data: { situacao: 'CANCELADO' },
      });

      return tx.lancamento.update({
        where: { id },
        data: { situacao: 'CANCELADO' },
        include: INCLUI_DETALHE,
      });
    });
  }

  private async garantirComprovante(lancamentoId: string, anexoId: string): Promise<void> {
    const comprovante = await this.prisma.anexo.findFirst({
      where: {
        id: anexoId,
        entidadeTipo: 'LANCAMENTO',
        entidadeId: lancamentoId,
        especie: 'COMPROVANTE',
      },
      select: { id: true },
    });

    if (!comprovante) {
      throw new BadRequestException(
        'Envie o comprovante como anexo deste lançamento antes de dar baixa',
      );
    }
  }

  private async garantirNaturezaDaCategoria(
    categoriaId: string,
    natureza: 'ENTRADA' | 'SAIDA',
  ): Promise<void> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { natureza: true, ativa: true },
    });

    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (!categoria.ativa) {
      throw new BadRequestException('Categoria inativa');
    }

    if (categoria.natureza !== natureza) {
      throw new BadRequestException(
        `A categoria é de ${categoria.natureza} e não combina com o lançamento de ${natureza}`,
      );
    }
  }

  private intervalo(de?: Date, ate?: Date): Prisma.DateTimeFilter | undefined {
    return de || ate ? { gte: de, lte: ate } : undefined;
  }

  private primeiroDiaDoMes(data: Date): Date {
    return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
  }
}
