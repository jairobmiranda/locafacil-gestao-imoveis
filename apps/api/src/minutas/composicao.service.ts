import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type EstadoCivil, type PapelParte } from '@prisma/client';
import {
  respostasBlindagemSchema,
  type AlertaMinuta,
  type RespostasBlindagem,
} from '@locafacil/contracts';
import { diferencaEmDias } from '../comum/datas';
import { PrismaService } from '../prisma/prisma.service';
import { avaliarRiscos, PROTECAO_MAXIMA, VERSAO_MODELO } from './clausulas';
import type { ContextoMinuta, ParteQualificada } from './contexto';
import { renderizarDocumento, type DocumentoRenderizado } from './documento';

const INCLUI_CONTRATO = {
  imovel: true,
  itens: { where: { ativo: true }, include: { categoria: true } },
  partes: { include: { pessoa: true }, orderBy: { ordem: 'asc' } },
  chavePix: true,
} satisfies Prisma.ContratoInclude;

type ContratoCompleto = Prisma.ContratoGetPayload<{ include: typeof INCLUI_CONTRATO }>;
type PessoaContrato = ContratoCompleto['partes'][number];

const ESTADO_CIVIL_TEXTO: Record<EstadoCivil, string> = {
  SOLTEIRO: 'solteiro(a)',
  CASADO: 'casado(a)',
  DIVORCIADO: 'divorciado(a)',
  VIUVO: 'viúvo(a)',
  UNIAO_ESTAVEL: 'convivente em união estável',
  SEPARADO: 'separado(a) judicialmente',
};

const TIPO_IMOVEL_TEXTO: Record<string, string> = {
  APARTAMENTO: 'apartamento',
  CASA: 'casa',
  TERRENO: 'terreno',
  COMERCIAL: 'imóvel comercial',
  RURAL: 'imóvel rural',
};

function formatarDocumento(documento: string | null): string | null {
  if (!documento) {
    return null;
  }

  const limpo = documento.toUpperCase().replace(/[^0-9A-Z]/g, '');

  if (/^\d{11}$/.test(limpo)) {
    return `CPF ${limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`;
  }

  if (/^[0-9A-Z]{12}\d{2}$/.test(limpo)) {
    return `CNPJ ${limpo.replace(/(.{2})(.{3})(.{3})(.{4})(.{2})/, '$1.$2.$3/$4-$5')}`;
  }

  return documento;
}

