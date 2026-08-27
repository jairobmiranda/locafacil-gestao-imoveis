'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { criarImovelSchema } from '@locafacil/contracts';
import { apiPatch, apiPost, ErroApi } from '@/lib/api';

export type EstadoFormulario = { erro?: string; campos?: Record<string, string> };

function numeroOuIndefinido(valor: FormDataEntryValue | null): number | undefined {
  const texto = String(valor ?? '').trim();
  return texto === '' ? undefined : Number(texto);
}

function textoOuIndefinido(valor: FormDataEntryValue | null): string | undefined {
  const texto = String(valor ?? '').trim();
  return texto === '' ? undefined : texto;
}

function extrair(dados: FormData) {
  return {
    apelido: String(dados.get('apelido') ?? ''),
    estrategia: String(dados.get('estrategia') ?? ''),
    situacao: String(dados.get('situacao') ?? 'PROSPECCAO'),
    tipo: String(dados.get('tipo') ?? ''),
    cep: textoOuIndefinido(dados.get('cep')),
    logradouro: textoOuIndefinido(dados.get('logradouro')),
    numero: textoOuIndefinido(dados.get('numero')),
    complemento: textoOuIndefinido(dados.get('complemento')),
    bairro: textoOuIndefinido(dados.get('bairro')),
    cidade: textoOuIndefinido(dados.get('cidade')),
    uf: textoOuIndefinido(dados.get('uf')),
    matricula: textoOuIndefinido(dados.get('matricula')),
    inscricaoMunicipal: textoOuIndefinido(dados.get('inscricaoMunicipal')),
    areaTotal: numeroOuIndefinido(dados.get('areaTotal')),
    areaConstruida: numeroOuIndefinido(dados.get('areaConstruida')),
    quartos: numeroOuIndefinido(dados.get('quartos')),
    vagas: numeroOuIndefinido(dados.get('vagas')),
    dataAquisicao: textoOuIndefinido(dados.get('dataAquisicao')),
    valorAquisicao: numeroOuIndefinido(dados.get('valorAquisicao')),
    valorVendaAlvo: numeroOuIndefinido(dados.get('valorVendaAlvo')),
    aluguelAlvo: numeroOuIndefinido(dados.get('aluguelAlvo')),
    observacoes: textoOuIndefinido(dados.get('observacoes')),
  };
}

function traduzirErro(erro: unknown): EstadoFormulario {
  if (erro instanceof ErroApi) {
    return {
      erro: erro.message,
      campos: Object.fromEntries((erro.campos ?? []).map((item) => [item.campo, item.erro])),
    };
  }

  throw erro;
}

export async function salvarImovel(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const id = String(dados.get('id') ?? '');
  const bruto = extrair(dados);

  // Valida no cliente com o mesmo schema da API, evitando ida e volta desnecessaria.
  const validado = criarImovelSchema.safeParse(bruto);

  if (!validado.success) {
    return {
      erro: 'Confira os campos destacados',
      campos: Object.fromEntries(
        validado.error.issues.map((problema) => [problema.path.join('.'), problema.message]),
      ),
    };
  }

  try {
    if (id) {
      await apiPatch(`/imoveis/${id}`, bruto);
    } else {
      const criado = await apiPost<{ id: string }>('/imoveis', bruto);
      revalidatePath('/imoveis');
      redirect(`/imoveis/${criado.id}`);
    }
  } catch (erro) {
    return traduzirErro(erro);
  }

  revalidatePath('/imoveis');
  revalidatePath(`/imoveis/${id}`);

  return {};
}

export async function arquivarImovel(id: string): Promise<void> {
  await apiPatch(`/imoveis/${id}/arquivar`);
  revalidatePath('/imoveis');
  revalidatePath(`/imoveis/${id}`);
}

export async function restaurarImovel(id: string): Promise<void> {
  await apiPatch(`/imoveis/${id}/restaurar`);
  revalidatePath('/imoveis');
  revalidatePath(`/imoveis/${id}`);
}
