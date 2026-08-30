'use server';

import { revalidatePath } from 'next/cache';
import { apiUpload, ErroApi } from '@/lib/api';

export type EstadoUpload = { erro?: string; sucesso?: boolean };

export async function enviarPdfAssinado(
  contratoId: string,
  minutaId: string,
  _anterior: EstadoUpload,
  dados: FormData,
): Promise<EstadoUpload> {
  const arquivo = dados.get('arquivo');

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: 'Selecione o PDF assinado' };
  }

  const envio = new FormData();
  envio.append('arquivo', arquivo);

  try {
    await apiUpload(`/minutas/${minutaId}/assinado`, envio);
  } catch (erro) {
    if (erro instanceof ErroApi) {
      return { erro: erro.message };
    }

    throw erro;
  }

  revalidatePath(`/contratos/${contratoId}/minuta/${minutaId}`);
  revalidatePath(`/contratos/${contratoId}`);

  return { sucesso: true };
}
