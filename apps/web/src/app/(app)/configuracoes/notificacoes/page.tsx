import { apiGet } from '@/lib/api';
import type { Paginado } from '@/lib/tipos';
import { PainelEnvios } from './painel-envios';

type Notificacao = {
  id: string;
  lancamentoId: string | null;
  ocorrencia: number;
  destinatario: string;
  assunto: string;
  agendadoPara: string;
  enviadoEm: string | null;
  situacao: string;
  tentativas: number;
  mensagemErro: string | null;
};

export default async function PaginaNotificacoes() {
  const notificacoes = await apiGet<Paginado<Notificacao>>('/cobranca/notificacoes', {
    limite: 40,
  });

  return (
    <PainelEnvios
      notificacoes={notificacoes.itens}
      envioAtivo={process.env.EMAIL_ENVIO_ATIVO === 'true'}
    />
  );
}
