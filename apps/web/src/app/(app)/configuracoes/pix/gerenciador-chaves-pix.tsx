'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  alternarChaveAtiva,
  criarChavePix,
  definirChavePadrao,
  removerChavePix,
  type EstadoFormulario,
} from '../acoes';

type ChavePix = {
  id: string;
  tipoChave: string;
  chave: string;
  nomeBeneficiario: string;
  cidadeBeneficiario: string;
  padrao: boolean;
  ativa: boolean;
};

const TIPOS = [
  { valor: 'CPF', rotulo: 'CPF', dica: 'Somente números, 11 dígitos' },
  { valor: 'CNPJ', rotulo: 'CNPJ', dica: 'Somente números, 14 dígitos' },
  { valor: 'EMAIL', rotulo: 'E-mail', dica: 'seu@email.com' },
  { valor: 'TELEFONE', rotulo: 'Telefone', dica: 'Formato +5511999999999' },
  { valor: 'ALEATORIA', rotulo: 'Aleatória', dica: 'A chave EVP no formato UUID' },
];

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : 'Cadastrar chave'}
    </button>
  );
}

export function GerenciadorChavesPix({ chaves }: { chaves: ChavePix[] }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(criarChavePix, {});
  const [tipo, setTipo] = useState('CPF');
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  const dica = TIPOS.find((item) => item.valor === tipo)?.dica;

  function executar(acao: () => Promise<void>, confirmacao?: string) {
    if (confirmacao && !confirm(confirmacao)) {
      return;
    }

    setErro(undefined);
    iniciar(async () => {
      try {
        await acao();
      } catch (falha) {
        setErro((falha as Error).message);
      }
    });
  }

  return (
    <>
      {chaves.length === 0 ? (
        <p className="aviso">
          Sem chave Pix cadastrada, as cobranças são geradas sem código de pagamento.
        </p>
      ) : (
        <div className="cartao">
          <table className="tabela">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Chave</th>
                <th>Beneficiário</th>
                <th>Cidade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {chaves.map((chave) => (
                <tr key={chave.id} className={chave.ativa ? undefined : 'inativo'}>
                  <td>{chave.tipoChave}</td>
                  <td>
                    {chave.chave}
                    {chave.padrao ? <span className="etiqueta situacao-ativo"> padrão</span> : null}
                  </td>
                  <td>{chave.nomeBeneficiario}</td>
                  <td>{chave.cidadeBeneficiario}</td>
                  <td className="direita acoes-linha">
                    {!chave.padrao && chave.ativa ? (
                      <button
                        type="button"
                        className="botao botao-texto"
                        disabled={pendente}
                        onClick={() => executar(() => definirChavePadrao(chave.id))}
                      >
                        Tornar padrão
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="botao botao-texto"
                      disabled={pendente}
                      onClick={() => executar(() => alternarChaveAtiva(chave.id, !chave.ativa))}
                    >
                      {chave.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      className="botao botao-texto"
                      disabled={pendente}
                      onClick={() =>
                        executar(
                          () => removerChavePix(chave.id),
                          'Excluir a chave? Só é possível se nenhum contrato usar ela.',
                        )
                      }
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {erro ? <p className="alerta-erro">{erro}</p> : null}

      <section>
        <div className="cabecalho-secao">
          <h2>Nova chave</h2>
        </div>

        <form action={acao} className="cartao formulario">
          <div className="grade">
            <label className="campo">
              Tipo
              <select
                name="tipoChave"
                value={tipo}
                onChange={(evento) => setTipo(evento.target.value)}
              >
                {TIPOS.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </select>
            </label>

            <label className={estado.campos?.chave ? 'campo com-erro' : 'campo'}>
              Chave
              <input name="chave" required />
              <small className="texto-suave">{dica}</small>
              {estado.campos?.chave ? (
                <span className="mensagem-campo">{estado.campos.chave}</span>
              ) : null}
            </label>

            <label className="campo">
              Nome do beneficiário
              <input name="nomeBeneficiario" maxLength={25} required />
              <small className="texto-suave">Máximo de 25 caracteres, limite do padrão</small>
            </label>

            <label className="campo">
              Cidade
              <input name="cidadeBeneficiario" maxLength={15} required />
              <small className="texto-suave">Máximo de 15 caracteres</small>
            </label>
          </div>

          <label className="campo-inline">
            <input type="checkbox" name="padrao" defaultChecked={chaves.length === 0} />
            <span>
              Usar como chave padrão
              <small className="texto-suave">
                Aplicada quando o contrato não define uma chave própria
              </small>
            </span>
          </label>

          {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}
          {estado.sucesso ? <p className="alerta-sucesso">{estado.sucesso}</p> : null}

          <div className="acoes-formulario">
            <Botao />
          </div>
        </form>
      </section>
    </>
  );
}
