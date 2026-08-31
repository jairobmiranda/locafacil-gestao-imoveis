/** Validacao dos digitos verificadores. Formato ja foi checado no schema. */
export function cpfValido(documento: string): boolean {
  if (documento.length !== 11 || /^(\d)\1{10}$/.test(documento)) {
    return false;
  }

  const digito = (ate: number): number => {
    let soma = 0;

    for (let posicao = 0; posicao < ate; posicao += 1) {
      soma += Number(documento[posicao]) * (ate + 1 - posicao);
    }

    const resto = (soma * 10) % 11;

    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(documento[9]) && digito(10) === Number(documento[10]);
}

/**
 * CNPJ alfanumerico (IN RFB 2.229/2024): as 12 primeiras posicoes podem ter letras e o valor
 * de cada caractere no calculo e `codigo ASCII - 48`. Os 2 digitos verificadores sao numericos.
 */
export function cnpjValido(documento: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(documento) || /^(.)\1{13}$/.test(documento)) {
    return false;
  }

  const valorDe = (posicao: number): number => documento.charCodeAt(posicao) - 48;

  const digito = (ate: number): number => {
    const pesos = ate === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let soma = 0;

    for (let posicao = 0; posicao < ate; posicao += 1) {
      soma += valorDe(posicao) * (pesos[posicao] as number);
    }

    const resto = soma % 11;

    return resto < 2 ? 0 : 11 - resto;
  };

  return digito(12) === Number(documento[12]) && digito(13) === Number(documento[13]);
}

export function documentoValido(documento: string): boolean {
  return documento.length === 11 ? cpfValido(documento) : cnpjValido(documento);
}
