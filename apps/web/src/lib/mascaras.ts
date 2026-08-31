/**
 * Mascaras de exibicao. O banco guarda sempre o valor limpo: telefone e CEP so com
 * digitos, documento alfanumerico em maiusculas e valor como decimal com ponto.
 */

const VALOR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** CNPJ alfanumerico (a partir de 2026) mantem letras; CPF continua so com digitos. */
export function limparDocumento(valor: string): string {
  return valor.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14);
}

export function mascararTelefone(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor ?? '').slice(0, 11);

  if (digitos.length === 0) {
    return '';
  }

  if (digitos.length <= 2) {
    return `(${digitos}`;
  }

  const ddd = `(${digitos.slice(0, 2)}) `;

  if (digitos.length <= 6) {
    return ddd + digitos.slice(2);
  }

  if (digitos.length <= 10) {
    return `${ddd}${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return `${ddd}${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function mascararCep(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor ?? '').slice(0, 8);

  if (digitos.length <= 2) {
    return digitos;
  }

  if (digitos.length <= 5) {
    return `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
  }

  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}-${digitos.slice(5)}`;
}

export function mascararDocumento(valor: string | null | undefined): string {
  const limpo = limparDocumento(valor ?? '');

  if (limpo.length === 0) {
    return '';
  }

  const ehCnpj = limpo.length > 11 || /[A-Z]/.test(limpo);

  if (!ehCnpj) {
    return limpo
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }

  return limpo
    .replace(/^(.{2})(.)/, '$1.$2')
    .replace(/^(.{2})\.(.{3})(.)/, '$1.$2.$3')
    .replace(/^(.{2})\.(.{3})\.(.{3})(.)/, '$1.$2.$3/$4')
    .replace(/^(.{2})\.(.{3})\.(.{3})\/(.{4})(.)/, '$1.$2.$3/$4-$5');
}

/** Aplica a mascara conforme o usuario digita: os digitos entram pela direita, em centavos. */
export function mascararValor(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor ?? '').slice(0, 15);

  if (digitos.length === 0) {
    return '';
  }

  return VALOR.format(Number(digitos) / 100);
}

/** Texto mascarado para o formato aceito pelo contrato/banco (`1234.56`). */
export function desmascararValor(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor ?? '').slice(0, 15);

  return digitos.length === 0 ? '' : (Number(digitos) / 100).toFixed(2);
}

/** Numero vindo da API para o texto mascarado do input. */
export function valorParaMascara(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  const numero = typeof valor === 'number' ? valor : Number(valor);

  return Number.isFinite(numero) ? VALOR.format(numero) : '';
}
