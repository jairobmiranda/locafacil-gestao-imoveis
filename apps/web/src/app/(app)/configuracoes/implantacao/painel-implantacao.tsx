'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { publicar, salvarWebhooks, type EstadoFormulario } from '../acoes';

type Webhooks = { api: string | null; web: string | null };

function BotaoSalvar() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar webhooks'}
    </button>
  );
}

export function PainelImplantacao({ webhooks }: { webhooks: Webhooks }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarWebhooks, {});
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ sucesso?: string; erro?: string }>({});

  function disparar(alvo: 'api' | 'web') {
    if (!confirm(`Publicar a ${alvo === 'api' ? 'API' : 'aplicação web'} agora?`)) {
      return;
    }

    setResultado({});
    iniciar(async () => {
      try {
        await publicar(alvo);
        setResultado({ sucesso: `Build da ${alvo} disparado no CapRover` });
      } catch (falha) {
        setResultado({ erro: (falha as Error).message });
      }
    });
  }

  return (
    <>
      <form action={acao} className="cartao formulario">
        <div className="cabecalho-secao">
          <h2>Webhooks do CapRover</h2>
        </div>

        <p className="texto-suave">
          Copie em cada app do CapRover, na aba Deployment, a URL do webhook de build. Ela contém o
          token do app, então trate como senha.
        </p>

        <label className={estado.campos?.api ? 'campo com-erro' : 'campo'}>
          API
          <input
            name="api"
            type="url"
            defaultValue={webhooks.api ?? ''}
            placeholder="https://captain.seudominio.com/api/v2/user/apps/webhooks/triggerbuild?namespace=captain&token=..."
          />
          {estado.campos?.api ? <span className="mensagem-campo">{estado.campos.api}</span> : null}
        </label>

        <label className={estado.campos?.web ? 'campo com-erro' : 'campo'}>
          Web
          <input
            name="web"
            type="url"
            defaultValue={webhooks.web ?? ''}
            placeholder="https://captain.seudominio.com/api/v2/user/apps/webhooks/triggerbuild?namespace=captain&token=..."
          />
          {estado.campos?.web ? <span className="mensagem-campo">{estado.campos.web}</span> : null}
        </label>

        {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
        {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}

        <div className="acoes-formulario">
          <BotaoSalvar />
        </div>
      </form>

      <div className="cartao formulario">
        <div className="cabecalho-secao">
          <h2>Publicar</h2>
        </div>

        <p className="texto-suave">
          O CapRover puxa o branch configurado no app e refaz a imagem. O deploy leva alguns minutos
          e o acompanhamento fica no painel dele.
        </p>

        <div className="acoes-cabecalho" style={{ justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="botao"
            disabled={pendente || !webhooks.api}
            onClick={() => disparar('api')}
          >
            Publicar API
          </button>
          <button
            type="button"
            className="botao"
            disabled={pendente || !webhooks.web}
            onClick={() => disparar('web')}
          >
            Publicar Web
          </button>
        </div>

        {resultado.erro ? <p className="alerta-erro">{resultado.erro}</p> : null}
        {resultado.sucesso ? <p className="alerta-sucesso">{resultado.sucesso}</p> : null}
      </div>
    </>
  );
}
