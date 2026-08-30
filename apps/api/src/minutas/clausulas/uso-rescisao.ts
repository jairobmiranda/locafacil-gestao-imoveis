import {
  aoLocador,
  aoLocatario,
  doLocador,
  doLocatario,
  lista,
  moeda,
  oLocador,
  oLocatario,
  peloLocatario,
  verbo,
} from '../contexto';
import { inteiroPorExtenso, moedaPorExtenso } from '../extenso';
import type { Clausula } from './tipos';

export const CLAUSULAS_CONSERVACAO: Clausula[] = [
  {
    id: 'CONSERVACAO',
    versao: 1,
    titulo: 'Da conservação e da devolução do imóvel',
    grupo: 'CONSERVACAO',
    obrigatoria: true,
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, art. 23, III e V',
    caput: (ctx) =>
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'obriga-se', 'obrigam-se')} a conservar o IMÓVEL como se seu fosse, restituindo-o ao final da locação no mesmo estado em que o recebeu, ressalvados os desgastes decorrentes do uso normal e regular.`,
    paragrafos: (ctx) => [
      `Correm por conta ${doLocatario(ctx)} os reparos de manutenção e os danos causados por si, por seus familiares, visitantes, prepostos ou animais, incluídos vidros, louças, metais, fechaduras, revestimentos, pintura e equipamentos entregues em funcionamento.`,
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'comunicará', 'comunicarão')} ${aoLocador(ctx)}, imediatamente e por escrito, o surgimento de qualquer dano estrutural, infiltração, vazamento ou defeito cuja reparação seja de responsabilidade ${doLocador(ctx)}, respondendo pelo agravamento decorrente da comunicação tardia.`,
      `A devolução do IMÓVEL somente se aperfeiçoa com a entrega formal das chaves e a aprovação do termo de vistoria de saída, permanecendo ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'responsável', 'responsáveis')} pelos aluguéis e encargos até essa data.`,
    ],
  },
  {
    id: 'RENUNCIA_BENFEITORIAS',
    versao: 1,
    titulo: 'Das benfeitorias',
    grupo: 'CONSERVACAO',
    nivelProtecao: 3,
    baseLegal: 'Lei 8.245/91, art. 35; Súmula 335 do STJ',
    condicao: (ctx) => ctx.respostas.renunciaBenfeitorias,
    caput: (ctx) =>
      `As benfeitorias e acessões de qualquer natureza, ainda que necessárias, úteis ou voluptuárias, incorporam-se ao IMÓVEL e não serão indenizadas, renunciando ${oLocatario(ctx)} expressamente ao direito de indenização e ao direito de retenção, na forma do artigo 35 da Lei 8.245/91 e da Súmula 335 do Superior Tribunal de Justiça.`,
    paragrafos: (ctx) => [
      `As benfeitorias voluptuárias poderão ser levantadas ao final da locação, desde que a remoção não danifique o IMÓVEL e que este seja restituído ao estado anterior, às expensas ${doLocatario(ctx)}.`,
      `${oLocador(ctx)} ${verbo(ctx.locadores, 'poderá', 'poderão')} exigir, a seu critério, a remoção de qualquer alteração introduzida sem autorização escrita, com a recomposição do estado original.`,
    ],
  },
];

