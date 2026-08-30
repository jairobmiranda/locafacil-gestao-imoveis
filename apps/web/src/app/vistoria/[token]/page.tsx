import type { VistoriaPublica } from '@locafacil/contracts';
import { publicoGet } from '@/lib/api-publico';
import { AppVistoria } from './app-vistoria';
import './vistoria.css';

type Resposta = VistoriaPublica & { expirado: boolean };

export default async function PaginaVistoria({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let vistoria: Resposta;

  try {
    vistoria = await publicoGet<Resposta>(`/publico/vistoria/${token}`);
  } catch {
    return (
      <div className="vistoria-final">
        <h1>Link inválido</h1>
        <p className="texto-suave">
          Este endereço não corresponde a nenhuma vistoria. Confira se você copiou o link inteiro
          do e-mail.
        </p>
      </div>
    );
  }

  if (vistoria.expirado) {
    return (
      <div className="vistoria-final">
        <h1>Link expirado</h1>
        <p className="texto-suave">
          O prazo deste convite terminou. Peça um novo link para quem administra o imóvel.
        </p>
      </div>
    );
  }

  return <AppVistoria token={token} inicial={vistoria} />;
}
