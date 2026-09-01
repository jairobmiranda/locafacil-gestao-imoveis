import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { EnviarCobrancaManualDto } from '@locafacil/contracts';
import { apenasData, diferencaEmDias, proximoDiaUtil, somarDias } from '../comum/datas';
import { FeriadosService } from '../feriados/feriados.service';
import { calcularEncargos } from '../lancamentos/encargos';
import { PixService } from '../pix/pix.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  montarVariaveis,
  montarVariaveisConsolidado,
  paraTextoSimples,
  renderizar,
} from './renderizador';

type ResumoRegua = {
  cobrancasAvaliadas: number;
  notificacoesAgendadas: number;
  semDestinatario: number;
};

const INCLUI_COBRANCA = {
  itens: true,
  imovel: true,
  contrato: {
    include: {
      reguaCobranca: {
        include: {
          regras: { where: { ativa: true }, include: { modeloEmail: true } },
          modeloConsolidado: true,
        },
      },
      partes: {
        where: { contatoPrincipal: true },
        include: { pessoa: { select: { nome: true, email: true } } },
      },
    },
  },
} satisfies Prisma.LancamentoInclude;

type Cobranca = Prisma.LancamentoGetPayload<{ include: typeof INCLUI_COBRANCA }>;

/** Guardado separado por virgula porque e assim que o envio le o campo. */
function copiasDoContrato(emailsCopia: string | null | undefined): string | undefined {
  const enderecos = (emailsCopia ?? '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return enderecos.length ? enderecos.join(',') : undefined;
}

@Injectable()
export class ReguaCobrancaService {
  private readonly logger = new Logger(ReguaCobrancaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pix: PixService,
    private readonly feriados: FeriadosService,
  ) {}

  async agendar(referencia = new Date()): Promise<ResumoRegua> {
    const hoje = apenasData(referencia);
    const feriados = await this.feriados.chaves();

    const cobrancas = await this.prisma.lancamento.findMany({
      where: {
        natureza: 'ENTRADA',
        situacao: { in: ['PENDENTE', 'ATRASADO'] },
        vencimento: { not: null },
        contratoId: { not: null },
      },
      include: INCLUI_COBRANCA,
      orderBy: { vencimento: 'asc' },
    });

    const reguaPadrao = await this.prisma.reguaCobranca.findFirst({
      where: { padrao: true, ativa: true },
      include: {
        regras: { where: { ativa: true }, include: { modeloEmail: true } },
        modeloConsolidado: true,
      },
    });

    const resumo: ResumoRegua = {
      cobrancasAvaliadas: cobrancas.length,
      notificacoesAgendadas: 0,
      semDestinatario: 0,
    };

    for (const doContrato of this.agruparPorContrato(cobrancas)) {
      const [primeira] = doContrato;
      const regua = primeira?.contrato?.reguaCobranca ?? reguaPadrao;
      const contato = primeira?.contrato?.partes[0]?.pessoa;

      if (!regua?.ativa) {
        continue;
      }

      if (!contato?.email) {
        resumo.semDestinatario += doContrato.length;
        continue;
      }

      for (const regra of regua.regras) {
        const elegiveis = doContrato
          .filter((cobranca) => !regra.apenasSeSituacao || regra.apenasSeSituacao === cobranca.situacao)
          .map((cobranca) => ({
            cobranca,
            ocorrencia: this.ocorrenciaDeHoje(regra, cobranca.vencimento as Date, hoje, feriados),
          }))
          .filter((item): item is { cobranca: Cobranca; ocorrencia: number } => item.ocorrencia !== null);

        if (elegiveis.length === 0) {
          continue;
        }

        // A etapa dispara por uma parcela, mas o e-mail mostra tudo que esta em aberto no
        // contrato: parcelas de meses diferentes nunca cairiam na mesma etapa no mesmo dia.
        if (doContrato.length > 1 && regua.modeloConsolidado) {
          const agendado = await this.agendarConsolidado(
            doContrato,
            elegiveis[0]?.cobranca as Cobranca,
            regra,
            regua.modeloConsolidado,
            elegiveis[0]?.ocorrencia ?? 1,
            contato,
            hoje,
            feriados,
          );

          if (agendado) {
            resumo.notificacoesAgendadas += 1;
            // Um consolidado por contrato por dia; as demais etapas nao repetem a mensagem.
            break;
          }

          continue;
        }

        for (const { cobranca, ocorrencia } of elegiveis) {
          const agendado = await this.agendarNotificacao(
            cobranca,
            regra,
            ocorrencia,
            contato,
            hoje,
            feriados,
          );

          if (agendado) {
            resumo.notificacoesAgendadas += 1;
          }
        }
      }
    }

    this.logger.log(
      `Régua: ${resumo.notificacoesAgendadas} notificação(ões) agendada(s) sobre ${resumo.cobrancasAvaliadas} cobrança(s)`,
    );

    return resumo;
  }

  /** Mantem a ordem por vencimento dentro de cada contrato: a mais antiga encabeca o consolidado. */
  private agruparPorContrato(cobrancas: Cobranca[]): Cobranca[][] {
    const grupos = new Map<string, Cobranca[]>();

    for (const cobranca of cobrancas) {
      const chave = cobranca.contratoId as string;
      const grupo = grupos.get(chave);

      if (grupo) {
        grupo.push(cobranca);
      } else {
        grupos.set(chave, [cobranca]);
      }
    }

    return [...grupos.values()];
  }

  /**
   * A ocorrencia 1 cai em `vencimento util + diasOffset`. Havendo repeticao, as seguintes
   * caem a cada `intervaloRepeticaoDias`. Retorna o numero da ocorrencia que bate com hoje.
   */
  private ocorrenciaDeHoje(
    regra: { diasOffset: number; intervaloRepeticaoDias: number | null; maximoRepeticoes: number | null },
    vencimento: Date,
    hoje: Date,
    feriados: ReadonlySet<string>,
  ): number | null {
    const primeira = somarDias(proximoDiaUtil(vencimento, feriados), regra.diasOffset);
    const distancia = diferencaEmDias(primeira, hoje);

    if (distancia < 0) {
      return null;
    }

    if (distancia === 0) {
      return 1;
    }

    if (!regra.intervaloRepeticaoDias || distancia % regra.intervaloRepeticaoDias !== 0) {
      return null;
    }

    const ocorrencia = distancia / regra.intervaloRepeticaoDias + 1;

    return regra.maximoRepeticoes && ocorrencia > regra.maximoRepeticoes ? null : ocorrencia;
  }

  private async agendarNotificacao(
    cobranca: Cobranca,
    regra: Prisma.RegraCobrancaGetPayload<{ include: { modeloEmail: true } }>,
    ocorrencia: number,
    contato: { nome: string; email: string | null },
    hoje: Date,
    feriados: ReadonlySet<string>,
  ): Promise<boolean> {
    const variaveis = montarVariaveis(cobranca, contato, hoje, feriados);
    const assunto = renderizar(regra.modeloEmail.assunto, variaveis);
    const corpoHtml = renderizar(regra.modeloEmail.corpoHtml, variaveis);

    const [hora, minuto] = regra.horaEnvio.split(':').map(Number);
    const agendadoPara = new Date(hoje);
    agendadoPara.setUTCHours(hora ?? 9, minuto ?? 0, 0, 0);

    try {
      await this.prisma.notificacao.create({
        data: {
          lancamentoId: cobranca.id,
          contratoId: cobranca.contratoId,
          regraCobrancaId: regra.id,
          modeloEmailId: regra.modeloEmailId,
          ocorrencia,
          destinatario: contato.email as string,
          copia: copiasDoContrato(cobranca.contrato?.emailsCopia),
          assunto: assunto.slice(0, 200),
          corpoRenderizado: corpoHtml,
          agendadoPara,
          situacao: 'PENDENTE',
        },
      });

      return true;
    } catch (erro) {
      // P2002 no indice (lancamento, regra, ocorrencia): ja foi agendada antes.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        return false;
      }

      throw erro;
    }
  }

  /**
   * Uma notificacao para todas as parcelas em aberto do contrato. Fica vinculada a
   * cobranca que disparou a etapa, o que reaproveita o indice de idempotencia
   * (lancamento, regra, ocorrencia) e impede repetir a mesma etapa no mesmo dia.
   */
  private async agendarConsolidado(
    cobrancas: Cobranca[],
    gatilho: Cobranca,
    regra: Prisma.RegraCobrancaGetPayload<{ include: { modeloEmail: true } }>,
    modelo: Prisma.ModeloEmailGetPayload<object>,
    ocorrencia: number,
    contato: { nome: string; email: string | null },
    hoje: Date,
    feriados: ReadonlySet<string>,
  ): Promise<boolean> {
    const [maisAntiga] = cobrancas;

    if (!maisAntiga || !gatilho) {
      return false;
    }

    const pixPayload = await this.pixConsolidado(cobrancas, hoje, feriados);
    const variaveis = montarVariaveisConsolidado(cobrancas, contato, hoje, pixPayload, feriados);

    const [hora, minuto] = regra.horaEnvio.split(':').map(Number);
    const agendadoPara = new Date(hoje);
    agendadoPara.setUTCHours(hora ?? 9, minuto ?? 0, 0, 0);

    try {
      await this.prisma.notificacao.create({
        data: {
          lancamentoId: gatilho.id,
          contratoId: gatilho.contratoId,
          regraCobrancaId: regra.id,
          modeloEmailId: modelo.id,
          ocorrencia,
          destinatario: contato.email as string,
          copia: copiasDoContrato(maisAntiga.contrato?.emailsCopia),
          assunto: renderizar(modelo.assunto, variaveis).slice(0, 200),
          corpoRenderizado: renderizar(modelo.corpoHtml, variaveis),
          pixPayload,
          agendadoPara,
          situacao: 'PENDENTE',
        },
      });

      return true;
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        return false;
      }

      throw erro;
    }
  }

  /** Sem chave Pix configurada o e-mail ainda vale; so vai sem QR. */
  private async pixConsolidado(
    cobrancas: Cobranca[],
    hoje: Date,
    feriados: ReadonlySet<string>,
  ): Promise<string | null> {
    const [maisAntiga] = cobrancas;

    if (!maisAntiga) {
      return null;
    }

    const total = cobrancas.reduce(
      (soma, cobranca) =>
        soma.plus(
          calcularEncargos(
            cobranca.valor,
            cobranca.vencimento,
            hoje,
            cobranca.contrato,
            feriados,
          ).totalDevido,
        ),
      new Prisma.Decimal(0),
    );

    try {
      return await this.pix.montarPayload({
        chavePixId: maisAntiga.contrato?.chavePixId,
        valor: total.toNumber(),
        txid: `${maisAntiga.contratoId}${hoje.toISOString().slice(0, 10)}`,
        descricao: `Débitos em aberto (${cobrancas.length})`,
      });
    } catch (erro) {
      this.logger.warn(`Consolidado sem Pix: ${(erro as Error).message}`);

      return null;
    }
  }

  /** Mantido junto do renderizador para o preview na tela de modelos. */
  previewTexto(html: string): string {
    return paraTextoSimples(html);
  }

  /**
   * Envio avulso de uma cobranca, fora da regua. Fica sem `regraCobrancaId`,
   * o que tambem libera o indice de idempotencia para repetir o disparo.
   */
  async criarNotificacaoManual(
    lancamentoId: string,
    dados: EnviarCobrancaManualDto,
  ): Promise<{ id: string; destinatario: string }> {
    const cobranca = await this.prisma.lancamento.findUnique({
      where: { id: lancamentoId },
      include: INCLUI_COBRANCA,
    });

    if (!cobranca) {
      throw new NotFoundException('Lançamento não encontrado');
    }

    const contato = cobranca.contrato?.partes[0]?.pessoa;
    const destinatario = dados.destinatario ?? contato?.email;

    if (!destinatario) {
      throw new BadRequestException(
        'Sem destinatário: o contrato não tem contato principal com e-mail',
      );
    }

    const modelo = await this.prisma.modeloEmail.findUnique({
      where: { id: dados.modeloEmailId },
    });

    if (!modelo) {
      throw new NotFoundException('Modelo de e-mail não encontrado');
    }

    const agora = new Date();
    const variaveis = montarVariaveis(
      cobranca,
      { nome: contato?.nome ?? destinatario },
      agora,
      await this.feriados.chaves(),
    );
    const anteriores = await this.prisma.notificacao.count({
      where: { lancamentoId, regraCobrancaId: null },
    });

    const notificacao = await this.prisma.notificacao.create({
      data: {
        lancamentoId: cobranca.id,
        contratoId: cobranca.contratoId,
        modeloEmailId: modelo.id,
        ocorrencia: anteriores + 1,
        destinatario,
        copia: copiasDoContrato(cobranca.contrato?.emailsCopia),
        assunto: renderizar(modelo.assunto, variaveis).slice(0, 200),
        corpoRenderizado: renderizar(modelo.corpoHtml, variaveis),
        agendadoPara: agora,
        situacao: 'PENDENTE',
      },
      select: { id: true, destinatario: true },
    });

    this.logger.log(`Notificação manual ${notificacao.id} criada para ${destinatario}`);

    return notificacao;
  }
}
