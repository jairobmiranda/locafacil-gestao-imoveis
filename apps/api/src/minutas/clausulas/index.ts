import type { AlertaMinuta } from '@locafacil/contracts';
import type { ContextoMinuta } from '../contexto';
import {
  CLAUSULAS_ALUGUEL,
  CLAUSULAS_ENCARGOS,
  CLAUSULAS_OBJETO,
  CLAUSULAS_PRAZO,
  CLAUSULAS_REAJUSTE,
} from './objeto-aluguel';
import { CLAUSULAS_GARANTIA, CLAUSULAS_SOLIDARIEDADE } from './garantia';
import {
  CLAUSULAS_CONSERVACAO,
  CLAUSULAS_FORO,
  CLAUSULAS_GERAIS,
  CLAUSULAS_PREFERENCIA,
  CLAUSULAS_RESCISAO,
  CLAUSULAS_USO,
  CLAUSULAS_VISTORIA,
} from './uso-rescisao';
import { ORDEM_GRUPOS, type Clausula } from './tipos';

export * from './tipos';

/** Sobe quando qualquer clausula muda. Fica gravado na minuta para auditoria. */
export const VERSAO_MODELO = 2;

export const BIBLIOTECA: Clausula[] = [
  ...CLAUSULAS_OBJETO,
  ...CLAUSULAS_PRAZO,
  ...CLAUSULAS_ALUGUEL,
  ...CLAUSULAS_REAJUSTE,
  ...CLAUSULAS_ENCARGOS,
  ...CLAUSULAS_GARANTIA,
  ...CLAUSULAS_SOLIDARIEDADE,
  ...CLAUSULAS_CONSERVACAO,
  ...CLAUSULAS_VISTORIA,
  ...CLAUSULAS_USO,
  ...CLAUSULAS_RESCISAO,
  ...CLAUSULAS_PREFERENCIA,
  ...CLAUSULAS_GERAIS,
  ...CLAUSULAS_FORO,
];

/** Nivel de protecao maximo alcancavel, usado para normalizar o medidor do wizard. */
export const PROTECAO_MAXIMA = BIBLIOTECA.reduce(
  (total, clausula) => total + (clausula.nivelProtecao ?? 0),
  0,
);

export function selecionarClausulas(contexto: ContextoMinuta): Clausula[] {
  const selecionadas = BIBLIOTECA.filter(
    (clausula) => clausula.obrigatoria || !clausula.condicao || clausula.condicao(contexto),
  );

  const escolhidos = new Set(selecionadas.map((clausula) => clausula.id));
  const conflitantes = new Set<string>();

  for (const clausula of selecionadas) {
    for (const outro of clausula.incompativelCom ?? []) {
      if (escolhidos.has(outro)) {
        conflitantes.add(outro);
        conflitantes.add(clausula.id);
      }
    }
  }

  if (conflitantes.size > 0) {
    throw new Error(
      `Cláusulas incompatíveis selecionadas ao mesmo tempo: ${[...conflitantes].join(', ')}`,
    );
  }

  return selecionadas.sort(
    (a, b) =>
      ORDEM_GRUPOS.indexOf(a.grupo) - ORDEM_GRUPOS.indexOf(b.grupo) ||
      BIBLIOTECA.indexOf(a) - BIBLIOTECA.indexOf(b),
  );
}

const alerta = (
  severidade: AlertaMinuta['severidade'],
  mensagem: string,
  clausulaId?: string,
): AlertaMinuta => ({ severidade, mensagem, ...(clausulaId ? { clausulaId } : {}) });

/**
 * Regras de risco juridico. BLOQUEIO impede gerar a minuta; os demais so avisam.
 */
