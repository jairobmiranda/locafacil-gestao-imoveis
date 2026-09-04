import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/configuracao';

/**
 * Repasse para as rotas publicas da API. Existe para o navegador nao precisar
 * conhecer a URL da API (que so existe no servidor) e para evitar CORS.
 */
/** O aceite da vistoria registra IP e navegador: sem repassar, sobraria o endereço do web. */
function origem(requisicao: NextRequest): Record<string, string> {
  const encaminhado =
    requisicao.headers.get('x-forwarded-for') ?? requisicao.headers.get('x-real-ip');
  const agente = requisicao.headers.get('user-agent');

  return {
    ...(encaminhado ? { 'x-forwarded-for': encaminhado } : {}),
    ...(agente ? { 'user-agent': agente } : {}),
  };
}

async function repassar(
  requisicao: NextRequest,
  caminho: string[],
  metodo: 'PATCH' | 'POST' | 'DELETE',
) {
  const destino = `${API_URL}/publico/vistoria/${caminho.join('/')}`;
  const tipo = requisicao.headers.get('content-type') ?? '';
  const ehMultipart = tipo.startsWith('multipart/form-data');
  const semCorpo = metodo === 'DELETE';

  const resposta = await fetch(destino, {
    method: metodo,
    headers: ehMultipart
      ? origem(requisicao)
      : { 'Content-Type': 'application/json', ...origem(requisicao) },
    ...(semCorpo
      ? {}
      : { body: ehMultipart ? await requisicao.formData() : await requisicao.text() }),
    cache: 'no-store',
  });

  // 204 não pode carregar corpo: montar a resposta com string vazia estoura no runtime.
  if (resposta.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const corpo = await resposta.text();

  return new NextResponse(corpo, {
    status: resposta.status,
    headers: { 'Content-Type': resposta.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(
  requisicao: NextRequest,
  { params }: { params: Promise<{ caminho: string[] }> },
) {
  const { caminho } = await params;

  const resposta = await fetch(`${API_URL}/publico/vistoria/${caminho.join('/')}`, {
    headers: origem(requisicao),
    cache: 'no-store',
  });

  return new NextResponse(await resposta.text(), {
    status: resposta.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(
  requisicao: NextRequest,
  { params }: { params: Promise<{ caminho: string[] }> },
) {
  const { caminho } = await params;
  return repassar(requisicao, caminho, 'POST');
}

export async function PATCH(
  requisicao: NextRequest,
  { params }: { params: Promise<{ caminho: string[] }> },
) {
  const { caminho } = await params;
  return repassar(requisicao, caminho, 'PATCH');
}

export async function DELETE(
  requisicao: NextRequest,
  { params }: { params: Promise<{ caminho: string[] }> },
) {
  const { caminho } = await params;
  return repassar(requisicao, caminho, 'DELETE');
}
