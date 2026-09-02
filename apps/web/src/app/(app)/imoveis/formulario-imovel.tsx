'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { EntradaCep, EntradaValor } from '@/componentes/campos-mascarados';
import type { Imovel } from '@/lib/tipos';
import { salvarImovel, type EstadoFormulario } from './acoes';

const ESTRATEGIAS = [
  { valor: 'REVENDA', rotulo: 'Revenda (flip)' },
  { valor: 'LOCACAO', rotulo: 'Locação' },
  { valor: 'TERRENO', rotulo: 'Terreno em espera' },
  { valor: 'USO_PROPRIO', rotulo: 'Uso próprio' },
];

const SITUACOES = [
  'PROSPECCAO',
  'ADQUIRIDO',
  'EM_REFORMA',
  'A_VENDA',
  'PARA_ALUGAR',
  'ALUGADO',
  'VENDIDO',
];

const TIPOS = ['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL', 'RURAL'];

function Campo({
  nome,
  rotulo,
  erro,
  children,
}: {
  nome: string;
  rotulo: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={erro ? 'campo com-erro' : 'campo'} htmlFor={nome}>
      {rotulo}
      {children}
      {erro ? <span className="mensagem-campo">{erro}</span> : null}
    </label>
  );
}

function BotaoSalvar() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="botao botao-primario" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  );
}

type CaracteristicaFormulario = { chave: number; descricao?: string; quantidade?: number };