export function avaliarRiscos(ctx: ContextoMinuta): AlertaMinuta[] {
  const alertas: AlertaMinuta[] = [];

  if (ctx.locadores.length === 0) {
    alertas.push(alerta('BLOQUEIO', 'Informe ao menos um locador.'));
  }

  if (ctx.locatarios.length === 0) {
    alertas.push(alerta('BLOQUEIO', 'Informe ao menos um locatário.'));
  }

  const semQualificacao = [...ctx.locadores, ...ctx.locatarios, ...ctx.fiadores].filter(
    (parte) => !parte.documento,
  );

  if (semQualificacao.length > 0) {
    alertas.push(
      alerta(
        'BLOQUEIO',
        `Cadastre o CPF ou CNPJ de: ${semQualificacao.map((parte) => parte.nome).join(', ')}.`,
      ),
    );
  }

  if (ctx.tipoGarantia === 'FIADOR') {
    if (ctx.fiadores.length === 0) {
      alertas.push(
        alerta('BLOQUEIO', 'A garantia escolhida é fiança, mas nenhum fiador foi informado.'),
      );
    }

    const fiadoresCasados = ctx.fiadores.filter((fiador) => fiador.casado);

    if (fiadoresCasados.length > ctx.anuentes.length) {
      alertas.push(
        alerta(
          'BLOQUEIO',
          'Fiador casado exige a anuência do cônjuge. Sem a outorga, a fiança é integralmente ineficaz (CC, art. 1.647, III e Súmula 332 do STJ). Cadastre o cônjuge como parte anuente.',
          'GARANTIA_FIADOR',
        ),
      );
    }
  }

  if (ctx.tipoGarantia === 'CAUCAO') {
    const valor = ctx.valorGarantia ?? 0;

    if (valor <= 0) {
      alertas.push(alerta('BLOQUEIO', 'Informe o valor da caução.', 'GARANTIA_CAUCAO'));
    } else if (valor > ctx.valorAluguel * 3) {
      alertas.push(
        alerta(
          'BLOQUEIO',
          'A caução em dinheiro não pode exceder 3 aluguéis (Lei 8.245/91, art. 38, §2º).',
          'GARANTIA_CAUCAO',
        ),
      );
    }
  }

  if (ctx.prazoMeses >= 120) {
    const casados = ctx.locadores.filter((locador) => locador.casado);

    if (casados.length > 0 && ctx.anuentes.length === 0) {
      alertas.push(
        alerta(
          'ATENCAO',
          'Locação por 10 anos ou mais depende de vênia conjugal do locador (Lei 8.245/91, art. 3º). Inclua o cônjuge como anuente.',
          'PRAZO',
        ),
      );
    }
  }

  if (ctx.finalidade === 'RESIDENCIAL' && ctx.prazoMeses > 0 && ctx.prazoMeses < 30) {
    alertas.push(
      alerta(
        'ATENCAO',
        'Prazo inferior a 30 meses: findo o contrato a locação se prorroga automaticamente e a retomada fica restrita às hipóteses do art. 47 da Lei 8.245/91.',
        'PRAZO',
      ),
    );
  }

  if (ctx.finalidade === 'TEMPORADA' && ctx.prazoMeses > 3) {
    alertas.push(
      alerta(
        'BLOQUEIO',
        'Locação por temporada não pode exceder 90 dias (Lei 8.245/91, art. 48). Acima disso o contrato é tratado como locação comum e o aluguel antecipado se torna indevido.',
        'PRAZO',
      ),
    );
  }

  if (ctx.finalidade === 'NAO_RESIDENCIAL' && ctx.prazoMeses >= 60) {
    alertas.push(
      alerta(
        'INFO',
        'Locação não residencial com 5 anos ou mais: o locatário passa a ter direito à renovação compulsória (Lei 8.245/91, art. 51), o que dificulta a retomada ao final do prazo.',
        'PRAZO',
      ),
    );
  }

  if (ctx.tipoGarantia === 'NENHUMA' && ctx.diaVencimento > 6) {
    alertas.push(
      alerta(
        'ATENCAO',
        `Sem garantia, o aluguel é antecipado e só pode ser exigido até o sexto dia útil do mês vincendo (art. 42). O vencimento no dia ${ctx.diaVencimento} pode extrapolar esse limite.`,
        'SEM_GARANTIA',
      ),
    );
  }

  if (ctx.respostas.multaRescisoriaAlugueis > 3) {
    alertas.push(
      alerta(
        'ATENCAO',
        'Multa compensatória acima de 3 aluguéis costuma ser reduzida judicialmente por abusividade. Considere manter até 3.',
        'RESCISAO_ANTECIPADA',
      ),
    );
  }

  if (ctx.percentualMulta > 10) {
    alertas.push(
      alerta('ATENCAO', 'Multa moratória acima de 10% tende a ser considerada abusiva.', 'MORA'),
    );
  }

  if (ctx.percentualJurosDia > 0.0334) {
    alertas.push(
      alerta(
        'ATENCAO',
        'Juros de mora acima de 1% ao mês (0,0333% ao dia) extrapolam o limite do art. 406 do Código Civil.',
        'MORA',
      ),
    );
  }

  if (ctx.descontoPontualidade > 0 && ctx.descontoPontualidade > ctx.valorAluguel * 0.1) {
    alertas.push(
      alerta(
        'ATENCAO',
        'Desconto de pontualidade acima de 10% do aluguel costuma ser requalificado como multa moratória disfarçada, com redução ao teto de 10% e devolução da diferença.',
        'DESCONTO_PONTUALIDADE',
      ),
    );
  }

  if (ctx.intervaloReajusteMeses < 12 && ctx.indiceReajuste !== 'NENHUM') {
    alertas.push(
      alerta(
        'BLOQUEIO',
        'É nula a cláusula de reajuste com periodicidade inferior a um ano (Lei 10.192/2001, art. 2º, §1º).',
        'REAJUSTE',
      ),
    );
  }

  if (ctx.locadores.length > 1) {
    const soma = ctx.locadores.reduce((total, locador) => total + (locador.participacao ?? 0), 0);

    if (Math.abs(soma - 100) > 0.01) {
      alertas.push(
        alerta(
          'ATENCAO',
          `A soma das participações dos locadores é ${soma.toFixed(2)}%, e deveria fechar 100%.`,
          'SOLIDARIEDADE_LOCADORES',
        ),
      );
    }
  }

  if (ctx.locatarios.length > 1 && !ctx.respostas.clausulaSolidariedade) {
    alertas.push(
      alerta(
        'ATENCAO',
        'Sem a cláusula expressa de solidariedade a cobrança fica mais frágil, ainda que o art. 2º da Lei 8.245/91 a presuma.',
        'SOLIDARIEDADE_LOCATARIOS',
      ),
    );
  }

  if (ctx.respostas.duasTestemunhas && ctx.testemunhas.length < 2) {
    alertas.push(
      alerta(
        'ATENCAO',
        'Você optou por incluir duas testemunhas, mas nenhuma dupla foi cadastrada. O contrato de locação já é título executivo pelo art. 784, VIII, do CPC, ainda assim as testemunhas reforçam a prova em juízo.',
        'TITULO_EXECUTIVO',
      ),
    );
  }

  const foro = ctx.foro.trim().toLowerCase();
  const cidadeImovel = ctx.imovel.cidade.trim().toLowerCase();
  const domicilios = [...ctx.locadores, ...ctx.locatarios].map((parte) =>
    parte.qualificacao.toLowerCase(),
  );

  if (
    foro.length > 0 &&
    !foro.includes(cidadeImovel) &&
    !domicilios.some((qualificacao) => qualificacao.includes(foro))
  ) {
    alertas.push(
      alerta(
        'ATENCAO',
        `O foro eleito (${ctx.foro}) não coincide com a comarca do imóvel (${ctx.imovel.cidade}) nem com o domicílio das partes. Desde a Lei 14.879/2024 a eleição sem pertinência pode ser declarada abusiva de ofício (CPC, art. 63, § 5º).`,
        'FORO',
      ),
    );
  }

  if (!ctx.respostas.exigirVistoriaEntrada) {
    alertas.push(
      alerta(
        'ATENCAO',
        'Sem vistoria de entrada, cobrar danos na saída fica praticamente inviável.',
        'VISTORIA_ENTRADA',
      ),
    );
  }

  if (ctx.respostas.comunicacoesEletronicas) {
    alertas.push(
      alerta(
        'INFO',
        'Notificação por e-mail ou WhatsApp só vale se houver prova do recebimento. O TJGO já negou liminar de despejo por falta dessa comprovação: guarde o comprovante de entrega ou use aviso de recebimento nas notificações premonitórias.',
        'COMUNICACOES_ELETRONICAS',
      ),
    );
  }

  return alertas;
}
