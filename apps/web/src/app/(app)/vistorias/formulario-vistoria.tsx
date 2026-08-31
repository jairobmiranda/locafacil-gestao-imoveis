'use client';

import { useActionState } from 'react';
import { criarVistoria, type EstadoVistoria } from './acoes';

type Opcao = { id: string; apelido: string };
type ContratoOpcao = { id: string; imovelId: string; rotulo: string };

export function FormularioVistoria({
  imoveis,
  contratos,
}: {
  imoveis: Opcao[];
  contratos: ContratoOpcao[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoVistoria, FormData>(criarVistoria, {});

  return (
    <form action={acao} className="cartao formulario">
      <div className="grade">
        <label>
          Imóvel
          <select name="imovelId" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {imoveis.map((imovel) => (
              <option key={imovel.id} value={imovel.id}>
                {imovel.apelido}
              </option>
            ))}
          </select>
        </label>

        <label>
          Contrato (opcional)
          <select name="contratoId" defaultValue="">
            <option value="">Sem contrato vinculado</option>
            {contratos.map((contrato) => (
              <option key={contrato.id} value={contrato.id}>
                {contrato.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tipo
          <select name="tipo" defaultValue="ENTRADA">
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="PERIODICA">Periódica</option>
          </select>
        </label>
      </div>

      {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}

      <div className="acoes-formulario">
        <button type="submit" className="botao botao-primario" disabled={pendente}>
          {pendente ? 'Criando...' : 'Criar vistoria'}
        </button>
      </div>
    </form>
  );
}
