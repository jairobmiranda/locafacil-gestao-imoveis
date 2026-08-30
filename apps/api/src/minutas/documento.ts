import { escaparHtml } from '../comum/html';
import { selecionarClausulas } from './clausulas';
import type { Clausula } from './clausulas/tipos';
import {
  capitalizar,
  dataExtenso,
  lista,
  moeda,
  type ContextoMinuta,
  type ParteQualificada,
} from './contexto';

const ORDINAIS = [
  'PRIMEIRA',
  'SEGUNDA',
  'TERCEIRA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SÉTIMA',
  'OITAVA',
  'NONA',
  'DÉCIMA',
  'DÉCIMA PRIMEIRA',
  'DÉCIMA SEGUNDA',
  'DÉCIMA TERCEIRA',
  'DÉCIMA QUARTA',
  'DÉCIMA QUINTA',
  'DÉCIMA SEXTA',
  'DÉCIMA SÉTIMA',
  'DÉCIMA OITAVA',
  'DÉCIMA NONA',
  'VIGÉSIMA',
  'VIGÉSIMA PRIMEIRA',
  'VIGÉSIMA SEGUNDA',
  'VIGÉSIMA TERCEIRA',
  'VIGÉSIMA QUARTA',
  'VIGÉSIMA QUINTA',
  'VIGÉSIMA SEXTA',
  'VIGÉSIMA SÉTIMA',
  'VIGÉSIMA OITAVA',
  'VIGÉSIMA NONA',
  'TRIGÉSIMA',
  'TRIGÉSIMA PRIMEIRA',
  'TRIGÉSIMA SEGUNDA',
  'TRIGÉSIMA TERCEIRA',
  'TRIGÉSIMA QUARTA',
  'TRIGÉSIMA QUINTA',
  'TRIGÉSIMA SEXTA',
  'TRIGÉSIMA SÉTIMA',
  'TRIGÉSIMA OITAVA',
  'TRIGÉSIMA NONA',
  'QUADRAGÉSIMA',
];

const TITULO_POR_FINALIDADE: Record<string, string> = {
  RESIDENCIAL: 'CONTRATO DE LOCAÇÃO DE IMÓVEL PARA FINS RESIDENCIAIS',
  NAO_RESIDENCIAL: 'CONTRATO DE LOCAÇÃO DE IMÓVEL PARA FINS NÃO RESIDENCIAIS',
  TEMPORADA: 'CONTRATO DE LOCAÇÃO DE IMÓVEL POR TEMPORADA',
};

const ordinal = (indice: number): string => ORDINAIS[indice] ?? `${indice + 1}ª`;

function rotuloParagrafo(indice: number, total: number): string {
  if (total === 1) {
    return 'Parágrafo único.';
  }

  return `§ ${indice + 1}º.`;
}

function bloco(partes: ParteQualificada[], rotuloSingular: string, rotuloPlural: string): string {
  if (partes.length === 0) {
    return '';
  }

  const rotulo = partes.length > 1 ? rotuloPlural : rotuloSingular;

  const linhas = partes
    .map(
      (parte) =>
        `<p class="parte"><strong>${escaparHtml(parte.nome)}</strong>, ${escaparHtml(parte.qualificacao)}</p>`,
    )
    .join('');

  return `<div class="grupo-partes"><p class="rotulo-parte">${escaparHtml(rotulo)}</p>${linhas}</div>`;
}

function renderizarClausula(clausula: Clausula, ctx: ContextoMinuta, indice: number): string {
  const paragrafos = clausula.paragrafos?.(ctx).filter((texto) => texto.trim() !== '') ?? [];

  const corpo = paragrafos
    .map(
      (texto, posicao) =>
        `<p class="paragrafo"><strong>${escaparHtml(rotuloParagrafo(posicao, paragrafos.length))}</strong> ${escaparHtml(capitalizar(texto))}</p>`,
    )
    .join('');

  const rodape = clausula.baseLegal
    ? `<p class="base-legal">${escaparHtml(clausula.baseLegal)}</p>`
    : '';

  return (
    `<section class="clausula" data-clausula="${escaparHtml(clausula.id)}">` +
    `<p class="caput"><strong>CLÁUSULA ${escaparHtml(ordinal(indice))}. ${escaparHtml(clausula.titulo.toUpperCase())}.</strong> ${escaparHtml(capitalizar(clausula.caput(ctx)))}</p>` +
    corpo +
    rodape +
    `</section>`
  );
}

