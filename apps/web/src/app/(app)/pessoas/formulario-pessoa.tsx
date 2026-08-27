'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Pessoa } from '@/lib/tipos';
import { salvarPessoa, type EstadoFormulario } from './acoes';

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  );
}

export function FormularioPessoa({ pessoa }: { pessoa?: Pessoa }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarPessoa, {});
  const erros = estado.campos ?? {};

  return (
    <form action={acao} className="cartao formulario">
      {pessoa ? <input type="hidden" name="id" value={pessoa.id} /> : null}

      <fieldset>
        <legend>Dados pessoais</legend>

        <div className="grade">
          <label className={erros.nome ? 'campo com-erro' : 'campo'}>
            Nome
            <input name="nome" defaultValue={pessoa?.nome} required maxLength={150} />
            {erros.nome ? <span className="mensagem-campo">{erros.nome}</span> : null}
          </label>

          <label className={erros.documento ? 'campo com-erro' : 'campo'}>
            CPF ou CNPJ
            <input name="documento" defaultValue={pessoa?.documento ?? ''} />
            {erros.documento ? <span className="mensagem-campo">{erros.documento}</span> : null}
          </label>

          <label className={erros.email ? 'campo com-erro' : 'campo'}>
            E-mail
            <input name="email" type="email" defaultValue={pessoa?.email ?? ''} />
            <small className="texto-suave">Necessário para receber as cobranças</small>
            {erros.email ? <span className="mensagem-campo">{erros.email}</span> : null}
          </label>

          <label className="campo">
            Telefone
            <input name="telefone" defaultValue={pessoa?.telefone ?? ''} maxLength={20} />
          </label>

          <label className="campo">
            Data de nascimento
            <input
              name="dataNascimento"
              type="date"
              defaultValue={pessoa?.dataNascimento?.slice(0, 10) ?? ''}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Endereço</legend>

        <div className="grade">
          <label className="campo">
            CEP
            <input name="cep" defaultValue={pessoa?.cep ?? ''} maxLength={9} />
          </label>

          <label className="campo">
            Logradouro
            <input name="logradouro" defaultValue={pessoa?.logradouro ?? ''} />
          </label>

          <label className="campo">
            Número
            <input name="numero" defaultValue={pessoa?.numero ?? ''} maxLength={20} />
          </label>

          <label className="campo">
            Complemento
            <input name="complemento" defaultValue={pessoa?.complemento ?? ''} />
          </label>

          <label className="campo">
            Bairro
            <input name="bairro" defaultValue={pessoa?.bairro ?? ''} />
          </label>

          <label className="campo">
            Cidade
            <input name="cidade" defaultValue={pessoa?.cidade ?? ''} />
          </label>

          <label className="campo">
            UF
            <input name="uf" defaultValue={pessoa?.uf ?? ''} maxLength={2} />
          </label>
        </div>
      </fieldset>

      <label className="campo">
        Observações
        <textarea name="observacoes" rows={2} defaultValue={pessoa?.observacoes ?? ''} />
      </label>

      {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}

      <div className="acoes-formulario">
        <Botao />
      </div>
    </form>
  );
}
