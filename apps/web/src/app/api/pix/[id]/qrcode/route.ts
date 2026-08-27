import { NextResponse, type NextRequest } from 'next/server';
import { obterToken } from '@/lib/sessao';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

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
    return NextResponse.json({ mensagem: 'QR Code indisponível' }, { status: resposta.status });
  }

  return new NextResponse(resposta.body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  });
}
