import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/configuracao';

/**
 * Repasse para as rotas publicas da API. Existe para o navegador nao precisar
 * conhecer a URL da API (que so existe no servidor) e para evitar CORS.
 */
async function repassar(requisicao: NextRequest, caminho: string[], metodo: 'PATCH' | 'POST') {
  const destino = `${API_URL}/publico/vistoria/${caminho.join('/')}`;
  const tipo = requisicao.headers.get('content-type') ?? '';
  const ehMultipart = tipo.startsWith('multipart/form-data');

  const resposta = await fetch(destino, {
    method: metodo,
    headers: ehMultipart ? undefined : { 'Content-Type': 'application/json' },
    body: ehMultipart ? await requisicao.formData() : await requisicao.text(),
    cache: 'no-store',
  });

  const corpo = await resposta.text();

  return new NextResponse(corpo, {
    status: resposta.status,
    headers: { 'Content-Type': resposta.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(
  _requisicao: NextRequest,
  { params }: { params: Promise<{ caminho: string[] }> },
) {
  const { caminho } = await params;

  const resposta = await fetch(`${API_URL}/publico/vistoria/${caminho.join('/')}`, {
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
