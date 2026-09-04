import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type {
  AcompanharVistoriaDto,
  CriarVistoriaDto,
  DestinatarioConvite,
  EnviarConviteDto,
  ListarVistoriasDto,
  MetadadosFotoDto,
  PapelDestinatario,
  ResponderItemDto,
  VistoriaPublica,
} from '@locafacil/contracts';
import { ArmazenamentoService } from '../anexos/armazenamento.service';
import { somarDias } from '../comum/datas';
import { sanitizarHtmlRico, textoDeHtml } from '../comum/html';
import { PrismaService } from '../prisma/prisma.service';
import { AvisoVistoriaService, type MomentoAviso } from './aviso-vistoria.service';
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
const VALIDADE_PADRAO_DIAS = 15;

/** Quem costuma executar a vistoria aparece primeiro na lista de convite. */
const ORDEM_PAPEL: Record<PapelDestinatario, number> = {
  CONVITE_ANTERIOR: 0,
  RESPONSAVEL: 1,
  LOCATARIO: 2,
  CONJUGE: 3,
  FIADOR: 4,
  LOCADOR: 5,
  ANUENTE: 6,
  TESTEMUNHA: 7,
  COPIA: 8,
};

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

/**
 * Devolver para complemento com o link vencido nao adianta: `garantirEditavel` barra o acesso.
 * O prazo volta a contar de hoje, repetindo a janela que o gestor escolheu no convite.
 */
function prazoRetomada(vistoria: {
  conviteEnviadoEm: Date | null;
  conviteExpiraEm: Date | null;
}): Date | null {
  if (!vistoria.conviteExpiraEm) {
    return null;
  }

  if (vistoria.conviteExpiraEm > new Date()) {
    return vistoria.conviteExpiraEm;
  }

  const janela = vistoria.conviteEnviadoEm
    ? Math.round(
        (vistoria.conviteExpiraEm.getTime() - vistoria.conviteEnviadoEm.getTime()) / 86_400_000,
      )
    : VALIDADE_PADRAO_DIAS;

  return somarDias(new Date(), janela >= 1 && janela <= 60 ? janela : VALIDADE_PADRAO_DIAS);
}

