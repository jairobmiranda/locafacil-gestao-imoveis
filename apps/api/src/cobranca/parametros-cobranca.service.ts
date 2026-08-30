import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CHAVE_MAXIMO_DIA = 'cobranca.maximo_emails_dia';
const PADRAO_MAXIMO_DIA = 1;

/** Parametros de cobranca editaveis no painel, sem passar por variavel de ambiente. */
@Injectable()
export class ParametrosCobrancaService {
  constructor(private readonly prisma: PrismaService) {}

  async maximoEmailsDia(): Promise<number> {
    const registro = await this.prisma.configuracao.findUnique({
      where: { chave: CHAVE_MAXIMO_DIA },
    });

    const valor = Number(registro?.valor);

    return Number.isInteger(valor) && valor > 0 ? valor : PADRAO_MAXIMO_DIA;
  }

  async salvarMaximoEmailsDia(valor: number): Promise<number> {
    await this.prisma.configuracao.upsert({
      where: { chave: CHAVE_MAXIMO_DIA },
      create: {
        chave: CHAVE_MAXIMO_DIA,
        valor: String(valor),
        tipo: 'NUMERO',
        grupo: 'cobranca',
        descricao: 'Máximo de cobranças por destinatário por dia',
      },
      update: { valor: String(valor) },
    });

    return this.maximoEmailsDia();
  }
}
