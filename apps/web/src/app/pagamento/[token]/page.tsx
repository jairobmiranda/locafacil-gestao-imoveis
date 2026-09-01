import { publicoGet } from '@/lib/api-publico';
import { formatarCompetencia, formatarData, formatarMoeda } from '@/lib/formato';
import { FormularioPagamento } from './formulario-pagamento';

type Resumo = {
  descricao: string;
  imovel: string;
  competencia: string;
  vencimento: string | null;
  vencimentoEfetivo: string | null;
  prorrogado: boolean;
  valor: number;
  valorTotal: number;
  diasAtraso: number;
  situacao: string;
  avisoEnviadoEm: string | null;
};

export const metadata = { title: 'Confirmar pagamento' };

export default async function PaginaPagamento({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let cobranca: Resumo;

  try {
    cobranca = await publicoGet<Resumo>(`/publico/pagamento/${token}`);
  } catch {
    return (
      <main className="tela-login">
        <div className="cartao formulario-login">
          <h1>Link inválido</h1>
          <p className="texto-suave">
            Este endereço não é mais válido. Peça um novo pelo e-mail da cobrança.
          </p>
        </div>
      </main>
    );
  }

  const quitado = cobranca.situacao === 'PAGO' || cobranca.situacao === 'CANCELADO';

  return (
    <main className="tela-login">
      <div className="cartao formulario-login pagina-publica">
        <h1>Confirmar pagamento</h1>
        <p className="texto-suave">
          {cobranca.imovel} · {formatarCompetencia(cobranca.competencia)}
        </p>

        <dl className="resumo-cobranca">
          <div>
            <dt>Cobrança</dt>
            <dd>{cobranca.descricao}</dd>
          </div>
          <div>
            <dt>Vencimento</dt>
            <dd>
              {formatarData(cobranca.vencimento)}
              {cobranca.prorrogado ? (
                <small className="texto-suave">
                  {' '}
                  Cai em dia não útil: pode pagar sem encargos até{' '}
                  {formatarData(cobranca.vencimentoEfetivo)}
                </small>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Valor {cobranca.diasAtraso > 0 ? 'com encargos' : 'devido'}</dt>
            <dd>
              <strong>{formatarMoeda(cobranca.valorTotal)}</strong>
            </dd>
          </div>
        </dl>

        {quitado ? (
          <p className="alerta-sucesso">Esta cobrança já está quitada. Nada a fazer por aqui.</p>
        ) : cobranca.avisoEnviadoEm ? (
          <p className="aviso">
            Já recebemos um aviso de pagamento em {formatarData(cobranca.avisoEnviadoEm)} e estamos
            conferindo. Se precisar, envie novamente abaixo.
          </p>
        ) : null}

        {quitado ? null : (
          <FormularioPagamento token={token} valorSugerido={cobranca.valorTotal} />
        )}
      </div>
    </main>
  );
}