export const CLAUSULAS_VISTORIA: Clausula[] = [
  {
    id: 'VISTORIA_ENTRADA',
    versao: 1,
    titulo: 'Da vistoria de entrada',
    grupo: 'VISTORIA',
    nivelProtecao: 3,
    condicao: (ctx) => ctx.respostas.exigirVistoriaEntrada,
    caput: (ctx) =>
      `As partes realizarão vistoria de entrada do IMÓVEL, documentada por laudo fotográfico datado, que integra este contrato para todos os efeitos, independentemente de transcrição, e serve de parâmetro para a apuração de responsabilidades ao final da locação.`,
    paragrafos: (ctx) => [
      `O laudo será disponibilizado ${aoLocatario(ctx)} por meio eletrônico, que terá o prazo de 7 (sete) dias corridos, contados do recebimento, para apresentar impugnação fundamentada e acompanhada de fotografias.`,
      `Não havendo manifestação no prazo acima, o laudo será considerado integralmente aceito, presumindo-se que o IMÓVEL foi recebido nas condições nele descritas.`,
    ],
  },
  {
    id: 'VISTORIA_SAIDA',
    versao: 2,
    titulo: 'Da vistoria de saída',
    grupo: 'VISTORIA',
    nivelProtecao: 3,
    condicao: (ctx) => ctx.respostas.exigirVistoriaSaida,
    caput: (ctx) =>
      `Ao término da locação será realizada vistoria de saída, comparada item a item com o laudo de entrada, apurando-se os reparos de responsabilidade ${doLocatario(ctx)}.`,
    paragrafos: (ctx) => [
      `Apurados danos, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'deverá', 'deverão')} promover os reparos no prazo de 15 (quinze) dias ou, a critério ${doLocador(ctx)}, ressarcir o custo correspondente mediante orçamento discriminado, autorizada a compensação com a garantia prestada.`,
      `Se os danos apurados impedirem objetivamente a nova locação do IMÓVEL, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'responderá', 'responderão')} por indenização correspondente ao aluguel proporcional ao período comprovadamente necessário à execução dos reparos, limitada a 60 (sessenta) dias, cessando a obrigação com a conclusão das obras ou com o ressarcimento do custo. A indenização depende de demonstração do dano e do prazo dos reparos, não se confundindo com a continuidade da locação, que se encerra com a entrega das chaves.`,
    ],
  },
];

