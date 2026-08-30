import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  // Entrada solta porque alguns schemas transformam o dado (ex.: texto que vira lista).
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

  transform(valor: unknown): T {
    const resultado = this.schema.safeParse(valor);

    if (!resultado.success) {
      throw new BadRequestException({
        mensagem: 'Dados inválidos',
        erros: resultado.error.issues.map((problema) => ({
          campo: problema.path.join('.') || '(raiz)',
          erro: problema.message,
        })),
      });
    }

    return resultado.data;
  }
}
