import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/configuracao';

/**
 * Link do laudo que sai no e-mail. Repassa o PDF da API para o navegador não precisar
 * conhecê-la, e entrega sempre a versão vigente da vistoria.
 */
export async function GET(
  _requisicao: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const resposta = await fetch(`${API_URL}/publico/laudo/${token}`, { cache: 'no-store' });

  if (!resposta.ok || !resposta.body) {
    return new NextResponse(
      'Não foi possível abrir este laudo. Peça um link novo para quem administra o imóvel.',
      { status: resposta.status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  return new NextResponse(resposta.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': resposta.headers.get('content-disposition') ?? 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