export const CLAUSULAS_USO: Clausula[] = [
  {
    id: 'VEDACAO_SUBLOCACAO',
    versao: 2,
    titulo: 'Da vedação à sublocação, cessão e empréstimo',
    grupo: 'USO',
    nivelProtecao: 3,
    baseLegal: 'Lei 8.245/91, arts. 13 e 9º, II',
    condicao: (ctx) => ctx.respostas.vedarSublocacao,
    caput: (ctx) =>
      `São vedadas a sublocação, total ou parcial, a cessão da locação e o empréstimo do IMÓVEL, ainda que gratuitos e por prazo determinado, sem o prévio consentimento escrito ${doLocador(ctx)}, nos termos do artigo 13 da Lei 8.245/91.`,
    paragrafos: (ctx) => [
      `Considera-se também vedada a disponibilização do IMÓVEL, no todo ou em parte, em plataformas de hospedagem de curta temporada.`,
      `O pedido de consentimento será formulado por escrito e ${oLocador(ctx)} ${verbo(ctx.locadores, 'terá', 'terão')} o prazo de 30 (trinta) dias para manifestar oposição, presumindo-se o consentimento pelo silêncio, na forma do artigo 13, § 2º, da Lei 8.245/91.`,
      `A infração a esta cláusula constitui falta grave e autoriza a rescisão com o ajuizamento da ação de despejo, além da multa prevista na cláusula de rescisão.`,
    ],
  },
  {
    id: 'VEDACAO_OBRAS',
    versao: 1,
    titulo: 'Das obras e modificações',
    grupo: 'USO',
    nivelProtecao: 2,
    condicao: (ctx) => ctx.respostas.vedarObras,
    caput: (ctx) =>
      `${oLocatario(ctx)} não ${verbo(ctx.locatarios, 'poderá', 'poderão')} realizar obras, demolições, alterações estruturais, mudanças de layout, perfurações em elementos estruturais, alteração de instalações elétricas ou hidráulicas, nem modificar a fachada, sem prévia e expressa autorização escrita ${doLocador(ctx)}.`,
    paragrafos: (ctx) => [
      `Autorizada a intervenção, correrão por conta ${doLocatario(ctx)} os custos, as licenças, a responsabilidade técnica e os danos a terceiros, permanecendo aplicável a cláusula relativa às benfeitorias.`,
    ],
  },
  {
    id: 'VEDACAO_ANIMAIS',
    versao: 2,
    titulo: 'Dos animais',
    grupo: 'USO',
    nivelProtecao: 1,
    condicao: (ctx) => ctx.respostas.vedarAnimais,
    caput: (ctx) =>
      `É vedada a permanência de animais no IMÓVEL sem prévia autorização escrita ${doLocador(ctx)}, ressalvados o cão-guia e os demais animais de assistência, cuja presença é assegurada por lei e não pode ser recusada.`,
    paragrafos: (ctx) => [
      `Autorizada a permanência, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'responderá', 'responderão')} integralmente pelos danos causados pelo animal ao IMÓVEL e a terceiros, bem como pela observância das normas condominiais e sanitárias aplicáveis.`,
    ],
  },
  {
    id: 'OCUPANTES',
    versao: 1,
    titulo: 'Dos ocupantes do imóvel',
    grupo: 'USO',
    nivelProtecao: 2,
    condicao: (ctx) => ctx.respostas.exigirComunicacaoOcupantes,
    caput: (ctx) =>
      `O IMÓVEL será ocupado exclusivamente ${peloLocatario(ctx)} e por seus familiares diretos, obrigando-se ${oLocatario(ctx)} a comunicar previamente e por escrito ${aoLocador(ctx)} a inclusão de qualquer outro ocupante permanente.`,
    paragrafos: () => [
      `O número de ocupantes deverá ser compatível com a capacidade do IMÓVEL e com as normas condominiais e sanitárias aplicáveis.`,
    ],
  },
  {
    id: 'VISTORIAS_PERIODICAS',
    versao: 1,
    titulo: 'Do direito de vistoria durante a locação',
    grupo: 'USO',
    nivelProtecao: 2,
    baseLegal: 'Lei 8.245/91, art. 23, IX',
    obrigatoria: true,
    caput: (ctx) =>
      `${oLocador(ctx)} ou pessoa por ${ctx.locadores.length > 1 ? 'eles' : 'ele'} indicada ${verbo(ctx.locadores, 'poderá', 'poderão')} vistoriar o IMÓVEL mediante prévio agendamento com antecedência mínima de 48 (quarenta e oito) horas, obrigando-se ${oLocatario(ctx)} a permitir o acesso.`,
    paragrafos: (ctx) => [
      `Colocado o IMÓVEL à venda ou à nova locação, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'permitirá', 'permitirão')} as visitas de interessados, em dias e horários previamente ajustados, na forma do artigo 23, IX, da Lei 8.245/91.`,
    ],
  },
];

