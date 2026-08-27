import { Prisma } from '@prisma/client';
import { calcularEncargos } from '../lancamentos/encargos';

const FORMATO_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const FORMATO_MES = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const CID_QRCODE = 'qrcode-pix';

/** Valores vindos do banco entram em HTML de modelo editavel pelo usuario. */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type LancamentoParaEmail = Prisma.LancamentoGetPayload<{
  include: {
    itens: true;
    imovel: true;
    contrato: true;
  };
}>;

export function montarVariaveis(
  lancamento: LancamentoParaEmail,
  inquilino: { nome: string },
  referencia: Date,
): Record<string, string> {
  const encargos = calcularEncargos(
    lancamento.valor,
    lancamento.vencimento,
    referencia,
    lancamento.contrato,
  );

  const endereco = [
    lancamento.imovel.logradouro,
    lancamento.imovel.numero,
    lancamento.imovel.bairro,
    lancamento.imovel.cidade,
  ]
    .filter(Boolean)
    .join(', ');

  const itens = lancamento.itens.length
    ? `<table style="border-collapse:collapse">${lancamento.itens
        .map(
          (item) =>
            `<tr><td style="padding:4px 12px 4px 0">${escaparHtml(item.descricao)}</td>` +
            `<td style="padding:4px 0;text-align:right">${FORMATO_MOEDA.format(item.valor.toNumber())}</td></tr>`,
        )
        .join('')}</table>`
    : '';

  return {
    'inquilino.nome': escaparHtml(inquilino.nome),
    'inquilino.primeiro_nome': escaparHtml(inquilino.nome.split(' ')[0] ?? inquilino.nome),
    'imovel.apelido': escaparHtml(lancamento.imovel.apelido),
    'imovel.endereco': escaparHtml(endereco),
    'cobranca.competencia': FORMATO_MES.format(lancamento.competencia),
    'cobranca.descricao': escaparHtml(lancamento.descricao),
    'cobranca.vencimento': lancamento.vencimento ? FORMATO_DATA.format(lancamento.vencimento) : '',
    'cobranca.valor': FORMATO_MOEDA.format(lancamento.valor.toNumber()),
    'cobranca.valor_total': FORMATO_MOEDA.format(encargos.totalDevido.toNumber()),
    'cobranca.valor_multa': FORMATO_MOEDA.format(encargos.valorMulta.toNumber()),
    'cobranca.valor_juros': FORMATO_MOEDA.format(encargos.valorJuros.toNumber()),
    'cobranca.dias_atraso': String(encargos.diasAtraso),
    'cobranca.itens': itens,
    'pix.copia_e_cola': escaparHtml(lancamento.pixPayload ?? ''),
    'pix.qrcode': lancamento.pixPayload
      ? `<img src="cid:${CID_QRCODE}" alt="QR Code Pix" width="220" height="220" />`
      : '',
  };
}

export function renderizar(modelo: string, variaveis: Record<string, string>): string {
  return modelo.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (original, chave: string) =>
    chave in variaveis ? (variaveis[chave] as string) : original,
  );
}

export function paraTextoSimples(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
