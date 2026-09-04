import { Injectable } from '@nestjs/common';
import type { EventoVistoria, OrigemEventoVistoria } from '@locafacil/contracts';
import type { TipoEventoVistoria as TipoEventoPrisma } from '@prisma/client';
import type { ContextoRequisicao } from '../comum/requisicao';
import { PrismaService } from '../prisma/prisma.service';

/** Acesso ao link vira evento uma vez por janela: a tela recarrega sozinha a cada foto. */
const JANELA_ACESSO_MINUTOS = 30;

/** Fotos seguidas do mesmo ambiente entram numa linha só; o intervalo maior abre outra. */
const INTERVALO_RAJADA_MINUTOS = 20;

const HORA = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

type RegistroEvento = {
  vistoriaId: string;
  tipo: TipoEventoPrisma;
  origem: OrigemEventoVistoria;
  descricao: string;
  autor?: string | null;
  contexto?: ContextoRequisicao | null;
};

/**
 * A linha do tempo responde "quem fez o quê e quando" sem depender da memória de ninguém.
 * Os eventos são gravados no fluxo normal e nunca alterados depois.
 */
@Injectable()
export class EventosVistoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registrar evento nunca pode derrubar a ação que o gerou. */
  async registrar(dados: RegistroEvento): Promise<void> {
    try {
      await this.prisma.vistoriaEvento.create({
        data: {
          vistoriaId: dados.vistoriaId,
          tipo: dados.tipo,
          origem: dados.origem,
          descricao: dados.descricao.slice(0, 300),
          autor: dados.autor ?? null,
          ip: dados.contexto?.ip ?? null,
          agente: dados.contexto?.agente ?? null,
        },
      });
    } catch {
      // Linha do tempo é registro, não regra de negócio: falha aqui não bloqueia a vistoria.
    }
  }

  /**
   * Abertura de um link público. A janela evita encher a linha do tempo: a tela da vistoria
   * recarrega a cada foto enviada e o leitor de PDF costuma pedir o arquivo mais de uma vez.
   */
  async registrarAcesso(
    vistoriaId: string,
    contexto: ContextoRequisicao,
    tipo: 'LINK_ABERTO' | 'LAUDO_ABERTO' = 'LINK_ABERTO',
  ): Promise<void> {
    const desde = new Date(Date.now() - JANELA_ACESSO_MINUTOS * 60_000);

    const recente = await this.prisma.vistoriaEvento.count({
      where: { vistoriaId, tipo, ocorridoEm: { gte: desde }, ip: contexto.ip },
    });

    if (recente > 0) {
      return;
    }

    await this.registrar({
      vistoriaId,
      tipo,
      origem: 'LINK_PUBLICO',
      descricao: tipo === 'LAUDO_ABERTO' ? 'Laudo aberto pelo link' : 'Link da vistoria aberto',
      contexto,
    });
  }

  /**
   * Eventos gravados mais as fotos, que não viram linha no banco: a data de cada uma já está
   * em `vistoria_fotos` e o manifesto do laudo lista foto por foto. Aqui elas entram
   * agrupadas por ambiente, senão uma vistoria de 200 fotos viraria 200 linhas.
   */
  async linhaDoTempo(vistoriaId: string): Promise<EventoVistoria[]> {
    const [eventos, fotos] = await Promise.all([
      this.prisma.vistoriaEvento.findMany({
        where: { vistoriaId },
        orderBy: { ocorridoEm: 'asc' },
      }),
      this.prisma.vistoriaFoto.findMany({
        where: { item: { ambiente: { vistoriaId } } },
        orderBy: { recebidaEm: 'asc' },
        select: { recebidaEm: true, item: { select: { ambiente: { select: { nome: true } } } } },
      }),
    ]);

    const gravados: EventoVistoria[] = eventos.map((evento) => ({
      tipo: evento.tipo,
      origem: evento.origem,
      ocorridoEm: evento.ocorridoEm.toISOString(),
      descricao: evento.descricao,
      autor: evento.autor,
      ip: evento.ip,
      agente: evento.agente,
    }));

    return [...gravados, ...this.rajadasDeFotos(fotos)].sort((um, outro) =>
      um.ocorridoEm.localeCompare(outro.ocorridoEm),
    );
  }

  private rajadasDeFotos(
    fotos: { recebidaEm: Date; item: { ambiente: { nome: string } } }[],
  ): EventoVistoria[] {
    const rajadas: { ambiente: string; inicio: Date; fim: Date; quantidade: number }[] = [];

    for (const foto of fotos) {
      const atual = rajadas[rajadas.length - 1];
      const ambiente = foto.item.ambiente.nome;
      const seguida =
        atual !== undefined &&
        atual.ambiente === ambiente &&
        foto.recebidaEm.getTime() - atual.fim.getTime() <= INTERVALO_RAJADA_MINUTOS * 60_000;

      if (seguida) {
        atual.fim = foto.recebidaEm;
        atual.quantidade += 1;
      } else {
        rajadas.push({ ambiente, inicio: foto.recebidaEm, fim: foto.recebidaEm, quantidade: 1 });
      }
    }

    return rajadas.map((rajada) => ({
      tipo: 'FOTOS_RECEBIDAS' as const,
      origem: 'LINK_PUBLICO' as const,
      ocorridoEm: rajada.inicio.toISOString(),
      descricao:
        rajada.quantidade === 1
          ? `1 foto recebida em ${rajada.ambiente}`
          : `${rajada.quantidade} fotos recebidas em ${rajada.ambiente}, das ` +
            `${HORA.format(rajada.inicio)} às ${HORA.format(rajada.fim)}`,
      autor: null,
      ip: null,
      agente: null,
    }));
  }
}