export const CLAUSULAS_RESCISAO: Clausula[] = [
  {
    id: 'RESCISAO_ANTECIPADA',
    versao: 2,
    titulo: 'Da rescisão antecipada e da multa',
    grupo: 'RESCISAO',
    nivelProtecao: 3,
    baseLegal: 'Lei 8.245/91, arts. 4º e 6º; CC, arts. 413 e 416',
    condicao: (ctx) => ctx.respostas.multaRescisoriaAlugueis > 0,
    caput: (ctx) => {
      const alugueis = ctx.respostas.multaRescisoriaAlugueis;
      const valor = alugueis * ctx.valorAluguel;

      return `Na hipótese de devolução do IMÓVEL antes do término do prazo ajustado, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'pagará', 'pagarão')} multa compensatória equivalente a ${inteiroPorExtenso(alugueis)} (${alugueis}) aluguéis vigentes na data da rescisão, correspondente hoje a ${moeda(valor)} (${moedaPorExtenso(valor)}), reduzida proporcionalmente ao período de contrato já cumprido, na forma do artigo 4º da Lei 8.245/91.`;
    },
    paragrafos: (ctx) => [
      `A multa compensatória prefixa as perdas e danos decorrentes da rescisão antecipada e substitui a cobrança dos aluguéis vincendos, sendo vedada a cumulação de ambos. Fica ressalvada ${aoLocador(ctx)} a indenização suplementar prevista no parágrafo único do artigo 416 do Código Civil, que depende de prova do prejuízo excedente, valendo a multa como mínimo.`,
      `A multa não é devida quando a devolução decorrer de transferência ${doLocatario(ctx)}, pelo seu empregador, para prestar serviços em localidade diversa, desde que notificado ${oLocador(ctx)} por escrito com antecedência mínima de 30 (trinta) dias, com a comprovação documental da transferência.`,
      `A multa é igualmente devida quando a rescisão decorrer de infração contratual ${doLocatario(ctx)}, sem prejuízo da ação de despejo, e poderá ser reduzida equitativamente pelo juízo se a obrigação houver sido cumprida em parte ou se o montante se revelar excessivo, na forma do artigo 413 do Código Civil.`,
      `A denúncia da locação já prorrogada por prazo indeterminado, com aviso prévio de 30 (trinta) dias, não enseja multa alguma. A ausência do aviso obriga ao pagamento de importância equivalente a um mês de aluguel e encargos, na forma do parágrafo único do artigo 6º da Lei 8.245/91.`,
    ],
  },
  {
    id: 'INFRACOES_RESCISAO',
    versao: 2,
    titulo: 'Da rescisão por infração contratual',
    grupo: 'RESCISAO',
    obrigatoria: true,
    nivelProtecao: 3,
    baseLegal: 'Lei 8.245/91, arts. 5º, 9º, 62 e 63',
    caput: (ctx) =>
      `Constitui infração contratual grave, autorizando a rescisão e a propositura da competente ação de despejo, o descumprimento de qualquer obrigação prevista neste contrato, em especial a falta de pagamento do aluguel e dos encargos, a alteração da destinação, a sublocação não autorizada, a realização de obras não autorizadas e a perda ou insuficiência da garantia não reposta no prazo desta avenca.`,
    paragrafos: (ctx) => [
      `Seja qual for o fundamento, a retomada do IMÓVEL depende de ação de despejo, na forma do artigo 5º da Lei 8.245/91, sendo vedado ${aoLocador(ctx)} interromper serviços essenciais, trocar fechaduras, remover bens ou praticar qualquer ato de retomada por vias próprias.`,
      `A parte que der causa à rescisão responderá pela multa compensatória prevista neste contrato, que prefixa as perdas e danos, e pelos valores já vencidos e não pagos até a efetiva entrega das chaves, com os acréscimos da cláusula de mora.`,
      `Rescindido o contrato, não são exigíveis os aluguéis vincendos relativos ao período posterior à devolução do IMÓVEL, ressalvada a multa compensatória e a indenização suplementar comprovada.`,
    ],
  },
  {
    id: 'TITULO_EXECUTIVO',
    versao: 2,
    titulo: 'Do título executivo',
    grupo: 'RESCISAO',
    obrigatoria: true,
    nivelProtecao: 3,
    baseLegal: 'CPC, art. 784, III, VIII e § 4º',
    caput: (ctx) =>
      ctx.respostas.duasTestemunhas
        ? `Este contrato constitui título executivo extrajudicial, nos termos do artigo 784, inciso VIII, do Código de Processo Civil, quanto ao crédito documentalmente comprovado decorrente de aluguel e encargos acessórios, e também nos termos do inciso III do mesmo artigo, uma vez assinado pelas partes e por duas testemunhas.`
        : `Este contrato constitui título executivo extrajudicial quanto ao crédito documentalmente comprovado decorrente de aluguel, encargos acessórios, tributos, despesas de condomínio e multas, nos termos do artigo 784, inciso VIII, do Código de Processo Civil, independentemente da assinatura de testemunhas.`,
    paragrafos: () => [
      `Sendo o instrumento constituído ou atestado por meio eletrônico, as partes admitem qualquer modalidade de assinatura eletrônica prevista em lei, dispensada a assinatura de testemunhas quando preservadas a integridade e a autenticidade do documento, na forma do artigo 784, § 4º, do Código de Processo Civil.`,
    ],
  },
];

