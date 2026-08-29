import { Controller, Get } from '@nestjs/common';
import { Publico } from '../auth/publico.decorator';
import { VERSAO_API } from '../comum/versao';
import { PrismaService } from '../prisma/prisma.service';

@Publico()
@Controller('saude')
export class SaudeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async verificar() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { situacao: 'ok', banco: 'ok', versao: VERSAO_API, em: new Date().toISOString() };
  }
}
