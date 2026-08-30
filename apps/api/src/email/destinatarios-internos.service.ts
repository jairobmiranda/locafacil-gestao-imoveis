import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const CHAVE = 'email.gestor';

/** Quem recebe os avisos internos, como o pagamento informado pelo inquilino. */
@Injectable()
export class DestinatariosInternosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listar(): Promise<string[]> {
    const registro = await this.prisma.configuracao.findUnique({ where: { chave: CHAVE } });
    const bruto = registro?.valor ?? this.config.get<string>('EMAIL_REPLY_TO') ?? '';

    return bruto
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async salvar(enderecos: string[]): Promise<string[]> {
    const valor = enderecos.join(';');

    await this.prisma.configuracao.upsert({
      where: { chave: CHAVE },
      create: {
        chave: CHAVE,
        valor,
        grupo: 'email',
        descricao: 'Destinatários dos avisos internos',
      },
      update: { valor },
    });

    return this.listar();
  }
}
