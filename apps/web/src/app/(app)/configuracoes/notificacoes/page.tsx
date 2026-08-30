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
  const [notificacoes, pendentes, configuracao] = await Promise.all([
    apiGet<Paginado<Notificacao>>('/cobranca/notificacoes', { limite: 40 }),
    apiGet<Paginado<Notificacao>>('/cobranca/notificacoes', {
      situacao: 'PENDENTE',
      limite: 100,
    }),
    apiGet<{ envioAtivo: boolean; emailsGestor: string[] }>('/cobranca/configuracao'),
  ]);

  return (
    <PainelEnvios
      notificacoes={notificacoes.itens}
      pendentes={pendentes.itens}
      envioAtivo={configuracao.envioAtivo}
      emailsGestor={configuracao.emailsGestor}
    />
  );
}
