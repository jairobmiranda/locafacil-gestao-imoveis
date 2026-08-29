'use client';

import { useEffect, useRef, useState } from 'react';

export function EditorHtml({
  nome,
  valorInicial,
  variaveis,
}: {
  nome: string;
  valorInicial: string;
  variaveis: string[];
}) {
  const [html, setHtml] = useState(valorInicial);
  const [previa, setPrevia] = useState(valorInicial);
  const area = useRef<HTMLTextAreaElement>(null);

  // Recarregar o iframe a cada tecla faria a previa piscar.
  useEffect(() => {
    const temporizador = setTimeout(() => setPrevia(html), 400);

    return () => clearTimeout(temporizador);
  }, [html]);

  function inserir(trecho: string) {
    const campo = area.current;

    if (!campo) {
      setHtml((atual) => atual + trecho);
      return;
    }

    const { selectionStart, selectionEnd } = campo;
    const posicao = selectionStart + trecho.length;

    setHtml(html.slice(0, selectionStart) + trecho + html.slice(selectionEnd));

    requestAnimationFrame(() => {
      campo.focus();
      campo.setSelectionRange(posicao, posicao);
    });
  }

  return (
    <div className="editor-html">
      <div className="editor-barra">
        <select
          className="ferramenta seletor-variavel"
          value=""
          title="Inserir variável no cursor"
          onChange={(evento) => inserir(`{{${evento.target.value}}}`)}
        >
          <option value="">Inserir variável</option>
          {variaveis.map((variavel) => (
            <option key={variavel} value={variavel}>
              {variavel}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-paineis">
        <textarea
          ref={area}
          className="editor-codigo"
          value={html}
          onChange={(evento) => setHtml(evento.target.value)}
          spellCheck={false}
        />

        {/* sandbox vazio: o HTML vem do proprio usuario, sem script nem navegacao. */}
        <iframe className="editor-previa" title="Pré-visualização" sandbox="" srcDoc={previa} />
      </div>

      <input type="hidden" name={nome} value={html} />
    </div>
  );
}
