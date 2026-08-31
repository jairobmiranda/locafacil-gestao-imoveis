import {
  aoLocador,
  aoLocatario,
  dataExtenso,
  doLocador,
  doLocatario,
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
          ? `${ctx.imovel.vagas === 1 ? 'uma' : inteiroPorExtenso(ctx.imovel.vagas)} ${plural(ctx.imovel.vagas, 'vaga de garagem', 'vagas de garagem')}`
          : null,
      ].filter(Boolean) as string[];

      if (caracteristicas.length > 0) {
        itens.push(`O IMÓVEL possui ${lista(caracteristicas)}.`);
      }

      itens.push(
        ctx.respostas.exigirVistoriaEntrada
          ? `O IMÓVEL é entregue em estado de servir ao uso a que se destina, na forma do artigo 22, I, da Lei 8.245/91, sendo o termo de vistoria de entrada o documento hábil a descrever as condições em que efetivamente se encontra na data da entrega das chaves.`
          : `O IMÓVEL é entregue em estado de servir ao uso a que se destina, na forma do artigo 22, I, da Lei 8.245/91, obrigando-se ${oLocatario(ctx)} a apontar por escrito, em até 7 (sete) dias contados da entrega das chaves, qualquer vício ou defeito preexistente.`,
      );

      return itens;
    },
  },
  {
    id: 'DESTINACAO',
    versao: 2,
    titulo: 'Da destinação',
    grupo: 'OBJETO',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, arts. 5º, 9º, II e 23, II',
    nivelProtecao: 1,
    caput: (ctx) =>
      `O IMÓVEL destina-se ao uso ${FINALIDADE_TEXTO[ctx.finalidade] as string}, sendo vedada sua utilização para fim diverso.`,
    paragrafos: (ctx) =>
      ctx.respostas.vedarMudancaDestinacao
        ? [
            `A alteração da destinação, ainda que parcial ou temporária, sem prévia e expressa autorização escrita ${doLocador(ctx)}, constitui infração legal e contratual, nos termos do artigo 9º, II, da Lei 8.245/91, e autoriza a rescisão deste contrato com a aplicação da multa prevista na cláusula de rescisão, ficando ressalvado que a retomada do IMÓVEL depende de ação de despejo, na forma do artigo 5º da mesma lei, vedada a retomada por vias próprias.`,
          ]
        : [],
  },
];

export const CLAUSULAS_PRAZO: Clausula[] = [
  {
    id: 'PRAZO',
    versao: 2,
    titulo: 'Do prazo',
    grupo: 'PRAZO',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, arts. 3º, 6º, 46, 47 e 56',
    caput: (ctx) => {
      const terminaDePlenoDireito = ctx.prazoMeses >= 30 || ctx.finalidade !== 'RESIDENCIAL';

      return `A locação é ajustada pelo prazo de ${inteiroPorExtenso(ctx.prazoMeses)} (${ctx.prazoMeses}) meses, com início em ${dataExtenso(ctx.dataInicio)} e término em ${dataExtenso(ctx.dataFim)}${terminaDePlenoDireito ? ', data em que a locação se extingue de pleno direito, independentemente de aviso, notificação ou interpelação judicial ou extrajudicial' : ''}.`;
    },
    paragrafos: (ctx) => {
      const itens: string[] = [];

      if (ctx.finalidade === 'TEMPORADA') {
        itens.push(
          `Tratando-se de locação por temporada, findo o prazo ajustado ${oLocador(ctx)} ${verbo(ctx.locadores, 'poderá', 'poderão')} retomar o IMÓVEL de imediato. Permanecendo ${oLocatario(ctx)} no IMÓVEL por mais de 30 (trinta) dias sem oposição, presume-se prorrogada a locação por prazo indeterminado, deixando de ser exigível o pagamento antecipado do aluguel e da garantia, na forma do artigo 50 da Lei 8.245/91.`,
        );
      } else if (ctx.prazoMeses >= 30 && ctx.finalidade === 'RESIDENCIAL') {
        itens.push(
          `Findo o prazo ajustado, a locação termina de pleno direito, na forma do artigo 46 da Lei 8.245/91, devendo o IMÓVEL ser restituído ${aoLocador(ctx)} nas condições previstas na cláusula de conservação. Permanecendo ${oLocatario(ctx)} no IMÓVEL por mais de 30 (trinta) dias sem oposição ${doLocador(ctx)}, a locação prorroga-se por prazo indeterminado, mantidas as demais cláusulas deste contrato, hipótese em que a denúncia poderá ser feita a qualquer tempo, concedidos 30 (trinta) dias para a desocupação, na forma do artigo 46, §§ 1º e 2º, da mesma lei.`,
        );
      } else if (ctx.finalidade === 'RESIDENCIAL') {
        itens.push(
          `Findo o prazo ajustado sem oposição ${doLocador(ctx)}, a locação prorroga-se automaticamente por prazo indeterminado, mantidas as demais condições deste contrato, e a retomada somente poderá ser pleiteada nas hipóteses do artigo 47 da Lei 8.245/91, ficando as partes cientes de que, neste caso, não cabe denúncia vazia.`,
        );
      } else {
        itens.push(
          `Findo o prazo ajustado, a locação termina de pleno direito. Permanecendo ${oLocatario(ctx)} no IMÓVEL por mais de 30 (trinta) dias sem oposição ${doLocador(ctx)}, a locação prorroga-se por prazo indeterminado, podendo ser denunciada por escrito a qualquer tempo, concedido o prazo de 30 (trinta) dias para a desocupação, na forma do artigo 57 da Lei 8.245/91.`,
        );
      }

      itens.push(
        `Prorrogada a locação por prazo indeterminado, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'poderá', 'poderão')} devolver o IMÓVEL a qualquer tempo, mediante aviso por escrito com antecedência mínima de 30 (trinta) dias, sem incidência da multa compensatória, na forma do artigo 6º da Lei 8.245/91.`,
      );

      if (ctx.finalidade === 'NAO_RESIDENCIAL') {
        itens.push(
          `As partes declaram ciência de que, atendidos os requisitos do artigo 51 da Lei 8.245/91, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'terá', 'terão')} direito à renovação compulsória da locação, cuja ação deve ser proposta no intervalo de um ano, no máximo, até seis meses, no mínimo, anteriores ao término do prazo aqui ajustado, sob pena de decadência.`,
        );
      }

      return itens;
    },
  },
];

