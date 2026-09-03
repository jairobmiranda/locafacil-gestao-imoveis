'use client';

import { useActionState, useMemo, useState } from 'react';
import { criarVistoria, type EstadoVistoria } from './acoes';

type Opcao = {
  id: string;
  apelido: string;
  tipo: string;
  quartos: number | null;
  vagas: number | null;
};

type ContratoOpcao = { id: string; imovelId: string; rotulo: string };

export type RoteiroOpcao = {
  chave: string;
  nome: string;
  tiposImovel: string[];
  ambientes: {
    chave: string;
    nome: string;
    repetirPor: 'quartos' | 'vagas' | null;
    itens: { chave: string; nome: string; obrigatorio: boolean }[];
  }[];
};

type Escolha = { quantidade: number; rotulos: string[]; itensOpcionais: string[] };

const MAXIMO_COPIAS = 20;

function selecaoPadrao(roteiro: RoteiroOpcao, imovel?: Opcao): Record<string, Escolha> {
  const inicial: Record<string, Escolha> = {};

  for (const ambiente of roteiro.ambientes) {
    // Ambiente repetido comeca com o que o cadastro do imovel informa; o resto entra uma vez.
    const padrao = ambiente.repetirPor ? (imovel?.[ambiente.repetirPor] ?? 0) : 1;

    inicial[ambiente.chave] = {
      quantidade: Math.min(MAXIMO_COPIAS, Math.max(0, padrao)),
      rotulos: [],
      itensOpcionais: ambiente.itens
        .filter((item) => !item.obrigatorio)
        .map((item) => item.chave),
    };
  }

  return inicial;
}

