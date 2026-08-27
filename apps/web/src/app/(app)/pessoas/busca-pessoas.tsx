'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function BuscaPessoas() {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function buscar(valor: string) {
    const novos = new URLSearchParams(parametros.toString());

    valor ? novos.set('busca', valor) : novos.delete('busca');
    novos.delete('pagina');

    iniciar(() => router.replace(`${caminho}?${novos.toString()}`));
  }

  return (
    <div className={pendente ? 'filtros carregando' : 'filtros'}>
      <input
        type="search"
        placeholder="Buscar por nome, e-mail ou documento"
        defaultValue={parametros.get('busca') ?? ''}
        onChange={(evento) => buscar(evento.target.value)}
      />
    </div>
  );
}
