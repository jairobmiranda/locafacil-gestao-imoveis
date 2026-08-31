'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { EntradaValor } from '@/componentes/campos-mascarados';
import { formatarMoeda } from '@/lib/formato';
import { informarPagamento, type EstadoPagamento } from './acoes';

const FORMAS = [
  { valor: 'PIX', rotulo: 'Pix' },
  { valor: 'TED', rotulo: 'TED / transferência' },
  { valor: 'BOLETO', rotulo: 'Boleto' },
  { valor: 'DINHEIRO', rotulo: 'Dinheiro' },
  { valor: 'CARTAO', rotulo: 'Cartão' },
];

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Enviando...' : 'Confirmar pagamento'}
    </button>
  );
}

export function FormularioPagamento({
  token,
  valorSugerido,
}: {
  token: string;
  valorSugerido: number;
}) {
  const [estado, acao] = useActionState<EstadoPagamento, FormData>(informarPagamento, {});
  const hoje = new Date().toISOString().slice(0, 10);

  if (estado.sucesso) {
    return <p className="alerta-sucesso">{estado.sucesso}</p>;
  }

  return (
    <form action={acao} className="formulario">
      <input type="hidden" name="token" value={token} />

      <div className="grade">
        <label className="campo">
          Pago em
          <input name="pagoEm" type="date" defaultValue={hoje} max={hoje} required />
        </label>

        <label className="campo">
          Valor pago
          <EntradaValor name="valor" valor={valorSugerido} required />
          <small className="texto-suave">Sugerido: {formatarMoeda(valorSugerido)}</small>
        </label>

        <label className="campo">
          Forma de pagamento
          <select name="formaPagamento" defaultValue="PIX">
            {FORMAS.map((forma) => (
              <option key={forma.valor} value={forma.valor}>
                {forma.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="campo">
        Comprovante (opcional)
        <input
          name="comprovante"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
        />
        <small className="texto-suave">PDF ou imagem, até 15 MB</small>
      </label>

      <label className="campo">
        Observações
        <textarea name="observacoes" rows={2} maxLength={500} />
      </label>

      {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}

      <div className="acoes-formulario">
        <Botao />
      </div>
    </form>
  );
}