@Injectable()
export class VistoriasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly armazenamento: ArmazenamentoService,
    private readonly aviso: AvisoVistoriaService,
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
        conviteCopias: dados.copias?.length ? dados.copias.join(';') : null,
        conviteEnviadoEm: new Date(),
        conviteExpiraEm: somarDias(new Date(), dados.validadeDias),
        situacao: vistoria.situacao === 'RASCUNHO' ? 'CONVITE_ENVIADO' : vistoria.situacao,
      },
    });
  }

  /** Quem recebeu o ultimo convite. E para esta lista que o pedido de complemento volta. */
  static destinosDoConvite(vistoria: {
    conviteEmail: string | null;
    conviteCopias: string | null;
  }): { email: string; copias: string[] } | null {
    if (!vistoria.conviteEmail) {
      return null;
    }

    return {
      email: vistoria.conviteEmail,
      copias: AvisoVistoriaService.separar(vistoria.conviteCopias),
    };
  }

  /** E-mails que a tela oferece como destino do convite: partes do contrato, copias e responsavel. */
  async destinatariosConvite(id: string): Promise<DestinatarioConvite[]> {
    const vistoria = await this.prisma.vistoria.findUnique({
      where: { id },
      select: {
        conviteEmail: true,
        responsavel: { select: { nome: true, email: true } },
        contrato: {
          select: {
            emailsCopia: true,
            partes: {
              orderBy: { ordem: 'asc' },
              select: {
                papel: true,
                contatoPrincipal: true,
                pessoa: { select: { nome: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!vistoria) {
      throw new NotFoundException('Vistoria não encontrada');
    }

    const candidatos: DestinatarioConvite[] = [];

    if (vistoria.conviteEmail) {
      candidatos.push({
        email: vistoria.conviteEmail,
        nome: null,
        papel: 'CONVITE_ANTERIOR',
        principal: true,
      });
    }

    if (vistoria.responsavel?.email) {
      candidatos.push({
        email: vistoria.responsavel.email,
        nome: vistoria.responsavel.nome,
        papel: 'RESPONSAVEL',
        principal: true,
      });
    }

    for (const parte of vistoria.contrato?.partes ?? []) {
      if (parte.pessoa.email) {
        candidatos.push({
          email: parte.pessoa.email,
          nome: parte.pessoa.nome,
          papel: parte.papel,
          // Locatario e o executor natural da vistoria; locador principal nao vira destino padrao.
          principal: parte.contatoPrincipal && parte.papel === 'LOCATARIO',
        });
      }
    }

    // Mesmo separador aceito na cobranca: o cadastro admite ponto e virgula ou virgula.
    for (const avulso of (vistoria.contrato?.emailsCopia ?? '').split(/[;,]/)) {
      const email = avulso.trim();

      if (email) {
        candidatos.push({ email, nome: null, papel: 'COPIA', principal: false });
      }
    }

    // O mesmo endereco pode ser parte e copia: fica a primeira ocorrencia, que carrega o nome.
    const porEmail = new Map<string, DestinatarioConvite>();

    for (const candidato of candidatos) {
      const chave = candidato.email.trim().toLowerCase();
      const existente = porEmail.get(chave);

      if (existente) {
        existente.principal = existente.principal || candidato.principal;
        existente.nome = existente.nome ?? candidato.nome;
      } else {
        porEmail.set(chave, { ...candidato, email: candidato.email.trim() });
      }
    }

    return [...porEmail.values()].sort(
      (um, outro) => ORDEM_PAPEL[um.papel] - ORDEM_PAPEL[outro.papel],
    );
  }

  /** Guarda quem acompanha esta vistoria e em que momento quer ser avisado. */
  async salvarAcompanhamento(id: string, dados: AcompanharVistoriaDto) {
    await this.buscar(id);

    const emails = AvisoVistoriaService.separar(dados.emails.join(';'));

    return this.prisma.vistoria.update({
      where: { id },
      data: {
        avisarEmails: emails.length ? emails.join(';') : null,
        avisarInicio: dados.avisarInicio && emails.length > 0,
        avisarConclusao: dados.avisarConclusao && emails.length > 0,
      },
      select: { id: true, avisarEmails: true, avisarInicio: true, avisarConclusao: true },
    });
  }

  /**
   * Carimba o aviso antes de mandar o e-mail. O `updateMany` com o carimbo nulo no filtro
   * e a trava: duas fotos subindo juntas nao geram dois avisos.
   */
  private async dispararAviso(vistoriaId: string, momento: MomentoAviso): Promise<void> {
    const campoCarimbo = momento === 'INICIO' ? 'avisoInicioEm' : 'avisoConclusaoEm';
    const campoOpcao = momento === 'INICIO' ? 'avisarInicio' : 'avisarConclusao';

    const marcada = await this.prisma.vistoria.updateMany({
      where: { id: vistoriaId, [campoOpcao]: true, [campoCarimbo]: null },
      data: { [campoCarimbo]: new Date() },
    });

    if (marcada.count === 0) {
      return;
    }

    const vistoria = await this.prisma.vistoria.findUnique({
      where: { id: vistoriaId },
      select: { tipo: true, avisarEmails: true, imovel: { select: { apelido: true } } },
    });

    if (!vistoria) {
      return;
    }

    await this.aviso.avisar({
      momento,
      vistoriaId,
      emails: AvisoVistoriaService.separar(vistoria.avisarEmails),
      tipo: vistoria.tipo,
      imovel: vistoria.imovel.apelido,
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
    const vistoria = await this.buscar(id);

    const limpo = sanitizarHtmlRico(motivo);

    // Um campo rico "vazio" ainda chega como `<p><br></p>`: o que vale e o texto que sobra.
    if (textoDeHtml(limpo) === '') {
      throw new BadRequestException('Escreva o que precisa ser refeito');
    }

    return this.prisma.vistoria.update({
      where: { id },
      // Vai ser retomada e concluida de novo: os carimbos zeram para os avisos repetirem.
      data: {
        situacao: 'RECUSADA',
        recusadaEm: new Date(),
        motivoRecusa: limpo,
        avisoInicioEm: null,
        avisoConclusaoEm: null,
        conviteExpiraEm: prazoRetomada(vistoria),
      },
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

    const registrada = await this.prisma.vistoriaFoto.create({
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

    // Primeira foto da rodada: depois de um complemento o carimbo zera e o aviso sai de novo.
    if (vistoria.avisoInicioEm === null) {
      await this.dispararAviso(vistoriaId, 'INICIO');
    }

    return registrada;
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

    const concluida = await this.prisma.vistoria.update({
      where: { id: vistoriaId },
      data: { situacao: 'ENVIADA', enviadaEm: new Date() },
      select: { id: true, situacao: true, enviadaEm: true },
    });

    await this.dispararAviso(vistoriaId, 'CONCLUSAO');

    return concluida;
  }

  /** Projecao enxuta do link publico: nunca devolve dados do contrato ou das partes. */
  async paraExecucao(vistoriaId: string): Promise<VistoriaPublica> {
    const vistoria = await this.buscar(vistoriaId);

    return {
      id: vistoria.id,
      tipo: vistoria.tipo,
      situacao: vistoria.situacao,
      motivoRecusa: vistoria.situacao === 'RECUSADA' ? vistoria.motivoRecusa : null,
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
