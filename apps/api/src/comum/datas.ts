import { FUSO_HORARIO } from './ambiente';

const MILISSEGUNDOS_POR_DIA = 86_400_000;
const MILISSEGUNDOS_POR_MINUTO = 60_000;

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

/** Quantos minutos o fuso esta a frente do UTC no instante informado. */
function deslocamentoDoFuso(instante: Date, fuso: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante);

  const campo = (tipo: string): number =>
    Number(partes.find((parte) => parte.type === tipo)?.value ?? 0);

  const comoUtc = Date.UTC(
    campo('year'),
    campo('month') - 1,
    campo('day'),
    campo('hour'),
    campo('minute'),
    campo('second'),
  );

  return (comoUtc - (instante.getTime() - instante.getMilliseconds())) / MILISSEGUNDOS_POR_MINUTO;
}

/**
 * Converte uma hora de parede (`HH:mm`) do fuso do sistema no instante UTC daquele dia.
 * `agendadoPara` e instante, nao data de negocio: gravar 09:00 direto em UTC faria a
 * cobranca configurada para as 09:00 sair as 06:00 em Brasilia.
 */
export function instanteLocal(dia: Date, horaMinuto: string, fuso: string = FUSO_HORARIO): Date {
  const [hora, minuto] = horaMinuto.split(':').map(Number);

  const ingenuo = Date.UTC(
    dia.getUTCFullYear(),
    dia.getUTCMonth(),
    dia.getUTCDate(),
    Number.isFinite(hora) ? (hora as number) : 9,
    Number.isFinite(minuto) ? (minuto as number) : 0,
  );

  // Duas passadas: a primeira estima o deslocamento, a segunda confere o resultado
  // no proprio instante calculado (o que resolve a virada de horario de verao).
  const estimado = new Date(
    ingenuo - deslocamentoDoFuso(new Date(ingenuo), fuso) * MILISSEGUNDOS_POR_MINUTO,
  );

  return new Date(ingenuo - deslocamentoDoFuso(estimado, fuso) * MILISSEGUNDOS_POR_MINUTO);
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
