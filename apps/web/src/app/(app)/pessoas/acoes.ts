'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiPatch, apiPost, ErroApi } from '@/lib/api';

export type EstadoFormulario = { erro?: string; campos?: Record<string, string> };

function texto(valor: FormDataEntryValue | null): string | undefined {
  const conteudo = String(valor ?? '').trim();
  return conteudo === '' ? undefined : conteudo;
}

function traduzir(erro: unknown): EstadoFormulario {
  if (erro instanceof ErroApi) {
    return {
      erro: erro.message,
      campos: Object.fromEntries((erro.campos ?? []).map((item) => [item.campo, item.erro])),
    };
  }

  throw erro;
}

export async function salvarPessoa(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const id = String(dados.get('id') ?? '');

  const corpo = {
    nome: String(dados.get('nome') ?? ''),
    documento: texto(dados.get('documento')),
    email: texto(dados.get('email')),
    telefone: texto(dados.get('telefone')),
    dataNascimento: texto(dados.get('dataNascimento')),
    cep: texto(dados.get('cep')),
    logradouro: texto(dados.get('logradouro')),
    numero: texto(dados.get('numero')),
    complemento: texto(dados.get('complemento')),
    bairro: texto(dados.get('bairro')),
    cidade: texto(dados.get('cidade')),
    uf: texto(dados.get('uf')),
    observacoes: texto(dados.get('observacoes')),
  };

  try {
    if (id) {
      await apiPatch(`/pessoas/${id}`, corpo);
    } else {
      const criada = await apiPost<{ id: string }>('/pessoas', corpo);
      revalidatePath('/pessoas');
      redirect(`/pessoas/${criada.id}`);
    }
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/pessoas');
  revalidatePath(`/pessoas/${id}`);

  return {};
}

export async function arquivarPessoa(id: string): Promise<void> {
  await apiPatch(`/pessoas/${id}/arquivar`);
  revalidatePath('/pessoas');
  revalidatePath(`/pessoas/${id}`);
}

export async function restaurarPessoa(id: string): Promise<void> {
  await apiPatch(`/pessoas/${id}/restaurar`);
  revalidatePath('/pessoas');
  revalidatePath(`/pessoas/${id}`);
}
