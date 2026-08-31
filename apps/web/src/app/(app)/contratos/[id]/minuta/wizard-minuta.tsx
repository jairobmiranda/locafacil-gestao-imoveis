'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { PapelParte, RespostasBlindagem } from '@locafacil/contracts';
import { EntradaValorControlada } from '@/componentes/campos-mascarados';
import { mascararDocumento } from '@/lib/mascaras';
import {
  carregarPrevia,
  gerarMinuta,
  salvarEnquadramento,
  salvarPartes,
  type ParteEdicao,
  type Previa,
} from './acoes';

type Pessoa = { id: string; nome: string; documento: string | null; estadoCivil: string | null };

type ContratoWizard = {
  id: string;
  finalidade: string;
  tipoGarantia: string;
  valorGarantia: number | null;
  valorAluguel: number;
  dataInicio: string;
  dataFim: string;
  diaVencimento: number;
  imovel: { apelido: string; cidade: string | null };
  partes: { pessoaId: string; papel: string; contatoPrincipal: boolean; participacao: number | null }[];
  respostasBlindagem: RespostasBlindagem | null;
};

const PADRAO: RespostasBlindagem = {
  perfil: 'EQUILIBRADO',
  renunciaBenfeitorias: true,
  vedarSublocacao: true,
  vedarObras: true,
  vedarAnimais: false,
  vedarMudancaDestinacao: true,
  exigirComunicacaoOcupantes: true,
  iptuPorLocatario: true,
  condominioPorLocatario: true,
  seguroIncendioPorLocatario: true,
  transferirContasConsumo: true,
  prazoTransferenciaConsumoDias: 30,
  autorizacaoConsultaConsumo: true,
  multaRescisoriaAlugueis: 3,
  duasTestemunhas: true,
  direitoPreferencia: true,
  exigirVistoriaEntrada: true,
  exigirVistoriaSaida: true,
  clausulaSolidariedade: true,
  comunicacoesEletronicas: true,
  clausulaLgpd: true,
  clausulasAdicionais: [],
};

type ChaveBooleana =
  | 'renunciaBenfeitorias'
  | 'vedarSublocacao'
  | 'vedarObras'
  | 'vedarAnimais'
  | 'vedarMudancaDestinacao'
  | 'exigirComunicacaoOcupantes'
  | 'iptuPorLocatario'
  | 'condominioPorLocatario'
  | 'seguroIncendioPorLocatario'
  | 'transferirContasConsumo'
  | 'autorizacaoConsultaConsumo'
  | 'duasTestemunhas'
  | 'direitoPreferencia'
  | 'exigirVistoriaEntrada'
  | 'exigirVistoriaSaida'
  | 'clausulaSolidariedade'
  | 'comunicacoesEletronicas'
  | 'clausulaLgpd';

type PerfilPronto = 'CONSERVADOR' | 'EQUILIBRADO' | 'MAXIMA_PROTECAO';

const PERFIS: Record<PerfilPronto, Partial<RespostasBlindagem>> = {
  CONSERVADOR: {
    renunciaBenfeitorias: false,
    vedarAnimais: false,
    vedarObras: true,
    vedarSublocacao: true,
    iptuPorLocatario: false,
    condominioPorLocatario: true,
    seguroIncendioPorLocatario: false,
    multaRescisoriaAlugueis: 3,
    direitoPreferencia: true,
  },
  EQUILIBRADO: {
    renunciaBenfeitorias: true,
    vedarAnimais: false,
    vedarObras: true,
    vedarSublocacao: true,
    iptuPorLocatario: true,
    condominioPorLocatario: true,
    seguroIncendioPorLocatario: true,
    multaRescisoriaAlugueis: 3,
    direitoPreferencia: true,
  },
  MAXIMA_PROTECAO: {
    renunciaBenfeitorias: true,
    vedarAnimais: true,
    vedarObras: true,
    vedarSublocacao: true,
    vedarMudancaDestinacao: true,
    exigirComunicacaoOcupantes: true,
    iptuPorLocatario: true,
    condominioPorLocatario: true,
    seguroIncendioPorLocatario: true,
    transferirContasConsumo: true,
    autorizacaoConsultaConsumo: true,
    multaRescisoriaAlugueis: 3,
    duasTestemunhas: true,
    direitoPreferencia: true,
    exigirVistoriaEntrada: true,
    exigirVistoriaSaida: true,
  },
};

