'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { criarLancamento, type EstadoFormulario } from './acoes';

type Opcao = { id: string; nome: string; natureza?: 'ENTRADA' | 'SAIDA' };

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : 'Criar lançamento'}
    </button>
  );
}

export function FormularioLancamento({
  imoveis,
  categorias,
}: {
  imoveis: { id: string; apelido: string }[];
  categorias: Opcao[];
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(criarLancamento, {});
  const [natureza, setNatureza] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const erros = estado.campos ?? {};

  const categoriasVisiveis = categorias.filter((item) => item.natureza === natureza);
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={acao} className="cartao formulario">
      <div className="grade">
        <label className={erros.natureza ? 'campo com-erro' : 'campo'}>
          Natureza
          <select
            name="natureza"
            value={natureza}
            onChange={(evento) => setNatureza(evento.target.value as 'ENTRADA' | 'SAIDA')}
          >
            <option value="SAIDA">Saída (despesa)</option>
            <option value="ENTRADA">Entrada (receita)</option>
          </select>
        </label>

        <label className={erros.imovelId ? 'campo com-erro' : 'campo'}>
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
          {erros.imovelId ? <span className="mensagem-campo">{erros.imovelId}</span> : null}
        </label>

        <label className={erros.categoriaId ? 'campo com-erro' : 'campo'}>
          Categoria
          <select name="categoriaId" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {categoriasVisiveis.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
          {erros.categoriaId ? <span className="mensagem-campo">{erros.categoriaId}</span> : null}
        </label>

        <label className={erros.valor ? 'campo com-erro' : 'campo'}>
          Valor
          <input name="valor" type="number" step="0.01" min="0.01" required />
          {erros.valor ? <span className="mensagem-campo">{erros.valor}</span> : null}
        </label>

        <label className={erros.competencia ? 'campo com-erro' : 'campo'}>
          Competência
          <input name="competencia" type="date" defaultValue={hoje} required />
        </label>

        <label className={erros.vencimento ? 'campo com-erro' : 'campo'}>
          Vencimento (opcional)
          <input name="vencimento" type="date" />
        </label>
      </div>

      <label className={erros.descricao ? 'campo com-erro' : 'campo'}>
        Descrição
        <input name="descricao" maxLength={200} required />
        {erros.descricao ? <span className="mensagem-campo">{erros.descricao}</span> : null}
      </label>

      <label className="campo-inline">
        <input type="checkbox" name="capitalizavel" defaultChecked={natureza === 'SAIDA'} />
        <span>
          Entra no custo do imóvel
          <small className="texto-suave">Usado para apurar ganho de capital na venda</small>
        </span>
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
