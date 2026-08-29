'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { formatarMoeda } from '@/lib/formato';
import { baixarLancamento, type EstadoFormulario } from '../acoes';

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
      {pending ? 'Registrando...' : 'Registrar pagamento'}
    </button>
  );
}

export function FormularioBaixa({
  id,
  valorSugerido,
  vencimento,
}: {
  id: string;
  valorSugerido: number;
  vencimento: string | null;
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(baixarLancamento, {});
  const erros = estado.campos ?? {};
  const hoje = new Date().toISOString().slice(0, 10);
  const emAtraso = vencimento ? new Date(vencimento) < new Date(hoje) : false;

  return (
    <form action={acao} className="cartao formulario">
      <input type="hidden" name="id" value={id} />

      {emAtraso ? (
        <p className="aviso">
          Pagamento em atraso. A multa e os juros do contrato são calculados automaticamente na
          baixa.
        </p>
      ) : null}

      <div className="grade">
        <label className="campo">
          Pago em
          <input name="pagoEm" type="date" defaultValue={hoje} required />
        </label>

        <label className={erros.valorPago ? 'campo com-erro' : 'campo'}>
          Valor pago
          <input
            name="valorPago"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={valorSugerido}
            required
          />
          <small className="texto-suave">Original: {formatarMoeda(valorSugerido)}</small>
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

      <label className={erros.comprovante ? 'campo com-erro' : 'campo'}>
        Comprovante (opcional)
        <input
          name="comprovante"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
        />
        {erros.comprovante ? <span className="mensagem-campo">{erros.comprovante}</span> : null}
        <small className="texto-suave">PDF ou imagem, até 15 MB</small>
      </label>

      <label className="campo">
        Observações
        <textarea name="observacoes" rows={2} />
      </label>

      {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}

      <div className="acoes-formulario">
        <Botao />
      </div>
    </form>
  );
}
