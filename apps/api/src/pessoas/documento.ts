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

export function cnpjValido(documento: string): boolean {
  if (documento.length !== 14 || /^(\d)\1{13}$/.test(documento)) {
    return false;
  }

  const digito = (ate: number): number => {
    const pesos = ate === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let soma = 0;

    for (let posicao = 0; posicao < ate; posicao += 1) {
      soma += Number(documento[posicao]) * (pesos[posicao] as number);
    }

    const resto = soma % 11;

    return resto < 2 ? 0 : 11 - resto;
  };

  return digito(12) === Number(documento[12]) && digito(13) === Number(documento[13]);
}

export function documentoValido(documento: string): boolean {
  return documento.length === 11 ? cpfValido(documento) : cnpjValido(documento);
}
