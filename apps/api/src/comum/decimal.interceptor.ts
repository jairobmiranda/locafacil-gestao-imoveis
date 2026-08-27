import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map, Observable } from 'rxjs';

/** Decimal do Prisma vira string no JSON padrao e BigInt lanca excecao. Ambos viram number aqui. */
function normalizar(valor: unknown): unknown {
  if (valor instanceof Prisma.Decimal) {
    return valor.toNumber();
  }

  if (typeof valor === 'bigint') {
    return Number(valor);
  }

  if (Array.isArray(valor)) {
    return valor.map(normalizar);
  }

  if (valor !== null && typeof valor === 'object' && !(valor instanceof Date)) {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([chave, item]) => [
        chave,
        normalizar(item),
      ]),
    );
  }

  return valor;
}

@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(_contexto: ExecutionContext, proximo: CallHandler): Observable<unknown> {
    return proximo.handle().pipe(map(normalizar));
  }
}