const BLINDAGEM: { grupo: string; itens: { chave: ChaveBooleana; titulo: string; explicacao: string }[] }[] = [
  {
    grupo: 'Conservação e uso',
    itens: [
      {
        chave: 'renunciaBenfeitorias',
        titulo: 'Renúncia a indenização por benfeitorias',
        explicacao:
          'O inquilino não pode cobrar por reformas que fizer nem reter o imóvel até ser pago. Súmula 335 do STJ.',
      },
      {
        chave: 'vedarSublocacao',
        titulo: 'Proibir sublocação, cessão e empréstimo',
        explicacao: 'Inclui a proibição de anunciar o imóvel em plataformas de temporada.',
      },
      {
        chave: 'vedarObras',
        titulo: 'Proibir obras sem autorização',
        explicacao: 'Nenhuma alteração estrutural, elétrica, hidráulica ou de fachada sem seu aval por escrito.',
      },
      {
        chave: 'vedarAnimais',
        titulo: 'Proibir animais',
        explicacao: 'Ressalvado cão-guia e demais casos de proteção legal obrigatória.',
      },
      {
        chave: 'vedarMudancaDestinacao',
        titulo: 'Proibir mudança de destinação',
        explicacao: 'Transformar residência em ponto comercial passa a ser infração grave.',
      },
      {
        chave: 'exigirComunicacaoOcupantes',
        titulo: 'Exigir comunicação de novos ocupantes',
        explicacao: 'Evita que o imóvel receba moradores que você nunca aprovou.',
      },
    ],
  },
  {
    grupo: 'Encargos',
    itens: [
      {
        chave: 'iptuPorLocatario',
        titulo: 'IPTU e taxas por conta do inquilino',
        explicacao: 'Inclui responsabilidade por dívida ativa gerada no período da locação.',
      },
      {
        chave: 'condominioPorLocatario',
        titulo: 'Condomínio ordinário por conta do inquilino',
        explicacao: 'As despesas extraordinárias continuam sendo suas, como manda a lei.',
      },
      {
        chave: 'seguroIncendioPorLocatario',
        titulo: 'Seguro contra incêndio por conta do inquilino',
        explicacao: 'Se ele não contratar, você contrata e cobra no aluguel seguinte.',
      },
      {
        chave: 'transferirContasConsumo',
        titulo: 'Exigir transferência das contas de consumo',
        explicacao: 'Água, luz e gás no nome dele, com prazo definido e prova na saída.',
      },
      {
        chave: 'autorizacaoConsultaConsumo',
        titulo: 'Autorização para consultar água e energia',
        explicacao:
          'Permite consultar faturas e débitos na concessionária mesmo com a conta no nome do inquilino, e enviar lembretes. Sem ela, a prestadora nega a informação por ser dado de terceiro (LGPD).',
      },
    ],
  },
  {
    grupo: 'Rescisão e execução',
    itens: [
      {
        chave: 'duasTestemunhas',
        titulo: 'Assinatura de duas testemunhas',
        explicacao:
          'É o que transforma o contrato em título executivo extrajudicial e permite executar direto, sem ação de conhecimento.',
      },
      {
        chave: 'direitoPreferencia',
        titulo: 'Cláusula de direito de preferência',
        explicacao: 'Disciplina como o inquilino é notificado se você decidir vender o imóvel.',
      },
    ],
  },
  {
    grupo: 'Vistoria',
    itens: [
      {
        chave: 'exigirVistoriaEntrada',
        titulo: 'Vistoria de entrada como parte do contrato',
        explicacao: 'Sem ela, cobrar danos na saída fica praticamente inviável.',
      },
      {
        chave: 'exigirVistoriaSaida',
        titulo: 'Vistoria de saída com prazo de reparo',
        explicacao: 'Permite compensar o custo dos reparos com a garantia prestada.',
      },
    ],
  },
  {
    grupo: 'Gerais',
    itens: [
      {
        chave: 'clausulaSolidariedade',
        titulo: 'Solidariedade expressa entre os locatários',
        explicacao:
          'Permite cobrar a dívida inteira de qualquer um deles. A lei já presume, mas a cláusula elimina discussão.',
      },
      {
        chave: 'comunicacoesEletronicas',
        titulo: 'Validar e-mail e mensagens como notificação',
        explicacao: 'Evita ter que notificar por cartório a cada aviso.',
      },
      {
        chave: 'clausulaLgpd',
        titulo: 'Cláusula de proteção de dados',
        explicacao: 'Define a finalidade do uso dos documentos que você coleta.',
      },
    ],
  },
];

