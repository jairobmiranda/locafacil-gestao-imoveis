import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { BotaoImprimir } from './botao-imprimir';
import '../../minuta.css';

type MinutaImpressao = {
  id: string;
  contratoId: string;
  versao: number;
  hashConteudo: string;
  conteudoHtml: string;
};

export default async function PaginaImpressao({
  params,
}: {
  params: Promise<{ id: string; minutaId: string }>;
}) {
  const { id, minutaId } = await params;
  const minuta = await apiGet<MinutaImpressao>(`/minutas/${minutaId}`);

  const identificacao = `Minuta ${minuta.id.slice(0, 8)} · versão ${minuta.versao} · SHA-256 ${minuta.hashConteudo.slice(0, 16)}`;

  return (
    <>
      <div className="barra-impressao nao-imprimir">
        <BotaoImprimir />
        <Link href={`/contratos/${id}/minuta/${minutaId}`} className="botao">
          Voltar
        </Link>
        <p className="texto-suave">
          No diálogo de impressão escolha destino &quot;Salvar como PDF&quot;, papel A4 e margens
          padrão. Mantenha &quot;gráficos de segundo plano&quot; desligado.
        </p>
      </div>

      <div className="folha">
        <div dangerouslySetInnerHTML={{ __html: minuta.conteudoHtml }} />
      </div>

      <div className="rodape-documento">{identificacao}</div>
    </>
  );
}
