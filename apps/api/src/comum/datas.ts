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

/** Chave `AAAA-MM-DD` usada para comparar feriados sem esbarrar em fuso. */
export function chaveData(data: Date): string {
  return apenasData(data).toISOString().slice(0, 10);
}

export function ehFimDeSemana(data: Date): boolean {
  const dia = data.getUTCDay();

  return dia === 0 || dia === 6;
}

/**
 * Vencimento caido em sabado, domingo ou feriado so vira mora no proximo dia util
 * (art. 132 §1o do Codigo Civil). Feriados chegam como chaves `AAAA-MM-DD`.
 */
export function proximoDiaUtil(data: Date, feriados: ReadonlySet<string> = new Set()): Date {
  let candidato = apenasData(data);

  // 10 saltos cobrem qualquer emenda de feriado real sem risco de laco infinito.
  for (let i = 0; i < 10; i += 1) {
    if (!ehFimDeSemana(candidato) && !feriados.has(chaveData(candidato))) {
      return candidato;
    }

    candidato = somarDias(candidato, 1);
  }

  return candidato;
}
