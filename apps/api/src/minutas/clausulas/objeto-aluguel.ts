import {
  aoLocador,
  aoLocatario,
  dataExtenso,
  doLocador,
  lista,
  moeda,
  numero,
  oLocador,
  oLocatario,
  plural,
  verbo,
} from '../contexto';
import { inteiroPorExtenso, moedaPorExtenso } from '../extenso';
import type { Clausula } from './tipos';

const FINALIDADE_TEXTO: Record<string, string> = {
  RESIDENCIAL: 'exclusivamente residencial',
  NAO_RESIDENCIAL: 'exclusivamente não residencial, para o exercício de atividade comercial',
  TEMPORADA: 'residencial por temporada, nos termos dos artigos 48 a 50 da Lei 8.245/91',
};

export const CLAUSULAS_OBJETO: Clausula[] = [
  {
    id: 'OBJETO_LOCACAO',
    versao: 1,
    titulo: 'Do objeto',
    grupo: 'OBJETO',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, art. 1º',
    caput: (ctx) =>
      `${oLocador(ctx)} ${verbo(ctx.locadores, 'dá', 'dão')} em locação ${aoLocatario(ctx)} o imóvel ${ctx.imovel.tipo.toLowerCase()} situado na ${ctx.imovel.endereco}, ${ctx.imovel.cidade}/${ctx.imovel.uf}${ctx.imovel.matricula ? `, objeto da matrícula nº ${ctx.imovel.matricula}` : ''}${ctx.imovel.inscricaoMunicipal ? `, inscrição municipal nº ${ctx.imovel.inscricaoMunicipal}` : ''}, doravante denominado simplesmente IMÓVEL.`,
    paragrafos: (ctx) => {
      const itens: string[] = [];

      const caracteristicas = [
        ctx.imovel.areaConstruida ? `área construída de ${ctx.imovel.areaConstruida} m²` : null,
        ctx.imovel.quartos
          ? `${inteiroPorExtenso(ctx.imovel.quartos)} ${plural(ctx.imovel.quartos, 'dormitório', 'dormitórios')}`
          : null,
        ctx.imovel.vagas
          ? `${inteiroPorExtenso(ctx.imovel.vagas)} ${plural(ctx.imovel.vagas, 'vaga de garagem', 'vagas de garagem')}`
          : null,
      ].filter(Boolean) as string[];

      if (caracteristicas.length > 0) {
        itens.push(`O IMÓVEL possui ${lista(caracteristicas)}.`);
      }

      itens.push(
        `O IMÓVEL é entregue em perfeitas condições de uso, habitabilidade, higiene e segurança, com todas as instalações elétricas, hidráulicas e sanitárias em pleno funcionamento, conforme atestado no termo de vistoria de entrada.`,
      );

      return itens;
    },
  },
  {
    id: 'DESTINACAO',
    versao: 1,
    titulo: 'Da destinação',
    grupo: 'OBJETO',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, art. 23, II',
    nivelProtecao: 1,
    caput: (ctx) =>
      `O IMÓVEL destina-se ao uso ${FINALIDADE_TEXTO[ctx.finalidade] as string}, sendo vedada sua utilização para fim diverso.`,
    paragrafos: (ctx) =>
      ctx.respostas.vedarMudancaDestinacao
        ? [
            `A alteração da destinação, ainda que parcial ou temporária, sem prévia e expressa autorização escrita ${doLocador(ctx)}, constitui infração contratual grave e autoriza a rescisão imediata deste contrato, com a aplicação da multa prevista na cláusula de rescisão, sem prejuízo da ação de despejo.`,
          ]
        : [],
  },
];

