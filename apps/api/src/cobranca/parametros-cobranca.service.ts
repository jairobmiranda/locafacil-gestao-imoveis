import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CHAVE_MAXIMO_DIA = 'cobranca.maximo_emails_dia';
const PADRAO_MAXIMO_DIA = 1;

const CHAVE_JANELA_RECUPERACAO = 'cobranca.janela_recuperacao_dias';
const PADRAO_JANELA_RECUPERACAO = 3;

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

  /**
   * Quantos dias a régua pode voltar atrás para recuperar uma etapa que passou sem ela
   * rodar (contrato cadastrado depois da hora do envio, API parada, cobrança criada
   * retroativamente). Zero mantém o comportamento antigo: só dispara no dia exato.
   */
  async janelaRecuperacaoDias(): Promise<number> {
    const registro = await this.prisma.configuracao.findUnique({
      where: { chave: CHAVE_JANELA_RECUPERACAO },
    });

    const valor = Number(registro?.valor);

    return Number.isInteger(valor) && valor >= 0 ? valor : PADRAO_JANELA_RECUPERACAO;
  }

  async salvar(dados: {
    maximoEmailsDia: number;
    janelaRecuperacaoDias: number;
  }): Promise<{ maximoEmailsDia: number; janelaRecuperacaoDias: number }> {
    await this.gravar(
      CHAVE_MAXIMO_DIA,
      dados.maximoEmailsDia,
      'Máximo de cobranças por destinatário por dia',
    );
    await this.gravar(
      CHAVE_JANELA_RECUPERACAO,
      dados.janelaRecuperacaoDias,
      'Dias que a régua volta atrás para recuperar etapas perdidas',
    );

    return {
      maximoEmailsDia: await this.maximoEmailsDia(),
      janelaRecuperacaoDias: await this.janelaRecuperacaoDias(),
    };
  }

  private async gravar(chave: string, valor: number, descricao: string): Promise<void> {
    await this.prisma.configuracao.upsert({
      where: { chave },
      create: {
        chave,
        valor: String(valor),
        tipo: 'NUMERO',
        grupo: 'cobranca',
        descricao,
      },
      update: { valor: String(valor) },
    });
  }
}
