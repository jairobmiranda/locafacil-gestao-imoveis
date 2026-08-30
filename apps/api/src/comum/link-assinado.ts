import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Link publico sem tabela de tokens: o id vai assinado com HMAC, entao so
 * quem tem o segredo consegue forjar um endereco valido.
 */
function segredo(): string {
  const valor = process.env.LINK_PUBLICO_SEGREDO ?? process.env.JWT_SECRET;

  if (!valor) {
    throw new Error('Defina LINK_PUBLICO_SEGREDO ou JWT_SECRET para gerar links públicos');
  }

  return valor;
}

function assinar(proposito: string, id: string): string {
  return createHmac('sha256', segredo()).update(`${proposito}:${id}`).digest('base64url');
}

export function gerarTokenPublico(proposito: string, id: string): string {
  return `${Buffer.from(id).toString('base64url')}.${assinar(proposito, id)}`;
}

export function lerTokenPublico(proposito: string, token: string): string | null {
  const [corpo, assinatura] = token.split('.');

  if (!corpo || !assinatura) {
    return null;
  }

  const id = Buffer.from(corpo, 'base64url').toString('utf8');
  const esperada = Buffer.from(assinar(proposito, id));
  const recebida = Buffer.from(assinatura);

  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) {
    return null;
  }

  return id;
}
