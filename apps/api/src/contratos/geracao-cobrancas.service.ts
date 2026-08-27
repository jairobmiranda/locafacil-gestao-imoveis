import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { apenasData, diferencaEmDias, formatarCompetencia, primeiroDiaDoMes, vencimentoNoMes } from '../comum/datas';
import { PrismaService } from '../prisma/prisma.service';
import { gerarBrCode, higienizarTxid } from '../pix/br-code';

type ResumoGeracao = {
  contratosAvaliados: number;
  cobrancasCriadas: number;
  cobrancasExistentes: number;
};

@Injectable()
export class GeracaoCobrancasService {
  private readonly logger = new Logger(GeracaoCobrancasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async gerar(referencia = new Date()): Promise<ResumoGeracao> {
    const hoje = apenasData(referencia);

    const contratos = await this.prisma.contrato.findMany({
      where: {
        situacao: 'ATIVO',
        gerarCobrancas: true,
        dataInicio: { lte: hoje },
        dataFim: { gte: hoje },
      },
      include: {
        itens: { where: { ativo: true } },
        chavePix: true,
        partes: { where: { contatoPrincipal: true }, select: { pessoaId: true } },
      },
    });

    const resumo: ResumoGeracao = {
      contratosAvaliados: contratos.length,
      cobrancasCriadas: 0,
      cobrancasExistentes: 0,
    };

    for (const contrato of contratos) {
      for (const vencimento of this.vencimentosNaJanela(contrato, hoje)) {
        const criada = await this.criarCobranca(contrato, vencimento);
        criada ? (resumo.cobrancasCriadas += 1) : (resumo.cobrancasExistentes += 1);
      }
    }

    this.logger.log(
      `Geração de cobranças: ${resumo.cobrancasCriadas} criadas, ${resumo.cobrancasExistentes} já existiam, ${resumo.contratosAvaliados} contratos avaliados`,
    );

    return resumo;
  }

  /** Olha o mes atual e o seguinte, respeitando a antecedencia configurada no contrato. */
  private vencimentosNaJanela(
    contrato: { diaVencimento: number; diasAntecedenciaGeracao: number; dataInicio: Date; dataFim: Date },
    hoje: Date,
  ): Date[] {
    const candidatos = [0, 1].map((deslocamento) =>
      vencimentoNoMes(
        hoje.getUTCFullYear(),
        hoje.getUTCMonth() + deslocamento,
        contrato.diaVencimento,
      ),
    );

    return candidatos.filter((vencimento) => {
      const dentroDoContrato =
        vencimento >= apenasData(contrato.dataInicio) && vencimento <= apenasData(contrato.dataFim);
      const dentroDaAntecedencia =
        diferencaEmDias(hoje, vencimento) <= contrato.diasAntecedenciaGeracao;

      return dentroDoContrato && dentroDaAntecedencia;
    });
  }

  private async criarCobranca(
    contrato: Prisma.ContratoGetPayload<{
      include: {
        itens: true;
        chavePix: true;
        partes: { select: { pessoaId: true } };
      };
    }>,
    vencimento: Date,
  ): Promise<boolean> {
    const competencia = primeiroDiaDoMes(vencimento);
    const chaveGeracao = `${contrato.id}:${formatarCompetencia(competencia)}`;

    const categoriaAluguel = await this.prisma.categoria.findFirst({
      where: { nome: 'Aluguel', natureza: 'ENTRADA' },
      select: { id: true },
    });

    if (!categoriaAluguel) {
      throw new Error('Categoria "Aluguel" não encontrada. Rode o seed.');
    }

    const itens = [
      {
        categoriaId: categoriaAluguel.id,
        descricao: 'Aluguel',
        valor: contrato.valorAluguel,
        ordem: 0,
      },
      ...contrato.itens.map((item, indice) => ({
        categoriaId: item.categoriaId,
        descricao: item.descricao,
        valor: item.valor,
        ordem: indice + 1,
      })),
    ];

    const total = itens.reduce(
      (soma, item) => soma.plus(item.valor),
      new Prisma.Decimal(0),
    );

    try {
      const lancamento = await this.prisma.lancamento.create({
        data: {
          imovelId: contrato.imovelId,
          contratoId: contrato.id,
          categoriaId: categoriaAluguel.id,
          pessoaId: contrato.partes[0]?.pessoaId,
          natureza: 'ENTRADA',
          situacao: 'PENDENTE',
          origem: 'CONTRATO_AUTOMATICO',
          descricao: `Aluguel ${formatarCompetencia(competencia)}`,
          valor: total,
          competencia,
          vencimento,
          chaveGeracao,
          itens: { create: itens },
        },
      });

      await this.anexarPix(lancamento.id, total, contrato.chavePix, competencia);

      return true;
    } catch (erro) {
      // P2002 = violacao do indice unico em chaveGeracao, ou seja, a cobranca ja existe.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        return false;
      }

      throw erro;
    }
  }

  private async anexarPix(
    lancamentoId: string,
    valor: Prisma.Decimal,
    chavePix: { chave: string; nomeBeneficiario: string; cidadeBeneficiario: string; ativa: boolean } | null,
    competencia: Date,
  ): Promise<void> {
    const chave = chavePix?.ativa
      ? chavePix
      : await this.prisma.chavePix.findFirst({ where: { padrao: true, ativa: true } });

    if (!chave) {
      this.logger.warn(`Lançamento ${lancamentoId} criado sem Pix: nenhuma chave padrão ativa`);
      return;
    }

    const txid = higienizarTxid(lancamentoId);

    await this.prisma.lancamento.update({
      where: { id: lancamentoId },
      data: {
        pixTxid: txid,
        pixPayload: gerarBrCode({
          chave: chave.chave,
          nomeBeneficiario: chave.nomeBeneficiario,
          cidadeBeneficiario: chave.cidadeBeneficiario,
          valor: valor.toNumber(),
          txid,
          descricao: `Aluguel ${formatarCompetencia(competencia)}`,
        }),
      },
    });
  }

  /** Move para ATRASADO o que venceu e nao foi pago. */
  async marcarAtrasos(referencia = new Date()): Promise<number> {
    const { count } = await this.prisma.lancamento.updateMany({
      where: { situacao: 'PENDENTE', vencimento: { lt: apenasData(referencia) } },
      data: { situacao: 'ATRASADO' },
    });

    if (count) {
      this.logger.log(`${count} lançamento(s) marcados como atrasados`);
    }

    return count;
  }
}
