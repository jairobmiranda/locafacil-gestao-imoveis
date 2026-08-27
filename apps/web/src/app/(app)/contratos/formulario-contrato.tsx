'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { criarContrato, type EstadoFormulario } from './acoes';

type Opcao = { id: string; rotulo: string };
type Categoria = { id: string; nome: string; natureza: 'ENTRADA' | 'SAIDA' };

const GARANTIAS = [
  { valor: 'NENHUMA', rotulo: 'Nenhuma' },
  { valor: 'CAUCAO', rotulo: 'Caução' },
  { valor: 'FIADOR', rotulo: 'Fiador' },
  { valor: 'SEGURO_FIANCA', rotulo: 'Seguro fiança' },
];

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : 'Criar contrato'}
    </button>
  );
}

export function FormularioContrato({
  imoveis,
  pessoas,
  categorias,
  chavesPix,
}: {
  imoveis: Opcao[];
  pessoas: Opcao[];
  categorias: Categoria[];
  chavesPix: Opcao[];
}) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(criarContrato, {});
  const [itens, setItens] = useState<number[]>([]);
  const erros = estado.campos ?? {};

  const categoriasEntrada = categorias.filter((item) => item.natureza === 'ENTRADA');

  return (
    <form action={acao} className="cartao formulario">
      <fieldset>
        <legend>Partes e imóvel</legend>

        <div className="grade">
          <label className={erros.imovelId ? 'campo com-erro' : 'campo'}>
            Imóvel
            <select name="imovelId" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {imoveis.map((imovel) => (
                <option key={imovel.id} value={imovel.id}>
                  {imovel.rotulo}
                </option>
              ))}
            </select>
            {erros.imovelId ? <span className="mensagem-campo">{erros.imovelId}</span> : null}
          </label>

          <label className={erros.partes ? 'campo com-erro' : 'campo'}>
            Inquilino
            <select name="inquilinoId" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {pessoas.map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.rotulo}
                </option>
              ))}
            </select>
            <small className="texto-suave">Será o contato principal das cobranças</small>
          </label>

          <label className="campo">
            Fiador (opcional)
            <select name="fiadorId" defaultValue="">
              <option value="">Nenhum</option>
              {pessoas.map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Vigência e valor</legend>

        <div className="grade">
          <label className={erros.dataInicio ? 'campo com-erro' : 'campo'}>
            Início
            <input name="dataInicio" type="date" required />
          </label>

          <label className={erros.dataFim ? 'campo com-erro' : 'campo'}>
            Fim
            <input name="dataFim" type="date" required />
            {erros.dataFim ? <span className="mensagem-campo">{erros.dataFim}</span> : null}
          </label>

          <label className={erros.diaVencimento ? 'campo com-erro' : 'campo'}>
            Dia do vencimento
            <input name="diaVencimento" type="number" min={1} max={31} defaultValue={10} required />
            <small className="texto-suave">Dia 31 vira o último dia nos meses curtos</small>
          </label>

          <label className={erros.valorAluguel ? 'campo com-erro' : 'campo'}>
            Valor do aluguel
            <input name="valorAluguel" type="number" step="0.01" min="0.01" required />
            {erros.valorAluguel ? (
              <span className="mensagem-campo">{erros.valorAluguel}</span>
            ) : null}
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Encargos recorrentes</legend>
        <p className="texto-suave">
          Condomínio, IPTU e afins. Entram na cobrança todo mês, junto com o aluguel.
        </p>

        {itens.map((chave) => (
          <div className="grade linha-item" key={chave}>
            <label className="campo">
              Descrição
              <input name="itemDescricao" maxLength={150} />
            </label>

            <label className="campo">
              Categoria
              <select name="itemCategoria" defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {categoriasEntrada.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              Valor
              <input name="itemValor" type="number" step="0.01" min="0" />
            </label>

            <button
              type="button"
              className="botao botao-texto"
              onClick={() => setItens((atuais) => atuais.filter((item) => item !== chave))}
            >
              Remover
            </button>
          </div>
        ))}

        <button
          type="button"
          className="botao"
          onClick={() => setItens((atuais) => [...atuais, Date.now()])}
        >
          Adicionar encargo
        </button>
      </fieldset>

      <fieldset>
        <legend>Multa, juros e reajuste</legend>

        <div className="grade">
          <label className="campo">
            Multa por atraso (%)
            <input name="percentualMulta" type="number" step="0.01" defaultValue={2} />
          </label>

          <label className="campo">
            Juros ao dia (%)
            <input name="percentualJurosDia" type="number" step="0.0001" defaultValue={0.033} />
          </label>

          <label className="campo">
            Desconto de pontualidade
            <input name="descontoPontualidade" type="number" step="0.01" defaultValue={0} />
          </label>

          <label className="campo">
            Índice de reajuste
            <select name="indiceReajuste" defaultValue="IGPM">
              <option value="IGPM">IGP-M</option>
              <option value="IPCA">IPCA</option>
              <option value="INCC">INCC</option>
              <option value="NENHUM">Nenhum</option>
            </select>
          </label>

          <label className="campo">
            Intervalo de reajuste (meses)
            <input name="intervaloReajusteMeses" type="number" min={1} defaultValue={12} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Garantia e cobrança</legend>

        <div className="grade">
          <label className="campo">
            Tipo de garantia
            <select name="tipoGarantia" defaultValue="NENHUMA">
              {GARANTIAS.map((garantia) => (
                <option key={garantia.valor} value={garantia.valor}>
                  {garantia.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            Valor da garantia
            <input name="valorGarantia" type="number" step="0.01" />
          </label>

          <label className="campo">
            Chave Pix
            <select name="chavePixId" defaultValue="">
              <option value="">Usar a chave padrão</option>
              {chavesPix.map((chave) => (
                <option key={chave.id} value={chave.id}>
                  {chave.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            Aviso de encerramento (dias)
            <input name="diasAvisoEncerramento" type="number" min={0} defaultValue={90} />
          </label>

          <label className="campo">
            Antecedência da cobrança (dias)
            <input name="diasAntecedenciaGeracao" type="number" min={0} defaultValue={10} />
          </label>
        </div>

        <label className="campo-inline">
          <input type="checkbox" name="gerarCobrancas" defaultChecked />
          <span>
            Gerar cobranças automaticamente
            <small className="texto-suave">Cria o lançamento mensal e o Pix sem intervenção</small>
          </span>
        </label>
      </fieldset>

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
