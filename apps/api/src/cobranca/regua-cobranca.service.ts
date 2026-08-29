import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { EnviarCobrancaManualDto } from '@locafacil/contracts';
import { apenasData, diferencaEmDias, somarDias } from '../comum/datas';
import { PrismaService } from '../prisma/prisma.service';
import { montarVariaveis, paraTextoSimples, renderizar } from './renderizador';

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
      reguaCobranca: { include: { regras: { where: { ativa: true }, include: { modeloEmail: true } } } },
      partes: {
        where: { contatoPrincipal: true },
        include: { pessoa: { select: { nome: true, email: true } } },
      },
    },
  },
} satisfies Prisma.LancamentoInclude;

@Injectable()
export class ReguaCobrancaService {
  private readonly logger = new Logger(ReguaCobrancaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async agendar(referencia = new Date()): Promise<ResumoRegua> {
    const hoje = apenasData(referencia);

    const cobrancas = await this.prisma.lancamento.findMany({
      where: {
        natureza: 'ENTRADA',
        situacao: { in: ['PENDENTE', 'ATRASADO'] },
        vencimento: { not: null },
        contratoId: { not: null },
      },
      include: INCLUI_COBRANCA,
    });

    const reguaPadrao = await this.prisma.reguaCobranca.findFirst({
      where: { padrao: true, ativa: true },
      include: { regras: { where: { ativa: true }, include: { modeloEmail: true } } },
    });

    const resumo: ResumoRegua = {
      cobrancasAvaliadas: cobrancas.length,
      notificacoesAgendadas: 0,
      semDestinatario: 0,
    };

    for (const cobranca of cobrancas) {
      const regua = cobranca.contrato?.reguaCobranca ?? reguaPadrao;
      const contato = cobranca.contrato?.partes[0]?.pessoa;

      if (!regua?.ativa) {
        continue;
      }

      if (!contato?.email) {
        resumo.semDestinatario += 1;
        continue;
      }

      for (const regra of regua.regras) {
        if (regra.apenasSeSituacao && regra.apenasSeSituacao !== cobranca.situacao) {
          continue;
        }

        const ocorrencia = this.ocorrenciaDeHoje(regra, cobranca.vencimento as Date, hoje);

        if (!ocorrencia) {
          continue;
        }

        const agendado = await this.agendarNotificacao(
          cobranca,
          regra,
          ocorrencia,
          contato,
          hoje,
        );

        if (agendado) {
          resumo.notificacoesAgendadas += 1;
        }
      }
    }

    this.logger.log(
      `Régua: ${resumo.notificacoesAgendadas} notificação(ões) agendada(s) sobre ${resumo.cobrancasAvaliadas} cobrança(s)`,
    );

    return resumo;
  }

  /**
   * A ocorrencia 1 cai em `vencimento + diasOffset`. Havendo repeticao, as seguintes
   * caem a cada `intervaloRepeticaoDias`. Retorna o numero da ocorrencia que bate com hoje.
   */
  private ocorrenciaDeHoje(
    regra: { diasOffset: number; intervaloRepeticaoDias: number | null; maximoRepeticoes: number | null },
    vencimento: Date,
    hoje: Date,
  ): number | null {
    const primeira = somarDias(apenasData(vencimento), regra.diasOffset);
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
    cobranca: Prisma.LancamentoGetPayload<{ include: typeof INCLUI_COBRANCA }>,
    regra: Prisma.RegraCobrancaGetPayload<{ include: { modeloEmail: true } }>,
    ocorrencia: number,
    contato: { nome: string; email: string | null },
    hoje: Date,
  ): Promise<boolean> {
    const variaveis = montarVariaveis(cobranca, contato, hoje);
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
    const variaveis = montarVariaveis(cobranca, { nome: contato?.nome ?? destinatario }, agora);
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
