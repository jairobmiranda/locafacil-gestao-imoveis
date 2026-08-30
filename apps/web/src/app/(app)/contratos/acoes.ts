'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiPatch, apiPost, ErroApi } from '@/lib/api';

export type EstadoFormulario = { erro?: string; campos?: Record<string, string> };

function numero(valor: FormDataEntryValue | null, padrao?: number): number | undefined {
  const conteudo = String(valor ?? '').trim();
  return conteudo === '' ? padrao : Number(conteudo);
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

/** Os encargos recorrentes chegam como listas paralelas vindas do formulario dinamico. */
function extrairItens(dados: FormData) {
  const descricoes = dados.getAll('itemDescricao').map(String);
  const valores = dados.getAll('itemValor').map(String);
  const categorias = dados.getAll('itemCategoria').map(String);

  return descricoes
    .map((descricao, indice) => ({
      descricao: descricao.trim(),
      valor: Number(valores[indice] ?? 0),
      categoriaId: categorias[indice] ?? '',
      ativo: true,
    }))
    .filter((item) => item.descricao !== '' && item.valor > 0 && item.categoriaId !== '');
}

export async function criarContrato(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const inquilinoId = String(dados.get('inquilinoId') ?? '');
  const fiadorId = texto(dados.get('fiadorId'));

  const partes = [
    { pessoaId: inquilinoId, papel: 'INQUILINO' as const, contatoPrincipal: true },
    ...(fiadorId
      ? [{ pessoaId: fiadorId, papel: 'FIADOR' as const, contatoPrincipal: false }]
      : []),
  ];

  const corpo = {
    imovelId: String(dados.get('imovelId') ?? ''),
    dataInicio: texto(dados.get('dataInicio')),
    dataFim: texto(dados.get('dataFim')),
    diaVencimento: numero(dados.get('diaVencimento'), 10),
    valorAluguel: numero(dados.get('valorAluguel')),
    percentualMulta: numero(dados.get('percentualMulta'), 2),
    percentualJurosDia: numero(dados.get('percentualJurosDia'), 0.033),
    descontoPontualidade: numero(dados.get('descontoPontualidade'), 0),
    indiceReajuste: String(dados.get('indiceReajuste') ?? 'IGPM'),
    intervaloReajusteMeses: numero(dados.get('intervaloReajusteMeses'), 12),
    tipoGarantia: String(dados.get('tipoGarantia') ?? 'NENHUMA'),
    valorGarantia: numero(dados.get('valorGarantia')),
    chavePixId: texto(dados.get('chavePixId')),
    diasAvisoEncerramento: numero(dados.get('diasAvisoEncerramento'), 90),
    diasAntecedenciaGeracao: numero(dados.get('diasAntecedenciaGeracao'), 10),
    gerarCobrancas: dados.get('gerarCobrancas') === 'on',
    observacoes: texto(dados.get('observacoes')),
    emailsCopia: texto(dados.get('emailsCopia')) ?? null,
    itens: extrairItens(dados),
    partes,
  };

  let criado: { id: string };

  try {
    criado = await apiPost<{ id: string }>('/contratos', corpo);
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/contratos');
  redirect(`/contratos/${criado.id}`);
}

export async function ativarContrato(id: string): Promise<void> {
  await apiPatch(`/contratos/${id}/ativar`);
  revalidatePath('/contratos');
  revalidatePath(`/contratos/${id}`);
}

export async function encerrarContrato(id: string, dataRescisao?: string): Promise<void> {
  await apiPatch(`/contratos/${id}/encerrar`, dataRescisao ? { dataRescisao } : {});
  revalidatePath('/contratos');
  revalidatePath(`/contratos/${id}`);
}

export async function reajustarContrato(id: string, percentual: number): Promise<void> {
  await apiPatch(`/contratos/${id}/reajustar`, { percentual });
  revalidatePath('/contratos');
  revalidatePath(`/contratos/${id}`);
}

export async function gerarCobrancasAgora(): Promise<void> {
  await apiPost('/contratos/gerar-cobrancas');
  revalidatePath('/lancamentos');
  revalidatePath('/contratos');
}
