'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
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

export function FormularioImovel({ imovel }: { imovel?: Imovel }) {
  const [estado, acao] = useActionState<EstadoFormulario, FormData>(salvarImovel, {});
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
            <input id="cep" name="cep" defaultValue={imovel?.cep ?? ''} maxLength={9} />
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
            <input
              id="valorAquisicao"
              name="valorAquisicao"
              type="number"
              step="0.01"
              defaultValue={imovel?.valorAquisicao ?? ''}
            />
          </Campo>

          <Campo nome="valorVendaAlvo" rotulo="Valor de venda alvo" erro={erros.valorVendaAlvo}>
            <input
              id="valorVendaAlvo"
              name="valorVendaAlvo"
              type="number"
              step="0.01"
              defaultValue={imovel?.valorVendaAlvo ?? ''}
            />
          </Campo>

          <Campo nome="aluguelAlvo" rotulo="Aluguel alvo" erro={erros.aluguelAlvo}>
            <input
              id="aluguelAlvo"
              name="aluguelAlvo"
              type="number"
              step="0.01"
              defaultValue={imovel?.aluguelAlvo ?? ''}
            />
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
