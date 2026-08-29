import { apiGet } from '@/lib/api';
import { PainelImplantacao } from './painel-implantacao';

export default async function PaginaImplantacao() {
  const webhooks = await apiGet<{ api: string | null; web: string | null }>(
    '/implantacao/webhooks',
  );

  return <PainelImplantacao webhooks={webhooks} />;
}
