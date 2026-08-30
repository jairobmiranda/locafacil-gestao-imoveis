'use server';

import { publicoEnviar } from '@/lib/api-publico';
import { ErroApi } from '@/lib/api';

export type EstadoPagamento = { erro?: string; sucesso?: string };

const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const TAMANHO_MAXIMO = 15 * 1024 * 1024;

export async function informarPagamento(
  _anterior: EstadoPagamento,
  dados: FormData,
): Promise<EstadoPagamento> {
  const token = String(dados.get('token') ?? '');
  const arquivo = dados.get('comprovante');
  const comprovante = arquivo instanceof File && arquivo.size > 0 ? arquivo : null;

  if (comprovante && !TIPOS_ACEITOS.includes(comprovante.type)) {
    return { erro: 'Envie o comprovante em PDF ou imagem' };
  }

  if (comprovante && comprovante.size > TAMANHO_MAXIMO) {
    return { erro: 'O comprovante passa do limite de 15 MB' };
  }

  const envio = new FormData();
  envio.set('pagoEm', String(dados.get('pagoEm') ?? ''));
  envio.set('valor', String(dados.get('valor') ?? ''));
  envio.set('formaPagamento', String(dados.get('formaPagamento') ?? 'PIX'));

  const observacoes = String(dados.get('observacoes') ?? '').trim();

  if (observacoes) {
    envio.set('observacoes', observacoes);
  }

  if (comprovante) {
    envio.set('comprovante', comprovante);
  }

  try {
    await publicoEnviar(`/publico/pagamento/${token}`, envio);
  } catch (erro) {
    if (erro instanceof ErroApi) {
      return { erro: erro.message };
    }

    throw erro;
  }

  return { sucesso: 'Recebemos o seu aviso. Vamos conferir e confirmar o pagamento.' };
}
