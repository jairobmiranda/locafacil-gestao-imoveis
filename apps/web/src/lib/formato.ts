const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatarMoeda(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '-' : MOEDA.format(valor);
}

export function formatarData(valor: string | Date | null | undefined): string {
  return valor ? DATA.format(new Date(valor)) : '-';
}

export function formatarCompetencia(valor: string | Date): string {
  return MES.format(new Date(valor));
}

export function rotular(valor: string): string {
  return valor
    .split('_')
    .map((parte) => parte.charAt(0) + parte.slice(1).toLowerCase())
    .join(' ');
}
