const UNIDADES = [
  '',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];

const DEZENAS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];

const CENTENAS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

const ESCALAS: [string, string][] = [
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
];

function ate999(valor: number): string {
  if (valor === 100) {
    return 'cem';
  }

  const centena = Math.floor(valor / 100);
  const resto = valor % 100;
  const partes: string[] = [];

  if (centena > 0) {
    partes.push(CENTENAS[centena] as string);
  }

  if (resto > 0 && resto < 20) {
    partes.push(UNIDADES[resto] as string);
  } else if (resto >= 20) {
    const dezena = Math.floor(resto / 10);
    const unidade = resto % 10;
    partes.push(
      unidade > 0
        ? `${DEZENAS[dezena] as string} e ${UNIDADES[unidade] as string}`
        : (DEZENAS[dezena] as string),
    );
  }

  return partes.join(' e ');
}

/** Numero inteiro por extenso, ate a casa dos bilhoes. */
export function inteiroPorExtenso(valor: number): string {
  const inteiro = Math.trunc(Math.abs(valor));

  if (inteiro === 0) {
    return 'zero';
  }

  const grupos: number[] = [];
  let restante = inteiro;

  while (restante > 0) {
    grupos.push(restante % 1000);
    restante = Math.floor(restante / 1000);
  }

  const partes: string[] = [];

  for (let indice = grupos.length - 1; indice >= 0; indice -= 1) {
    const grupo = grupos[indice] as number;

    if (grupo === 0) {
      continue;
    }

    if (indice === 0) {
      partes.push(ate999(grupo));
      continue;
    }

    const escala = ESCALAS[indice - 1] as [string, string];

    if (indice === 1) {
      partes.push(grupo === 1 ? 'mil' : `${ate999(grupo)} mil`);
    } else {
      partes.push(`${ate999(grupo)} ${grupo === 1 ? escala[0] : escala[1]}`);
    }
  }

  // "mil e duzentos" soa melhor que "mil duzentos"; com centena cheia usa virgula.
  return partes.reduce((texto, parte, indice) => {
    if (indice === 0) {
      return parte;
    }

    const ultimo = indice === partes.length - 1;
    const grupoFinal = grupos[grupos.length - 1 - indice] as number;
    const ligaComE = ultimo && (grupoFinal < 100 || grupoFinal % 100 === 0);

    return `${texto}${ligaComE ? ' e ' : ', '}${parte}`;
  }, '');
}

/** Ex.: 1250.5 vira "mil, duzentos e cinquenta reais e cinquenta centavos". */
export function moedaPorExtenso(valor: number): string {
  const centavosTotais = Math.round(Math.abs(valor) * 100);
  const reais = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;

  const extensoReais = inteiroPorExtenso(reais);
  // "um milhão de reais", mas "um milhão e duzentos mil reais".
  const preposicao = /(milhão|milhões|bilhão|bilhões)$/.test(extensoReais) ? 'de ' : '';

  const parteReais =
    reais === 0 ? '' : `${extensoReais} ${preposicao}${reais === 1 ? 'real' : 'reais'}`;
  const parteCentavos =
    centavos === 0
      ? ''
      : `${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;

  if (parteReais && parteCentavos) {
    return `${parteReais} e ${parteCentavos}`;
  }

  return parteReais || parteCentavos || 'zero real';
}
