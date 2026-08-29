import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { AlvoImplantacao, SalvarWebhooksDto } from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';

const GRUPO = 'implantacao';
const CHAVES: Record<AlvoImplantacao, string> = {
  api: 'caprover.webhook.api',
  web: 'caprover.webhook.web',
};

@Injectable()
export class ImplantacaoService {
  private readonly logger = new Logger(ImplantacaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buscarWebhooks(): Promise<Record<AlvoImplantacao, string | null>> {
    const registros = await this.prisma.configuracao.findMany({ where: { grupo: GRUPO } });
    const valor = (alvo: AlvoImplantacao) =>
      registros.find((item) => item.chave === CHAVES[alvo])?.valor ?? null;

    return { api: valor('api'), web: valor('web') };
  }

  async salvarWebhooks(dados: SalvarWebhooksDto): Promise<Record<AlvoImplantacao, string | null>> {
    for (const alvo of ['api', 'web'] as const) {
      const valor = dados[alvo];

      if (valor === undefined) {
        continue;
      }

      if (!valor) {
        await this.prisma.configuracao.deleteMany({ where: { chave: CHAVES[alvo] } });
        continue;
      }

      await this.prisma.configuracao.upsert({
        where: { chave: CHAVES[alvo] },
        create: {
          chave: CHAVES[alvo],
          valor,
          grupo: GRUPO,
          descricao: `Webhook de build do CapRover (${alvo})`,
        },
        update: { valor },
      });
    }

    return this.buscarWebhooks();
  }

  async publicar(alvo: AlvoImplantacao): Promise<{ disparado: boolean; resposta: string }> {
    const webhooks = await this.buscarWebhooks();
    const url = webhooks[alvo];

    if (!url) {
      throw new BadRequestException(`Configure antes o webhook do CapRover para ${alvo}`);
    }

    const resposta = await fetch(url, { method: 'POST' });
    const corpo = (await resposta.text()).slice(0, 500);

    if (!resposta.ok) {
      throw new BadRequestException(`CapRover respondeu ${resposta.status}: ${corpo}`);
    }

    this.logger.log(`Build de ${alvo} disparado no CapRover`);

    return { disparado: true, resposta: corpo };
  }
}
