'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { rotular } from '@/lib/formato';

const SITUACOES = ['PENDENTE', 'PAGO', 'ATRASADO', 'PARCIAL', 'CANCELADO'];

export function FiltrosLancamentos({ imoveis }: { imoveis: { id: string; apelido: string }[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function aplicar(chave: string, valor: string) {
    const novos = new URLSearchParams(parametros.toString());

    valor ? novos.set(chave, valor) : novos.delete(chave);
    novos.delete('pagina');

    iniciar(() => router.replace(`${caminho}?${novos.toString()}`));
  }

  return (
    <div className={pendente ? 'filtros carregando' : 'filtros'}>
      <select
        defaultValue={parametros.get('imovelId') ?? ''}
        onChange={(evento) => aplicar('imovelId', evento.target.value)}
      >
        <option value="">Todos os imóveis</option>
        {imoveis.map((imovel) => (
          <option key={imovel.id} value={imovel.id}>
            {imovel.apelido}
          </option>
        ))}
      </select>

      <select
        defaultValue={parametros.get('natureza') ?? ''}
        onChange={(evento) => aplicar('natureza', evento.target.value)}
      >
        <option value="">Entradas e saídas</option>
        <option value="ENTRADA">Só entradas</option>
        <option value="SAIDA">Só saídas</option>
      </select>

      <select
        defaultValue={parametros.get('situacao') ?? ''}
        onChange={(evento) => aplicar('situacao', evento.target.value)}
      >
        <option value="">Todas as situações</option>
        {SITUACOES.map((valor) => (
          <option key={valor} value={valor}>
            {rotular(valor)}
          </option>
        ))}
      </select>
    </div>
  );
}
