'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { AlertaMinuta, PapelParte, RespostasBlindagem } from '@locafacil/contracts';
import { apiPatch, apiPost, ErroApi } from '@/lib/api';

export type ParteEdicao = {
  pessoaId: string;
  papel: PapelParte;
  contatoPrincipal: boolean;
  participacao?: number;
  ordem: number;
};

export type Previa = {
  html: string;
  alertas: AlertaMinuta[];
  clausulas: { id: string; versao: number; titulo: string }[];
  nivelProtecao: number;
  protecaoMaxima: number;
};

export type Resultado = { erro?: string };
/** `erro` obrigatorio: e o que permite ao TypeScript estreitar `Previa | Falha`. */
export type Falha = { erro: string };

function traduzir(erro: unknown): Falha {
  if (erro instanceof ErroApi) {
    const detalhe = (erro.campos ?? []).map((item) => item.erro).join(' ');
    return { erro: [erro.message, detalhe].filter(Boolean).join(' ') };
  }

  throw erro;
}

export async function carregarPrevia(
  contratoId: string,
  respostas: RespostasBlindagem,
): Promise<Previa | Falha> {
  try {
    return await apiPost<Previa>(`/contratos/${contratoId}/minutas/previa`, { respostas });
  } catch (erro) {
    return traduzir(erro);
  }
}

export async function salvarPartes(
  contratoId: string,
  partes: ParteEdicao[],
): Promise<Resultado> {
  try {
    await apiPatch(`/contratos/${contratoId}`, { partes });
    revalidatePath(`/contratos/${contratoId}/minuta`);
    return {};
  } catch (erro) {
    return traduzir(erro);
  }
}

export async function salvarEnquadramento(
  contratoId: string,
  dados: {
    finalidade: string;
    tipoGarantia: string;
    valorGarantia?: number;
  },
): Promise<Resultado> {
  try {
    await apiPatch(`/contratos/${contratoId}`, dados);
    revalidatePath(`/contratos/${contratoId}/minuta`);
    return {};
  } catch (erro) {
    return traduzir(erro);
  }
}

export async function gerarMinuta(
  contratoId: string,
  respostas: RespostasBlindagem,
): Promise<Resultado> {
  let destino: string;

  try {
    const minuta = await apiPost<{ id: string }>(`/contratos/${contratoId}/minutas`, { respostas });
    destino = `/contratos/${contratoId}/minuta/${minuta.id}`;
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath(`/contratos/${contratoId}`);
  redirect(destino);
}

export async function enviarParaAssinatura(
  contratoId: string,
  minutaId: string,
): Promise<Resultado> {
  try {
    await apiPost(`/minutas/${minutaId}/enviar-assinatura`);
    revalidatePath(`/contratos/${contratoId}/minuta/${minutaId}`);
    return {};
  } catch (erro) {
    return traduzir(erro);
  }
}

export async function cancelarMinuta(contratoId: string, minutaId: string): Promise<Resultado> {
  try {
    await apiPost(`/minutas/${minutaId}/cancelar`);
    revalidatePath(`/contratos/${contratoId}/minuta/${minutaId}`);
    return {};
  } catch (erro) {
    return traduzir(erro);
  }
}
