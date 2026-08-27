'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { removerModelo, salvarModelo, type EstadoFormulario } from '../acoes';

type Modelo = {
  id: string;
  chave: string;
  nome: string;
  assunto: string;
  corpoHtml: string;
  ativo: boolean;
};

function Botao({ novo }: { novo: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : novo ? 'Criar modelo' : 'Salvar alterações'}
    </button>
  );
}

export function EditorModelos({
  modelos,
  variaveis,
}: {
  modelos: Modelo[];
  variaveis: string[];
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarModelo, {});
  const [selecionado, setSelecionado] = useState<string>(modelos[0]?.id ?? '');
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  const modelo = modelos.find((item) => item.id === selecionado);
  const novo = selecionado === '';

  function excluir(id: string) {
    if (!confirm('Excluir o modelo? Só é possível se nenhuma etapa da régua usar ele.')) {
      return;
    }

    setErro(undefined);
    iniciar(async () => {
      try {
        await removerModelo(id);
        setSelecionado('');
      } catch (falha) {
        setErro((falha as Error).message);
      }
    });
  }

  return (
    <div className="colunas">
      <aside className="cartao lista-lateral">
        {modelos.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === selecionado ? 'item-lista ativo' : 'item-lista'}
            onClick={() => setSelecionado(item.id)}
          >
            <strong>{item.nome}</strong>
            <small className="texto-suave">
              {item.chave}
              {item.ativo ? '' : ' · inativo'}
            </small>
          </button>
        ))}

        <button
          type="button"
          className={novo ? 'item-lista ativo' : 'item-lista'}
          onClick={() => setSelecionado('')}
        >
          <strong>+ Novo modelo</strong>
        </button>
      </aside>

      <div className="coluna-principal">
        <form action={acao} className="cartao formulario" key={selecionado}>
          {modelo ? <input type="hidden" name="id" value={modelo.id} /> : null}

          <div className="grade">
            <label className="campo">
              Nome
              <input name="nome" defaultValue={modelo?.nome} required maxLength={100} />
            </label>

            {novo ? (
              <label className={estado.campos?.chave ? 'campo com-erro' : 'campo'}>
                Chave
                <input name="chave" required maxLength={50} placeholder="cobranca_atraso" />
                <small className="texto-suave">Minúsculas, números e underline</small>
                {estado.campos?.chave ? (
                  <span className="mensagem-campo">{estado.campos.chave}</span>
                ) : null}
              </label>
            ) : null}
          </div>

          <label className="campo">
            Assunto
            <input name="assunto" defaultValue={modelo?.assunto} required maxLength={200} />
          </label>

          <label className="campo">
            Corpo (HTML)
            <textarea name="corpoHtml" rows={14} defaultValue={modelo?.corpoHtml} required />
          </label>

          <label className="campo-inline">
            <input type="checkbox" name="ativo" defaultChecked={modelo?.ativo ?? true} />
            <span>Modelo ativo</span>
          </label>

          {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
          {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}
          {erro ? <p className="alerta-erro">{erro}</p> : null}

          <div className="acoes-formulario">
            {modelo ? (
              <button
                type="button"
                className="botao"
                disabled={pendente}
                onClick={() => excluir(modelo.id)}
              >
                Excluir
              </button>
            ) : null}
            <Botao novo={novo} />
          </div>
        </form>

        <div className="cartao">
          <h2>Variáveis disponíveis</h2>
          <p className="texto-suave">
            Escreva no corpo ou no assunto. Os valores são inseridos no momento do agendamento.
          </p>
          <div className="variaveis">
            {variaveis.map((variavel) => (
              <code key={variavel}>{`{{${variavel}}}`}</code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