export const CLAUSULAS_PRAZO: Clausula[] = [
  {
    id: 'PRAZO',
    versao: 1,
    titulo: 'Do prazo',
    grupo: 'PRAZO',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, arts. 3º, 46 e 47',
    caput: (ctx) =>
      `A locação é ajustada pelo prazo de ${inteiroPorExtenso(ctx.prazoMeses)} (${ctx.prazoMeses}) meses, com início em ${dataExtenso(ctx.dataInicio)} e término em ${dataExtenso(ctx.dataFim)}, independentemente de aviso, notificação ou interpelação judicial ou extrajudicial.`,
    paragrafos: (ctx) => {
      const itens: string[] = [];

      if (ctx.prazoMeses >= 30 && ctx.finalidade === 'RESIDENCIAL') {
        itens.push(
          `Findo o prazo ajustado, a locação termina de pleno direito, na forma do artigo 46 da Lei 8.245/91, devendo o IMÓVEL ser restituído ${aoLocador(ctx)} nas mesmas condições em que foi recebido.`,
        );
      } else {
        itens.push(
          `Findo o prazo ajustado sem oposição ${doLocador(ctx)}, a locação prorroga-se por prazo indeterminado, mantidas as demais condições deste contrato, podendo ser retomada nas hipóteses do artigo 47 da Lei 8.245/91.`,
        );
      }

      itens.push(
        `Prorrogada a locação por prazo indeterminado, ${oLocador(ctx)} ${verbo(ctx.locadores, 'poderá', 'poderão')} denunciá-la mediante aviso por escrito com antecedência mínima de 30 (trinta) dias, e ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'poderá', 'poderão')} devolver o IMÓVEL a qualquer tempo, observado o mesmo aviso prévio, na forma do artigo 6º da Lei 8.245/91.`,
      );

      return itens;
    },
  },
];

export const CLAUSULAS_ALUGUEL: Clausula[] = [
  {
    id: 'ALUGUEL',
    versao: 1,
    titulo: 'Do aluguel e da forma de pagamento',
    grupo: 'ALUGUEL',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, arts. 17 e 20',
    caput: (ctx) =>
      `O aluguel mensal é de ${moeda(ctx.valorAluguel)} (${moedaPorExtenso(ctx.valorAluguel)}), a ser pago até o dia ${ctx.diaVencimento} de cada mês, referente ao mês imediatamente anterior.`,
    paragrafos: (ctx) => {
      const itens: string[] = [];

      itens.push(
        ctx.chavePix
          ? `O pagamento será feito por transferência via Pix para a chave ${ctx.chavePix.chave}, de titularidade de ${ctx.chavePix.titular}, valendo o comprovante de transação como recibo de quitação.`
          : `O pagamento será feito na forma indicada ${doLocador(ctx)} por escrito, valendo o comprovante bancário como recibo de quitação.`,
      );

      itens.push(
        `Recaindo o vencimento em sábado, domingo ou feriado bancário, o pagamento poderá ser realizado no primeiro dia útil subsequente, sem qualquer acréscimo.`,
      );

      itens.push(
        `O recebimento de aluguéis ou encargos em atraso, ou o recebimento parcial, constitui mera tolerância e não implica novação, renúncia de direitos ou alteração das condições aqui pactuadas.`,
      );

      return itens;
    },
  },
  {
    id: 'MORA',
    versao: 1,
    titulo: 'Da mora',
    grupo: 'ALUGUEL',
    obrigatoria: true,
    nivelProtecao: 2,
    caput: (ctx) =>
      `O atraso no pagamento do aluguel ou dos encargos sujeita ${oLocatario(ctx)}, independentemente de notificação, à multa moratória de ${numero(ctx.percentualMulta)}% (${inteiroPorExtenso(ctx.percentualMulta)} por cento) sobre o valor devido, acrescida de juros de mora de ${numero(ctx.percentualJurosDia)}% ao dia e de correção monetária, calculados desde a data do vencimento até a data do efetivo pagamento.`,
    paragrafos: (ctx) => [
      `O inadimplemento por prazo superior a 30 (trinta) dias autoriza ${oLocador(ctx)} a promover a ação de despejo por falta de pagamento cumulada com cobrança, nos termos do artigo 62 da Lei 8.245/91, arcando ${oLocatario(ctx)} com as custas processuais e com os honorários advocatícios fixados judicialmente.`,
      `Os valores pagos serão imputados primeiro nos encargos da mora, depois nos encargos locatícios e por último no aluguel, ainda que o comprovante indique destinação diversa.`,
    ],
  },
  {
    id: 'DESCONTO_PONTUALIDADE',
    versao: 1,
    titulo: 'Do desconto de pontualidade',
    grupo: 'ALUGUEL',
    condicao: (ctx) => ctx.descontoPontualidade > 0,
    caput: (ctx) =>
      `A título de incentivo à pontualidade, ${oLocador(ctx)} ${verbo(ctx.locadores, 'concede', 'concedem')} desconto de ${moeda(ctx.descontoPontualidade)} (${moedaPorExtenso(ctx.descontoPontualidade)}) sobre o aluguel mensal, aplicável exclusivamente quando o pagamento ocorrer até a data de vencimento.`,
    paragrafos: () => [
      `O desconto é liberalidade condicionada à pontualidade, não integra o valor do aluguel para nenhum efeito e não se incorpora ao contrato, podendo deixar de ser aplicado no mês em que houver atraso, ainda que parcial.`,
    ],
  },
];

