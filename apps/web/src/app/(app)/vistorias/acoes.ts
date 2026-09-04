'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiPost, apiPut, ErroApi } from '@/lib/api';

export type EstadoVistoria = { erro?: string; sucesso?: string };

function traduzir(erro: unknown): EstadoVistoria {
  if (erro instanceof ErroApi) {
    const detalhe = (erro.campos ?? []).map((item) => `${item.campo}: ${item.erro}`).join('; ');
    return { erro: [erro.message, detalhe].filter(Boolean).join(' ') };
  }

  throw erro;
}

/** A selecao de ambientes viaja como JSON num hidden: a lista e dinamica demais para campos soltos. */
function lerAmbientes(valor: FormDataEntryValue | null) {
  const conteudo = String(valor ?? '').trim();

  if (conteudo === '') {
    return undefined;
  }

  try {
    const analisado: unknown = JSON.parse(conteudo);

    return Array.isArray(analisado) && analisado.length > 0 ? analisado : undefined;
  } catch {
    return undefined;
  }
}

export async function criarVistoria(
  _anterior: EstadoVistoria,
  dados: FormData,
): Promise<EstadoVistoria> {
  let destino: string;

  try {
    const contratoId = String(dados.get('contratoId') ?? '').trim();
    const roteiroChave = String(dados.get('roteiroChave') ?? '').trim();
    const ambientes = lerAmbientes(dados.get('ambientes'));

    const vistoria = await apiPost<{ id: string }>('/vistorias', {
      imovelId: String(dados.get('imovelId') ?? ''),
      tipo: String(dados.get('tipo') ?? 'ENTRADA'),
      ...(contratoId ? { contratoId } : {}),
      ...(roteiroChave ? { roteiroChave } : {}),
      ...(ambientes ? { ambientes } : {}),
    });

    destino = `/vistorias/${vistoria.id}`;
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath('/vistorias');
  redirect(destino);
}

/** O primeiro marcado vira destinatario e o resto entra em copia, sem repetir endereco. */
function lerDestinatarios(dados: FormData) {
  const escolhidos = [
    ...dados.getAll('destinatarios').map((valor) => String(valor)),
    String(dados.get('outroEmail') ?? ''),
  ].map((email) => email.trim());

  return escolhidos.filter(
    (email, indice, lista) =>
      email !== '' &&
      lista.findIndex((outro) => outro.toLowerCase() === email.toLowerCase()) === indice,
  );
}

export async function enviarConvite(
  vistoriaId: string,
  _anterior: EstadoVistoria,
  dados: FormData,
): Promise<EstadoVistoria> {
  const [email, ...copias] = lerDestinatarios(dados);

  if (!email) {
    return { erro: 'Escolha ao menos um e-mail para receber o convite' };
  }

  // Campo em branco cai no padrao: zero seria recusado pelo contrato.
  const validadeDias = Number(dados.get('validadeDias')) || 15;

  try {
    await apiPost(`/vistorias/${vistoriaId}/convite`, {
      email,
      ...(copias.length ? { copias } : {}),
      validadeDias,
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath(`/vistorias/${vistoriaId}`);

  return {
    sucesso:
      copias.length > 0
        ? `Convite enviado para ${email}, com cópia para ${copias.join(', ')}`
        : `Convite enviado para ${email}`,
  };
}

export async function salvarAcompanhamento(
  vistoriaId: string,
  _anterior: EstadoVistoria,
  dados: FormData,
): Promise<EstadoVistoria> {
  const emails = dados.getAll('avisarEmails').map((valor) => String(valor).trim()).filter(Boolean);
  const avisarInicio = dados.get('avisarInicio') === 'on';
  const avisarConclusao = dados.get('avisarConclusao') === 'on';

  if ((avisarInicio || avisarConclusao) && emails.length === 0) {
    return { erro: 'Escolha ao menos um e-mail para receber os avisos' };
  }

  try {
    await apiPut(`/vistorias/${vistoriaId}/acompanhamento`, {
      emails,
      avisarInicio,
      avisarConclusao,
    });
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath(`/vistorias/${vistoriaId}`);

  return {
    sucesso:
      avisarInicio || avisarConclusao ? 'Avisos salvos' : 'Avisos desligados para esta vistoria',
  };
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

/** O laudo pode ser enviado quantas vezes for preciso: cada envio fica na linha do tempo. */
export async function enviarLaudo(
  vistoriaId: string,
  _anterior: EstadoVistoria,
  dados: FormData,
): Promise<EstadoVistoria> {
  const escolhidos = [
    ...dados.getAll('destinatariosLaudo').map((valor) => String(valor)),
    String(dados.get('outroEmailLaudo') ?? ''),
  ].map((email) => email.trim());

  const emails = escolhidos.filter(
    (email, indice, lista) =>
      email !== '' &&
      lista.findIndex((outro) => outro.toLowerCase() === email.toLowerCase()) === indice,
  );

  if (emails.length === 0) {
    return { erro: 'Escolha ao menos um e-mail para receber o laudo' };
  }

  const mensagem = String(dados.get('mensagem') ?? '').trim();

  let resultado: { destinatarios: string[]; anexado: boolean };

  try {
    resultado = await apiPost<{ destinatarios: string[]; anexado: boolean }>(
      `/vistorias/${vistoriaId}/laudo/enviar`,
      { emails, ...(mensagem ? { mensagem } : {}) },
    );
  } catch (erro) {
    return traduzir(erro);
  }

  revalidatePath(`/vistorias/${vistoriaId}`);

  return {
    sucesso:
      `Laudo enviado para ${resultado.destinatarios.join(', ')}` +
      (resultado.anexado ? ' com o PDF anexado.' : ' (só o link: o arquivo ficou grande demais).'),
  };
}
