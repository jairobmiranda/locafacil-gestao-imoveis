import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AtualizarChavePixDto,
  CobrancaPix,
  CriarChavePixDto,
  GerarCobrancaPixDto,
} from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { gerarBrCode, higienizarTxid } from './br-code';

@Injectable()
export class PixService {
  constructor(private readonly prisma: PrismaService) {}

  listarChaves() {
    return this.prisma.chavePix.findMany({ orderBy: [{ padrao: 'desc' }, { criadoEm: 'asc' }] });
  }

  async criarChave(dados: CriarChavePixDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dados.padrao) {
        await tx.chavePix.updateMany({ where: { padrao: true }, data: { padrao: false } });
      }

      return tx.chavePix.create({ data: dados });
    });
  }

  async atualizarChave(id: string, dados: AtualizarChavePixDto) {
    await this.buscarChave(id);

    return this.prisma.$transaction(async (tx) => {
      if (dados.padrao) {
        await tx.chavePix.updateMany({ where: { padrao: true }, data: { padrao: false } });
      }

      return tx.chavePix.update({ where: { id }, data: dados });
    });
  }

  async removerChave(id: string): Promise<void> {
    const emUso = await this.prisma.contrato.count({ where: { chavePixId: id } });

    if (emUso) {
      throw new ConflictException('Chave vinculada a contratos. Desative-a em vez de excluir');
    }

    await this.buscarChave(id);
    await this.prisma.chavePix.delete({ where: { id } });
  }

  /**
   * Monta o BR Code e congela o payload no lancamento. Alteracao posterior na chave
   * nao pode invalidar cobranca ja enviada por e-mail.
   */
  async gerarCobranca(lancamentoId: string, dados: GerarCobrancaPixDto): Promise<CobrancaPix> {
    const lancamento = await this.prisma.lancamento.findUnique({
      where: { id: lancamentoId },
      include: { contrato: { select: { chavePixId: true } } },
    });

    if (!lancamento) {
      throw new NotFoundException('Lançamento não encontrado');
    }

    if (lancamento.natureza !== 'ENTRADA') {
      throw new BadRequestException('Só é possível gerar Pix para lançamento de entrada');
    }

    if (lancamento.situacao === 'PAGO' || lancamento.situacao === 'CANCELADO') {
      throw new ConflictException(`Lançamento já está ${lancamento.situacao.toLowerCase()}`);
    }

    const chave = await this.resolverChave(dados.chavePixId ?? lancamento.contrato?.chavePixId);
    const txid = lancamento.pixTxid ?? higienizarTxid(lancamento.id);

    const payload = gerarBrCode({
      chave: chave.chave,
      nomeBeneficiario: chave.nomeBeneficiario,
      cidadeBeneficiario: chave.cidadeBeneficiario,
      valor: lancamento.valor.toNumber(),
      txid,
      descricao: dados.descricao ?? lancamento.descricao,
    });

    await this.prisma.lancamento.update({
      where: { id: lancamentoId },
      data: { pixTxid: txid, pixPayload: payload },
    });

    return {
      txid,
      payload,
      valor: lancamento.valor.toNumber(),
      chave: chave.chave,
      nomeBeneficiario: chave.nomeBeneficiario,
    };
  }

  private async buscarChave(id: string) {
    const chave = await this.prisma.chavePix.findUnique({ where: { id } });

    if (!chave) {
      throw new NotFoundException('Chave Pix não encontrada');
    }

    return chave;
  }

  private async resolverChave(id?: string | null) {
    const chave = id
      ? await this.buscarChave(id)
      : await this.prisma.chavePix.findFirst({ where: { padrao: true, ativa: true } });

    if (!chave) {
      throw new BadRequestException('Nenhuma chave Pix padrão configurada');
    }

    if (!chave.ativa) {
      throw new BadRequestException('Chave Pix inativa');
    }

    return chave;
  }
}