export const CLAUSULAS_PREFERENCIA: Clausula[] = [
  {
    id: 'DIREITO_PREFERENCIA',
    versao: 2,
    titulo: 'Do direito de preferência',
    grupo: 'PREFERENCIA',
    nivelProtecao: 1,
    baseLegal: 'Lei 8.245/91, arts. 8º e 27 a 34',
    condicao: (ctx) => ctx.respostas.direitoPreferencia,
    caput: (ctx) =>
      `Em caso de venda, promessa de venda, cessão ou promessa de cessão de direitos ou dação em pagamento do IMÓVEL, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'terá', 'terão')} preferência para adquiri-lo em igualdade de condições com terceiros, devendo ser notificado por escrito com todas as condições do negócio.`,
    paragrafos: (ctx) => [
      `A preferência caducará se ${oLocatario(ctx)} não manifestar de forma inequívoca sua aceitação integral no prazo de 30 (trinta) dias contados do recebimento da notificação.`,
      `Preterido o direito de preferência, ${oLocatario(ctx)} ${verbo(ctx.locatarios, 'poderá', 'poderão')} reclamar perdas e danos ou, desde que o contrato esteja averbado na matrícula do IMÓVEL há pelo menos 30 (trinta) dias, haver para si o imóvel mediante depósito do preço e das despesas do ato, no prazo decadencial de 6 (seis) meses do registro da alienação, na forma do artigo 33 da Lei 8.245/91.`,
      `Alienado o IMÓVEL durante a locação, o adquirente poderá denunciar o contrato no prazo de 90 (noventa) dias contados do registro da venda, concedidos 90 (noventa) dias para a desocupação, salvo se a locação for por prazo determinado, contiver cláusula de vigência em caso de alienação e estiver averbada na matrícula, na forma do artigo 8º da Lei 8.245/91.`,
    ],
  },
];

