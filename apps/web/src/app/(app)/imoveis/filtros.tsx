'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { rotular } from '@/lib/formato';

export function Filtros({
  estrategias,
  situacoes,
}: {
  estrategias: string[];
  situacoes: string[];
}) {
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
      <input
        type="search"
        placeholder="Buscar por apelido, rua, bairro ou cidade"
        defaultValue={parametros.get('busca') ?? ''}
        onChange={(evento) => aplicar('busca', evento.target.value)}
      />

      <select
        defaultValue={parametros.get('estrategia') ?? ''}
        onChange={(evento) => aplicar('estrategia', evento.target.value)}
      >
        <option value="">Todas as estratégias</option>
        {estrategias.map((valor) => (
          <option key={valor} value={valor}>
            {rotular(valor)}
          </option>
        ))}
      </select>

      <select
        defaultValue={parametros.get('situacao') ?? ''}
        onChange={(evento) => aplicar('situacao', evento.target.value)}
      >
        <option value="">Todas as situações</option>
        {situacoes.map((valor) => (
          <option key={valor} value={valor}>
            {rotular(valor)}
          </option>
        ))}
      </select>
    </div>
  );
}
