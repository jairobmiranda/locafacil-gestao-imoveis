import type { Request } from 'express';

/** Quem agiu, do ponto de vista da rede. Vale como indício, nunca como identidade. */
export type ContextoRequisicao = {
  ip: string | null;
  agente: string | null;
};

/** IPv4 mapeado em IPv6 (`::ffff:187.1.2.3`) polui o laudo sem acrescentar nada. */
function limparIp(valor: string | undefined): string | null {
  const ip = (valor ?? '').trim().replace(/^::ffff:/i, '');

  return ip === '' ? null : ip.slice(0, 45);
}

/**
 * O navegador nunca fala com a API direto: as chamadas públicas passam pelo proxy do Next,
 * então o socket sempre traria o IP do servidor web. O endereço de quem agiu vem no
 * `x-forwarded-for`, e o primeiro da lista é o cliente original.
 */
export function contextoDaRequisicao(requisicao: Request): ContextoRequisicao {
  const encaminhado = requisicao.headers['x-forwarded-for'];
  const lista = Array.isArray(encaminhado) ? encaminhado[0] : encaminhado;
  const primeiro = (lista ?? '').split(',')[0];
  const agente = requisicao.headers['user-agent'];

  return {
    ip: limparIp(primeiro) ?? limparIp(requisicao.socket?.remoteAddress),
    agente: agente ? agente.slice(0, 255) : null,
  };
}

/** Navegador inteiro no laudo é ruído; o que identifica é o aparelho e o navegador. */
export function resumirAgente(agente: string | null): string {
  if (!agente) {
    return 'não informado';
  }

  const sistema = /\(([^)]+)\)/.exec(agente)?.[1]?.split(';')[0]?.trim();
  const navegador = /(Edg|OPR|Chrome|Firefox|Safari)\/[\d.]+/.exec(agente)?.[0];

  const nomes: Record<string, string> = { Edg: 'Edge', OPR: 'Opera' };
  const limpo = navegador
    ? navegador.replace(/^(\w+)\/([\d]+).*/, (_todo, nome: string, versao: string) =>
        `${nomes[nome] ?? nome} ${versao}`,
      )
    : null;

  // "Windows NT 10.0" e "Intel Mac OS X 10_15_7" não dizem nada a quem lê o laudo.
  const aparelho = sistema
    ?.replace(/Windows NT [\d.]+/, 'Windows')
    .replace(/Intel Mac OS X.*/, 'Mac')
    .slice(0, 24);

  return [limpo, aparelho].filter(Boolean).join(' · ') || agente.slice(0, 60);
}
