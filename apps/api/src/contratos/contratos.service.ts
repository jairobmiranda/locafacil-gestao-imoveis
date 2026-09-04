import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarContratoDto,
  CriarContratoDto,
  EncerrarContratoDto,
  ListarContratosDto,
  Paginado,
  ReajustarContratoDto,
} from '@locafacil/contracts';
import { ReguaCobrancaService } from '../cobranca/regua-cobranca.service';
import { apenasData, somarDias, somarMeses } from '../comum/datas';
import { PrismaService } from '../prisma/prisma.service';
import { GeracaoCobrancasService } from './geracao-cobrancas.service';

const INCLUI_DETALHE = {
  imovel: { select: { id: true, apelido: true, cidade: true, uf: true, tipo: true } },
  itens: { include: { categoria: { select: { id: true, nome: true } } } },
  partes: { include: { pessoa: { select: { id: true, nome: true, email: true } } } },
  chavePix: { select: { id: true, tipoChave: true, chave: true } },
} satisfies Prisma.ContratoInclude;

@Injectable()
export class ContratosService {
  private readonly logger = new Logger(ContratosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geracao: GeracaoCobrancasService,
    private readonly regua: ReguaCobrancaService,
  ) {}

  async listar(filtros: ListarContratosDto): Promise<Paginado<unknown>> {
    const where: Prisma.ContratoWhereInput = {
      imovelId: filtros.imovelId,
      situacao: filtros.situacao,
      partes: filtros.pessoaId ? { some: { pessoaId: filtros.pessoaId } } : undefined,
      dataFim: filtros.vencendoEmDias
        ? { lte: somarDias(new Date(), filtros.vencendoEmDias) }
        : undefined,
    };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.contrato.findMany({
        where,
        include: INCLUI_DETALHE,
        orderBy: { dataInicio: 'desc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      this.prisma.contrato.count({ where }),
    ]);

    return { itens, total, pagina: filtros.pagina, limite: filtros.limite };
  }

  async buscar(id: string) {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: INCLUI_DETALHE,
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    return contrato;
  }

  async criar(dados: CriarContratoDto) {
    const { itens, partes, ...contrato } = dados;

    if (contrato.situacao === 'ATIVO') {
      await this.garantirImovelLivre(contrato.imovelId, contrato.dataInicio, contrato.dataFim);
    }

    const criado = await this.prisma.contrato.create({
      data: {
        ...contrato,
        proximoReajusteEm: somarMeses(contrato.dataInicio, contrato.intervaloReajusteMeses),
        itens: { create: itens },
        partes: { create: partes },
      },
      include: INCLUI_DETALHE,
    });

    if (criado.situacao === 'ATIVO') {
      await this.cobrarDesdeJa(criado.id);
    }

    return criado;
  }

  async atualizar(id: string, dados: AtualizarContratoDto) {
    const atual = await this.buscar(id);

    if (atual.situacao === 'ENCERRADO' || atual.situacao === 'RESCINDIDO') {
      throw new ConflictException('Contrato encerrado não pode ser editado');
    }

    const { itens, partes, ...contrato } = dados;

    if (contrato.situacao === 'ATIVO' && atual.situacao !== 'ATIVO') {
      await this.garantirImovelLivre(
        atual.imovelId,
        contrato.dataInicio ?? atual.dataInicio,
        contrato.dataFim ?? atual.dataFim,
        id,
      );
    }

    const atualizado = await this.prisma.$transaction(async (tx) => {
      if (itens) {
        await tx.itemContrato.deleteMany({ where: { contratoId: id } });
      }

      if (partes) {
        await tx.parteContrato.deleteMany({ where: { contratoId: id } });
      }

      return tx.contrato.update({
        where: { id },
        data: {
          ...contrato,
          itens: itens ? { create: itens } : undefined,
          partes: partes ? { create: partes } : undefined,
        },
        include: INCLUI_DETALHE,
      });
    });

    if (atualizado.situacao === 'ATIVO' && atual.situacao !== 'ATIVO') {
      await this.cobrarDesdeJa(id);
    }

    return atualizado;
  }

  async ativar(id: string) {
    const contrato = await this.buscar(id);

    if (contrato.situacao === 'ATIVO') {
      return contrato;
    }

    if (contrato.situacao !== 'RASCUNHO') {
      throw new ConflictException('Só é possível ativar contrato em rascunho');
    }

    if (!contrato.partes.some((parte) => parte.contatoPrincipal && parte.pessoa.email)) {
      throw new BadRequestException(
        'O contato principal precisa ter e-mail cadastrado para receber as cobranças',
      );
    }

    await this.garantirImovelLivre(
      contrato.imovelId,
      contrato.dataInicio,
      contrato.dataFim,
      id,
    );

    const ativado = await this.prisma.$transaction(async (tx) => {
      await tx.imovel.update({ where: { id: contrato.imovelId }, data: { situacao: 'ALUGADO' } });

      return tx.contrato.update({
        where: { id },
        data: { situacao: 'ATIVO' },
        include: INCLUI_DETALHE,
      });
    });

    await this.cobrarDesdeJa(id);

    return ativado;
  }

  /**
   * Contrato que entra em vigor no proprio dia do vencimento nao pode esperar o cron da
   * madrugada seguinte: ai a etapa do dia do vencimento ja teria passado. Gera a cobranca
   * e roda a regua so para este contrato, na hora.
   *
   * Falha aqui nao derruba a ativacao: o cron do dia seguinte refaz o trabalho e a regua
   * recupera a etapa dentro da janela de recuperacao.
   */
  private async cobrarDesdeJa(contratoId: string): Promise<void> {
    try {
      await this.geracao.gerar(new Date(), contratoId);
      await this.regua.agendar(new Date(), contratoId);
    } catch (erro) {
      this.logger.error(
        `Contrato ${contratoId} ativado, mas a cobrança imediata falhou: ${(erro as Error).message}`,
      );
    }
  }

  /** Reajuste e manual: o sistema avisa e aplica o percentual informado, sem consultar indice. */
  async reajustar(id: string, dados: ReajustarContratoDto) {
    const contrato = await this.buscar(id);

    if (contrato.situacao !== 'ATIVO') {
      throw new ConflictException('Só é possível reajustar contrato ativo');
    }

    const fator = new Prisma.Decimal(1).plus(new Prisma.Decimal(dados.percentual).div(100));
    const novoAluguel = contrato.valorAluguel.mul(fator).toDecimalPlaces(2);
    const base = dados.vigenteA ?? new Date();

    return this.prisma.contrato.update({
      where: { id },
      data: {
        valorAluguel: novoAluguel,
        proximoReajusteEm: somarMeses(apenasData(base), contrato.intervaloReajusteMeses),
      },
      include: INCLUI_DETALHE,
    });
  }

  async encerrar(id: string, dados: EncerrarContratoDto) {
    const contrato = await this.buscar(id);

    if (contrato.situacao === 'ENCERRADO' || contrato.situacao === 'RESCINDIDO') {
      throw new ConflictException('Contrato já encerrado');
    }

    const dataRescisao = dados.dataRescisao ? apenasData(dados.dataRescisao) : null;
    const antecipado = dataRescisao !== null && dataRescisao < apenasData(contrato.dataFim);

    return this.prisma.$transaction(async (tx) => {
      // Cobranca futura de contrato encerrado nao deve continuar na fila.
      const canceladas = await tx.lancamento.findMany({
        where: {
          contratoId: id,
          situacao: 'PENDENTE',
          origem: 'CONTRATO_AUTOMATICO',
          vencimento: { gt: dataRescisao ?? contrato.dataFim },
        },
        select: { id: true },
      });

      const ids = canceladas.map((lancamento) => lancamento.id);

      if (ids.length) {
        await tx.notificacao.updateMany({
          where: { lancamentoId: { in: ids }, situacao: 'PENDENTE' },
          data: { situacao: 'CANCELADO' },
        });
        await tx.lancamento.updateMany({
          where: { id: { in: ids } },
          data: { situacao: 'CANCELADO' },
        });
      }

      await tx.imovel.update({
        where: { id: contrato.imovelId },
        data: { situacao: 'PARA_ALUGAR' },
      });

      return tx.contrato.update({
        where: { id },
        data: {
          situacao: antecipado ? 'RESCINDIDO' : 'ENCERRADO',
          dataRescisao,
          gerarCobrancas: false,
          observacoes: dados.motivo ?? contrato.observacoes,
        },
        include: INCLUI_DETALHE,
      });
    });
  }

  /** Um imovel nao pode ter dois contratos ativos com periodos sobrepostos. */
  private async garantirImovelLivre(
    imovelId: string,
    inicio: Date,
    fim: Date,
    ignorarId?: string,
  ): Promise<void> {
    const conflito = await this.prisma.contrato.findFirst({
      where: {
        imovelId,
        situacao: 'ATIVO',
        id: ignorarId ? { not: ignorarId } : undefined,
        dataInicio: { lte: fim },
        dataFim: { gte: inicio },
      },
      select: { id: true, dataInicio: true, dataFim: true },
    });

    if (conflito) {
      throw new ConflictException(
        `Imóvel já possui contrato ativo no período (contrato ${conflito.id})`,
      );
    }
  }
}