function linhaAssinatura(parte: ParteQualificada, papel: string): string {
  return (
    `<div class="assinatura">` +
    `<span class="linha"></span>` +
    `<p class="nome">${escaparHtml(parte.nome)}</p>` +
    `<p class="papel">${escaparHtml(papel)}${parte.documento ? ` · ${escaparHtml(parte.documento)}` : ''}</p>` +
    `</div>`
  );
}

function assinaturas(ctx: ContextoMinuta): string {
  const blocos = [
    ...ctx.locadores.map((parte) => linhaAssinatura(parte, 'LOCADOR')),
    ...ctx.locatarios.map((parte) => linhaAssinatura(parte, 'LOCATÁRIO')),
    ...ctx.fiadores.map((parte) => linhaAssinatura(parte, 'FIADOR')),
    ...ctx.anuentes.map((parte) => linhaAssinatura(parte, 'ANUENTE')),
  ].join('');

  const testemunhas =
    ctx.testemunhas.length > 0
      ? ctx.testemunhas.map((parte) => linhaAssinatura(parte, 'TESTEMUNHA')).join('')
      : `<div class="assinatura"><span class="linha"></span><p class="nome">&nbsp;</p><p class="papel">TESTEMUNHA · CPF</p></div>`.repeat(
          2,
        );

  return (
    `<section class="assinaturas">` +
    `<p class="fecho">E por estarem assim justas e contratadas, as partes assinam o presente instrumento, ` +
    `juntamente com as testemunhas abaixo, para que produza seus jurídicos e legais efeitos.</p>` +
    `<p class="local-data">${escaparHtml(`${ctx.imovel.cidade || ctx.foro}, ${dataExtenso(ctx.emitidaEm)}.`)}</p>` +
    `<div class="grade-assinaturas">${blocos}</div>` +
    `<p class="rotulo-testemunhas">Testemunhas</p>` +
    `<div class="grade-assinaturas">${testemunhas}</div>` +
    `</section>`
  );
}

function preambulo(ctx: ContextoMinuta): string {
  const resumo = [
    `Imóvel: ${ctx.imovel.endereco}, ${ctx.imovel.cidade}/${ctx.imovel.uf}`,
    `Prazo: ${dataExtenso(ctx.dataInicio)} a ${dataExtenso(ctx.dataFim)}`,
    `Aluguel mensal: ${moeda(ctx.valorAluguel)}, vencimento todo dia ${ctx.diaVencimento}`,
    ctx.encargos.length > 0
      ? `Encargos mensais: ${lista(ctx.encargos.map((item) => `${item.descricao} (${moeda(item.valor)})`))}`
      : null,
  ].filter(Boolean) as string[];

  return (
    `<section class="preambulo">` +
    bloco(ctx.locadores, 'LOCADOR', 'LOCADORES') +
    bloco(ctx.locatarios, 'LOCATÁRIO', 'LOCATÁRIOS') +
    bloco(ctx.fiadores, 'FIADOR', 'FIADORES') +
    bloco(ctx.anuentes, 'ANUENTE', 'ANUENTES') +
    `<p class="intro">As partes acima qualificadas têm entre si justo e contratado o presente ` +
    `contrato de locação, que se regerá pela Lei 8.245/91 e pelas cláusulas seguintes.</p>` +
    `<div class="resumo"><p class="rotulo-resumo">Resumo do contrato</p><ul>` +
    resumo.map((linha) => `<li>${escaparHtml(linha)}</li>`).join('') +
    `</ul></div>` +
    `</section>`
  );
}

export type DocumentoRenderizado = {
  html: string;
  clausulas: { id: string; versao: number; titulo: string }[];
  nivelProtecao: number;
};

/** Fragmento HTML. O CSS de impressao vive no web, junto do preview. */
export function renderizarDocumento(ctx: ContextoMinuta): DocumentoRenderizado {
  const clausulas = selecionarClausulas(ctx);

  const corpo = clausulas
    .map((clausula, indice) => renderizarClausula(clausula, ctx, indice))
    .join('');

  const html =
    `<article class="contrato">` +
    `<h1>${escaparHtml(TITULO_POR_FINALIDADE[ctx.finalidade] as string)}</h1>` +
    preambulo(ctx) +
    `<section class="corpo">${corpo}</section>` +
    assinaturas(ctx) +
    `</article>`;

  return {
    html,
    clausulas: clausulas.map((clausula) => ({
      id: clausula.id,
      versao: clausula.versao,
      titulo: clausula.titulo,
    })),
    nivelProtecao: clausulas.reduce((total, clausula) => total + (clausula.nivelProtecao ?? 0), 0),
  };
}
