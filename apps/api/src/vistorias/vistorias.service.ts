import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type {
  CriarVistoriaDto,
  EnviarConviteDto,
  ListarVistoriasDto,
  MetadadosFotoDto,
  ResponderItemDto,
  VistoriaPublica,
} from '@locafacil/contracts';
import { ArmazenamentoService } from '../anexos/armazenamento.service';
import { somarDias } from '../comum/datas';
import { PrismaService } from '../prisma/prisma.service';
import { materializar, roteiroPara, roteirosDisponiveis } from './roteiros';

const INCLUI_EXECUCAO = {
  imovel: true,
  ambientes: {
    orderBy: { ordem: 'asc' },
    include: {
      itens: {
        orderBy: { ordem: 'asc' },
        include: { fotos: { orderBy: { ordem: 'asc' } } },
      },
    },
  },
} satisfies Prisma.VistoriaInclude;

type VistoriaCompleta = Prisma.VistoriaGetPayload<{ include: typeof INCLUI_EXECUCAO }>;

const TIPOS_IMAGEM = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANHO_MAXIMO_FOTO = 6 * 1024 * 1024;
const MAXIMO_FOTOS_POR_VISTORIA = 400;

type ArquivoRecebido = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/** O Content-Type do cliente nao prova nada; os bytes iniciais provam. */
function tipoRealDaImagem(conteudo: Buffer): string | null {
  if (conteudo.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }

  if (conteudo.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (
    conteudo.subarray(0, 4).toString('ascii') === 'RIFF' &&
    conteudo.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

@Injectable()
export class VistoriasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async criar(dados: CriarVistoriaDto) {
    const imovel = await this.prisma.imovel.findUnique({ where: { id: dados.imovelId } });

    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    const roteiro = roteiroPara(imovel.tipo, dados.roteiroChave);

    if (dados.ambientes) {
      const conhecidas = new Set(roteiro.ambientes.map((ambiente) => ambiente.chave));
      const desconhecida = dados.ambientes.find((escolha) => !conhecidas.has(escolha.chave));

      if (desconhecida) {
        throw new BadRequestException(
          `O ambiente "${desconhecida.chave}" não existe no roteiro ${roteiro.nome}`,
        );
      }
    }

    const ambientes = materializar(roteiro, imovel, dados.ambientes);

    if (ambientes.length === 0) {
      throw new BadRequestException('Selecione ao menos um ambiente para a vistoria');
    }

    return this.prisma.vistoria.create({
      data: {
        imovelId: dados.imovelId,
        contratoId: dados.contratoId ?? null,
        tipo: dados.tipo,
        roteiroChave: roteiro.chave,
        roteiroVersao: roteiro.versao,
        responsavelId: dados.responsavelId ?? null,
        observacoes: dados.observacoes ?? null,
        ambientes: {
          create: ambientes.map((ambiente) => ({
            chave: ambiente.chave,
            nome: ambiente.nome,
            ordem: ambiente.ordem,
            itens: { create: ambiente.itens },
          })),
        },
      },
      include: INCLUI_EXECUCAO,
    });
  }

  roteiros() {
    return roteirosDisponiveis();
  }

  listar(filtros: ListarVistoriasDto) {
    return this.prisma.vistoria.findMany({
      where: {
        imovelId: filtros.imovelId,
        contratoId: filtros.contratoId,
        situacao: filtros.situacao,
      },
      orderBy: { criadoEm: 'desc' },
      include: { imovel: { select: { id: true, apelido: true } } },
    });
  }

  async buscar(id: string): Promise<VistoriaCompleta> {
    const vistoria = await this.prisma.vistoria.findUnique({
      where: { id },
      include: INCLUI_EXECUCAO,
    });

    if (!vistoria) {
      throw new NotFoundException('Vistoria não encontrada');
    }

    return vistoria;
  }

  async registrarConvite(id: string, dados: EnviarConviteDto) {
    const vistoria = await this.buscar(id);

    if (vistoria.situacao === 'APROVADA') {
      throw new ConflictException('Vistoria já aprovada');
    }

    return this.prisma.vistoria.update({
      where: { id },
      data: {
        conviteEmail: dados.email,
        conviteEnviadoEm: new Date(),
        conviteExpiraEm: somarDias(new Date(), dados.validadeDias),
        situacao: vistoria.situacao === 'RASCUNHO' ? 'CONVITE_ENVIADO' : vistoria.situacao,
      },
    });
  }

  async aprovar(id: string) {
    const vistoria = await this.buscar(id);

    if (vistoria.situacao !== 'ENVIADA') {
      throw new ConflictException('Só é possível aprovar uma vistoria já enviada');
    }

    return this.prisma.vistoria.update({
      where: { id },
      data: { situacao: 'APROVADA', aprovadaEm: new Date() },
    });
  }

  async recusar(id: string, motivo: string) {
    await this.buscar(id);

    return this.prisma.vistoria.update({
      where: { id },
      data: { situacao: 'RECUSADA', recusadaEm: new Date(), motivoRecusa: motivo },
    });
  }

  // ---------------------------------------------------------------------------
  // Execucao, usada tanto pelo painel interno quanto pelo link publico
  // ---------------------------------------------------------------------------

  /** Convite vencido ou vistoria fechada nao aceita mais nada. */
  private garantirEditavel(vistoria: VistoriaCompleta): void {
    if (vistoria.situacao === 'ENVIADA' || vistoria.situacao === 'APROVADA') {
      throw new ConflictException('Esta vistoria já foi enviada e não aceita alterações');
    }

    if (vistoria.conviteExpiraEm && vistoria.conviteExpiraEm < new Date()) {
      throw new ConflictException('O prazo deste link de vistoria expirou');
    }
  }

  private async marcarEmExecucao(vistoria: VistoriaCompleta): Promise<void> {
    if (vistoria.situacao === 'EM_EXECUCAO') {
      return;
    }

    await this.prisma.vistoria.update({
      where: { id: vistoria.id },
      data: { situacao: 'EM_EXECUCAO', iniciadaEm: vistoria.iniciadaEm ?? new Date() },
    });
  }

  async responderItem(vistoriaId: string, itemId: string, dados: ResponderItemDto) {
    const vistoria = await this.buscar(vistoriaId);
    this.garantirEditavel(vistoria);

    const item = vistoria.ambientes
      .flatMap((ambiente) => ambiente.itens)
      .find((candidato) => candidato.id === itemId);

    if (!item) {
      throw new NotFoundException('Item não pertence a esta vistoria');
    }

    await this.marcarEmExecucao(vistoria);

    return this.prisma.vistoriaItem.update({
      where: { id: itemId },
      data: {
        estado: dados.estado ?? null,
        observacao: dados.observacao ?? null,
      },
    });
  }

  async enviarFoto(
    vistoriaId: string,
    itemId: string,
    arquivo: ArquivoRecebido | undefined,
    metadados: MetadadosFotoDto,
  ) {
    const vistoria = await this.buscar(vistoriaId);
    this.garantirEditavel(vistoria);

    if (!arquivo) {
      throw new BadRequestException('Nenhum arquivo enviado no campo "arquivo"');
    }

    if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
      throw new BadRequestException('Foto acima de 6 MB. Ela deveria chegar comprimida.');
    }

    const tipoReal = tipoRealDaImagem(arquivo.buffer);

    if (!tipoReal || !TIPOS_IMAGEM.has(tipoReal)) {
      throw new BadRequestException('Envie uma imagem JPEG, PNG ou WebP');
    }

    const item = vistoria.ambientes
      .flatMap((ambiente) => ambiente.itens)
      .find((candidato) => candidato.id === itemId);

    if (!item) {
      throw new NotFoundException('Item não pertence a esta vistoria');
    }

    const total = vistoria.ambientes.reduce(
      (soma, ambiente) => soma + ambiente.itens.reduce((parcial, atual) => parcial + atual.fotos.length, 0),
      0,
    );

    if (total >= MAXIMO_FOTOS_POR_VISTORIA) {
      throw new ConflictException('Limite de fotos desta vistoria atingido');
    }

    // O nome vindo do cliente nunca entra na chave do objeto.
    const chaveObjeto = `vistoria/${vistoriaId}/${itemId}/${randomUUID()}.jpg`;

    await this.armazenamento.enviar(chaveObjeto, arquivo.buffer, tipoReal);
    await this.marcarEmExecucao(vistoria);

    return this.prisma.vistoriaFoto.create({
      data: {
        itemId,
        bucket: this.armazenamento.bucket,
        chaveObjeto,
        tipoConteudo: tipoReal,
        tamanhoBytes: arquivo.size,
        largura: metadados.largura ?? null,
        altura: metadados.altura ?? null,
        hashSha256: createHash('sha256').update(arquivo.buffer).digest('hex'),
        capturadaEm: metadados.capturadaEm ?? null,
        latitude: metadados.latitude ?? null,
        longitude: metadados.longitude ?? null,
        legenda: metadados.legenda ?? null,
        ordem: item.fotos.length,
      },
      select: { id: true, ordem: true, recebidaEm: true, hashSha256: true },
    });
  }

  async removerFoto(vistoriaId: string, fotoId: string): Promise<void> {
    const vistoria = await this.buscar(vistoriaId);
    this.garantirEditavel(vistoria);

    const foto = vistoria.ambientes
      .flatMap((ambiente) => ambiente.itens)
      .flatMap((item) => item.fotos)
      .find((candidata) => candidata.id === fotoId);

    if (!foto) {
      throw new NotFoundException('Foto não pertence a esta vistoria');
    }

    await this.prisma.vistoriaFoto.delete({ where: { id: fotoId } });
    await this.armazenamento.remover(foto.chaveObjeto);
  }

  /** Item com `minimoFotos` zero e opcional: nao exige estado nem foto para concluir. */
  pendencias(vistoria: VistoriaCompleta): { ambiente: string; item: string }[] {
    return vistoria.ambientes.flatMap((ambiente) =>
      ambiente.itens
        .filter(
          (item) =>
            item.minimoFotos > 0 &&
            item.estado !== 'NAO_APLICAVEL' &&
            (item.fotos.length < item.minimoFotos || item.estado === null),
        )
        .map((item) => ({ ambiente: ambiente.nome, item: item.nome })),
    );
  }

  async concluir(vistoriaId: string) {
    const vistoria = await this.buscar(vistoriaId);
    this.garantirEditavel(vistoria);

    const pendentes = this.pendencias(vistoria);

    if (pendentes.length > 0) {
      throw new BadRequestException({
        mensagem: 'Ainda faltam itens para concluir a vistoria',
        erros: pendentes.map((item) => ({ campo: item.ambiente, erro: item.item })),
      });
    }

    return this.prisma.vistoria.update({
      where: { id: vistoriaId },
      data: { situacao: 'ENVIADA', enviadaEm: new Date() },
      select: { id: true, situacao: true, enviadaEm: true },
    });
  }

  /** Projecao enxuta do link publico: nunca devolve dados do contrato ou das partes. */
  async paraExecucao(vistoriaId: string): Promise<VistoriaPublica> {
    const vistoria = await this.buscar(vistoriaId);

    return {
      id: vistoria.id,
      tipo: vistoria.tipo,
      situacao: vistoria.situacao,
      imovel: {
        apelido: vistoria.imovel.apelido,
        endereco: [
          vistoria.imovel.logradouro,
          vistoria.imovel.numero,
          vistoria.imovel.bairro,
          vistoria.imovel.cidade,
        ]
          .filter(Boolean)
          .join(', '),
      },
      ambientes: vistoria.ambientes.map((ambiente) => ({
        id: ambiente.id,
        nome: ambiente.nome,
        ordem: ambiente.ordem,
        concluido: ambiente.concluido,
        itens: ambiente.itens.map((item) => ({
          id: item.id,
          nome: item.nome,
          dica: item.dica,
          ordem: item.ordem,
          minimoFotos: item.minimoFotos,
          estado: item.estado,
          observacao: item.observacao,
          fotos: item.fotos.map((foto) => ({
            id: foto.id,
            url: `/api/publico/vistoria-foto/${foto.id}`,
            legenda: foto.legenda,
          })),
        })),
      })),
    };
  }

  async conteudoFoto(fotoId: string) {
    const foto = await this.prisma.vistoriaFoto.findUnique({ where: { id: fotoId } });

    if (!foto) {
      throw new NotFoundException('Foto não encontrada');
    }

    return { foto, conteudo: await this.armazenamento.obter(foto.chaveObjeto) };
  }
}