export function FormularioImovel({ imovel }: { imovel?: Imovel }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarImovel, {});
  const [caracteristicas, setCaracteristicas] = useState<CaracteristicaFormulario[]>(
    () =>
      imovel?.caracteristicas.map((caracteristica, indice) => ({
        chave: indice,
        descricao: caracteristica.descricao,
        quantidade: caracteristica.quantidade ?? undefined,
      })) ?? [],
  );
  const erros = estado.campos ?? {};

  return (
    <form action={acao} className="cartao formulario">
      {imovel ? <input type="hidden" name="id" value={imovel.id} /> : null}

      <fieldset>
        <legend>Identificação</legend>

        <div className="grade">
          <Campo nome="apelido" rotulo="Apelido" erro={erros.apelido}>
            <input id="apelido" name="apelido" defaultValue={imovel?.apelido} required maxLength={80} />
          </Campo>

          <Campo nome="estrategia" rotulo="Estratégia" erro={erros.estrategia}>
            <select id="estrategia" name="estrategia" defaultValue={imovel?.estrategia ?? 'LOCACAO'}>
              {ESTRATEGIAS.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo nome="tipo" rotulo="Tipo" erro={erros.tipo}>
            <select id="tipo" name="tipo" defaultValue={imovel?.tipo ?? 'APARTAMENTO'}>
              {TIPOS.map((valor) => (
                <option key={valor} value={valor}>
                  {valor.charAt(0) + valor.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Campo>

          <Campo nome="situacao" rotulo="Situação" erro={erros.situacao}>
            <select id="situacao" name="situacao" defaultValue={imovel?.situacao ?? 'PROSPECCAO'}>
              {SITUACOES.map((valor) => (
                <option key={valor} value={valor}>
                  {valor.replace('_', ' ').charAt(0) + valor.replace('_', ' ').slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </fieldset>

      <fieldset>
        <legend>Endereço</legend>

        <div className="grade">
          <Campo nome="cep" rotulo="CEP" erro={erros.cep}>
            <EntradaCep id="cep" name="cep" valor={imovel?.cep} />
          </Campo>

          <Campo nome="logradouro" rotulo="Logradouro" erro={erros.logradouro}>
            <input id="logradouro" name="logradouro" defaultValue={imovel?.logradouro ?? ''} />
          </Campo>

          <Campo nome="numero" rotulo="Número" erro={erros.numero}>
            <input id="numero" name="numero" defaultValue={imovel?.numero ?? ''} maxLength={20} />
          </Campo>

          <Campo nome="complemento" rotulo="Complemento" erro={erros.complemento}>
            <input id="complemento" name="complemento" defaultValue={imovel?.complemento ?? ''} />
          </Campo>

          <Campo nome="bairro" rotulo="Bairro" erro={erros.bairro}>
            <input id="bairro" name="bairro" defaultValue={imovel?.bairro ?? ''} />
          </Campo>

          <Campo nome="cidade" rotulo="Cidade" erro={erros.cidade}>
            <input id="cidade" name="cidade" defaultValue={imovel?.cidade ?? ''} />
          </Campo>

          <Campo nome="uf" rotulo="UF" erro={erros.uf}>
            <input id="uf" name="uf" defaultValue={imovel?.uf ?? ''} maxLength={2} />
          </Campo>
        </div>
      </fieldset>

      <fieldset>
        <legend>Características e documentos</legend>

        <div className="grade">
          <Campo nome="areaTotal" rotulo="Área total (m²)" erro={erros.areaTotal}>
            <input id="areaTotal" name="areaTotal" type="number" step="0.01" defaultValue={imovel?.areaTotal ?? ''} />
          </Campo>

          <Campo nome="areaConstruida" rotulo="Área construída (m²)" erro={erros.areaConstruida}>
            <input
              id="areaConstruida"
              name="areaConstruida"
              type="number"
              step="0.01"
              defaultValue={imovel?.areaConstruida ?? ''}
            />
          </Campo>

          <Campo nome="quartos" rotulo="Quartos" erro={erros.quartos}>
            <input id="quartos" name="quartos" type="number" defaultValue={imovel?.quartos ?? ''} />
          </Campo>

          <Campo nome="banheiros" rotulo="Banheiros" erro={erros.banheiros}>
            <input id="banheiros" name="banheiros" type="number" defaultValue={imovel?.banheiros ?? ''} />
          </Campo>

          <Campo nome="vagas" rotulo="Vagas" erro={erros.vagas}>
            <input id="vagas" name="vagas" type="number" defaultValue={imovel?.vagas ?? ''} />
          </Campo>

          <Campo nome="matricula" rotulo="Matrícula" erro={erros.matricula}>
            <input id="matricula" name="matricula" defaultValue={imovel?.matricula ?? ''} />
          </Campo>

          <Campo nome="inscricaoMunicipal" rotulo="Inscrição municipal" erro={erros.inscricaoMunicipal}>
            <input
              id="inscricaoMunicipal"
              name="inscricaoMunicipal"
              defaultValue={imovel?.inscricaoMunicipal ?? ''}
            />
          </Campo>
        </div>
      </fieldset>

      <fieldset>
        <legend>Outras características</legend>
        <p className="texto-suave">
          Cômodos ou diferenciais que variam de imóvel para imóvel: suíte, quintal,
          churrasqueira, piscina... Preencha a quantidade só quando fizer sentido contar (ex.:
          quantidade 2, descrição &quot;suítes&quot;). Deixe em branco para características sem
          contagem, como &quot;quintal&quot;.
        </p>

        {caracteristicas.map((caracteristica) => (
          <div className="grade linha-item" key={caracteristica.chave}>
            <label className="campo">
              Quantidade (opcional)
              <input
                name="caracteristicaQuantidade"
                type="number"
                min={1}
                defaultValue={caracteristica.quantidade ?? ''}
              />
            </label>

            <label className="campo">
              Descrição
              <input
                name="caracteristicaDescricao"
                maxLength={80}
                placeholder="Ex.: suítes, quintal, churrasqueira"
                defaultValue={caracteristica.descricao}
              />
            </label>

            <button
              type="button"
              className="botao botao-texto"
              onClick={() =>
                setCaracteristicas((atuais) =>
                  atuais.filter((atual) => atual.chave !== caracteristica.chave),
                )
              }
            >
              Remover
            </button>
          </div>
        ))}

        <button
          type="button"
          className="botao"
          onClick={() =>
            setCaracteristicas((atuais) => [...atuais, { chave: Date.now() }])
          }
        >
          Adicionar característica
        </button>
      </fieldset>

      <fieldset>
        <legend>Valores</legend>

        <div className="grade">
          <Campo nome="dataAquisicao" rotulo="Data de aquisição" erro={erros.dataAquisicao}>
            <input
              id="dataAquisicao"
              name="dataAquisicao"
              type="date"
              defaultValue={imovel?.dataAquisicao?.slice(0, 10) ?? ''}
            />
          </Campo>

          <Campo nome="valorAquisicao" rotulo="Valor de aquisição" erro={erros.valorAquisicao}>
            <EntradaValor id="valorAquisicao" name="valorAquisicao" valor={imovel?.valorAquisicao} />
          </Campo>

          <Campo nome="valorVendaAlvo" rotulo="Valor de venda alvo" erro={erros.valorVendaAlvo}>
            <EntradaValor id="valorVendaAlvo" name="valorVendaAlvo" valor={imovel?.valorVendaAlvo} />
          </Campo>

          <Campo nome="aluguelAlvo" rotulo="Aluguel alvo" erro={erros.aluguelAlvo}>
            <EntradaValor id="aluguelAlvo" name="aluguelAlvo" valor={imovel?.aluguelAlvo} />
          </Campo>
        </div>
      </fieldset>

      <Campo nome="observacoes" rotulo="Observações" erro={erros.observacoes}>
        <textarea id="observacoes" name="observacoes" rows={3} defaultValue={imovel?.observacoes ?? ''} />
      </Campo>

      {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}

      <div className="acoes-formulario">
        <BotaoSalvar />
      </div>
    </form>
  );
}
