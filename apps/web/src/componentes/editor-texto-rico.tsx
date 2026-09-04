'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Comando = {
  chave: string;
  rotulo: string;
  titulo: string;
  classe?: string;
};

const COMANDOS: Comando[] = [
  { chave: 'bold', rotulo: 'B', titulo: 'Negrito (Ctrl+B)', classe: 'negrito' },
  { chave: 'italic', rotulo: 'I', titulo: 'Itálico (Ctrl+I)', classe: 'italico' },
  { chave: 'underline', rotulo: 'U', titulo: 'Sublinhado (Ctrl+U)', classe: 'sublinhado' },
  { chave: 'insertUnorderedList', rotulo: '•', titulo: 'Lista com marcadores' },
  { chave: 'insertOrderedList', rotulo: '1.', titulo: 'Lista numerada' },
];

/**
 * Editor de texto com negrito, itálico e listas. Usa `contentEditable` e `execCommand`: a API é
 * antiga, mas é a única suportada em todo navegador sem trazer uma biblioteca de editor junto.
 * O conteúdo fica no DOM, não em estado: reescrever o HTML a cada tecla joga o cursor para o fim.
 */
export function EditorTextoRico({
  nome,
  htmlInicial = '',
  placeholder,
  limite = 4000,
  aoMudar,
}: {
  /** Só quando o editor vai dentro de um formulário: cria o campo oculto com o HTML. */
  nome?: string;
  htmlInicial?: string;
  placeholder?: string;
  limite?: number;
  aoMudar?: (dados: { html: string; texto: string }) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(htmlInicial);
  const [texto, setTexto] = useState('');
  const [ativos, setAtivos] = useState<string[]>([]);

  const sincronizar = useCallback(() => {
    const atual = area.current;

    if (!atual) {
      return;
    }

    const conteudo = atual.innerHTML;
    const puro = (atual.textContent ?? '').trim();

    setHtml(conteudo);
    setTexto(puro);
    aoMudar?.({ html: conteudo, texto: puro });
  }, [aoMudar]);

  const conferirEstado = useCallback(() => {
    setAtivos(
      COMANDOS.filter((comando) => {
        try {
          return document.queryCommandState(comando.chave);
        } catch {
          return false;
        }
      }).map((comando) => comando.chave),
    );
  }, []);

  useEffect(() => {
    const atual = area.current;

    if (atual && atual.innerHTML !== htmlInicial) {
      atual.innerHTML = htmlInicial;
      sincronizar();
    }
    // Só na montagem: depois disso quem manda no conteúdo é o próprio DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aplicar(comando: string) {
    area.current?.focus();
    document.execCommand(comando);
    sincronizar();
    conferirEstado();
  }

  const excedeu = texto.length > limite;

  return (
    <div className="editor-rico" data-excedeu={excedeu}>
      <div className="editor-barra" role="toolbar" aria-label="Formatação">
        {COMANDOS.map((comando) => (
          <button
            type="button"
            key={comando.chave}
            className={`editor-botao ${comando.classe ?? ''}`}
            title={comando.titulo}
            aria-label={comando.titulo}
            aria-pressed={ativos.includes(comando.chave)}
            // Evita o blur antes do comando: sem seleção, execCommand não faz nada.
            onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => aplicar(comando.chave)}
          >
            {comando.rotulo}
          </button>
        ))}
      </div>

      <div
        ref={area}
        className="editor-area"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={sincronizar}
        onKeyUp={conferirEstado}
        onMouseUp={conferirEstado}
        onFocus={conferirEstado}
        onPaste={(evento) => {
          // Cola sempre como texto: senão entra o CSS inteiro da página de origem.
          evento.preventDefault();
          document.execCommand('insertText', false, evento.clipboardData.getData('text/plain'));
          sincronizar();
        }}
      />

      <div className="editor-rodape">
        <span className="texto-suave">Selecione o texto e use os botões acima.</span>
        <span className="editor-contador" data-excedeu={excedeu}>
          {texto.length} / {limite}
        </span>
      </div>

      {nome ? <input type="hidden" name={nome} value={texto === '' ? '' : html} /> : null}
    </div>
  );
}
