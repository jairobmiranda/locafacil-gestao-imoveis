import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/configuracao';
import { obterToken } from '@/lib/sessao';

export async function GET(
  requisicao: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await obterToken();

  if (!token) {
    return NextResponse.redirect(new URL('/login', requisicao.url));
  }

  const resposta = await fetch(`${API_URL}/pix/cobrancas/${id}/qrcode`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!resposta.ok || !resposta.body) {
    const detalhe = await resposta.text().catch(() => '');

    return NextResponse.json(
      { mensagem: 'QR Code indisponível', status: resposta.status, detalhe: detalhe.slice(0, 500) },
      { status: resposta.status === 200 ? 502 : resposta.status },
    );
  }

  return new NextResponse(resposta.body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  });
}
