import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import {
  TAMANHO_MAXIMO_ANEXO_BYTES,
  TIPOS_ANEXO_ACEITOS,
  type EnviarAnexoDto,
  type EntidadeAnexo,
  type ListarAnexosDto,
} from '@locafacil/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { ArmazenamentoService } from './armazenamento.service';

type ArquivoRecebido = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class AnexosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async enviar(dados: EnviarAnexoDto, arquivo: ArquivoRecebido | undefined) {
    if (!arquivo) {
      throw new BadRequestException('Nenhum arquivo enviado no campo "arquivo"');
    }

    if (!TIPOS_ANEXO_ACEITOS.includes(arquivo.mimetype as (typeof TIPOS_ANEXO_ACEITOS)[number])) {
      throw new BadRequestException(
        `Tipo de arquivo não aceito. Permitidos: ${TIPOS_ANEXO_ACEITOS.join(', ')}`,
      );
    }

    if (arquivo.size > TAMANHO_MAXIMO_ANEXO_BYTES) {
      throw new BadRequestException(
        `Arquivo acima do limite de ${TAMANHO_MAXIMO_ANEXO_BYTES / 1024 / 1024} MB`,
      );
    }

    await this.garantirEntidade(dados.entidadeTipo, dados.entidadeId);

    const nomeArquivo = this.higienizarNome(arquivo.originalname);
    const chaveObjeto = `${dados.entidadeTipo.toLowerCase()}/${dados.entidadeId}/${randomUUID()}${extname(nomeArquivo)}`;

    await this.armazenamento.enviar(chaveObjeto, arquivo.buffer, arquivo.mimetype);

    return this.prisma.anexo.create({
      data: {
        entidadeTipo: dados.entidadeTipo,
        entidadeId: dados.entidadeId,
        especie: dados.especie,
        bucket: this.armazenamento.bucket,
        chaveObjeto,
        nomeArquivo,
        tipoConteudo: arquivo.mimetype,
        tamanhoBytes: BigInt(arquivo.size),
        checksum: createHash('sha256').update(arquivo.buffer).digest('hex'),
      },
    });
  }

  listar(filtros: ListarAnexosDto) {
    return this.prisma.anexo.findMany({
      where: {
        entidadeTipo: filtros.entidadeTipo,
        entidadeId: filtros.entidadeId,
        especie: filtros.especie,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscar(id: string) {
    const anexo = await this.prisma.anexo.findUnique({ where: { id } });

    if (!anexo) {
      throw new NotFoundException('Anexo não encontrado');
    }

    return anexo;
  }

  async baixar(id: string): Promise<{ anexo: Awaited<ReturnType<AnexosService['buscar']>>; conteudo: Readable }> {
    const anexo = await this.buscar(id);

    return { anexo, conteudo: await this.armazenamento.obter(anexo.chaveObjeto) };
  }

  async remover(id: string): Promise<void> {
    const anexo = await this.buscar(id);

    await this.prisma.anexo.delete({ where: { id } });
    await this.armazenamento.remover(anexo.chaveObjeto);
  }

  /** Evita anexo orfao apontando para entidade inexistente, ja que a relacao e polimorfica e sem FK. */
  private async garantirEntidade(tipo: EntidadeAnexo, id: string): Promise<void> {
    const existe = await {
      IMOVEL: () => this.prisma.imovel.count({ where: { id } }),
      LANCAMENTO: () => this.prisma.lancamento.count({ where: { id } }),
      CONTRATO: () => this.prisma.contrato.count({ where: { id } }),
      PESSOA: () => this.prisma.pessoa.count({ where: { id } }),
      VISTORIA: () => this.prisma.vistoria.count({ where: { id } }),
    }[tipo]();

    if (!existe) {
      throw new NotFoundException(`${tipo} ${id} não encontrado`);
    }
  }

  private higienizarNome(nome: string): string {
    return nome
      .replace(/[/\\]/g, '')
      .replace(/[^\p{L}\p{N}._-]+/gu, '_')
      .slice(-255);
  }
}
