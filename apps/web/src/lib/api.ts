import { redirect } from 'next/navigation';
import { API_URL } from './configuracao';
import { obterToken } from './sessao';

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly campos?: { campo: string; erro: string }[],
  ) {
    super(mensagem);
  }
}

type Opcoes = RequestInit & { query?: Record<string, unknown> };

function montarUrl(caminho: string, query?: Record<string, unknown>): string {
  const url = new URL(`${API_URL}${caminho}`);

  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, String(valor));
    }
  }

  return url.toString();
}

/** Executado apenas no servidor, para o token nunca chegar ao bundle do navegador. */
export async function api<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const token = await obterToken();
  const { query, ...resto } = opcoes;

  const resposta = await fetch(montarUrl(caminho, query), {
    ...resto,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...resto.headers,
    },
    cache: 'no-store',
  });

  if (resposta.status === 401) {
    redirect('/login');
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ErroApi(
      resposta.status,
      corpo?.mensagem ?? corpo?.message ?? 'Não foi possível concluir a operação',
      corpo?.erros,
    );
  }

  return corpo as T;
}

export const apiGet = <T>(caminho: string, query?: Record<string, unknown>) =>
  api<T>(caminho, { query });

export const apiPost = <T>(caminho: string, corpo?: unknown) =>
  api<T>(caminho, { method: 'POST', body: corpo ? JSON.stringify(corpo) : undefined });

export const apiPatch = <T>(caminho: string, corpo?: unknown) =>
  api<T>(caminho, { method: 'PATCH', body: corpo ? JSON.stringify(corpo) : undefined });

export const apiDelete = <T>(caminho: string) => api<T>(caminho, { method: 'DELETE' });

/** O Content-Type do multipart precisa do boundary gerado pelo fetch, entao nao pode ser fixado. */
export async function apiUpload<T>(caminho: string, formulario: FormData): Promise<T> {
  const token = await obterToken();

  const resposta = await fetch(montarUrl(caminho), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formulario,
    cache: 'no-store',
  });

  if (resposta.status === 401) {
    redirect('/login');
  }

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ErroApi(
      resposta.status,
      corpo?.mensagem ?? corpo?.message ?? 'Não foi possível enviar o arquivo',
      corpo?.erros,
    );
  }

  return corpo as T;
}
