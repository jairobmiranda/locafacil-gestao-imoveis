'use client';

import { useEffect, useState } from 'react';
import { EditorTextoRico } from '@/componentes/editor-texto-rico';

const LIMITE = 4000;

/** Pedir complemento devolve a vistoria para quem executou: o texto é a única instrução que sobra. */
export function JanelaComplemento({
  ambiente,
  processando,
  aoFechar,
  aoConfirmar,
}: {
  ambiente: string;
  processando: boolean;
  aoFechar: () => void;
  aoConfirmar: (motivo: string) => void;
}) {
  const [conteudo, setConteudo] = useState({ html: '', texto: '' });

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !processando) {
        aoFechar();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar, processando]);

  const vazio = conteudo.texto === '';
  const excedeu = conteudo.texto.length > LIMITE;

  return (
    <div className="sobreposicao" onClick={() => !processando && aoFechar()}>
      <div
        className="janela janela-media"
        role="dialog"
        aria-modal="true"
        aria-label="Pedir complemento"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="janela-cabecalho">
          <div>
            <h2>Pedir complemento</h2>
            <p className="texto-suave">
              {ambiente} · quem executou recebe este texto ao reabrir o link da vistoria.
            </p>
          </div>
          <button type="button" className="botao botao-texto" onClick={aoFechar}>
            Fechar
          </button>
        </div>

        <div className="janela-corpo">
          <EditorTextoRico
            nome="motivo"
            limite={LIMITE}
            placeholder="Ex.: refazer as fotos do banheiro, faltou o box e o rejunte."
            aoMudar={setConteudo}
          />
        </div>

        <div className="janela-rodape">
          <button type="button" className="botao" onClick={aoFechar} disabled={processando}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao-primario"
            disabled={processando || vazio || excedeu}
            onClick={() => aoConfirmar(conteudo.html)}
          >
            {processando ? 'Enviando...' : 'Devolver para complemento'}
          </button>
        </div>
      </div>
    </div>
  );
}
