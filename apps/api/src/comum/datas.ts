const MILISSEGUNDOS_POR_DIA = 86_400_000;

export function apenasData(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

export function primeiroDiaDoMes(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

export function somarMeses(data: Date, meses: number): Date {
  const resultado = new Date(data);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);
  return resultado;
}

export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * MILISSEGUNDOS_POR_DIA);
}

export function diferencaEmDias(de: Date, ate: Date): number {
  return Math.round((apenasData(ate).getTime() - apenasData(de).getTime()) / MILISSEGUNDOS_POR_DIA);
}

/** Dia 31 em fevereiro vira o dia 28 ou 29. */
export function vencimentoNoMes(ano: number, mes: number, diaDesejado: number): Date {
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(diaDesejado, ultimoDia)));
}

export function formatarCompetencia(data: Date): string {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}
