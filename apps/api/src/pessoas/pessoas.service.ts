import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AtualizarPessoaDto,
  CriarPessoaDto,
  ListarPessoasDto,
  Paginado,
} from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { documentoValido } from './documento';

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: ListarPessoasDto): Promise<Paginado<unknown>> {
    const where: Prisma.PessoaWhereInput = {
      ...(filtros.incluirArquivadas ? {} : { arquivadoEm: null }),
      ...(filtros.busca
        ? {
            OR: [
              { nome: { contains: filtros.busca } },
              { email: { contains: filtros.busca } },
              { documento: { contains: filtros.busca.replace(/\D/g, '') } },
            ],
          }
        : {}),
    };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.pessoa.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
      }),
      this.prisma.pessoa.count({ where }),
    ]);

    return { itens, total, pagina: filtros.pagina, limite: filtros.limite };
  }

  async buscar(id: string) {
    const pessoa = await this.prisma.pessoa.findUnique({
      where: { id },
      include: {
        partesContrato: {
          select: {
            papel: true,
            contatoPrincipal: true,
            contrato: {
              select: {
                id: true,
                situacao: true,
                dataInicio: true,
                dataFim: true,
                valorAluguel: true,
                imovel: { select: { id: true, apelido: true } },
              },
            },
          },
        },
      },
    });

    if (!pessoa) {
      throw new NotFoundException('Pessoa não encontrada');
    }

    return pessoa;
  }

  async criar(dados: CriarPessoaDto) {
    this.garantirDocumento(dados.documento);

    try {
      return await this.prisma.pessoa.create({ data: dados });
    } catch (erro) {
      throw this.traduzirConflito(erro);
    }
  }

  async atualizar(id: string, dados: AtualizarPessoaDto) {
    await this.buscar(id);
    this.garantirDocumento(dados.documento);

    try {
      return await this.prisma.pessoa.update({ where: { id }, data: dados });
    } catch (erro) {
      throw this.traduzirConflito(erro);
    }
  }

  async arquivar(id: string) {
    const vinculos = await this.prisma.parteContrato.count({
      where: { pessoaId: id, contrato: { situacao: 'ATIVO' } },
    });

    if (vinculos) {
      throw new ConflictException('Pessoa vinculada a contrato ativo');
    }

    await this.buscar(id);

    return this.prisma.pessoa.update({ where: { id }, data: { arquivadoEm: new Date() } });
  }

  async restaurar(id: string) {
    await this.buscar(id);

    return this.prisma.pessoa.update({ where: { id }, data: { arquivadoEm: null } });
  }

  private garantirDocumento(documento?: string): void {
    if (documento && !documentoValido(documento)) {
      throw new BadRequestException('CPF ou CNPJ inválido');
    }
  }

  private traduzirConflito(erro: unknown): Error {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      return new ConflictException('Já existe uma pessoa com esse documento');
    }

    return erro as Error;
  }
}
