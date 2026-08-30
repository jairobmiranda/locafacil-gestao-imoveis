'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiPost, ErroApi } from '@/lib/api';

export type EstadoVistoria = { erro?: string; sucesso?: string };

function traduzir(erro: unknown): EstadoVistoria {
  if (erro instanceof ErroApi) {
    const detalhe = (erro.campos ?? []).map((item) => `${item.campo}: ${item.erro}`).join('; ');
    return { erro: [erro.message, detalhe].filter(Boolean).join(' ') };
  }

  throw erro;
}

export async function criarVistoria(
  _anterior: EstadoVistoria,
  dados: FormData,
): Promise<EstadoVistoria> {
  let destino: string;

  try {
    const contratoId = String(dados.get('contratoId') ?? '').trim();

    const vistoria = await apiPost<{ id: string }>('/vistorias', {
      imovelId: String(dados.get('imovelId') ?? ''),
      tipo: String(dados.get('tipo') ?? 'ENTRADA'),
      ...(contratoId ? { contratoId } : {}),
    });

    destino = `/vistorias/${vistoria.id}`;
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/vistorias');
  redirect(destino);
}

export async function enviarConvite(
  vistoriaId: string,
  _anterior: EstadoVistoria,
  dados: FormData,
): Promise<EstadoVistoria> {
  try {
    await apiPost(`/vistorias/${vistoriaId}/convite`, {
      email: String(dados.get('email') ?? ''),
      validadeDias: Number(dados.get('validadeDias') ?? 15),
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath(`/vistorias/${vistoriaId}`);

  return { sucesso: 'Convite enviado' };
}

export async function aprovarVistoria(vistoriaId: string): Promise<void> {
  await apiPost(`/vistorias/${vistoriaId}/aprovar`);
  revalidatePath(`/vistorias/${vistoriaId}`);
}

export async function recusarVistoria(vistoriaId: string, motivo: string): Promise<void> {
  await apiPost(`/vistorias/${vistoriaId}/recusar`, { motivo });
  revalidatePath(`/vistorias/${vistoriaId}`);
}

export async function gerarLaudo(vistoriaId: string): Promise<void> {
  await apiPost(`/vistorias/${vistoriaId}/laudo`);
  revalidatePath(`/vistorias/${vistoriaId}`);
}
