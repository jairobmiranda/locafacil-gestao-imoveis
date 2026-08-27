'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiPatch, apiPost, apiUpload, ErroApi } from '@/lib/api';

export type EstadoFormulario = { erro?: string; campos?: Record<string, string> };

const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const TAMANHO_MAXIMO = 15 * 1024 * 1024;

function numero(valor: FormDataEntryValue | null): number | undefined {
  const texto = String(valor ?? '').trim();
  return texto === '' ? undefined : Number(texto);
}

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

export async function criarLancamento(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const corpo = {
    imovelId: String(dados.get('imovelId') ?? ''),
    categoriaId: String(dados.get('categoriaId') ?? ''),
    natureza: String(dados.get('natureza') ?? ''),
    descricao: String(dados.get('descricao') ?? ''),
    valor: numero(dados.get('valor')),
    competencia: texto(dados.get('competencia')),
    vencimento: texto(dados.get('vencimento')),
    capitalizavel: dados.get('capitalizavel') === 'on',
    observacoes: texto(dados.get('observacoes')),
  };

  let criado: { id: string };

  try {
    criado = await apiPost<{ id: string }>('/lancamentos', corpo);
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/lancamentos');
  redirect(`/lancamentos/${criado.id}`);
}

export async function baixarLancamento(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const id = String(dados.get('id') ?? '');
  const comprovante = dados.get('comprovante');

  if (!(comprovante instanceof File) || comprovante.size === 0) {
    return { erro: 'Anexe o comprovante do pagamento', campos: { comprovante: 'Obrigatório' } };
  }

  if (!TIPOS_ACEITOS.includes(comprovante.type)) {
    return {
      erro: 'Formato não aceito',
      campos: { comprovante: 'Use PDF, JPEG, PNG, WebP ou HEIC' },
    };
  }

  if (comprovante.size > TAMANHO_MAXIMO) {
    return { erro: 'Arquivo muito grande', campos: { comprovante: 'Limite de 15 MB' } };
  }

  try {
    // O comprovante precisa existir antes da baixa: a API recusa a baixa sem ele.
    const envio = new FormData();
    envio.set('arquivo', comprovante);
    envio.set('entidadeTipo', 'LANCAMENTO');
    envio.set('entidadeId', id);
    envio.set('especie', 'COMPROVANTE');

    const anexo = await apiUpload<{ id: string }>('/anexos', envio);

    await apiPatch(`/lancamentos/${id}/baixar`, {
      pagoEm: String(dados.get('pagoEm') ?? ''),
      valorPago: numero(dados.get('valorPago')),
      formaPagamento: String(dados.get('formaPagamento') ?? 'PIX'),
      anexoComprovanteId: anexo.id,
      observacoes: texto(dados.get('observacoes')),
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/lancamentos');
  revalidatePath(`/lancamentos/${id}`);

  return {};
}

export async function estornarLancamento(id: string): Promise<void> {
  await apiPatch(`/lancamentos/${id}/estornar`);
  revalidatePath('/lancamentos');
  revalidatePath(`/lancamentos/${id}`);
}

export async function cancelarLancamento(id: string): Promise<void> {
  await apiPatch(`/lancamentos/${id}/cancelar`);
  revalidatePath('/lancamentos');
  revalidatePath(`/lancamentos/${id}`);
}

export async function gerarPix(id: string): Promise<void> {
  await apiPost(`/pix/cobrancas/${id}`, {});
  revalidatePath(`/lancamentos/${id}`);
}
