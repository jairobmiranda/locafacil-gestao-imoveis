import { NextResponse, type NextRequest } from 'next/server';
import { obterToken } from '@/lib/sessao';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

/**
 * O navegador nao tem o JWT (fica em cookie httpOnly deste dominio), entao o
 * download precisa passar por aqui para receber o Authorization.
 */
export async function GET(
  _requisicao: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await obterToken();

  if (!token) {
    return NextResponse.redirect(new URL('/login', _requisicao.url));
  }

  const resposta = await fetch(`${API_URL}/anexos/${id}/conteudo`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!resposta.ok || !resposta.body) {
    return NextResponse.json({ mensagem: 'Anexo indisponível' }, { status: resposta.status });
  }

  return new NextResponse(resposta.body, {
    headers: {
      'Content-Type': resposta.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': resposta.headers.get('content-disposition') ?? 'attachment',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
