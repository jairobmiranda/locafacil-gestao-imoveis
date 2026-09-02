import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarImovelDto,
  CriarImovelDto,
  ListarImoveisDto,
  Paginado,
} from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';

const INCLUI_CARACTERISTICAS = {
  caracteristicas: { orderBy: { ordem: 'asc' } },
} satisfies Prisma.ImovelInclude;

/// A ordem de entrada e a de exibicao: preserva a sequencia que a pessoa digitou.
function comOrdem(caracteristicas: CriarImovelDto['caracteristicas']) {
  return caracteristicas.map((caracteristica, ordem) => ({ ...caracteristica, ordem }));
}

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
    const imovel = await this.prisma.imovel.findUnique({
      where: { id },
      include: INCLUI_CARACTERISTICAS,
    });

    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    return imovel;
  }

  criar(dados: CriarImovelDto) {
    const { caracteristicas, ...imovel } = dados;

    return this.prisma.imovel.create({
      data: { ...imovel, caracteristicas: { create: comOrdem(caracteristicas) } },
      include: INCLUI_CARACTERISTICAS,
    });
  }

  async atualizar(id: string, dados: AtualizarImovelDto) {
    await this.buscar(id);

    const { caracteristicas, ...imovel } = dados;

    return this.prisma.$transaction(async (tx) => {
      if (caracteristicas) {
        await tx.caracteristicaImovel.deleteMany({ where: { imovelId: id } });
      }

      return tx.imovel.update({
        where: { id },
        data: {
          ...imovel,
          caracteristicas: caracteristicas ? { create: comOrdem(caracteristicas) } : undefined,
        },
        include: INCLUI_CARACTERISTICAS,
      });
    });
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
