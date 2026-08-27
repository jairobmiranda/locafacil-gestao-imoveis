import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { apenasData, primeiroDiaDoMes, somarDias, somarMeses } from '../comum/datas';
import { PrismaService } from '../prisma/prisma.service';

const ZERO = new Prisma.Decimal(0);

type SomaPorImovel = Map<string, Prisma.Decimal>;

function acumular(mapa: SomaPorImovel, chave: string, valor: Prisma.Decimal | null): void {
  mapa.set(chave, (mapa.get(chave) ?? ZERO).plus(valor ?? ZERO));
}

function dividir(numerador: Prisma.Decimal, denominador: Prisma.Decimal): number | null {
  return denominador.isZero() ? null : numerador.div(denominador).toNumber();
}

function mesesEntre(inicio: Date, fim: Date): number {
  const meses =
    (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
    (fim.getUTCMonth() - inicio.getUTCMonth());

  return Math.max(meses, 1);
}

@Injectable()
export class MetricasService {
  constructor(private readonly prisma: PrismaService) {}

  async desempenhoPorImovel() {
    const inicioJanela = primeiroDiaDoMes(somarMeses(new Date(), -11));

    const [imoveis, realizados, capitalizaveis, ultimos12Meses, emAberto] = await Promise.all([
      this.prisma.imovel.findMany({ where: { arquivadoEm: null } }),
      this.prisma.lancamento.groupBy({
        by: ['imovelId', 'natureza'],
        where: { situacao: { in: ['PAGO', 'PARCIAL'] } },
        _sum: { valorPago: true },
      }),
      this.prisma.lancamento.groupBy({
        by: ['imovelId'],
        where: { situacao: { in: ['PAGO', 'PARCIAL'] }, capitalizavel: true },
        _sum: { valorPago: true },
      }),
      this.prisma.lancamento.groupBy({
        by: ['imovelId', 'natureza'],
        where: { situacao: { in: ['PAGO', 'PARCIAL'] }, competencia: { gte: inicioJanela } },
        _sum: { valorPago: true },
      }),
      this.prisma.lancamento.groupBy({
        by: ['imovelId', 'situacao'],
        where: { situacao: { in: ['PENDENTE', 'ATRASADO'] }, natureza: 'ENTRADA' },
        _sum: { valor: true },
      }),
    ]);

    const entradas: SomaPorImovel = new Map();
    const saidas: SomaPorImovel = new Map();
    const entradas12m: SomaPorImovel = new Map();
    const saidas12m: SomaPorImovel = new Map();
    const custoCapitalizado: SomaPorImovel = new Map();
    const atrasado: SomaPorImovel = new Map();

    for (const linha of realizados) {
      acumular(
        linha.natureza === 'ENTRADA' ? entradas : saidas,
        linha.imovelId,
        linha._sum.valorPago,
      );
    }

    for (const linha of ultimos12Meses) {
      acumular(
        linha.natureza === 'ENTRADA' ? entradas12m : saidas12m,
        linha.imovelId,
        linha._sum.valorPago,
      );
    }

    for (const linha of capitalizaveis) {
      acumular(custoCapitalizado, linha.imovelId, linha._sum.valorPago);
    }

    for (const linha of emAberto) {
      if (linha.situacao === 'ATRASADO') {
        acumular(atrasado, linha.imovelId, linha._sum.valor);
      }
    }

    const hoje = apenasData(new Date());

    return imoveis.map((imovel) => {
      const aquisicao = imovel.valorAquisicao ?? ZERO;
      const custoTotal = aquisicao.plus(custoCapitalizado.get(imovel.id) ?? ZERO);

      const recebido = entradas.get(imovel.id) ?? ZERO;
      const gasto = saidas.get(imovel.id) ?? ZERO;
      const liquido12m = (entradas12m.get(imovel.id) ?? ZERO).minus(
        saidas12m.get(imovel.id) ?? ZERO,
      );

      const base = {
        id: imovel.id,
        apelido: imovel.apelido,
        estrategia: imovel.estrategia,
        situacao: imovel.situacao,
        custoTotal: custoTotal.toNumber(),
        recebido: recebido.toNumber(),
        gasto: gasto.toNumber(),
        resultado: recebido.minus(gasto).toNumber(),
        emAtraso: (atrasado.get(imovel.id) ?? ZERO).toNumber(),
      };

      if (imovel.estrategia === 'LOCACAO') {
        const mensalLiquido = liquido12m.div(12);

        return {
          ...base,
          liquido12m: liquido12m.toNumber(),
          // Yield sobre o custo real, nao sobre o valor de mercado.
          yieldLiquidoAnual: dividir(liquido12m, custoTotal),
          paybackMeses: mensalLiquido.greaterThan(0)
            ? Math.ceil(custoTotal.div(mensalLiquido).toNumber())
            : null,
          roi: null,
          lucro: null,
          retornoMensal: null,
          mesesDecorridos: null,
          projetado: false,
        };
      }

      const vendido = imovel.valorVenda !== null;
      const valorSaida = imovel.valorVenda ?? imovel.valorVendaAlvo;
      const fim = imovel.dataVenda ?? hoje;
      const meses = imovel.dataAquisicao ? mesesEntre(apenasData(imovel.dataAquisicao), fim) : null;
      const lucro = valorSaida ? valorSaida.minus(custoTotal) : null;
      const roi = lucro ? dividir(lucro, custoTotal) : null;

      return {
        ...base,
        lucro: lucro?.toNumber() ?? null,
        roi,
        // A metrica que muda decisao: rendimento por mes de capital parado.
        retornoMensal: roi !== null && meses ? roi / meses : null,
        mesesDecorridos: meses,
        projetado: !vendido,
        liquido12m: null,
        yieldLiquidoAnual: null,
        paybackMeses: null,
      };
    });
  }

  async resumo() {
    const agora = new Date();
    const inicioMes = primeiroDiaDoMes(agora);
    const hoje = apenasData(agora);

    const [
      imoveis,
      doMes,
      aberto,
      contratosAtivos,
      contratosVencendo,
      reajustes,
      vencidos,
    ] = await Promise.all([
      this.prisma.imovel.groupBy({
        by: ['estrategia'],
        where: { arquivadoEm: null },
        _count: true,
      }),
      this.prisma.lancamento.groupBy({
        by: ['natureza'],
        where: { situacao: { in: ['PAGO', 'PARCIAL'] }, competencia: { gte: inicioMes } },
        _sum: { valorPago: true },
      }),
      this.prisma.lancamento.groupBy({
        by: ['situacao'],
        where: { natureza: 'ENTRADA', situacao: { in: ['PENDENTE', 'ATRASADO'] } },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.contrato.count({ where: { situacao: 'ATIVO' } }),
      this.prisma.contrato.count({
        where: { situacao: 'ATIVO', dataFim: { lte: somarDias(hoje, 90) } },
      }),
      this.prisma.contrato.count({
        where: { situacao: 'ATIVO', proximoReajusteEm: { lte: somarDias(hoje, 30) } },
      }),
      this.prisma.lancamento.count({
        where: {
          natureza: 'ENTRADA',
          vencimento: { lte: hoje },
          situacao: { in: ['PAGO', 'PARCIAL', 'ATRASADO'] },
        },
      }),
    ]);

    const soma = (natureza: 'ENTRADA' | 'SAIDA') =>
      doMes.find((linha) => linha.natureza === natureza)?._sum.valorPago ?? ZERO;

    const porSituacao = (situacao: 'PENDENTE' | 'ATRASADO') =>
      aberto.find((linha) => linha.situacao === situacao);

    const atrasados = porSituacao('ATRASADO');
    const pendentes = porSituacao('PENDENTE');

    return {
      imoveis: {
        total: imoveis.reduce((soma, linha) => soma + linha._count, 0),
        porEstrategia: Object.fromEntries(
          imoveis.map((linha) => [linha.estrategia, linha._count]),
        ),
      },
      mes: {
        recebido: soma('ENTRADA').toNumber(),
        gasto: soma('SAIDA').toNumber(),
        resultado: soma('ENTRADA').minus(soma('SAIDA')).toNumber(),
      },
      aReceber: {
        pendente: (pendentes?._sum.valor ?? ZERO).toNumber(),
        atrasado: (atrasados?._sum.valor ?? ZERO).toNumber(),
        cobrancasAtrasadas: atrasados?._count ?? 0,
        // Sobre o que ja venceu, nao sobre a carteira toda.
        taxaInadimplencia: vencidos ? (atrasados?._count ?? 0) / vencidos : 0,
      },
      contratos: {
        ativos: contratosAtivos,
        vencendoEm90Dias: contratosVencendo,
        reajusteEm30Dias: reajustes,
      },
    };
  }

  async alertas() {
    const hoje = apenasData(new Date());

    const [contratos, cobrancas] = await Promise.all([
      this.prisma.contrato.findMany({
        where: {
          situacao: 'ATIVO',
          OR: [
            { dataFim: { lte: somarDias(hoje, 90) } },
            { proximoReajusteEm: { lte: somarDias(hoje, 30) } },
          ],
        },
        select: {
          id: true,
          dataFim: true,
          proximoReajusteEm: true,
          indiceReajuste: true,
          imovel: { select: { id: true, apelido: true } },
        },
        orderBy: { dataFim: 'asc' },
      }),
      this.prisma.lancamento.findMany({
        where: { situacao: 'ATRASADO', natureza: 'ENTRADA' },
        select: {
          id: true,
          descricao: true,
          valor: true,
          vencimento: true,
          imovel: { select: { id: true, apelido: true } },
          pessoa: { select: { id: true, nome: true } },
        },
        orderBy: { vencimento: 'asc' },
        take: 20,
      }),
    ]);

    return { contratos, cobrancas };
  }
}
