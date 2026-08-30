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
    versao: 2,
    titulo: 'Da garantia locatícia: caução em dinheiro',
    grupo: 'GARANTIA',
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, arts. 37, I e parágrafo único, 38 e 39',
    incompativelCom: semAsPropria('GARANTIA_CAUCAO'),
    condicao: (ctx) => ctx.tipoGarantia === 'CAUCAO',
    caput: (ctx) => {
      const valor = ctx.valorGarantia ?? 0;
      const proporcao =
        ctx.valorAluguel > 0 ? (valor / ctx.valorAluguel).toFixed(1).replace('.', ',') : null;

      return `Em garantia das obrigações assumidas neste contrato, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'deposita', 'depositam')} a quantia de ${moeda(valor)} (${moedaPorExtenso(valor)}), a título de caução em dinheiro${proporcao ? `, correspondente a ${proporcao} aluguéis mensais` : ''}, observado o limite de 3 (três) aluguéis previsto no artigo 38, § 2º, da Lei 8.245/91.`;
    },
    paragrafos: (ctx) => [
      `A caução será depositada em caderneta de poupança e reverterá em favor ${doLocatario(ctx)} ao final da locação, com os rendimentos do período, na forma do artigo 38, § 2º, da Lei 8.245/91.`,
      `A restituição ocorrerá em até 30 (trinta) dias contados da devolução das chaves e da conclusão do termo de vistoria de saída, autorizada a compensação de aluguéis, encargos, multas, contas de consumo e do custo dos reparos de responsabilidade ${doLocatario(ctx)}, desde que discriminados por escrito e acompanhados dos respectivos orçamentos ou comprovantes.`,
      `A caução não substitui o pagamento pontual dos aluguéis e encargos, sendo vedado ${aoLocatario(ctx)} pretender imputá-la a débitos no curso da locação.`,
      `A garantia estende-se até a efetiva devolução do IMÓVEL, ainda que prorrogada a locação por prazo indeterminado, nos termos do artigo 39 da Lei 8.245/91, e é a única modalidade de garantia pactuada, sendo vedada a cumulação com qualquer outra, sob pena de nulidade (artigo 37, parágrafo único, da mesma lei).`,
    ],
  },
  {
    id: 'GARANTIA_FIADOR',
    versao: 2,
    titulo: 'Da garantia locatícia: fiança',
    grupo: 'GARANTIA',
    nivelProtecao: 3,
    baseLegal:
      'Lei 8.245/91, arts. 37, II e parágrafo único, 39 e 40; CC, arts. 818, 819, 827, 828 e 836; Lei 8.009/90, art. 3º, VII; Súmulas 214, 549 e 656 do STJ',
    incompativelCom: semAsPropria('GARANTIA_FIADOR'),
    condicao: (ctx) => ctx.tipoGarantia === 'FIADOR',
    caput: (ctx) => {
      const varios = ctx.fiadores.length > 1;

      return `${varios ? 'Os FIADORES' : 'O FIADOR'} qualificado${varios ? 's' : ''} no preâmbulo ${verbo(ctx.fiadores, 'assume', 'assumem')} a condição de fiador${varios ? 'es' : ''} e principal pagador${varios ? 'es' : ''}, solidariamente responsáve${varios ? 'is' : 'l'} com ${oLocatario(ctx)} por todas as obrigações deste contrato, com expressa renúncia ao benefício de ordem previsto nos artigos 827 e 828 do Código Civil.`;
    },
    paragrafos: (ctx) => {
      const varios = ctx.fiadores.length > 1;
      const itens: string[] = [
        `A fiança abrange aluguéis, encargos, multas, juros, correção monetária, tributos, contas de consumo, custos de reparação do IMÓVEL, custas processuais e honorários advocatícios, e, por expressa disposição desta cláusula, prorroga-se automaticamente e vigora até a efetiva devolução das chaves, ainda que a locação se prorrogue por prazo indeterminado, nos termos do artigo 39 da Lei 8.245/91 e da Súmula 656 do Superior Tribunal de Justiça.`,
        `A fiança não admite interpretação extensiva (Código Civil, artigo 819). Qualquer aditivo, novação, prorrogação por prazo determinado ou alteração do valor do aluguel que não decorra do reajuste aqui pactuado somente vinculará ${varios ? 'os FIADORES' : 'o FIADOR'} se por ${varios ? 'eles' : 'ele'} expressamente subscrito, na forma da Súmula 214 do Superior Tribunal de Justiça.`,
        `${varios ? 'Os FIADORES declaram' : 'O FIADOR declara'} ciência de que o bem de família de propriedade do fiador de locação é passível de penhora, conforme o artigo 3º, VII, da Lei 8.009/90, a Súmula 549 do Superior Tribunal de Justiça e o Tema 1.127 de repercussão geral do Supremo Tribunal Federal, que estendeu a penhorabilidade também à fiança prestada em locação não residencial.`,
        `Prorrogada a locação por prazo indeterminado, ${varios ? 'os FIADORES poderão' : 'o FIADOR poderá'} exonerar-se da obrigação mediante notificação resilitória ${aoLocador(ctx)}, ficando responsáve${varios ? 'is' : 'l'} por todos os efeitos da fiança durante 120 (cento e vinte) dias após a notificação, na forma do artigo 40, X e parágrafo único, da Lei 8.245/91, direito que não pode ser suprimido por este contrato.`,
        `Ocorrendo morte, insolvência, falência, recuperação judicial, exoneração, alienação de todos os bens imóveis ou mudança de domicílio do fiador, ${oLocatario(ctx)} deverá indicar novo fiador idôneo ou garantia substitutiva em até 30 (trinta) dias contados da notificação, sob pena de rescisão e despejo, na forma dos artigos 40 e 63 da Lei 8.245/91. As partes registram que, falecendo o fiador, o espólio e os herdeiros respondem apenas pelas dívidas vencidas até a data do óbito, até os limites da herança, na forma do artigo 836 do Código Civil.`,
      ];

      const casados = ctx.fiadores.filter((fiador) => fiador.casado);

      if (casados.length > 0) {
        itens.push(
          `A fiança é prestada com a expressa anuência do cônjuge de ${lista(casados.map((fiador) => fiador.nome))}, que comparece a este instrumento na qualidade de anuente e o subscreve, atendendo ao artigo 1.647, III, do Código Civil e à Súmula 332 do Superior Tribunal de Justiça, segundo a qual a fiança prestada sem a outorga do cônjuge é integralmente ineficaz.`,
        );
      } else {
        itens.push(
          `${varios ? 'Os FIADORES declaram' : 'O FIADOR declara'} não ser casado${varios ? 's' : ''} nem conviver em união estável, respondendo pela veracidade da declaração e por eventual ineficácia da fiança a que der causa.`,
        );
      }

      return itens;
    },
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
    versao: 2,
    titulo: 'Da ausência de garantia',
    grupo: 'GARANTIA',
    nivelProtecao: 0,
    baseLegal: 'Lei 8.245/91, arts. 20 e 42',
    incompativelCom: semAsPropria('SEM_GARANTIA'),
    condicao: (ctx) => ctx.tipoGarantia === 'NENHUMA',
    caput: (ctx) =>
      `A presente locação é celebrada sem qualquer das garantias do artigo 37 da Lei 8.245/91, razão pela qual o aluguel e os encargos são pagos antecipadamente, na data ajustada na cláusula do aluguel, observado o limite do sexto dia útil do mês vincendo previsto no artigo 42 da mesma lei.`,
    paragrafos: (ctx) => [
      `A exigência de garantia em momento posterior depende de aditivo escrito, ficando ${oLocador(ctx)} ciente de que, sem garantia, a mora autoriza desde logo a ação de despejo por falta de pagamento, inclusive com pedido liminar de desocupação, na forma do artigo 59, § 1º, IX, da Lei 8.245/91.`,
      `Para a liminar prevista no parágrafo anterior, a lei exige caução equivalente a 3 (três) meses de aluguel, admitindo-se, conforme o caso, que o próprio crédito locatício já vencido seja aceito como caução quando superar esse valor. A mora no pagamento do aluguel é automática, nos termos do artigo 397 do Código Civil, dispensada notificação prévia para caracterizá-la.`,
    ],
  },
];

