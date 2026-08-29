'use client';

import { useState, useTransition } from 'react';
import { enviarAlertaCobranca } from '../acoes';

export function EnviarAlerta({
  id,
  modelos,
}: {
  id: string;
  modelos: { id: string; nome: string }[];
}) {
  const [modeloEmailId, setModeloEmailId] = useState(modelos[0]?.id ?? '');
  const [pendente, iniciar] = useTransition();
  const [estado, setEstado] = useState<{ sucesso?: string; erro?: string }>({});

  if (modelos.length === 0) {
    return (
      <div className="cartao vazio">
        <p>Nenhum modelo de e-mail ativo. Cadastre um em Configurações para enviar alertas.</p>
      </div>
    );
  }

  function enviar() {
    setEstado({});
    iniciar(async () => {
      setEstado(await enviarAlertaCobranca(id, modeloEmailId));
    });
  }

  return (
    <div className="cartao formulario">
      <p className="texto-suave">
        Dispara o e-mail na hora para o contato principal do contrato, sem esperar a régua.
      </p>

      <div className="linha-teste">
        <label className="campo">
          Modelo
          <select value={modeloEmailId} onChange={(evento) => setModeloEmailId(evento.target.value)}>
            {modelos.map((modelo) => (
              <option key={modelo.id} value={modelo.id}>
                {modelo.nome}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="botao" disabled={pendente} onClick={enviar}>
          {pendente ? 'Enviando...' : 'Enviar alerta'}
        </button>
      </div>

      {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
      {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}
    </div>
  );
}