export const CLAUSULAS_REAJUSTE: Clausula[] = [
  {
    id: 'REAJUSTE',
    versao: 1,
    titulo: 'Do reajuste',
    grupo: 'REAJUSTE',
    condicao: (ctx) => ctx.indiceReajuste !== 'NENHUM',
    baseLegal: 'Lei 10.192/2001, art. 2º, §1º',
    caput: (ctx) =>
      `O aluguel será reajustado a cada ${inteiroPorExtenso(ctx.intervaloReajusteMeses)} (${ctx.intervaloReajusteMeses}) meses, contados do início da locação, pela variação acumulada do ${ctx.indiceReajuste}, ou por outro índice que legalmente venha a substituí-lo.`,
    paragrafos: (ctx) => [
      `Na hipótese de extinção, suspensão ou vedação legal do índice pactuado, o reajuste observará, sucessivamente, o IPCA/IBGE e, na falta deste, a média aritmética dos índices de preços ao consumidor disponíveis, sempre pela variação acumulada do período.`,
      `Sendo negativa a variação do índice no período, o aluguel permanecerá inalterado, vedada a redução automática.`,
      `Fica ressalvado às partes o direito à revisão judicial do aluguel a cada 3 (três) anos, nos termos do artigo 19 da Lei 8.245/91, bem como a livre repactuação de comum acordo, na forma do artigo 18 da mesma lei.`,
      `${oLocador(ctx)} ${verbo(ctx.locadores, 'comunicará', 'comunicarão')} o novo valor ${aoLocatario(ctx)} com antecedência mínima de 10 (dez) dias do primeiro vencimento reajustado.`,
    ],
  },
];

