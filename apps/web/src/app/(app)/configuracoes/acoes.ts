'use server';

import { revalidatePath } from 'next/cache';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, ErroApi } from '@/lib/api';

export type EstadoFormulario = { erro?: string; sucesso?: string; campos?: Record<string, string> };

function texto(valor: FormDataEntryValue | null): string | undefined {
  const conteudo = String(valor ?? '').trim();
  return conteudo === '' ? undefined : conteudo;
}

function numeroOuNulo(valor: FormDataEntryValue | null): number | null {
  const conteudo = String(valor ?? '').trim();
  return conteudo === '' ? null : Number(conteudo);
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

// ----- Chaves Pix -----

export async function criarChavePix(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiPost('/pix/chaves', {
      tipoChave: String(dados.get('tipoChave') ?? ''),
      chave: String(dados.get('chave') ?? '').trim(),
      nomeBeneficiario: String(dados.get('nomeBeneficiario') ?? '').trim(),
      cidadeBeneficiario: String(dados.get('cidadeBeneficiario') ?? '').trim(),
      padrao: dados.get('padrao') === 'on',
      ativa: true,
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/pix');

  return { sucesso: 'Chave cadastrada' };
}

export async function definirChavePadrao(id: string): Promise<void> {
  await apiPatch(`/pix/chaves/${id}`, { padrao: true });
  revalidatePath('/configuracoes/pix');
}

export async function alternarChaveAtiva(id: string, ativa: boolean): Promise<void> {
  await apiPatch(`/pix/chaves/${id}`, { ativa });
  revalidatePath('/configuracoes/pix');
}

export async function removerChavePix(id: string): Promise<void> {
  await apiDelete(`/pix/chaves/${id}`);
  revalidatePath('/configuracoes/pix');
}

// ----- Categorias -----

export async function salvarCategoria(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const id = texto(dados.get('id'));

  const corpo = {
    nome: String(dados.get('nome') ?? '').trim(),
    categoriaPaiId: texto(dados.get('categoriaPaiId')) ?? null,
    capitalizavelPadrao: dados.get('capitalizavelPadrao') === 'on',
    codigoFiscal: texto(dados.get('codigoFiscal')) ?? null,
  };

  try {
    if (id) {
      await apiPatch(`/categorias/${id}`, corpo);
    } else {
      await apiPost('/categorias', {
        ...corpo,
        categoriaPaiId: corpo.categoriaPaiId ?? undefined,
        codigoFiscal: corpo.codigoFiscal ?? undefined,
        natureza: String(dados.get('natureza') ?? 'SAIDA'),
        ativa: true,
      });
    }
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/categorias');

  return { sucesso: id ? 'Categoria atualizada' : 'Categoria cadastrada' };
}

export async function alternarCategoriaAtiva(id: string, ativa: boolean): Promise<void> {
  await apiPatch(`/categorias/${id}`, { ativa });
  revalidatePath('/configuracoes/categorias');
}

export async function removerCategoria(id: string): Promise<void> {
  await apiDelete(`/categorias/${id}`);
  revalidatePath('/configuracoes/categorias');
}

// ----- Feriados -----

export async function salvarFeriado(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const id = texto(dados.get('id'));

  const corpo = {
    data: String(dados.get('data') ?? ''),
    descricao: String(dados.get('descricao') ?? '').trim(),
  };

  try {
    if (id) {
      await apiPatch(`/feriados/${id}`, corpo);
    } else {
      await apiPost('/feriados', corpo);
    }
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/feriados');

  return { sucesso: id ? 'Feriado atualizado' : 'Feriado cadastrado' };
}

export async function removerFeriado(id: string): Promise<void> {
  await apiDelete(`/feriados/${id}`);
  revalidatePath('/configuracoes/feriados');
}

// ----- Modelos de e-mail -----

export async function salvarModelo(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const id = texto(dados.get('id'));

  const corpo = {
    nome: String(dados.get('nome') ?? '').trim(),
    assunto: String(dados.get('assunto') ?? '').trim(),
    corpoHtml: String(dados.get('corpoHtml') ?? ''),
    ativo: dados.get('ativo') === 'on',
  };

  try {
    if (id) {
      await apiPatch(`/cobranca/modelos/${id}`, corpo);
    } else {
      await apiPost('/cobranca/modelos', {
        ...corpo,
        chave: String(dados.get('chave') ?? '').trim(),
      });
    }
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/modelos');

  return { sucesso: 'Modelo salvo' };
}

export async function removerModelo(id: string): Promise<void> {
  await apiDelete(`/cobranca/modelos/${id}`);
  revalidatePath('/configuracoes/modelos');
}

// ----- Regua -----

export async function criarRegua(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiPost('/cobranca/reguas', {
      nome: String(dados.get('nome') ?? '').trim(),
      padrao: dados.get('padrao') === 'on',
      ativa: true,
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/regua');

  return { sucesso: 'Régua criada' };
}

export async function definirModeloConsolidado(
  id: string,
  modeloConsolidadoId: string | null,
): Promise<void> {
  await apiPatch(`/cobranca/reguas/${id}`, { modeloConsolidadoId });
  revalidatePath('/configuracoes/regua');
}

export async function salvarRegra(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const id = texto(dados.get('id'));
  const reguaId = String(dados.get('reguaId') ?? '');

  const corpo = {
    diasOffset: Number(dados.get('diasOffset') ?? 0),
    intervaloRepeticaoDias: numeroOuNulo(dados.get('intervaloRepeticaoDias')),
    maximoRepeticoes: numeroOuNulo(dados.get('maximoRepeticoes')),
    modeloEmailId: String(dados.get('modeloEmailId') ?? ''),
    horaEnvio: String(dados.get('horaEnvio') ?? '09:00'),
    apenasSeSituacao: texto(dados.get('apenasSeSituacao')) ?? null,
  };

  try {
    if (id) {
      await apiPatch(`/cobranca/regras/${id}`, corpo);
    } else {
      await apiPost(`/cobranca/reguas/${reguaId}/regras`, { ...corpo, ativa: true });
    }
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/regua');

  return { sucesso: id ? 'Etapa atualizada' : 'Etapa adicionada' };
}

export async function removerRegra(id: string): Promise<void> {
  await apiDelete(`/cobranca/regras/${id}`);
  revalidatePath('/configuracoes/regua');
}

export async function alternarRegraAtiva(id: string, ativa: boolean): Promise<void> {
  await apiPatch(`/cobranca/regras/${id}`, { ativa });
  revalidatePath('/configuracoes/regua');
}

// ----- Envio -----

export async function testarEmail(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiPost('/cobranca/testar-email', {
      destinatario: String(dados.get('destinatario') ?? '').trim(),
    });
  } catch (erro) {
    return traduzir(erro);
  }

  return { sucesso: 'E-mail de teste enviado. Confira a caixa de entrada e o spam.' };
}

export async function salvarEmailsGestor(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiPut('/cobranca/configuracao/emails-gestor', {
      emailsGestor: String(dados.get('emailsGestor') ?? ''),
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/notificacoes');

  return { sucesso: 'Destinatários salvos' };
}

export async function salvarParametrosCobranca(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiPut('/cobranca/configuracao/parametros', {
      maximoEmailsDia: String(dados.get('maximoEmailsDia') ?? '1'),
      janelaRecuperacaoDias: String(dados.get('janelaRecuperacaoDias') ?? '3'),
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/notificacoes');

  return { sucesso: 'Parâmetros salvos' };
}

export async function agendarRegua(): Promise<void> {
  await apiPost('/cobranca/agendar');
  revalidatePath('/configuracoes/notificacoes');
}

export async function processarFila(): Promise<void> {
  await apiPost('/cobranca/processar-fila');
  revalidatePath('/configuracoes/notificacoes');
}

export async function reenviarNotificacao(id: string): Promise<void> {
  await apiPost(`/cobranca/notificacoes/${id}/reenviar`);
  revalidatePath('/configuracoes/notificacoes');
}

export type NotificacaoDetalhe = {
  id: string;
  destinatario: string;
  copia: string | null;
  assunto: string;
  corpoRenderizado: string;
  agendadoPara: string;
  enviadoEm: string | null;
  situacao: string;
  tentativas: number;
  mensagemErro: string | null;
};

export async function obterNotificacao(id: string): Promise<NotificacaoDetalhe> {
  return apiGet<NotificacaoDetalhe>(`/cobranca/notificacoes/${id}`);
}

export async function cancelarNotificacao(id: string): Promise<void> {
  await apiPost(`/cobranca/notificacoes/${id}/cancelar`);
  revalidatePath('/configuracoes/notificacoes');
}

// ----- Implantacao -----

export async function salvarWebhooks(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiPut('/implantacao/webhooks', {
      api: texto(dados.get('api')) ?? null,
      web: texto(dados.get('web')) ?? null,
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/implantacao');

  return { sucesso: 'Webhooks salvos' };
}

export async function publicar(alvo: 'api' | 'web'): Promise<void> {
  await apiPost(`/implantacao/publicar/${alvo}`);
}

// ----- Usuarios -----

export async function criarUsuario(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiPost('/usuarios', {
      nome: String(dados.get('nome') ?? '').trim(),
      email: String(dados.get('email') ?? '').trim(),
      senha: String(dados.get('senha') ?? ''),
      perfil: String(dados.get('perfil') ?? 'OPERADOR'),
      ativo: true,
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/usuarios');

  return { sucesso: 'Usuário cadastrado' };
}

export async function alternarUsuarioAtivo(id: string, ativo: boolean): Promise<void> {
  await apiPatch(`/usuarios/${id}`, { ativo });
  revalidatePath('/configuracoes/usuarios');
}

export async function alterarPerfilUsuario(id: string, perfil: string): Promise<void> {
  await apiPatch(`/usuarios/${id}`, { perfil });
  revalidatePath('/configuracoes/usuarios');
}

export async function redefinirSenhaUsuario(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiPatch(`/usuarios/${String(dados.get('id') ?? '')}`, {
      senha: String(dados.get('senha') ?? ''),
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/configuracoes/usuarios');

  return { sucesso: 'Senha redefinida' };
}
