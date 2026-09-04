'use client';

import { useEffect, useRef, useState } from 'react';
import type { PerfilUsuario } from '@locafacil/contracts';
import { obterTemaSalvo, salvarTema, type Tema } from '@/lib/tema';
import { IconeLua, IconeSol } from './icones';

const ROTULO_PERFIL: Record<PerfilUsuario, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  LEITURA: 'Leitura',
};

type Props = {
  nome: string;
  perfil: PerfilUsuario;
  aoSair: () => Promise<void>;
};

function obterIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes.at(0);
  const ultima = partes.at(-1);
  if (!primeira || !ultima) return '';
  if (partes.length === 1) return primeira.slice(0, 2).toUpperCase();
  return (primeira.charAt(0) + ultima.charAt(0)).toUpperCase();
}

export function MenuUsuario({ nome, perfil, aoSair }: Props) {
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState<Tema | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTema(
      obterTemaSalvo() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'),
    );
  }, []);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setAberto(false);
      }
    }

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, []);

  function alternarTema() {
    const proximo: Tema = tema === 'escuro' ? 'claro' : 'escuro';
    salvarTema(proximo);
    setTema(proximo);
  }

  const iniciais = obterIniciais(nome);

  return (
    <div className="menu-usuario" ref={raiz}>
      <button
        type="button"
        className="menu-usuario-gatilho"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        <span className="avatar" aria-hidden="true">
          {iniciais}
        </span>
        <span className="texto-suave">{nome}</span>
      </button>

      {aberto ? (
        <div className="menu-usuario-painel" role="menu">
          <div className="menu-usuario-cabecalho">
            <span className="avatar avatar-grande" aria-hidden="true">
              {iniciais}
            </span>
            <div>
              <p className="menu-usuario-nome">{nome}</p>
              <p className="menu-usuario-perfil">{ROTULO_PERFIL[perfil]}</p>
            </div>
          </div>

          <button
            type="button"
            className="menu-usuario-item"
            role="menuitemcheckbox"
            aria-checked={tema === 'escuro'}
            onClick={alternarTema}
          >
            {tema === 'escuro' ? <IconeLua /> : <IconeSol />}
            <span>Modo escuro</span>
            <span className={tema === 'escuro' ? 'interruptor ligado' : 'interruptor'} aria-hidden="true" />
          </button>

          <form action={aoSair}>
            <button type="submit" role="menuitem" className="menu-usuario-item menu-usuario-sair">
              Sair
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