export const CLAUSULAS_ENCARGOS: Clausula[] = [
  {
    id: 'ENCARGOS_RECORRENTES',
    versao: 1,
    titulo: 'Dos encargos mensais',
    grupo: 'ENCARGOS',
    condicao: (ctx) => ctx.encargos.length > 0,
    caput: (ctx) =>
      `Além do aluguel, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'pagará', 'pagarão')} mensalmente, no mesmo vencimento, os seguintes encargos: ${lista(ctx.encargos.map((item) => `${item.descricao} no valor de ${moeda(item.valor)}`))}.`,
    paragrafos: () => [
      `Os valores acima são estimativos quando sujeitos a rateio ou a medição, e serão cobrados conforme o valor efetivamente apurado no período, mediante apresentação do respectivo demonstrativo.`,
    ],
  },
  {
    id: 'ENCARGO_IPTU',
    versao: 1,
    titulo: 'Do imposto predial e territorial urbano',
    grupo: 'ENCARGOS',
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, art. 25',
    condicao: (ctx) => ctx.respostas.iptuPorLocatario,
    caput: (ctx) =>
      `${verbo(ctx.locatarios, 'Fica', 'Ficam')} ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'responsável', 'responsáveis')} pelo pagamento integral do Imposto Predial e Territorial Urbano (IPTU) e das taxas municipais incidentes sobre o IMÓVEL durante a vigência da locação, incluída a taxa de coleta de resíduos.`,
    paragrafos: (ctx) => [
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'apresentará', 'apresentarão')} ${aoLocador(ctx)}, sempre que solicitado, os comprovantes de quitação, e ${verbo(ctx.locatarios, 'responderá', 'responderão')} por eventual inscrição em dívida ativa decorrente de inadimplemento no período da locação, ainda que a cobrança ocorra após a devolução do IMÓVEL.`,
    ],
  },
  {
    id: 'ENCARGO_CONDOMINIO',
    versao: 1,
    titulo: 'Das despesas de condomínio',
    grupo: 'ENCARGOS',
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, arts. 23, XII e 25',
    condicao: (ctx) => ctx.respostas.condominioPorLocatario,
    caput: (ctx) =>
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'responderá', 'responderão')} pelas despesas ordinárias de condomínio, assim entendidas as necessárias à administração respectiva, na forma do artigo 23, §1º, da Lei 8.245/91.`,
    paragrafos: (ctx) => [
      `Permanecem a cargo ${doLocador(ctx)} as despesas extraordinárias de condomínio, tais como obras de reforma que interessem à estrutura integral do IMÓVEL, pintura de fachadas, instalação de equipamentos de segurança e constituição de fundo de reserva.`,
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'obriga-se', 'obrigam-se')} a observar a convenção de condomínio e o regimento interno, respondendo pelas multas que der causa.`,
    ],
  },
  {
    id: 'ENCARGO_SEGURO_INCENDIO',
    versao: 1,
    titulo: 'Do seguro contra incêndio',
    grupo: 'ENCARGOS',
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, art. 22, VIII e art. 23, VIII',
    condicao: (ctx) => ctx.respostas.seguroIncendioPorLocatario,
    caput: (ctx) =>
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'contratará', 'contratarão')} e ${verbo(ctx.locatarios, 'manterá', 'manterão')} vigente, às suas expensas, durante todo o prazo da locação, seguro contra incêndio do IMÓVEL, indicando ${oLocador(ctx)} como beneficiário da cobertura relativa ao imóvel.`,
    paragrafos: (ctx) => [
      `A apólice será entregue ${aoLocador(ctx)} em até 30 (trinta) dias do início da locação e renovada nos mesmos termos até a efetiva devolução das chaves. O descumprimento autoriza ${oLocador(ctx)} a contratar a apólice e cobrar o valor no aluguel do mês seguinte.`,
    ],
  },
  {
    id: 'CONTAS_CONSUMO',
    versao: 1,
    titulo: 'Das contas de consumo',
    grupo: 'ENCARGOS',
    nivelProtecao: 2,
    condicao: (ctx) => ctx.respostas.transferirContasConsumo,
    caput: (ctx) =>
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'obriga-se', 'obrigam-se')} a transferir para o seu nome, em até ${inteiroPorExtenso(ctx.respostas.prazoTransferenciaConsumoDias)} (${ctx.respostas.prazoTransferenciaConsumoDias}) dias contados do início da locação, as contas de energia elétrica, água, esgoto, gás e demais serviços de consumo do IMÓVEL, mantendo-as adimplentes até a devolução das chaves.`,
    paragrafos: (ctx) => [
      `Na devolução do IMÓVEL, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'apresentará', 'apresentarão')} os comprovantes de quitação e ${verbo(ctx.locatarios, 'providenciará', 'providenciarão')} a exclusão das ligações em seu nome, respondendo pelos consumos apurados até a data da entrega das chaves, ainda que faturados posteriormente.`,
    ],
  },
];
