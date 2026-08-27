'use client';

import { useState } from 'react';

export function CopiaECola({ payload, lancamentoId }: { payload: string; lancamentoId: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(payload);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="cartao pix">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/pix/${lancamentoId}/qrcode`}
        alt="QR Code do Pix"
        width={200}
        height={200}
      />

      <div className="pix-dados">
        <span className="texto-suave">Pix copia e cola</span>
        <code className="payload">{payload}</code>
        <button type="button" className="botao" onClick={copiar}>
          {copiado ? 'Copiado' : 'Copiar código'}
        </button>
      </div>
    </div>
  );
}