export const CLAUSULAS_GERAIS: Clausula[] = [
  {
    id: 'OBRIGACOES_LOCADOR',
    versao: 1,
    titulo: 'Das obrigações do locador',
    grupo: 'GERAIS',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, art. 22',
    caput: (ctx) =>
      `${oLocador(ctx)} ${verbo(ctx.locadores, 'obriga-se', 'obrigam-se')} a entregar o IMÓVEL em estado de servir ao uso a que se destina, a garantir seu uso pacífico durante a locação, a responder pelos vícios ou defeitos anteriores à locação, a fornecer recibo discriminado dos valores recebidos e a arcar com as despesas extraordinárias de condomínio e com os tributos que a lei lhe atribuir.`,
  },
  {
    id: 'OBRIGACOES_LOCATARIO',
    versao: 1,
    titulo: 'Das obrigações do locatário',
    grupo: 'GERAIS',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, art. 23',
    caput: (ctx) =>
      `${oLocatario(ctx)} ${verbo(ctx.locatarios, 'obriga-se', 'obrigam-se')} a pagar pontualmente o aluguel e os encargos, a utilizar o IMÓVEL conforme a destinação ajustada, a zelar por sua conservação, a restituí-lo no estado em que o recebeu, a levar imediatamente ao conhecimento ${doLocador(ctx)} qualquer turbação de terceiros e a cumprir integralmente a convenção de condomínio e os regulamentos internos.`,
  },
  {
    id: 'COMUNICACOES_ELETRONICAS',
    versao: 2,
    titulo: 'Das comunicações entre as partes',
    grupo: 'GERAIS',
    nivelProtecao: 2,
    condicao: (ctx) => ctx.respostas.comunicacoesEletronicas,
    caput: () =>
      `As partes elegem o correio eletrônico e as mensagens instantâneas informados nesta cláusula como meios válidos e eficazes de comunicação, notificação e interpelação extrajudicial, reputando-se recebidas as mensagens enviadas aos endereços aqui indicados desde que haja confirmação de entrega, de leitura ou de resposta do destinatário.`,
    paragrafos: (ctx) => [
      `Ficam eleitos os seguintes canais, cuja titularidade e exatidão cada parte declara e assume: ${lista(
        [...ctx.locadores, ...ctx.locatarios, ...ctx.fiadores].map((parte) => {
          const canais = [
            parte.email ? `e-mail ${parte.email}` : null,
            parte.telefone ? `telefone e WhatsApp ${parte.telefone}` : null,
          ].filter(Boolean) as string[];

          return `${parte.nome} (${canais.length > 0 ? canais.join(' e ') : 'sem canal eletrônico informado'})`;
        }),
      )}.`,
      `A alteração de endereço eletrônico, telefone ou domicílio deverá ser comunicada à outra parte no prazo de 10 (dez) dias, sob pena de se considerarem válidas as comunicações enviadas aos dados constantes deste contrato.`,
      `A notificação premonitória e as demais comunicações das quais dependa a propositura de ação ou a concessão de liminar serão feitas por meio que produza prova do efetivo recebimento, admitidos o aviso de recebimento postal, o cartório de títulos e documentos e o meio eletrônico com confirmação de entrega, sob pena de ineficácia da comunicação.`,
      `Os endereços físicos indicados no preâmbulo são os domicílios das partes para todos os fins, inclusive para a citação e a intimação em eventual processo judicial, que observarão as formas previstas em lei, não sendo supridas pela comunicação eletrônica ajustada nesta cláusula.`,
    ],
  },
  {
    id: 'LGPD',
    versao: 1,
    titulo: 'Da proteção de dados pessoais',
    grupo: 'GERAIS',
    baseLegal: 'Lei 13.709/2018',
    condicao: (ctx) => ctx.respostas.clausulaLgpd,
    caput: (ctx) =>
      `As partes tratarão os dados pessoais compartilhados exclusivamente para a execução deste contrato e para o cumprimento de obrigações legais e regulatórias, observada a Lei 13.709/2018, adotando medidas de segurança compatíveis e limitando o compartilhamento ao estritamente necessário.`,
    paragrafos: () => [
      `Os documentos e dados coletados serão conservados pelo prazo exigido pela legislação aplicável e pelo período necessário ao exercício regular de direitos em eventual processo.`,
    ],
  },
  {
    id: 'CLAUSULAS_ADICIONAIS',
    versao: 1,
    titulo: 'Das disposições complementares',
    grupo: 'GERAIS',
    condicao: (ctx) => ctx.respostas.clausulasAdicionais.length > 0,
    caput: () => `As partes ajustam ainda as seguintes disposições complementares:`,
    paragrafos: (ctx) => ctx.respostas.clausulasAdicionais,
  },
  {
    id: 'DISPOSICOES_FINAIS',
    versao: 1,
    titulo: 'Das disposições finais',
    grupo: 'GERAIS',
    obrigatoria: true,
    caput: () =>
      `Este contrato obriga as partes, seus herdeiros e sucessores a qualquer título, e somente poderá ser alterado por aditivo escrito assinado por todos os signatários.`,
    paragrafos: () => [
      `A eventual nulidade ou ineficácia de qualquer cláusula não prejudica a validade das demais, que permanecem em pleno vigor.`,
      `A tolerância quanto ao descumprimento de qualquer obrigação constitui mera liberalidade e não implica novação, renúncia ou alteração do pactuado.`,
    ],
  },
];

export const CLAUSULAS_FORO: Clausula[] = [
  {
    id: 'FORO',
    versao: 2,
    titulo: 'Do foro',
    grupo: 'FORO',
    obrigatoria: true,
    baseLegal: 'Lei 8.245/91, art. 58, II; CPC, arts. 63 e 784',
    caput: (ctx) =>
      `As partes elegem o foro da comarca de ${ctx.foro}, que guarda pertinência com o local de situação do IMÓVEL e com o cumprimento das obrigações aqui ajustadas, para dirimir as questões oriundas deste contrato, na forma do artigo 58, II, da Lei 8.245/91 e do artigo 63 do Código de Processo Civil, com renúncia a qualquer outro.`,
  },
];
