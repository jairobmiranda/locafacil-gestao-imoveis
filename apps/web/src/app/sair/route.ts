import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSAO } from '@/lib/sessao';

/**
 * Saida de emergencia da sessao: um cookie que a API recusa levaria a um
 * pingue-pongue entre o middleware e as paginas protegidas. Aqui o cookie
 * morre antes do redirecionamento.
 */
export function GET(requisicao: NextRequest) {
  const destino = new URL('/login', requisicao.url);
  destino.searchParams.set('sessao', 'expirada');

  const resposta = NextResponse.redirect(destino);
  resposta.cookies.delete(COOKIE_SESSAO);

  return resposta;
}
