import { Prisma } from '@prisma/client';
import { proximoDiaUtil } from '../comum/datas';

const CEM = new Prisma.Decimal(100);
const MILISSEGUNDOS_POR_DIA = 86_400_000;

export type EncargosContrato = {
  percentualMulta: Prisma.Decimal;
  percentualJurosDia: Prisma.Decimal;
  descontoPontualidade: Prisma.Decimal;
};

export type Encargos = {
  /** Vencimento prorrogado para o proximo dia util, quando cai em fim de semana ou feriado. */
  vencimentoEfetivo: Date | null;
  prorrogado: boolean;
  diasAtraso: number;
  valorMulta: Prisma.Decimal;
  valorJuros: Prisma.Decimal;
  valorDesconto: Prisma.Decimal;
  totalDevido: Prisma.Decimal;
};

function diasDeAtraso(vencimento: Date | null, pagoEm: Date): number {
  if (!vencimento) {
    return 0;
  }

  const diferenca = Math.floor(
    (Date.UTC(pagoEm.getUTCFullYear(), pagoEm.getUTCMonth(), pagoEm.getUTCDate()) -
      Date.UTC(
        vencimento.getUTCFullYear(),
        vencimento.getUTCMonth(),
        vencimento.getUTCDate(),
      )) /
      MILISSEGUNDOS_POR_DIA,
  );

  return Math.max(diferenca, 0);
}

/**
 * Multa e percentual fixo sobre o valor original, juros sao pro rata die.
 * Vencimento em sabado, domingo ou feriado cadastrado rola para o proximo dia util
 * (art. 132 §1o do Codigo Civil): o atraso so comeca a contar depois dele.
 * Tudo em Decimal para nao acumular erro de ponto flutuante em centavos.
 */
export function calcularEncargos(
  valor: Prisma.Decimal,
  vencimento: Date | null,
  pagoEm: Date,
  contrato: EncargosContrato | null,
  feriados: ReadonlySet<string> = new Set(),
): Encargos {
  const vencimentoEfetivo = vencimento ? proximoDiaUtil(vencimento, feriados) : null;
  const prorrogado =
    vencimento !== null &&
    vencimentoEfetivo !== null &&
    vencimentoEfetivo.getTime() !== Date.UTC(
      vencimento.getUTCFullYear(),
      vencimento.getUTCMonth(),
      vencimento.getUTCDate(),
    );
  const diasAtraso = diasDeAtraso(vencimentoEfetivo, pagoEm);

  if (!contrato) {
    return {
      vencimentoEfetivo,
      prorrogado,
      diasAtraso,
      valorMulta: new Prisma.Decimal(0),
      valorJuros: new Prisma.Decimal(0),
      valorDesconto: new Prisma.Decimal(0),
      totalDevido: valor,
    };
  }

  const emAtraso = diasAtraso > 0;

  const valorMulta = emAtraso
    ? valor.mul(contrato.percentualMulta).div(CEM).toDecimalPlaces(2)
    : new Prisma.Decimal(0);

  const valorJuros = emAtraso
    ? valor.mul(contrato.percentualJurosDia).div(CEM).mul(diasAtraso).toDecimalPlaces(2)
    : new Prisma.Decimal(0);

  const valorDesconto = emAtraso ? new Prisma.Decimal(0) : contrato.descontoPontualidade;

  return {
    vencimentoEfetivo,
    prorrogado,
    diasAtraso,
    valorMulta,
    valorJuros,
    valorDesconto,
    totalDevido: valor.plus(valorMulta).plus(valorJuros).minus(valorDesconto).toDecimalPlaces(2),
  };
}
