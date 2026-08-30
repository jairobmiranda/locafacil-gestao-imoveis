import { API_URL } from './configuracao';
import { ErroApi } from './api';

/** Rotas do link enviado por e-mail: sem sessao e sem redirecionar para o login. */
async function publico<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${API_URL}${caminho}`, { ...opcoes, cache: 'no-store' });
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

export const publicoGet = <T>(caminho: string) => publico<T>(caminho);

export const publicoEnviar = <T>(caminho: string, formulario: FormData) =>
  publico<T>(caminho, { method: 'POST', body: formulario });
