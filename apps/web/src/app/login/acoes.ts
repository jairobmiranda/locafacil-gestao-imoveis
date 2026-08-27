'use server';

import { redirect } from 'next/navigation';
import type { RespostaLogin } from '@locafacil/contracts';
import { gravarToken, limparToken } from '@/lib/sessao';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 24 * 7;

export type EstadoLogin = { erro?: string };

export async function entrar(_anterior: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const email = String(dados.get('email') ?? '');
  const senha = String(dados.get('senha') ?? '');
  const proximo = String(dados.get('proximo') ?? '/imoveis');

  const resposta = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
    cache: 'no-store',
  }).catch(() => null);

  if (!resposta) {
    return { erro: 'Não foi possível falar com o servidor' };
  }

  if (!resposta.ok) {
    return { erro: 'E-mail ou senha inválidos' };
  }

  const { token } = (await resposta.json()) as RespostaLogin;

  await gravarToken(token, DURACAO_SESSAO_SEGUNDOS);

  redirect(proximo.startsWith('/') ? proximo : '/imoveis');
}

export async function sair(): Promise<void> {
  await limparToken();
  redirect('/login');
}