export const CLAUSULAS_ALUGUEL: Clausula[] = [
  {
    id: 'ALUGUEL',
    versao: 2,
    titulo: 'Do aluguel e da forma de pagamento',
    grupo: 'ALUGUEL',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, arts. 17, 20, 42 e 45',
    caput: (ctx) => {
      const valor = `${moeda(ctx.valorAluguel)} (${moedaPorExtenso(ctx.valorAluguel)})`;

      // Art. 20: aluguel antecipado so e licito sem garantia (art. 42) ou por temporada.
      if (ctx.tipoGarantia === 'NENHUMA' || ctx.finalidade === 'TEMPORADA') {
        return `O aluguel mensal é de ${valor}, a ser pago antecipadamente, até o dia ${ctx.diaVencimento} de cada mês, referente ao próprio mês em curso, na forma expressamente autorizada pelo artigo ${ctx.finalidade === 'TEMPORADA' ? '20 c/c o artigo 45' : '42'} da Lei 8.245/91.`;
      }

      return `O aluguel mensal é de ${valor}, a ser pago até o dia ${ctx.diaVencimento} de cada mês, referente ao mês imediatamente anterior, sendo vedada a exigência de pagamento antecipado, na forma do artigo 20 da Lei 8.245/91.`;
    },
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
    versao: 2,
    titulo: 'Da mora',
    grupo: 'ALUGUEL',
    obrigatoria: true,
    nivelProtecao: 2,
    baseLegal: 'CC, arts. 354, 389, 395, 397 e 406; Lei 8.245/91, art. 62',
    caput: (ctx) =>
      `O atraso no pagamento do aluguel ou dos encargos sujeita ${oLocatario(ctx)}, de pleno direito e independentemente de notificação, por se tratar de obrigação positiva e líquida com termo certo (Código Civil, artigo 397), à multa moratória de ${numero(ctx.percentualMulta)}% (${inteiroPorExtenso(ctx.percentualMulta)} por cento) sobre o valor devido, acrescida de juros de mora de ${numero(ctx.percentualJurosDia)}% ao dia, equivalentes a ${numero(Number((ctx.percentualJurosDia * 30).toFixed(4)))}% ao mês, calculados pro rata die, e de correção monetária pelo IPCA/IBGE, tudo contado da data do vencimento até a do efetivo pagamento.`,
    paragrafos: (ctx) => [
      `O inadimplemento autoriza ${oLocador(ctx)} a promover a ação de despejo por falta de pagamento cumulada com cobrança, nos termos do artigo 62 da Lei 8.245/91, arcando ${oLocatario(ctx)} com as custas processuais e com os honorários advocatícios fixados judicialmente.`,
      `É assegurada ${aoLocatario(ctx)} a purgação da mora no prazo legal, com o pagamento integral do débito atualizado e dos acessórios, ficando as partes cientes de que tal faculdade não se admite mais de uma vez no intervalo de 24 (vinte e quatro) meses, na forma do artigo 62, inciso II e parágrafo único, da Lei 8.245/91.`,
      `Os valores pagos serão imputados primeiro nos encargos da mora, depois nos encargos locatícios e por último no aluguel, ainda que o comprovante indique destinação diversa, na forma do artigo 354 do Código Civil.`,
    ],
  },
  {
    id: 'DESCONTO_PONTUALIDADE',
    versao: 2,
    titulo: 'Do desconto de pontualidade',
    grupo: 'ALUGUEL',
    condicao: (ctx) => ctx.descontoPontualidade > 0,
    caput: (ctx) =>
      `A título de incentivo à pontualidade, ${oLocador(ctx)} ${verbo(ctx.locadores, 'concede', 'concedem')} desconto de ${moeda(ctx.descontoPontualidade)} (${moedaPorExtenso(ctx.descontoPontualidade)}) sobre o aluguel mensal, aplicável exclusivamente quando o pagamento ocorrer até a data de vencimento.`,
    paragrafos: () => [
      `O desconto é liberalidade condicionada à pontualidade, não integra o valor do aluguel para nenhum efeito e não se incorpora ao contrato, podendo deixar de ser aplicado no mês em que houver atraso, ainda que parcial.`,
      `O valor cheio do aluguel é o previsto na cláusula própria e sobre ele incidem o reajuste, a garantia e a multa compensatória. A perda do desconto não tem natureza de penalidade e não se cumula com a multa moratória, que é regulada em cláusula distinta e incide apenas sobre a parcela efetivamente em atraso.`,
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
    versao: 2,
    titulo: 'Do imposto predial e territorial urbano',
    grupo: 'ENCARGOS',
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, arts. 22, VIII e 25',
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
  {
    id: 'AUTORIZACAO_CONSULTA_CONSUMO',
    versao: 1,
    titulo: 'Da autorização de consulta às concessionárias',
    grupo: 'ENCARGOS',
    nivelProtecao: 2,
    baseLegal: 'Lei 13.709/2018, arts. 7º, I e V, e 9º',
    condicao: (ctx) => ctx.respostas.autorizacaoConsultaConsumo,
    caput: (ctx) =>
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'autoriza', 'autorizam')} expressamente ${oLocador(ctx)}, ou a administradora por ${verbo(ctx.locadores, 'ele', 'eles')} indicada, a consultar junto às concessionárias e prestadoras de energia elétrica, água, esgoto, gás e demais serviços de consumo do IMÓVEL, ainda que as unidades estejam cadastradas em nome ${doLocatario(ctx)}, as informações de titularidade, situação cadastral, faturas emitidas, valores em aberto, datas de vencimento e histórico de pagamento, bem como a receber tais informações diretamente da prestadora.`,
    paragrafos: (ctx) => [
      `A autorização é concedida exclusivamente para a finalidade de acompanhar o cumprimento das obrigações assumidas neste contrato, prevenir o corte de fornecimento e a inscrição de débitos vinculados ao IMÓVEL, e viabilizar o envio de lembretes e avisos ${aoLocatario(ctx)}, sendo vedado qualquer outro uso, o compartilhamento com terceiros estranhos à locação e a formação de cadastro para fins comerciais, na forma da Lei 13.709/2018.`,
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'consente', 'consentem')} no recebimento, pelos canais eletrônicos indicados neste contrato, de lembretes de vencimento, avisos de fatura em aberto e comunicações sobre a regularização das contas de consumo, sem que o envio ou a ausência de envio transfira ${aoLocador(ctx)} a responsabilidade pelo pagamento, que permanece integralmente ${doLocatario(ctx)}.`,
      `A autorização vigora enquanto durar a locação e pelo prazo necessário à apuração dos consumos posteriores à devolução das chaves, podendo ser revogada por escrito a qualquer tempo, hipótese em que ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'passará', 'passarão')} a apresentar mensalmente, até o vencimento do aluguel, os comprovantes de quitação de todas as contas de consumo do IMÓVEL.`,
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'obriga-se', 'obrigam-se')} a praticar os atos que a prestadora exigir para tornar efetiva esta autorização, tais como o cadastro ${doLocador(ctx)} como representante ou o envio de segunda via das faturas, e a não se opor ao fornecimento das informações aqui autorizadas.`,
    ],
  },
];