export function FormularioVistoria({
  imoveis,
  contratos,
  roteiros,
}: {
  imoveis: Opcao[];
  contratos: ContratoOpcao[];
  roteiros: RoteiroOpcao[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoVistoria, FormData>(criarVistoria, {});
  const [imovelId, setImovelId] = useState('');
  const [roteiroChave, setRoteiroChave] = useState('');
  const [selecao, setSelecao] = useState<Record<string, Escolha>>({});

  const imovel = imoveis.find((item) => item.id === imovelId);

  const roteiro = useMemo(() => {
    if (roteiroChave) {
      return roteiros.find((item) => item.chave === roteiroChave);
    }

    return imovel ? roteiros.find((item) => item.tiposImovel.includes(imovel.tipo)) : undefined;
  }, [roteiros, roteiroChave, imovel]);

  function trocarImovel(novoId: string) {
    const novoImovel = imoveis.find((item) => item.id === novoId);
    const novoRoteiro = roteiroChave
      ? roteiros.find((item) => item.chave === roteiroChave)
      : roteiros.find((item) => novoImovel && item.tiposImovel.includes(novoImovel.tipo));

    setImovelId(novoId);
    setSelecao(novoRoteiro ? selecaoPadrao(novoRoteiro, novoImovel) : {});
  }

  function trocarRoteiro(novaChave: string) {
    const novoRoteiro = novaChave
      ? roteiros.find((item) => item.chave === novaChave)
      : roteiros.find((item) => imovel && item.tiposImovel.includes(imovel.tipo));

    setRoteiroChave(novaChave);
    setSelecao(novoRoteiro ? selecaoPadrao(novoRoteiro, imovel) : {});
  }

  function ajustar(chave: string, mudanca: Partial<Escolha>) {
    setSelecao((atual) => ({
      ...atual,
      [chave]: { quantidade: 0, rotulos: [], itensOpcionais: [], ...atual[chave], ...mudanca },
    }));
  }

  const ambientesEscolhidos = (roteiro?.ambientes ?? [])
    .map((ambiente) => ({
      chave: ambiente.chave,
      quantidade: selecao[ambiente.chave]?.quantidade ?? 0,
      rotulos: selecao[ambiente.chave]?.rotulos ?? [],
      itensOpcionais: selecao[ambiente.chave]?.itensOpcionais ?? [],
    }))
    .filter((ambiente) => ambiente.quantidade > 0);

  const totalAmbientes = ambientesEscolhidos.reduce((soma, item) => soma + item.quantidade, 0);

  return (
    <form action={acao} className="cartao formulario">
      <div className="grade grade-campos-vistoria">
        <label>
          Imóvel
          <select
            name="imovelId"
            required
            value={imovelId}
            onChange={(evento) => trocarImovel(evento.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {imoveis.map((item) => (
              <option key={item.id} value={item.id}>
                {item.apelido}
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

        <label>
          Roteiro
          <select
            name="roteiroChave"
            value={roteiroChave}
            onChange={(evento) => trocarRoteiro(evento.target.value)}
          >
            <option value="">Pelo tipo do imóvel</option>
            {roteiros.map((item) => (
              <option key={item.chave} value={item.chave}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {roteiro ? (
        <fieldset>
          <legend>Ambientes ({totalAmbientes})</legend>
          <p className="texto-suave">
            Deixe em zero o que o imóvel não tem. Com mais de uma cópia dá para nomear cada uma, e
            item desmarcado aparece na vistoria sem exigir resposta nem foto.
          </p>

          <div className="grade-ambientes">
            {roteiro.ambientes.map((ambiente) => {
              const escolha = selecao[ambiente.chave] ?? {
                quantidade: 0,
                rotulos: [],
                itensOpcionais: [],
              };

              return (
                <div className="ambiente-escolha" key={ambiente.chave}>
                  <label className="campo-inline">
                    <input
                      type="checkbox"
                      checked={escolha.quantidade > 0}
                      onChange={(evento) =>
                        ajustar(ambiente.chave, { quantidade: evento.target.checked ? 1 : 0 })
                      }
                    />
                    <span>
                      {ambiente.nome}
                      <small className="texto-suave">{ambiente.itens.length} itens</small>
                    </span>
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={MAXIMO_COPIAS}
                    value={escolha.quantidade}
                    aria-label={`Quantidade de ${ambiente.nome}`}
                    onChange={(evento) =>
                      ajustar(ambiente.chave, {
                        quantidade: Math.min(
                          MAXIMO_COPIAS,
                          Math.max(0, Number(evento.target.value) || 0),
                        ),
                      })
                    }
                  />

                  {escolha.quantidade > 1 ? (
                    <div className="rotulos-ambiente">
                      {Array.from({ length: escolha.quantidade }, (_, indice) => (
                        <input
                          key={indice}
                          type="text"
                          maxLength={80}
                          placeholder={`${ambiente.nome} ${indice + 1}`}
                          value={escolha.rotulos[indice] ?? ''}
                          aria-label={`Nome do ${ambiente.nome} ${indice + 1}`}
                          onChange={(evento) => {
                            const rotulos = [...escolha.rotulos];
                            rotulos[indice] = evento.target.value;
                            ajustar(ambiente.chave, { rotulos });
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {escolha.quantidade > 0 ? (
                    <details className="itens-ambiente">
                      <summary>
                        Itens obrigatórios (
                        {ambiente.itens.length - escolha.itensOpcionais.length} de{' '}
                        {ambiente.itens.length})
                      </summary>
                      {ambiente.itens.map((item) => (
                        <label className="campo-inline" key={item.chave}>
                          <input
                            type="checkbox"
                            checked={!escolha.itensOpcionais.includes(item.chave)}
                            onChange={(evento) =>
                              ajustar(ambiente.chave, {
                                itensOpcionais: evento.target.checked
                                  ? escolha.itensOpcionais.filter((chave) => chave !== item.chave)
                                  : [...escolha.itensOpcionais, item.chave],
                              })
                            }
                          />
                          <span>{item.nome}</span>
                        </label>
                      ))}
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <input type="hidden" name="ambientes" value={JSON.stringify(ambientesEscolhidos)} />

      {estado.erro ? <p className="alerta-erro">{estado.erro}</p> : null}

      <div className="acoes-formulario">
        <button
          type="submit"
          className="botao botao-primario"
          disabled={pendente || totalAmbientes === 0}
        >
          {pendente ? 'Criando...' : 'Criar vistoria'}
        </button>
      </div>
    </form>
  );
}
