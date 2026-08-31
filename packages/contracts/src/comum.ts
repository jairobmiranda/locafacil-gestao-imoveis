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
