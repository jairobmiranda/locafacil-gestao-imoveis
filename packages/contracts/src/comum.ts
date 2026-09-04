import { z } from 'zod';

export const paginacaoSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginacaoDto = z.infer<typeof paginacaoSchema>;

export type Paginado<T> = {
  itens: T[];
  total: number;
  pagina: number;
  limite: number;
};

export const uuidSchema = z.string().uuid();

/**
 * Telefone e CEP sao guardados so com digitos: a mascara e responsabilidade da tela.
 * O transform aceita valor mascarado vindo de qualquer cliente.
 */
export const telefoneSchema = z
  .string()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine((valor) => valor.length === 0 || valor.length === 10 || valor.length === 11, {
    message: 'Informe o telefone com DDD, 10 ou 11 dígitos',
  });

export const cepSchema = z
  .string()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine((valor) => valor.length === 0 || valor.length === 8, {
    message: 'Informe um CEP com 8 dígitos',
  });

/** Só CPF: onde ele aparece, o que se identifica é uma pessoa, nunca uma empresa. */
export const cpfSchema = z
  .string()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine((valor) => valor.length === 11, { message: 'Informe um CPF com 11 dígitos' });

/**
 * Dígitos verificadores do CPF. Fica no contrato porque as duas pontas precisam dela: a tela
 * avisa enquanto a pessoa digita e o servidor confere de novo antes de gravar.
 */
export function cpfValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, '');

  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) {
    return false;
  }

  const digito = (ate: number): number => {
    let soma = 0;

    for (let posicao = 0; posicao < ate; posicao += 1) {
      soma += Number(digitos[posicao]) * (ate + 1 - posicao);
    }

    const resto = (soma * 10) % 11;

    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(digitos[9]) && digito(10) === Number(digitos[10]);
}

/**
 * Máscara de CPF. Serve tanto para exibir quanto para acompanhar a digitação, por isso
 * aceita valor incompleto e devolve o que der para formatar.
 */
export function formatarCpf(valor: string | null | undefined): string {
  return (valor ?? '')
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

/**
 * Aceita CPF (11 digitos) ou CNPJ (14 caracteres). O CNPJ alfanumerico usa letras nas 12
 * primeiras posicoes; os 2 digitos verificadores continuam numericos. A conferencia dos
 * digitos verificadores fica no servico.
 */
export const documentoSchema = z
  .string()
  .transform((valor) => valor.toUpperCase().replace(/[^0-9A-Z]/g, ''))
  .refine(
    (valor) =>
      (valor.length === 11 && /^\d{11}$/.test(valor)) ||
      (valor.length === 14 && /^[0-9A-Z]{12}\d{2}$/.test(valor)),
    { message: 'Informe um CPF com 11 dígitos ou CNPJ com 14 caracteres' },
  );
