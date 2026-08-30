import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from '@/lib/configuracao';

/** Miniatura ja enviada. O identificador e um UUID opaco, sem enumeracao util. */
export async function GET(
  _requisicao: NextRequest,
  { params }: { params: Promise<{ fotoId: string }> },
) {
  const { fotoId } = await params;

  const resposta = await fetch(`${API_URL}/publico/vistoria-foto/${fotoId}`, {
    cache: 'no-store',
  });

  if (!resposta.ok || !resposta.body) {
    return NextResponse.json({ mensagem: 'Foto indisponível' }, { status: resposta.status });
  }

  return new NextResponse(resposta.body, {
    headers: {
      'Content-Type': resposta.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
