import { cookies } from 'next/headers';

export const COOKIE_SESSAO = 'locafacil_sessao';

export async function obterToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_SESSAO)?.value;
}

export async function gravarToken(token: string, duracaoSegundos: number): Promise<void> {
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: duracaoSegundos,
  });
}

export async function limparToken(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSAO);
}
