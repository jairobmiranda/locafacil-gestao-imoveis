'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

type Opcao = { id: string; rotulo: string };

type Props = {
  name?: string;
  opcoes: Opcao[];
  valorInicial?: string;
  placeholder?: string;
  desabilitado?: boolean;
  /** Depois de escolher uma opcao, volta o campo vazio em vez de mostrar o rotulo escolhido.
   * Usado em telas de "adicionar a uma lista", onde o mesmo campo serve para varias escolhas. */
  limparAposSelecionar?: boolean;
  onSelecionar?: (id: string) => void;
};

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Select com busca: digita para filtrar as opcoes, o valor real viaja num input hidden. */
export function ComboboxBusca({
  name,
  opcoes,
  valorInicial = '',
  placeholder = 'Digite para buscar...',
  desabilitado,
  limparAposSelecionar,
  onSelecionar,
}: Props) {
  const [id, setId] = useState(valorInicial);
  const [texto, setTexto] = useState(
    () => opcoes.find((opcao) => opcao.id === valorInicial)?.rotulo ?? '',
  );
  const [aberta, setAberta] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(() => {
    const busca = normalizar(texto.trim());

    if (!busca) {
      return opcoes;
    }

    return opcoes.filter((opcao) => normalizar(opcao.rotulo).includes(busca));
  }, [opcoes, texto]);

  useEffect(() => {
    setIndiceAtivo(0);
  }, [filtradas]);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) {
        setAberta(false);
        setTexto(opcoes.find((opcao) => opcao.id === id)?.rotulo ?? '');
      }
    }

    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [id, opcoes]);

  function selecionar(opcao: Opcao) {
    if (limparAposSelecionar) {
      setId('');
      setTexto('');
    } else {
      setId(opcao.id);
      setTexto(opcao.rotulo);
    }

    setAberta(false);
    onSelecionar?.(opcao.id);
  }

  function limpar() {
    setId('');
    setTexto('');
    onSelecionar?.('');
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (!aberta && (evento.key === 'ArrowDown' || evento.key === 'ArrowUp')) {
      evento.preventDefault();
      setAberta(true);
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceAtivo((atual) => Math.min(atual + 1, filtradas.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceAtivo((atual) => Math.max(atual - 1, 0));
    } else if (evento.key === 'Enter') {
      if (aberta && filtradas[indiceAtivo]) {
        evento.preventDefault();
        selecionar(filtradas[indiceAtivo]);
      }
    } else if (evento.key === 'Escape') {
      setAberta(false);
    }
  }

  return (
    <div className="combobox" ref={raiz}>
      <div className="combobox-caixa">
        <input
          type="text"
          role="combobox"
          aria-expanded={aberta}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          disabled={desabilitado}
          value={texto}
          onFocus={() => setAberta(true)}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setId('');
            setAberta(true);
          }}
          onKeyDown={aoTeclar}
        />
        {id ? (
          <button
            type="button"
            className="combobox-limpar"
            aria-label="Limpar selecao"
            onClick={limpar}
          >
            ×
          </button>
        ) : null}
      </div>

      {name ? <input type="hidden" name={name} value={id} /> : null}

      {aberta ? (
        <ul className="combobox-lista">
          {filtradas.length === 0 ? (
            <li className="combobox-vazio">Nenhum resultado</li>
          ) : (
            filtradas.map((opcao, indice) => (
              <li
                key={opcao.id}
                className={indice === indiceAtivo ? 'combobox-opcao ativa' : 'combobox-opcao'}
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  selecionar(opcao);
                }}
              >
                {opcao.rotulo}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
