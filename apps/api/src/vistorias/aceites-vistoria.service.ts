import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { codigoVerificacao, type AceiteVistoria } from '@locafacil/contracts';
import type { PapelAceiteVistoria } from '@prisma/client';
import { resumirAgente, type ContextoRequisicao } from '../comum/requisicao';
import { PrismaService } from '../prisma/prisma.service';

type ConteudoAssinavel = {
  ambientes: {
    nome: string;
    itens: {
      nome: string;
      estado: string | null;
      observacao: string | null;
      fotos: { hashSha256: string }[];
    }[];
  }[];
};

/**
 * Resumo do que foi aceito: nomes, estados, observações e o hash de cada foto.
 * Trocar uma foto, mudar um estado ou apagar uma observação muda o resumo, e o laudo
 * passa a mostrar que o aceite não cobre mais o conteúdo atual.
 */
export function resumoConteudo(vistoria: ConteudoAssinavel): string {
  const linhas = vistoria.ambientes.flatMap((ambiente) =>
    ambiente.itens.map((item) =>
      [
        ambiente.nome,
        item.nome,
        item.estado ?? '',
        item.observacao ?? '',
        item.fotos.map((foto) => foto.hashSha256).join(','),
      ].join('|'),
    ),
  );

  return createHash('sha256').update(linhas.join('\n')).digest('hex');
}

/**
 * Aceite eletrônico sem desenho de assinatura: o que prova é o conjunto (quem declarou,
 * quando, de onde e sobre qual conteúdo). Um aceite por papel: refazer substitui o anterior,
 * e o histórico de todos eles fica na linha do tempo.
 */
@Injectable()
export class AceitesVistoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(dados: {
    vistoriaId: string;
    papel: PapelAceiteVistoria;
    nome: string;
    email?: string | null;
    documento?: string | null;
    declaracao: string;
    hashConteudo: string;
    contexto?: ContextoRequisicao | null;
  }) {
    const valores = {
      nome: dados.nome,
      email: dados.email ?? null,
      documento: dados.documento ?? null,
      declaracao: dados.declaracao,
      hashConteudo: dados.hashConteudo,
      ip: dados.contexto?.ip ?? null,
      agente: dados.contexto?.agente ?? null,
      aceitoEm: new Date(),
    };

    return this.prisma.vistoriaAceite.upsert({
      where: { vistoriaId_papel: { vistoriaId: dados.vistoriaId, papel: dados.papel } },
      create: { vistoriaId: dados.vistoriaId, papel: dados.papel, ...valores },
      update: valores,
    });
  }

  /** `hashAtual` vem do conteúdo de hoje: é a comparação que diz se o aceite ainda vale. */
  async listar(vistoriaId: string, hashAtual: string): Promise<AceiteVistoria[]> {
    const aceites = await this.prisma.vistoriaAceite.findMany({
      where: { vistoriaId },
      orderBy: { aceitoEm: 'asc' },
    });

    return aceites.map((aceite) => ({
      papel: aceite.papel,
      nome: aceite.nome,
      email: aceite.email,
      documento: aceite.documento,
      aceitoEm: aceite.aceitoEm.toISOString(),
      ip: aceite.ip,
      agente: aceite.agente,
      dispositivo: resumirAgente(aceite.agente),
      declaracao: aceite.declaracao,
      hashConteudo: aceite.hashConteudo,
      codigo: codigoVerificacao(aceite.hashConteudo),
      cobreConteudoAtual: aceite.hashConteudo === hashAtual,
    }));
  }
}
