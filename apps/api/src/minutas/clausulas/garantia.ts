import {
  aoLocador,
  aoLocatario,
  doLocador,
  doLocatario,
  lista,
  moeda,
  oLocador,
  oLocatario,
  verbo,
} from '../contexto';
import { moedaPorExtenso } from '../extenso';
import type { Clausula } from './tipos';

const OUTRAS_GARANTIAS = [
  'GARANTIA_CAUCAO',
  'GARANTIA_FIADOR',
  'GARANTIA_SEGURO_FIANCA',
  'GARANTIA_TITULO_CAPITALIZACAO',
  'SEM_GARANTIA',
];

const semAsPropria = (id: string): string[] => OUTRAS_GARANTIAS.filter((item) => item !== id);

export const CLAUSULAS_GARANTIA: Clausula[] = [
  {
    id: 'GARANTIA_CAUCAO',
    versao: 1,
    titulo: 'Da garantia locatícia: caução em dinheiro',
    grupo: 'GARANTIA',
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, arts. 37, I, 38 e 39',
    incompativelCom: semAsPropria('GARANTIA_CAUCAO'),
    condicao: (ctx) => ctx.tipoGarantia === 'CAUCAO',
    caput: (ctx) =>
      `Em garantia das obrigações assumidas neste contrato, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'deposita', 'depositam')} a quantia de ${moeda(ctx.valorGarantia ?? 0)} (${moedaPorExtenso(ctx.valorGarantia ?? 0)}), a título de caução em dinheiro, correspondente a ${((ctx.valorGarantia ?? 0) / ctx.valorAluguel).toFixed(1).replace('.', ',')} aluguéis mensais.`,
    paragrafos: (ctx) => [
      `A caução será depositada em caderneta de poupança e reverterá em favor ${doLocatario(ctx)} ao final da locação, com os rendimentos do período, na forma do artigo 38, §2º, da Lei 8.245/91.`,
      `A restituição ocorrerá em até 30 (trinta) dias contados da devolução das chaves e da aprovação do termo de vistoria de saída, autorizada a compensação de aluguéis, encargos, multas, contas de consumo e do custo dos reparos de responsabilidade ${doLocatario(ctx)}.`,
      `A caução não substitui o pagamento pontual dos aluguéis e encargos, sendo vedado ${aoLocatario(ctx)} pretender imputá-la a débitos no curso da locação.`,
      `A garantia estende-se até a efetiva devolução do IMÓVEL, ainda que prorrogada a locação por prazo indeterminado, nos termos do artigo 39 da Lei 8.245/91.`,
    ],
  },
  {
    id: 'GARANTIA_FIADOR',
    versao: 1,
    titulo: 'Da garantia locatícia: fiança',
    grupo: 'GARANTIA',
    nivelProtecao: 3,
    baseLegal: 'Lei 8.245/91, arts. 37, II, 39 e 40; CC, arts. 818 e 828',
    incompativelCom: semAsPropria('GARANTIA_FIADOR'),
    condicao: (ctx) => ctx.tipoGarantia === 'FIADOR',
    caput: (ctx) =>
      `${ctx.fiadores.length > 1 ? 'Os FIADORES' : 'O FIADOR'} qualificado${ctx.fiadores.length > 1 ? 's' : ''} no preâmbulo ${verbo(ctx.fiadores, 'assume', 'assumem')} a condição de fiador${ctx.fiadores.length > 1 ? 'es' : ''} e principal pagador${ctx.fiadores.length > 1 ? 'es' : ''}, solidariamente responsável${ctx.fiadores.length > 1 ? 'is' : ''} com ${oLocatario(ctx)} por todas as obrigações deste contrato, com expressa renúncia ao benefício de ordem previsto nos artigos 827 e 828 do Código Civil.`,
    paragrafos: (ctx) => [
      `A fiança abrange aluguéis, encargos, multas, juros, correção monetária, tributos, contas de consumo, custos de reparação do IMÓVEL, custas processuais e honorários advocatícios, e vigora até a efetiva devolução das chaves, ainda que a locação se prorrogue por prazo indeterminado, nos termos do artigo 39 da Lei 8.245/91.`,
      `Os fiadores declaram ciência de que o bem de família de propriedade do fiador de locação é passível de penhora, conforme o artigo 3º, VII, da Lei 8.009/90 e a Súmula 549 do Superior Tribunal de Justiça.`,
      `Ocorrendo morte, insolvência, falência, recuperação judicial, exoneração, alienação de todos os bens imóveis ou mudança de domicílio do fiador, ${oLocatario(ctx)} deverá indicar novo fiador idôneo em até 30 (trinta) dias, sob pena de rescisão e despejo, na forma dos artigos 40 e 63 da Lei 8.245/91.`,
      `${ctx.fiadores.some((fiador) => fiador.casado) ? 'A fiança é prestada com a expressa anuência do cônjuge do fiador, que comparece a este instrumento na qualidade de anuente, atendendo ao artigo 1.647, III, do Código Civil e à Súmula 332 do Superior Tribunal de Justiça.' : 'O fiador declara não ser casado nem conviver em união estável, respondendo pela veracidade da declaração.'}`,
    ],
  },
  {
    id: 'GARANTIA_SEGURO_FIANCA',
    versao: 1,
    titulo: 'Da garantia locatícia: seguro fiança',
    grupo: 'GARANTIA',
    nivelProtecao: 3,
    baseLegal: 'Lei 8.245/91, art. 37, III',
    incompativelCom: semAsPropria('GARANTIA_SEGURO_FIANCA'),
    condicao: (ctx) => ctx.tipoGarantia === 'SEGURO_FIANCA',
    caput: (ctx) =>
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'contratará', 'contratarão')} e ${verbo(ctx.locatarios, 'manterá', 'manterão')} vigente, às suas expensas, apólice de seguro fiança locatícia em favor ${doLocador(ctx)}, com cobertura de aluguéis, encargos, multas, danos ao IMÓVEL e despesas processuais.`,
    paragrafos: (ctx) => [
      `A apólice será entregue ${aoLocador(ctx)} antes da entrega das chaves e renovada com antecedência mínima de 30 (trinta) dias do respectivo vencimento, mantida ininterruptamente até a devolução do IMÓVEL.`,
      `A não renovação ou o cancelamento da apólice constitui infração contratual grave e autoriza ${oLocador(ctx)} a exigir, no prazo de 15 (quinze) dias, garantia substitutiva em modalidade legalmente admitida, sob pena de rescisão.`,
    ],
  },
  {
    id: 'GARANTIA_TITULO_CAPITALIZACAO',
    versao: 1,
    titulo: 'Da garantia locatícia: título de capitalização',
    grupo: 'GARANTIA',
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, art. 37, IV',
    incompativelCom: semAsPropria('GARANTIA_TITULO_CAPITALIZACAO'),
    condicao: (ctx) => ctx.tipoGarantia === 'TITULO_CAPITALIZACAO',
    caput: (ctx) =>
      `Em garantia das obrigações deste contrato, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'apresenta', 'apresentam')} título de capitalização no valor de ${moeda(ctx.valorGarantia ?? 0)} (${moedaPorExtenso(ctx.valorGarantia ?? 0)}), com cessão fiduciária em favor ${doLocador(ctx)}.`,
    paragrafos: (ctx) => [
      `O resgate em favor ${doLocador(ctx)} poderá ser acionado para quitação de aluguéis, encargos, multas e reparos de responsabilidade ${doLocatario(ctx)}, apurado o saldo ao final da locação.`,
      `A garantia estende-se até a efetiva devolução do IMÓVEL, ainda que prorrogada a locação por prazo indeterminado.`,
    ],
  },
  {
    id: 'SEM_GARANTIA',
    versao: 1,
    titulo: 'Da ausência de garantia',
    grupo: 'GARANTIA',
    nivelProtecao: 0,
    baseLegal: 'Lei 8.245/91, arts. 20 e 42',
    incompativelCom: semAsPropria('SEM_GARANTIA'),
    condicao: (ctx) => ctx.tipoGarantia === 'NENHUMA',
    caput: (ctx) =>
      `A presente locação é celebrada sem garantia, hipótese em que ${oLocador(ctx)} fica autorizado a exigir o pagamento do aluguel e dos encargos até o sexto dia útil do mês vincendo, nos termos do artigo 42 da Lei 8.245/91.`,
  },
];

export const CLAUSULAS_SOLIDARIEDADE: Clausula[] = [
  {
    id: 'SOLIDARIEDADE_LOCATARIOS',
    versao: 1,
    titulo: 'Da solidariedade entre os locatários',
    grupo: 'SOLIDARIEDADE',
    nivelProtecao: 3,
    baseLegal: 'Lei 8.245/91, art. 2º; CC, arts. 264, 265 e 275',
    condicao: (ctx) => ctx.locatarios.length > 1 && ctx.respostas.clausulaSolidariedade,
    caput: (ctx) =>
      `Os LOCATÁRIOS respondem solidariamente por todas as obrigações decorrentes deste contrato, na forma do artigo 2º da Lei 8.245/91 e dos artigos 264 e seguintes do Código Civil, podendo ${oLocador(ctx)} exigir de qualquer deles, isolada ou conjuntamente, o cumprimento integral da dívida.`,
    paragrafos: (ctx) => [
      `A notificação, interpelação ou citação dirigida a qualquer dos LOCATÁRIOS produz efeitos em relação a todos, e o pagamento efetuado por um aproveita aos demais somente até o montante efetivamente pago.`,
      `A saída de qualquer dos LOCATÁRIOS do IMÓVEL não o exonera das obrigações contratuais, salvo mediante aditivo escrito com a expressa concordância ${doLocador(ctx)} e apresentação de garantia substitutiva.`,
      `Na hipótese de separação de fato, separação judicial, divórcio ou dissolução de união estável, a locação prosseguirá automaticamente com o LOCATÁRIO que permanecer no IMÓVEL, nos termos do artigo 12 da Lei 8.245/91, obrigando-se as partes a comunicar o fato ${aoLocador(ctx)} por escrito no prazo de 30 (trinta) dias.`,
    ],
  },
  {
    id: 'SOLIDARIEDADE_LOCADORES',
    versao: 1,
    titulo: 'Da pluralidade de locadores',
    grupo: 'SOLIDARIEDADE',
    baseLegal: 'Lei 8.245/91, art. 2º',
    condicao: (ctx) => ctx.locadores.length > 1,
    caput: (ctx) =>
      `Os LOCADORES são solidários entre si quanto às obrigações deste contrato, na forma do artigo 2º da Lei 8.245/91, e são coproprietários do IMÓVEL nas seguintes proporções: ${lista(
        ctx.locadores.map(
          (locador) =>
            `${locador.nome}, ${locador.participacao !== null ? `${locador.participacao.toString().replace('.', ',')}%` : 'quota não especificada'}`,
        ),
      )}.`,
    paragrafos: (ctx) => [
      `O pagamento do aluguel e dos encargos na forma indicada neste contrato quita a obrigação ${doLocatario(ctx)} perante todos os LOCADORES, cabendo a estes o rateio interno conforme as quotas acima.`,
      `Qualquer notificação enviada por um dos LOCADORES presume-se feita em nome de todos, e a comunicação recebida por um deles vincula os demais.`,
    ],
  },
];
