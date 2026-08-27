import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_SESSAO = 'locafacil_sessao';
const ROTAS_PUBLICAS = ['/login'];

export function middleware(requisicao: NextRequest) {
  const { pathname } = requisicao.nextUrl;
  const autenticado = Boolean(requisicao.cookies.get(COOKIE_SESSAO)?.value);
  const rotaPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));

  if (!autenticado && !rotaPublica) {
    const destino = new URL('/login', requisicao.url);
    destino.searchParams.set('proximo', pathname);
    return NextResponse.redirect(destino);
  }

  if (autenticado && rotaPublica) {
    return NextResponse.redirect(new URL('/dashboard', requisicao.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
