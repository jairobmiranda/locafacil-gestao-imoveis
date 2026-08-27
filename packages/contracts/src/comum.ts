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
