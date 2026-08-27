import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarImovelDto,
  CriarImovelDto,
  ListarImoveisDto,
  Paginado,
} from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImoveisService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: ListarImoveisDto): Promise<Paginado<unknown>> {
    const where: Prisma.ImovelWhereInput = {
      estrategia: filtros.estrategia,
      situacao: filtros.situacao,
      tipo: filtros.tipo,
      ...(filtros.incluirArquivados ? {} : { arquivadoEm: null }),
      ...(filtros.busca
        ? {
            OR: [
              { apelido: { contains: filtros.busca } },
              { logradouro: { contains: filtros.busca } },
              { bairro: { contains: filtros.busca } },
              { cidade: { contains: filtros.busca } },
            ],
          }
        : {}),
    };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.imovel.findMany({
        where,
        orderBy: { apelido: 'asc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      this.prisma.imovel.count({ where }),
    ]);

    return { itens, total, pagina: filtros.pagina, limite: filtros.limite };
  }

  async buscar(id: string) {
    const imovel = await this.prisma.imovel.findUnique({ where: { id } });

    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    return imovel;
  }

  criar(dados: CriarImovelDto) {
    return this.prisma.imovel.create({ data: dados });
  }

  async atualizar(id: string, dados: AtualizarImovelDto) {
    await this.buscar(id);

    return this.prisma.imovel.update({ where: { id }, data: dados });
  }

  async arquivar(id: string) {
    await this.buscar(id);

    return this.prisma.imovel.update({
      where: { id },
      data: { arquivadoEm: new Date() },
    });
  }

  async restaurar(id: string) {
    await this.buscar(id);

    return this.prisma.imovel.update({
      where: { id },
      data: { arquivadoEm: null },
    });
  }
}
