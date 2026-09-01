import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AtualizarFeriadoDto, CriarFeriadoDto } from '@locafacil/contracts';
import { apenasData, chaveData } from '../comum/datas';
import { PrismaService } from '../prisma/prisma.service';

/** Cache curto: a régua e a baixa consultam a lista a cada lançamento avaliado. */
const VALIDADE_CACHE_MS = 5 * 60 * 1000;

@Injectable()
export class FeriadosService {
  private cache: { chaves: Set<string>; expiraEm: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  listar(ano?: number) {
    const intervalo =
      ano === undefined
        ? undefined
        : { gte: new Date(Date.UTC(ano, 0, 1)), lt: new Date(Date.UTC(ano + 1, 0, 1)) };

    return this.prisma.feriado.findMany({
      where: intervalo ? { data: intervalo } : undefined,
      orderBy: { data: 'asc' },
    });
  }

  async criar(dados: CriarFeriadoDto) {
    try {
      const feriado = await this.prisma.feriado.create({
        data: { data: apenasData(dados.data), descricao: dados.descricao },
      });

      this.cache = null;

      return feriado;
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Já existe um feriado cadastrado nessa data');
      }

      throw erro;
    }
  }

  async atualizar(id: string, dados: AtualizarFeriadoDto) {
    await this.garantirExistencia(id);

    try {
      const feriado = await this.prisma.feriado.update({
        where: { id },
        data: {
          data: dados.data ? apenasData(dados.data) : undefined,
          descricao: dados.descricao,
        },
      });

      this.cache = null;

      return feriado;
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Já existe um feriado cadastrado nessa data');
      }

      throw erro;
    }
  }

  async remover(id: string): Promise<void> {
    await this.garantirExistencia(id);
    await this.prisma.feriado.delete({ where: { id } });

    this.cache = null;
  }

  /** Conjunto de chaves `AAAA-MM-DD` para `proximoDiaUtil`. */
  async chaves(): Promise<ReadonlySet<string>> {
    if (this.cache && this.cache.expiraEm > Date.now()) {
      return this.cache.chaves;
    }

    const feriados = await this.prisma.feriado.findMany({ select: { data: true } });
    const chaves = new Set(feriados.map((feriado) => chaveData(feriado.data)));

    this.cache = { chaves, expiraEm: Date.now() + VALIDADE_CACHE_MS };

    return chaves;
  }

  private async garantirExistencia(id: string): Promise<void> {
    const existe = await this.prisma.feriado.findUnique({ where: { id }, select: { id: true } });

    if (!existe) {
      throw new NotFoundException('Feriado não encontrado');
    }
  }
}
