import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_SESSAO = 'locafacil_sessao';
const ROTAS_PUBLICAS = [
  '/login',
  '/pagamento',
  '/sair',
  '/vistoria',
  '/api/vistoria',
  '/api/vistoria-foto',
];

/**
 * Le o `exp` do JWT sem validar a assinatura: serve para descartar cedo um
 * cookie vencido, evitando mandar o usuario para uma area que a API vai negar.
 */
function tokenValido(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  try {
    const conteudo = token.split('.')[1];

    if (!conteudo) {
      return false;
    }

    const { exp } = JSON.parse(atob(conteudo.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };

    return typeof exp === 'number' ? exp * 1000 > Date.now() : true;
  } catch {
    return false;
  }
}

export function middleware(requisicao: NextRequest) {
  const { pathname } = requisicao.nextUrl;
  const cookie = requisicao.cookies.get(COOKIE_SESSAO)?.value;
  const autenticado = tokenValido(cookie);
  const rotaPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));

  if (!autenticado && !rotaPublica) {
    const destino = new URL('/login', requisicao.url);
    destino.searchParams.set('proximo', pathname);

    const resposta = NextResponse.redirect(destino);

    // Cookie vencido some aqui; mante-lo faria o proximo acesso repetir o desvio.
    if (cookie) {
      resposta.cookies.delete(COOKIE_SESSAO);
    }

    return resposta;
  }

  // O link do e-mail precisa abrir mesmo para quem esta logado no painel.
  if (autenticado && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', requisicao.url));
  }

  return NextResponse.next();
}

export const config = {
  // Os arquivos do PWA precisam responder antes do login, senao o navegador nao instala o app.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.png).*)',
  ],
};
