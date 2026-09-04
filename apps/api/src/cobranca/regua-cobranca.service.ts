import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { EnviarCobrancaManualDto } from '@locafacil/contracts';
import {
  apenasData,
  diferencaEmDias,
  instanteLocal,
  proximoDiaUtil,
  somarDias,
} from '../comum/datas';
import { FeriadosService } from '../feriados/feriados.service';
import { calcularEncargos } from '../lancamentos/encargos';
import { PixService } from '../pix/pix.service';
import { PrismaService } from '../prisma/prisma.service';
import { ParametrosCobrancaService } from './parametros-cobranca.service';
import {
  montarVariaveis,
  montarVariaveisConsolidado,
  paraTextoSimples,
  renderizar,
} from './renderizador';

type ResumoRegua = {
  cobrancasAvaliadas: number;
  notificacoesAgendadas: number;
  notificacoesRecuperadas: number;
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

/** `atraso` em dias entre a data prevista da etapa e hoje: zero e o disparo no dia. */
type EtapaDevida = { ocorrencia: number; atraso: number };

function chaveEtapa(lancamentoId: string, regraId: string, ocorrencia: number): string {
  return `${lancamentoId}:${regraId}:${ocorrencia}`;
}

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
    private readonly parametros: ParametrosCobrancaService,
  ) {}

  /**
   * `contratoId` restringe a varredura a um contrato so, o que permite rodar a regua
   * na hora em que o contrato e ativado, sem esperar o cron da madrugada.
   */
  async agendar(referencia = new Date(), contratoId?: string): Promise<ResumoRegua> {
    const hoje = apenasData(referencia);
    const feriados = await this.feriados.chaves();
    const janelaRecuperacao = await this.parametros.janelaRecuperacaoDias();

    const cobrancas = await this.prisma.lancamento.findMany({
      where: {
        natureza: 'ENTRADA',
        situacao: { in: ['PENDENTE', 'ATRASADO'] },
        vencimento: { not: null },
        contratoId: contratoId ?? { not: null },
      },
      include: INCLUI_COBRANCA,
      orderBy: { vencimento: 'asc' },
    });

    const jaAgendadas = await this.etapasJaAgendadas(cobrancas.map((cobranca) => cobranca.id));

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
      notificacoesRecuperadas: 0,
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
            devida: this.ocorrenciaDevida(
              regra,
              cobranca.vencimento as Date,
              hoje,
              feriados,
              janelaRecuperacao,
            ),
          }))
          .filter(
            (item): item is { cobranca: Cobranca; devida: EtapaDevida } =>
              item.devida !== null &&
              !jaAgendadas.has(chaveEtapa(item.cobranca.id, regra.id, item.devida.ocorrencia)),
          );

        if (elegiveis.length === 0) {
          continue;
        }

        // A etapa dispara por uma parcela, mas o e-mail mostra tudo que esta em aberto no
        // contrato: parcelas de meses diferentes nunca cairiam na mesma etapa no mesmo dia.
        if (doContrato.length > 1 && regua.modeloConsolidado) {
          const primeiroElegivel = elegiveis[0] as { cobranca: Cobranca; devida: EtapaDevida };
          const agendado = await this.agendarConsolidado(
            doContrato,
            primeiroElegivel.cobranca,
            regra,
            regua.modeloConsolidado,
            primeiroElegivel.devida.ocorrencia,
            contato,
            hoje,
            feriados,
          );

          if (agendado) {
            resumo.notificacoesAgendadas += 1;
            resumo.notificacoesRecuperadas += primeiroElegivel.devida.atraso > 0 ? 1 : 0;
            // Um consolidado por contrato por dia; as demais etapas nao repetem a mensagem.
            break;
          }

          continue;
        }

        for (const { cobranca, devida } of elegiveis) {
          const agendado = await this.agendarNotificacao(
            cobranca,
            regra,
            devida.ocorrencia,
            contato,
            hoje,
            feriados,
          );

          if (agendado) {
            resumo.notificacoesAgendadas += 1;
            resumo.notificacoesRecuperadas += devida.atraso > 0 ? 1 : 0;
          }
        }
      }
    }

    const recuperadas = resumo.notificacoesRecuperadas
      ? `, ${resumo.notificacoesRecuperadas} recuperada(s) de etapa vencida`
      : '';

    this.logger.log(
      `Régua: ${resumo.notificacoesAgendadas} notificação(ões) agendada(s) sobre ${resumo.cobrancasAvaliadas} cobrança(s)${recuperadas}`,
    );

    return resumo;
  }

  /**
   * As etapas ja gravadas. O indice unico continua sendo a garantia contra duplicidade,
   * mas conferir antes evita uma violacao por cobranca por regra a cada rodada agora que
   * a regua reavalia etapas passadas.
   */
  private async etapasJaAgendadas(lancamentoIds: string[]): Promise<Set<string>> {
    if (lancamentoIds.length === 0) {
      return new Set();
    }

    const existentes = await this.prisma.notificacao.findMany({
      where: { lancamentoId: { in: lancamentoIds }, regraCobrancaId: { not: null } },
      select: { lancamentoId: true, regraCobrancaId: true, ocorrencia: true },
    });

    return new Set(
      existentes.map((item) =>
        chaveEtapa(item.lancamentoId as string, item.regraCobrancaId as string, item.ocorrencia),
      ),
    );
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
   * caem a cada `intervaloRepeticaoDias`.
   *
   * Retorna a ultima ocorrencia ja devida, e nao apenas a que cai exatamente hoje: um
   * contrato cadastrado depois da hora do envio so ganha cobranca no dia seguinte, e com
   * a comparacao exata a etapa do dia do vencimento se perdia para sempre. O mesmo vale
   * para API parada na hora do cron ou cobranca criada retroativamente.
   *
   * `janelaRecuperacaoDias` limita o quanto a regua volta atras, para um contrato antigo
   * recem cadastrado nao disparar de uma vez etapas de meses passados.
   */
  private ocorrenciaDevida(
    regra: { diasOffset: number; intervaloRepeticaoDias: number | null; maximoRepeticoes: number | null },
    vencimento: Date,
    hoje: Date,
    feriados: ReadonlySet<string>,
    janelaRecuperacaoDias: number,
  ): EtapaDevida | null {
    const primeira = somarDias(proximoDiaUtil(vencimento, feriados), regra.diasOffset);
    const distancia = diferencaEmDias(primeira, hoje);

    if (distancia < 0) {
      return null;
    }

    const intervalo = regra.intervaloRepeticaoDias ?? 0;
    const ocorrencia = intervalo
      ? Math.min(
          Math.floor(distancia / intervalo) + 1,
          regra.maximoRepeticoes ?? Number.MAX_SAFE_INTEGER,
        )
      : 1;

    // Dias entre a data em que a etapa deveria ter saido e hoje.
    const atraso = distancia - (ocorrencia - 1) * intervalo;

    return atraso <= janelaRecuperacaoDias ? { ocorrencia, atraso } : null;
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

    // Hora ja passada fica no passado de proposito: a fila despacha no ciclo seguinte.
    const agendadoPara = instanteLocal(hoje, regra.horaEnvio);

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

    const agendadoPara = instanteLocal(hoje, regra.horaEnvio);

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
