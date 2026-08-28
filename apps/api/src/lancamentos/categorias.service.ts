import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarCategoriaDto,
  CriarCategoriaDto,
  ListarCategoriasDto,
} from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  listar(filtros: ListarCategoriasDto) {
    return this.prisma.categoria.findMany({
      where: {
        natureza: filtros.natureza,
        ...(filtros.incluirInativas ? {} : { ativa: true }),
      },
      orderBy: [{ natureza: 'asc' }, { nome: 'asc' }],
    });
  }

  async criar(dados: CriarCategoriaDto) {
    await this.validarPai(dados.categoriaPaiId, dados.natureza);

    try {
      return await this.prisma.categoria.create({ data: dados });
    } catch (erro) {
      throw this.traduzirDuplicidade(erro);
    }
  }

  async atualizar(id: string, dados: AtualizarCategoriaDto) {
    const categoria = await this.buscar(id);

    if (categoria.doSistema) {
      if (dados.nome !== undefined && dados.nome !== categoria.nome) {
        throw new ConflictException(
          'Categoria do sistema não pode ser renomeada: rotinas automáticas dependem do nome',
        );
      }

      if (dados.ativa === false) {
        throw new ConflictException('Categoria do sistema não pode ser desativada');
      }
    }

    if (dados.categoriaPaiId) {
      await this.validarPai(dados.categoriaPaiId, categoria.natureza);
      await this.validarCiclo(id, dados.categoriaPaiId);
    }

    try {
      return await this.prisma.categoria.update({ where: { id }, data: dados });
    } catch (erro) {
      throw this.traduzirDuplicidade(erro);
    }
  }

  async remover(id: string): Promise<void> {
    const categoria = await this.buscar(id);

    if (categoria.doSistema) {
      throw new ConflictException('Categoria do sistema não pode ser excluída');
    }

    const [lancamentos, itensLancamento, itensContrato, subcategorias] = await Promise.all([
      this.prisma.lancamento.count({ where: { categoriaId: id } }),
      this.prisma.itemLancamento.count({ where: { categoriaId: id } }),
      this.prisma.itemContrato.count({ where: { categoriaId: id } }),
      this.prisma.categoria.count({ where: { categoriaPaiId: id } }),
    ]);

    if (lancamentos || itensLancamento || itensContrato) {
      throw new ConflictException('Categoria já usada em lançamentos ou contratos. Desative-a em vez de excluir');
    }

    if (subcategorias) {
      throw new ConflictException('Categoria possui subcategorias. Remova-as primeiro');
    }

    await this.prisma.categoria.delete({ where: { id } });
  }

  private async buscar(id: string) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });

    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return categoria;
  }

  private async validarPai(categoriaPaiId: string | undefined, natureza: string): Promise<void> {
    if (!categoriaPaiId) {
      return;
    }

    const pai = await this.prisma.categoria.findUnique({ where: { id: categoriaPaiId } });

    if (!pai) {
      throw new NotFoundException('Categoria pai não encontrada');
    }

    if (pai.natureza !== natureza) {
      throw new ConflictException('A categoria pai precisa ter a mesma natureza');
    }
  }

  /** Impede que a categoria vire ancestral de si mesma. */
  private async validarCiclo(id: string, categoriaPaiId: string): Promise<void> {
    let atual: string | null = categoriaPaiId;

    while (atual) {
      if (atual === id) {
        throw new ConflictException('A hierarquia de categorias não pode formar um ciclo');
      }

      const pai: { categoriaPaiId: string | null } | null = await this.prisma.categoria.findUnique({
        where: { id: atual },
        select: { categoriaPaiId: true },
      });

      atual = pai?.categoriaPaiId ?? null;
    }
  }

  private traduzirDuplicidade(erro: unknown): unknown {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      return new ConflictException('Já existe uma categoria com esse nome para essa natureza');
    }

    return erro;
  }
}