function formatarTelefone(telefone: string | null): string | null {
  if (!telefone) {
    return null;
  }

  const digitos = telefone.replace(/\D/g, '');

  if (digitos.length === 11) {
    return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (digitos.length === 10) {
    return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return telefone;
}

function formatarCep(cep: string | null): string | null {
  if (!cep) {
    return null;
  }

  const digitos = cep.replace(/\D/g, '');

  return digitos.length === 8 ? digitos.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2-$3') : cep;
}

function montarEndereco(origem: {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}): string {
  const linha = [
    origem.logradouro,
    origem.numero ? `nº ${origem.numero}` : null,
    origem.complemento,
    origem.bairro,
  ]
    .filter(Boolean)
    .join(', ');

  const local = [origem.cidade, origem.uf].filter(Boolean).join('/');
  const cep = origem.cep ? `CEP ${formatarCep(origem.cep)}` : null;

  return [linha, local, cep].filter(Boolean).join(', ') || 'endereço não informado';
}

function qualificar(parte: PessoaContrato): ParteQualificada {
  const pessoa = parte.pessoa;
  const documento = formatarDocumento(pessoa.documento);
  const telefone = formatarTelefone(pessoa.telefone);

  const trechos = [
    pessoa.nacionalidade ?? 'brasileiro(a)',
    pessoa.estadoCivil ? ESTADO_CIVIL_TEXTO[pessoa.estadoCivil] : null,
    pessoa.profissao,
    pessoa.rg ? `portador(a) do RG nº ${pessoa.rg}${pessoa.orgaoExpedidor ? ` ${pessoa.orgaoExpedidor}` : ''}` : null,
    documento ? `inscrito(a) no ${documento}` : null,
    pessoa.email ? `endereço eletrônico ${pessoa.email}` : null,
    telefone ? `telefone e WhatsApp ${telefone}` : null,
    `residente e domiciliado(a) na ${montarEndereco(pessoa)}`,
  ].filter(Boolean) as string[];

  return {
    nome: pessoa.nome,
    qualificacao: `${trechos.join(', ')}.`,
    documento,
    email: pessoa.email,
    telefone,
    estadoCivil: pessoa.estadoCivil,
    casado: pessoa.estadoCivil === 'CASADO' || pessoa.estadoCivil === 'UNIAO_ESTAVEL',
    participacao: parte.participacao ? Number(parte.participacao) : null,
  };
}

const porPapel = (contrato: ContratoCompleto, papel: PapelParte): ParteQualificada[] =>
  contrato.partes.filter((parte) => parte.papel === papel).map(qualificar);

@Injectable()
export class ComposicaoService {
  constructor(private readonly prisma: PrismaService) {}

  async carregarContrato(contratoId: string): Promise<ContratoCompleto> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id: contratoId },
      include: INCLUI_CONTRATO,
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    return contrato;
  }

  /** As respostas ficam no contrato para o wizard poder retomar de onde parou. */
  lerRespostas(contrato: ContratoCompleto, sobrescrever?: RespostasBlindagem): RespostasBlindagem {
    if (sobrescrever) {
      return sobrescrever;
    }

    const analise = respostasBlindagemSchema.safeParse(contrato.respostasBlindagem ?? {});

    return analise.success ? analise.data : respostasBlindagemSchema.parse({});
  }

  montarContexto(contrato: ContratoCompleto, respostas: RespostasBlindagem): ContextoMinuta {
    const meses = Math.max(
      1,
      Math.round(diferencaEmDias(contrato.dataInicio, contrato.dataFim) / 30.4375),
    );

    return {
      locadores: porPapel(contrato, 'LOCADOR'),
      locatarios: porPapel(contrato, 'LOCATARIO'),
      fiadores: porPapel(contrato, 'FIADOR'),
      anuentes: [...porPapel(contrato, 'CONJUGE'), ...porPapel(contrato, 'ANUENTE')],
      testemunhas: porPapel(contrato, 'TESTEMUNHA'),

      imovel: {
        apelido: contrato.imovel.apelido,
        tipo: TIPO_IMOVEL_TEXTO[contrato.imovel.tipo] ?? 'imóvel',
        endereco: montarEndereco(contrato.imovel),
        cidade: contrato.imovel.cidade ?? '',
        uf: contrato.imovel.uf ?? '',
        matricula: contrato.imovel.matricula,
        inscricaoMunicipal: contrato.imovel.inscricaoMunicipal,
        areaConstruida: contrato.imovel.areaConstruida
          ? Number(contrato.imovel.areaConstruida)
          : null,
        quartos: contrato.imovel.quartos,
        vagas: contrato.imovel.vagas,
      },
      finalidade: contrato.finalidade,

      dataInicio: contrato.dataInicio,
      dataFim: contrato.dataFim,
      prazoMeses: meses,

      diaVencimento: contrato.diaVencimento,
      valorAluguel: Number(contrato.valorAluguel),
      percentualMulta: Number(contrato.percentualMulta),
      percentualJurosDia: Number(contrato.percentualJurosDia),
      descontoPontualidade: Number(contrato.descontoPontualidade),

      indiceReajuste: contrato.indiceReajuste,
      intervaloReajusteMeses: contrato.intervaloReajusteMeses,

      tipoGarantia: contrato.tipoGarantia,
      valorGarantia: contrato.valorGarantia ? Number(contrato.valorGarantia) : null,

      encargos: contrato.itens.map((item) => ({
        descricao: item.descricao,
        valor: Number(item.valor),
      })),
      chavePix: contrato.chavePix
        ? {
            tipo: contrato.chavePix.tipoChave,
            chave: contrato.chavePix.chave,
            titular: contrato.chavePix.nomeBeneficiario,
          }
        : null,

      respostas,
      foro: respostas.foroComarca?.trim() || contrato.imovel.cidade || 'do foro do imóvel',
      emitidaEm: new Date(),
    };
  }

  compor(
    contexto: ContextoMinuta,
  ): DocumentoRenderizado & { alertas: AlertaMinuta[]; protecaoMaxima: number } {
    const alertas = avaliarRiscos(contexto);
    const documento = renderizarDocumento(contexto);

    return { ...documento, alertas, protecaoMaxima: PROTECAO_MAXIMA };
  }

  /** Bloqueio nao e aviso: impede gravar a minuta. */
  garantirSemBloqueio(alertas: AlertaMinuta[]): void {
    const bloqueios = alertas.filter((item) => item.severidade === 'BLOQUEIO');

    if (bloqueios.length > 0) {
      throw new BadRequestException({
        mensagem: 'Corrija os pontos abaixo antes de gerar a minuta',
        erros: bloqueios.map((item) => ({
          campo: item.clausulaId ?? 'contrato',
          erro: item.mensagem,
        })),
      });
    }
  }

  get versaoModelo(): number {
    return VERSAO_MODELO;
  }
}
