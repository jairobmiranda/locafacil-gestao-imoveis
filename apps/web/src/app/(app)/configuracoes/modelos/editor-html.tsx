'use client';

import Link from '@tiptap/extension-link';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';

type Modo = 'visual' | 'html';

const BOTOES = [
  { chave: 'bold', rotulo: 'B', titulo: 'Negrito', estilo: { fontWeight: 700 } },
  { chave: 'italic', rotulo: 'I', titulo: 'Itálico', estilo: { fontStyle: 'italic' } },
  { chave: 'strike', rotulo: 'S', titulo: 'Riscado', estilo: { textDecoration: 'line-through' } },
] as const;

function aplicar(editor: Editor, chave: (typeof BOTOES)[number]['chave']): void {
  const cadeia = editor.chain().focus();

  if (chave === 'bold') cadeia.toggleBold().run();
  if (chave === 'italic') cadeia.toggleItalic().run();
  if (chave === 'strike') cadeia.toggleStrike().run();
}

function BarraFerramentas({
  editor,
  variaveis,
}: {
  editor: Editor;
  variaveis: string[];
}) {
  function inserirLink() {
    const atual = editor.getAttributes('link').href as string | undefined;
    const url = prompt('Endereço do link', atual ?? 'https://');

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="editor-barra">
      {BOTOES.map((botao) => (
        <button
          key={botao.chave}
          type="button"
          title={botao.titulo}
          style={botao.estilo}
          className={editor.isActive(botao.chave) ? 'ferramenta ativa' : 'ferramenta'}
          onClick={() => aplicar(editor, botao.chave)}
        >
          {botao.rotulo}
        </button>
      ))}

      <span className="editor-divisor" />

      {[1, 2].map((nivel) => (
        <button
          key={nivel}
          type="button"
          title={`Título ${nivel}`}
          className={
            editor.isActive('heading', { level: nivel }) ? 'ferramenta ativa' : 'ferramenta'
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: nivel as 1 | 2 })
              .run()
          }
        >
          H{nivel}
        </button>
      ))}

      <button
        type="button"
        title="Lista com marcadores"
        className={editor.isActive('bulletList') ? 'ferramenta ativa' : 'ferramenta'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </button>

      <button
        type="button"
        title="Linha divisória"
        className="ferramenta"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        —
      </button>

      <button
        type="button"
        title="Link"
        className={editor.isActive('link') ? 'ferramenta ativa' : 'ferramenta'}
        onClick={inserirLink}
      >
        🔗
      </button>

      <span className="editor-divisor" />

      <select
        className="ferramenta seletor-variavel"
        value=""
        title="Inserir variável no cursor"
        onChange={(evento) => {
          if (evento.target.value) {
            editor.chain().focus().insertContent(`{{${evento.target.value}}}`).run();
          }
        }}
      >
        <option value="">Inserir variável</option>
        {variaveis.map((variavel) => (
          <option key={variavel} value={variavel}>
            {variavel}
          </option>
        ))}
      </select>
    </div>
  );
}

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
  const [modo, setModo] = useState<Modo>('visual');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false, autolink: false }),
    ],
    content: valorInicial,
    // Sem isso o App Router acusa divergencia de hidratacao.
    immediatelyRender: false,
    editorProps: { attributes: { class: 'editor-area' } },
    onUpdate: ({ editor: instancia }) => setHtml(instancia.getHTML()),
  });

  // Ao voltar do modo HTML, o editor visual precisa refletir o que foi digitado na mão.
  useEffect(() => {
    if (modo === 'visual' && editor && editor.getHTML() !== html) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [modo, editor, html]);

  return (
    <div className="editor-html">
      <div className="editor-abas">
        <button
          type="button"
          className={modo === 'visual' ? 'aba ativa' : 'aba'}
          onClick={() => setModo('visual')}
        >
          Visual
        </button>
        <button
          type="button"
          className={modo === 'html' ? 'aba ativa' : 'aba'}
          onClick={() => setModo('html')}
        >
          HTML
        </button>
      </div>

      {modo === 'visual' ? (
        <div className="editor-caixa">
          {editor ? <BarraFerramentas editor={editor} variaveis={variaveis} /> : null}
          <EditorContent editor={editor} />
        </div>
      ) : (
        <textarea
          className="editor-codigo"
          rows={16}
          value={html}
          onChange={(evento) => setHtml(evento.target.value)}
          spellCheck={false}
        />
      )}

      <input type="hidden" name={nome} value={html} />
    </div>
  );
}