const PASSOS = ['Partes', 'Enquadramento', 'Garantia', 'Blindagem', 'Revisão'];

const PAPEIS_EDITAVEIS: { papel: PapelParte; rotulo: string; ajuda: string }[] = [
  { papel: 'LOCADOR', rotulo: 'Locadores', ajuda: 'Quem é dono do imóvel. Pode ser mais de um.' },
  { papel: 'LOCATARIO', rotulo: 'Locatários', ajuda: 'Quem vai morar ou usar o imóvel.' },
  { papel: 'FIADOR', rotulo: 'Fiadores', ajuda: 'Só se a garantia escolhida for fiança.' },
  { papel: 'CONJUGE', rotulo: 'Cônjuges anuentes', ajuda: 'Obrigatório quando o fiador é casado.' },
  { papel: 'TESTEMUNHA', rotulo: 'Testemunhas', ajuda: 'Duas testemunhas tornam o contrato título executivo.' },
];

function faixaProtecao(percentual: number): 'fraco' | 'equilibrado' | 'robusto' {
  if (percentual < 45) return 'fraco';
  if (percentual < 75) return 'equilibrado';
  return 'robusto';
}

export function WizardMinuta({
  contrato,
  pessoas,
}: {
  contrato: ContratoWizard;
  pessoas: Pessoa[];
}) {
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [salvando, iniciarSalvamento] = useTransition();

  const [respostas, setRespostas] = useState<RespostasBlindagem>(
    () => contrato.respostasBlindagem ?? PADRAO,
  );

  const [partes, setPartes] = useState<ParteEdicao[]>(() =>
    contrato.partes.map((parte, indice) => ({
      pessoaId: parte.pessoaId,
      papel: parte.papel as PapelParte,
      contatoPrincipal: parte.contatoPrincipal,
      ...(parte.participacao !== null ? { participacao: parte.participacao } : {}),
      ordem: indice,
    })),
  );

  const [finalidade, setFinalidade] = useState(contrato.finalidade);
  const [tipoGarantia, setTipoGarantia] = useState(contrato.tipoGarantia);
  const [valorGarantia, setValorGarantia] = useState(contrato.valorGarantia ?? 0);

  const nomePorId = useMemo(
    () => new Map(pessoas.map((pessoa) => [pessoa.id, pessoa])),
    [pessoas],
  );

  const atualizarPrevia = useCallback(
    (proximas: RespostasBlindagem) => {
      void carregarPrevia(contrato.id, proximas).then((resultado) => {
        if ('erro' in resultado) {
          setErro(resultado.erro);
          return;
        }

        setErro(null);
        setPrevia(resultado);
      });
    },
    [contrato.id],
  );

  const primeiraCarga = useRef(true);

  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      atualizarPrevia(respostas);
      return;
    }

    const temporizador = setTimeout(() => atualizarPrevia(respostas), 400);
    return () => clearTimeout(temporizador);
  }, [respostas, atualizarPrevia]);

  const alternar = (chave: ChaveBooleana) =>
    setRespostas((atual) => ({ ...atual, [chave]: !atual[chave], perfil: 'PERSONALIZADO' }));

  const aplicarPerfil = (perfil: PerfilPronto) =>
    setRespostas((atual) => ({ ...atual, ...PERFIS[perfil], perfil }));

  const adicionarParte = (papel: PapelParte, pessoaId: string) => {
    if (!pessoaId || partes.some((parte) => parte.pessoaId === pessoaId && parte.papel === papel)) {
      return;
    }

    setPartes((atual) => [
      ...atual,
      {
        pessoaId,
        papel,
        contatoPrincipal: papel === 'LOCATARIO' && !atual.some((parte) => parte.contatoPrincipal),
        ordem: atual.length,
      },
    ]);
  };

  const removerParte = (pessoaId: string, papel: PapelParte) =>
    setPartes((atual) =>
      atual.filter((parte) => !(parte.pessoaId === pessoaId && parte.papel === papel)),
    );

  const definirParticipacao = (pessoaId: string, valor: number) =>
    setPartes((atual) =>
      atual.map((parte) =>
        parte.pessoaId === pessoaId && parte.papel === 'LOCADOR'
          ? { ...parte, participacao: valor }
          : parte,
      ),
    );

  const definirContatoPrincipal = (pessoaId: string) =>
    setPartes((atual) =>
      atual.map((parte) => ({ ...parte, contatoPrincipal: parte.pessoaId === pessoaId })),
    );

  const avancar = () => {
    setErro(null);

    if (passo === 0) {
      iniciarSalvamento(async () => {
        const resultado = await salvarPartes(contrato.id, partes);
        if (resultado.erro) {
          setErro(resultado.erro);
          return;
        }
        setPasso(1);
        atualizarPrevia(respostas);
      });
      return;
    }

    if (passo === 2) {
      iniciarSalvamento(async () => {
        const resultado = await salvarEnquadramento(contrato.id, {
          finalidade,
          tipoGarantia,
          ...(tipoGarantia === 'CAUCAO' || tipoGarantia === 'TITULO_CAPITALIZACAO'
            ? { valorGarantia }
            : {}),
        });
        if (resultado.erro) {
          setErro(resultado.erro);
          return;
        }
        setPasso(3);
        atualizarPrevia(respostas);
      });
      return;
    }

    setPasso((atual) => Math.min(atual + 1, PASSOS.length - 1));
  };

  const finalizar = () =>
    iniciarSalvamento(async () => {
      const resultado = await gerarMinuta(contrato.id, respostas);
      if (resultado?.erro) {
        setErro(resultado.erro);
      }
    });

  const bloqueios = previa?.alertas.filter((item) => item.severidade === 'BLOQUEIO') ?? [];
  const percentual = previa
    ? Math.round((previa.nivelProtecao / Math.max(1, previa.protecaoMaxima)) * 100)
    : 0;

  const documento = previa ? (
    <div className="contrato-preview" dangerouslySetInnerHTML={{ __html: previa.html }} />
  ) : (
    <p className="texto-suave">Montando o documento...</p>
  );

  return (
    <>
      <div className="wizard-progresso">
        <div className="rotulo">
          <span>
            Passo {passo + 1} de {PASSOS.length}
          </span>
          <strong>{PASSOS[passo]}</strong>
        </div>
        <div className="trilha">
          <div
            className="preenchido"
            style={{ width: `${((passo + 1) / PASSOS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="wizard">
        <div className="wizard-passo">
          {erro ? (
            <p className="alerta-item" data-severidade="BLOQUEIO">
              {erro}
            </p>
          ) : null}

          {passo === 0 ? (
            <PassoPartes
              partes={partes}
              pessoas={pessoas}
              nomePorId={nomePorId}
              onAdicionar={adicionarParte}
              onRemover={removerParte}
              onParticipacao={definirParticipacao}
              onContatoPrincipal={definirContatoPrincipal}
            />
          ) : null}

          {passo === 1 ? (
            <PassoEnquadramento
              finalidade={finalidade}
              onFinalidade={setFinalidade}
              foro={respostas.foroComarca ?? contrato.imovel.cidade ?? ''}
              onForo={(valor) =>
                setRespostas((atual) => ({ ...atual, foroComarca: valor || undefined }))
              }
            />
          ) : null}

          {passo === 2 ? (
            <PassoGarantia
              tipoGarantia={tipoGarantia}
              onTipoGarantia={setTipoGarantia}
              valorGarantia={valorGarantia}
              onValorGarantia={setValorGarantia}
              valorAluguel={contrato.valorAluguel}
            />
          ) : null}

          {passo === 3 ? (
            <PassoBlindagem
              respostas={respostas}
              percentual={percentual}
              onAlternar={alternar}
              onPerfil={aplicarPerfil}
              onMulta={(valor) =>
                setRespostas((atual) => ({
                  ...atual,
                  multaRescisoriaAlugueis: valor,
                  perfil: 'PERSONALIZADO',
                }))
              }
            />
          ) : null}

          {passo === 4 ? (
            <section className="campo-grupo">
              <h2>Revisão</h2>
              <p className="ajuda">
                Confira o documento antes de gerar. Depois de gerada, a minuta não muda mais:
                qualquer ajuste cria uma nova versão.
              </p>
              {previa ? (
                <p className="texto-suave">
                  {previa.clausulas.length} cláusulas selecionadas · proteção {percentual}%
                </p>
              ) : null}
              <div className="preview-embutido">{documento}</div>
            </section>
          ) : null}

          {previa && previa.alertas.length > 0 ? (
            <ul className="alerta-lista">
              {previa.alertas.map((alerta, indice) => (
                <li
                  className="alerta-item"
                  data-severidade={alerta.severidade}
                  key={`${alerta.clausulaId ?? 'geral'}-${indice}`}
                >
                  {alerta.mensagem}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <aside className="preview">{documento}</aside>
      </div>

      <button
        type="button"
        className="botao preview-flutuante"
        onClick={() => setMostrarPreview(true)}
      >
        Ver documento
      </button>

      {mostrarPreview ? (
        <div className="preview-folha" role="dialog" aria-label="Prévia do contrato">
          <header>
            <strong>Prévia do contrato</strong>
            <button type="button" className="botao" onClick={() => setMostrarPreview(false)}>
              Fechar
            </button>
          </header>
          <div className="conteudo">{documento}</div>
        </div>
      ) : null}

      <div className="wizard-rodape">
        <button
          type="button"
          className="botao"
          onClick={() => setPasso((atual) => Math.max(0, atual - 1))}
          disabled={passo === 0 || salvando}
        >
          Voltar
        </button>
        {passo < PASSOS.length - 1 ? (
          <button type="button" className="botao botao-primario" onClick={avancar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Continuar'}
          </button>
        ) : (
          <button
            type="button"
            className="botao botao-primario"
            onClick={finalizar}
            disabled={salvando || bloqueios.length > 0}
          >
            {salvando ? 'Gerando...' : 'Gerar minuta'}
          </button>
        )}
      </div>
    </>
  );
}

function PassoPartes({
  partes,
  pessoas,
  nomePorId,
  onAdicionar,
  onRemover,
  onParticipacao,
  onContatoPrincipal,
}: {
  partes: ParteEdicao[];
  pessoas: Pessoa[];
  nomePorId: Map<string, Pessoa>;
  onAdicionar: (papel: PapelParte, pessoaId: string) => void;
  onRemover: (pessoaId: string, papel: PapelParte) => void;
  onParticipacao: (pessoaId: string, valor: number) => void;
  onContatoPrincipal: (pessoaId: string) => void;
}) {
  return (
    <section className="campo-grupo">
      <h2>Quem assina o contrato</h2>
      <p className="ajuda">
        Um contrato pode ter mais de um locador e mais de um locatário. Eles respondem
        solidariamente, na forma do artigo 2º da Lei 8.245/91.
      </p>

      {PAPEIS_EDITAVEIS.map((definicao) => {
        const doPapel = partes.filter((parte) => parte.papel === definicao.papel);

        return (
          <div className="cartao" key={definicao.papel}>
            <div className="cabecalho-secao">
              <h3>{definicao.rotulo}</h3>
            </div>
            <p className="ajuda">{definicao.ajuda}</p>

            {doPapel.map((parte) => {
              const pessoa = nomePorId.get(parte.pessoaId);

              return (
                <div className="opcao" key={`${parte.papel}-${parte.pessoaId}`}>
                  <div className="texto">
                    <span className="titulo">{pessoa?.nome ?? parte.pessoaId}</span>
                    <span className="explicacao">
                      {pessoa?.documento ? mascararDocumento(pessoa.documento) : 'sem documento cadastrado'}
                      {pessoa?.estadoCivil ? ` · ${pessoa.estadoCivil.toLowerCase()}` : ''}
                    </span>

                    {definicao.papel === 'LOCADOR' ? (
                      <label className="texto-suave">
                        Participação (%)
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step="0.01"
                          value={parte.participacao ?? ''}
                          onChange={(evento) =>
                            onParticipacao(parte.pessoaId, Number(evento.target.value))
                          }
                        />
                      </label>
                    ) : null}

                    {definicao.papel === 'LOCATARIO' ? (
                      <label className="texto-suave">
                        <input
                          type="radio"
                          name="contatoPrincipal"
                          checked={parte.contatoPrincipal}
                          onChange={() => onContatoPrincipal(parte.pessoaId)}
                        />{' '}
                        Contato principal das cobranças
                      </label>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="botao botao-texto"
                    onClick={() => onRemover(parte.pessoaId, definicao.papel)}
                  >
                    Remover
                  </button>
                </div>
              );
            })}

            <label>
              Adicionar
              <select
                value=""
                onChange={(evento) => onAdicionar(definicao.papel, evento.target.value)}
              >
                <option value="">Selecione uma pessoa</option>
                {pessoas.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        );
      })}
    </section>
  );
}

function PassoEnquadramento({
  finalidade,
  onFinalidade,
  foro,
  onForo,
}: {
  finalidade: string;
  onFinalidade: (valor: string) => void;
  foro: string;
  onForo: (valor: string) => void;
}) {
  const opcoes = [
    {
      valor: 'RESIDENCIAL',
      titulo: 'Residencial',
      explicacao: 'Moradia. Prazo de 30 meses ou mais permite retomada automática ao fim.',
    },
    {
      valor: 'NAO_RESIDENCIAL',
      titulo: 'Comercial',
      explicacao: 'Atividade empresarial. Regime de renovatória do artigo 51 da Lei 8.245/91.',
    },
    {
      valor: 'TEMPORADA',
      titulo: 'Temporada',
      explicacao: 'Até 90 dias, com regras próprias dos artigos 48 a 50.',
    },
  ];

  return (
    <section className="campo-grupo">
      <h2>Enquadramento</h2>
      <p className="ajuda">A finalidade muda o regime legal e as cláusulas que entram.</p>

      {opcoes.map((opcao) => (
        <label className="opcao" key={opcao.valor}>
          <input
            type="radio"
            name="finalidade"
            value={opcao.valor}
            checked={finalidade === opcao.valor}
            onChange={() => onFinalidade(opcao.valor)}
          />
          <span className="texto">
            <span className="titulo">{opcao.titulo}</span>
            <span className="explicacao">{opcao.explicacao}</span>
          </span>
        </label>
      ))}

      <label>
        Foro da comarca
        <input
          type="text"
          value={foro}
          onChange={(evento) => onForo(evento.target.value)}
          placeholder="Ex.: Goiânia"
        />
      </label>
    </section>
  );
}

function PassoGarantia({
  tipoGarantia,
  onTipoGarantia,
  valorGarantia,
  onValorGarantia,
  valorAluguel,
}: {
  tipoGarantia: string;
  onTipoGarantia: (valor: string) => void;
  valorGarantia: number;
  onValorGarantia: (valor: number) => void;
  valorAluguel: number;
}) {
  const opcoes = [
    {
      valor: 'CAUCAO',
      titulo: 'Caução em dinheiro',
      explicacao: 'Limite legal de 3 aluguéis. Fica em poupança e volta corrigida no fim.',
    },
    {
      valor: 'FIADOR',
      titulo: 'Fiador',
      explicacao:
        'A garantia mais forte. Se o fiador for casado, o cônjuge precisa anuir, senão a fiança não vale.',
    },
    {
      valor: 'SEGURO_FIANCA',
      titulo: 'Seguro fiança',
      explicacao: 'Apólice paga pelo inquilino, com cobertura de aluguel, encargos e danos.',
    },
    {
      valor: 'TITULO_CAPITALIZACAO',
      titulo: 'Título de capitalização',
      explicacao: 'Título cedido em garantia, resgatável se houver inadimplência.',
    },
    {
      valor: 'NENHUMA',
      titulo: 'Sem garantia',
      explicacao: 'Permite exigir o aluguel no mês vincendo, até o sexto dia útil.',
    },
  ];

  const exigeValor = tipoGarantia === 'CAUCAO' || tipoGarantia === 'TITULO_CAPITALIZACAO';
  const limite = valorAluguel * 3;

  return (
    <section className="campo-grupo">
      <h2>Garantia</h2>
      <p className="ajuda">
        A lei proíbe cumular modalidades. Escolha apenas uma.
      </p>

      {opcoes.map((opcao) => (
        <label className="opcao" key={opcao.valor}>
          <input
            type="radio"
            name="tipoGarantia"
            value={opcao.valor}
            checked={tipoGarantia === opcao.valor}
            onChange={() => onTipoGarantia(opcao.valor)}
          />
          <span className="texto">
            <span className="titulo">{opcao.titulo}</span>
            <span className="explicacao">{opcao.explicacao}</span>
          </span>
        </label>
      ))}

      {exigeValor ? (
        <label>
          Valor da garantia
          <EntradaValorControlada valor={valorGarantia} aoMudar={onValorGarantia} />
          {tipoGarantia === 'CAUCAO' ? (
            <span className="texto-suave">
              Máximo permitido: {limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          ) : null}
        </label>
      ) : null}
    </section>
  );
}

function PassoBlindagem({
  respostas,
  percentual,
  onAlternar,
  onPerfil,
  onMulta,
}: {
  respostas: RespostasBlindagem;
  percentual: number;
  onAlternar: (chave: ChaveBooleana) => void;
  onPerfil: (perfil: PerfilPronto) => void;
  onMulta: (valor: number) => void;
}) {
  const faixa = faixaProtecao(percentual);

  return (
    <section className="campo-grupo">
      <h2>Blindagem</h2>
      <p className="ajuda">
        Cada opção liga um bloco de cláusulas. O texto explica o efeito prático, sem juridiquês.
      </p>

      <div className="medidor">
        <div className="topo">
          <strong>Nível de proteção</strong>
          <span className="texto-suave">
            {faixa === 'fraco' ? 'Fraco' : faixa === 'equilibrado' ? 'Equilibrado' : 'Robusto'} ·{' '}
            {percentual}%
          </span>
        </div>
        <div className="barra">
          <div className="nivel" data-faixa={faixa} style={{ width: `${percentual}%` }} />
        </div>
      </div>

      <div className="campo-grupo">
        <strong>Perfis prontos</strong>
        <div className="wizard-rodape" style={{ position: 'static', padding: 0, background: 'none', border: 0 }}>
          <button type="button" className="botao" onClick={() => onPerfil('CONSERVADOR')}>
            Conservador
          </button>
          <button type="button" className="botao" onClick={() => onPerfil('EQUILIBRADO')}>
            Equilibrado
          </button>
          <button type="button" className="botao" onClick={() => onPerfil('MAXIMA_PROTECAO')}>
            Máxima proteção
          </button>
        </div>
      </div>

      {BLINDAGEM.map((secao) => (
        <div className="campo-grupo" key={secao.grupo}>
          <strong>{secao.grupo}</strong>
          {secao.itens.map((item) => (
            <label className="opcao" key={item.chave}>
              <input
                type="checkbox"
                checked={Boolean(respostas[item.chave])}
                onChange={() => onAlternar(item.chave)}
              />
              <span className="texto">
                <span className="titulo">{item.titulo}</span>
                <span className="explicacao">{item.explicacao}</span>
              </span>
            </label>
          ))}
        </div>
      ))}

      <label>
        Multa por rescisão antecipada (em aluguéis)
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={6}
          step="1"
          value={respostas.multaRescisoriaAlugueis}
          onChange={(evento) => onMulta(Number(evento.target.value))}
        />
        <span className="texto-suave">
          Acima de 3 aluguéis costuma ser reduzida judicialmente. A lei já manda reduzir
          proporcionalmente ao tempo cumprido.
        </span>
      </label>
    </section>
  );
}
