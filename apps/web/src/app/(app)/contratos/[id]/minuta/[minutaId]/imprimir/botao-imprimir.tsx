'use client';

export function BotaoImprimir() {
  return (
    <button type="button" className="botao botao-primario" onClick={() => window.print()}>
      Imprimir ou salvar em PDF
    </button>
  );
}