export const CLAUSULAS_SOLIDARIEDADE: Clausula[] = [
  {
    id: 'SOLIDARIEDADE_LOCATARIOS',
    versao: 2,
    titulo: 'Da solidariedade entre os locatários',
    grupo: 'SOLIDARIEDADE',
    nivelProtecao: 3,
    baseLegal: 'Lei 8.245/91, arts. 2º e 12; CC, arts. 264, 265 e 275',
    condicao: (ctx) => ctx.locatarios.length > 1 && ctx.respostas.clausulaSolidariedade,
    caput: (ctx) =>
      `Os LOCATÁRIOS respondem solidariamente por todas as obrigações decorrentes deste contrato, na forma do artigo 2º da Lei 8.245/91 e dos artigos 264 e seguintes do Código Civil, podendo ${oLocador(ctx)} exigir de qualquer deles, isolada ou conjuntamente, o cumprimento integral da dívida.`,
    paragrafos: (ctx) => [
      `A notificação, interpelação ou citação dirigida a qualquer dos LOCATÁRIOS produz efeitos em relação a todos, e o pagamento efetuado por um aproveita aos demais somente até o montante efetivamente pago.`,
      `A saída de qualquer dos LOCATÁRIOS do IMÓVEL não o exonera das obrigações contratuais, salvo mediante aditivo escrito com a expressa concordância ${doLocador(ctx)} e apresentação de garantia substitutiva.`,
      `Na hipótese de separação de fato, separação judicial, divórcio ou dissolução de união estável, a locação prosseguirá automaticamente com o LOCATÁRIO que permanecer no IMÓVEL, nos termos do artigo 12 da Lei 8.245/91, obrigando-se as partes a comunicar o fato por escrito ${aoLocador(ctx)} e ao fiador no prazo de 30 (trinta) dias, com a indicação de nova garantia no mesmo prazo.`,
      `Recebida a comunicação prevista no parágrafo anterior, o fiador poderá exonerar-se de suas obrigações no prazo de 30 (trinta) dias contados do recebimento, ficando responsável pelos efeitos da fiança durante 120 (cento e vinte) dias após a notificação ${aoLocador(ctx)}, na forma do artigo 12, §§ 1º e 2º, da Lei 8.245/91.`,
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
