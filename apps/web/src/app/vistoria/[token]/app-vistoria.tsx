'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  cpfValido,
  DECLARACAO_EXECUTOR,
  formatarCpf,
  type EstadoItemVistoria,
  type VistoriaItemPublico,
  type VistoriaPublica,
} from '@locafacil/contracts';
import { formatarDataHora } from '@/lib/formato';
import { useFilaEnvio } from './fila-envio';
import { prepararImagem } from './imagem';

const ESTADOS: { valor: EstadoItemVistoria; rotulo: string }[] = [
  { valor: 'NOVO', rotulo: 'Novo' },
  { valor: 'BOM', rotulo: 'Bom' },
  { valor: 'REGULAR', rotulo: 'Regular' },
  { valor: 'RUIM', rotulo: 'Ruim' },
  { valor: 'AUSENTE', rotulo: 'Ausente' },
  { valor: 'NAO_APLICAVEL', rotulo: 'Não tem' },
];

type Tela =
  | { nome: 'ambientes' }
  | { nome: 'itens'; ambienteId: string }
  | { nome: 'aceite' }
  | { nome: 'fim' };

/** Item sem foto minima e opcional: nao exige estado nem foto para concluir. */
const itemOpcional = (item: VistoriaItemPublico): boolean => item.minimoFotos === 0;

const itemCompleto = (item: VistoriaItemPublico, extras: number): boolean =>
  itemOpcional(item) ||
  item.estado === 'NAO_APLICAVEL' ||
  (item.estado !== null && item.fotos.length + extras >= item.minimoFotos);

/** So o obrigatorio entra no progresso: contar opcional junto fazia a barra nascer quase cheia. */
function contar(itens: VistoriaItemPublico[], extras: Map<string, number>) {
  const obrigatorios = itens.filter((item) => !itemOpcional(item));

  return {
    obrigatorios: obrigatorios.length,
    prontos: obrigatorios.filter((item) => itemCompleto(item, extras.get(item.id) ?? 0)).length,
    opcionais: itens.length - obrigatorios.length,
  };
}

/** "2 de 5 obrigatorios . 7 opcionais", sem a metade que o ambiente nao tem. */
function textoContagem(numeros: ReturnType<typeof contar>): string {
  const partes = [];

  if (numeros.obrigatorios > 0) {
    partes.push(`${numeros.prontos} de ${numeros.obrigatorios} obrigatórios`);
  }

  if (numeros.opcionais > 0) {
    partes.push(`${numeros.opcionais} opcionais`);
  }

  return partes.join(' · ') || 'sem itens';
}

export function AppVistoria({ token, inicial }: { token: string; inicial: VistoriaPublica }) {
  const [vistoria, setVistoria] = useState(inicial);
  const [tela, setTela] = useState<Tela>({ nome: 'ambientes' });
  const [erro, setErro] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState(false);

  // Aceite eletrônico: o que a pessoa declara ao fechar a vistoria fica visível até o fim.
  const [aceite, setAceite] = useState(inicial.aceite);
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  const recarregar = useCallback(async () => {
    const resposta = await fetch(`/api/vistoria/${token}`, { cache: 'no-store' });

    if (resposta.ok) {
      setVistoria((await resposta.json()) as VistoriaPublica);
    }
  }, [token]);

  const { fila, enviando, falhas, online, enfileirar, tentarNovamente } = useFilaEnvio(
    token,
    recarregar,
  );

  const extrasPorItem = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const item of fila) {
      mapa.set(item.itemId, (mapa.get(item.itemId) ?? 0) + 1);
    }

    return mapa;
  }, [fila]);

  const progresso = useMemo(
    () => contar(vistoria.ambientes.flatMap((ambiente) => ambiente.itens), extrasPorItem),
    [vistoria, extrasPorItem],
  );

  const pendencias = useMemo(
    () =>
      vistoria.ambientes.flatMap((ambiente) =>
        ambiente.itens
          .filter((item) => !itemCompleto(item, extrasPorItem.get(item.id) ?? 0))
          .map((item) => ({ ambienteId: ambiente.id, texto: `${ambiente.nome}: ${item.nome}` })),
      ),
    [vistoria, extrasPorItem],
  );

  const responder = async (
    itemId: string,
    dados: { estado?: EstadoItemVistoria | null; observacao?: string | null },
  ) => {
    setVistoria((atual) => ({
      ...atual,
      ambientes: atual.ambientes.map((ambiente) => ({
        ...ambiente,
        itens: ambiente.itens.map((item) =>
          item.id === itemId ? { ...item, ...dados } : item,
        ),
      })),
    }));

    const resposta = await fetch(`/api/vistoria/${token}/itens/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      setErro('Não conseguimos salvar agora. Verifique a conexão e tente de novo.');
    }
  };

  const capturar = async (itemId: string, arquivos: FileList | null) => {
    if (!arquivos) {
      return;
    }

    setErro(null);

    for (const arquivo of Array.from(arquivos)) {
      try {
        const preparada = await prepararImagem(arquivo);
        enfileirar(itemId, preparada.arquivo, preparada.metadados);
      } catch (falha) {
        setErro((falha as Error).message);
      }
    }
  };

  /** Foto enviada por engano sai pelo mesmo link. Depois de concluída, a API já barra. */
  const apagarFoto = async (fotoId: string) => {
    setErro(null);

    const resposta = await fetch(`/api/vistoria/${token}/fotos/${fotoId}`, { method: 'DELETE' });

    if (!resposta.ok) {
      setErro('Não conseguimos apagar esta foto agora. Tente de novo.');
      return;
    }

    setVistoria((atual) => ({
      ...atual,
      ambientes: atual.ambientes.map((ambiente) => ({
        ...ambiente,
        itens: ambiente.itens.map((item) => ({
          ...item,
          fotos: item.fotos.filter((foto) => foto.id !== fotoId),
        })),
      })),
    }));
  };

  const concluir = async () => {
    setConcluindo(true);
    setErro(null);

    const resposta = await fetch(`/api/vistoria/${token}/concluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome.trim(),
        documento: documento.replace(/\D/g, ''),
        confirmado: true,
      }),
    });

    setConcluindo(false);

    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => null)) as { mensagem?: string } | null;
      setErro(corpo?.mensagem ?? 'Não conseguimos concluir agora. Tente de novo.');
      return;
    }

    const corpo = (await resposta.json()) as {
      aceite: { nome: string; aceitoEm: string; codigo: string };
    };

    setAceite(corpo.aceite);
    setTela({ nome: 'fim' });
  };

  if (vistoria.situacao === 'ENVIADA' || vistoria.situacao === 'APROVADA' || tela.nome === 'fim') {
    return (
      <div className="vistoria-final">
        <h1>Vistoria enviada</h1>
        <p className="texto-suave">
          Recebemos todas as fotos. A gestão vai conferir e você receberá o laudo por e-mail.
          Pode fechar esta página.
        </p>

        {aceite ? (
          <div className="recibo-aceite">
            <strong>Aceite registrado</strong>
            <span>{aceite.nome}</span>
            <span>{formatarDataHora(aceite.aceitoEm)}</span>
            <span className="codigo">Código de verificação {aceite.codigo}</span>
            <p className="texto-suave">
              Este mesmo código aparece no laudo em PDF. Ele resume o conteúdo que você aceitou.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  if (tela.nome === 'aceite') {
    // Só reclama do CPF depois dos 11 dígitos: apontar erro no meio da digitação é ruído.
    const cpf = documento.replace(/\D/g, '');
    const cpfCompleto = cpf.length === 11;
    const cpfCorreto = cpfValido(cpf);
    const podeConcluir = nome.trim().length >= 3 && cpfCorreto && confirmado;

    return (
      <div className="vistoria-final aceite-tela">
        <h1>Falta só confirmar</h1>
        <p className="texto-suave">
          Seu nome, seu CPF, a data e a hora ficam registrados junto do que você enviou, e vale
          como aceite eletrônico da vistoria.
        </p>

        {erro ? (
          <p className="alerta-item" data-severidade="BLOQUEIO">
            {erro}
          </p>
        ) : null}

        <label>
          Seu nome completo
          <input
            type="text"
            value={nome}
            autoComplete="name"
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="Como está no contrato"
          />
        </label>

        <label>
          Seu CPF
          <input
            type="text"
            value={documento}
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            data-invalido={cpfCompleto && !cpfCorreto}
            aria-invalid={cpfCompleto && !cpfCorreto}
            aria-describedby="erro-cpf"
            onChange={(evento) => setDocumento(formatarCpf(evento.target.value))}
            placeholder="000.000.000-00"
          />
          <span className="aviso-campo" id="erro-cpf" role="status">
            {cpfCompleto && !cpfCorreto ? 'Esse CPF não confere. Revise os números.' : ''}
          </span>
        </label>

        <label className="declaracao">
          <input
            type="checkbox"
            checked={confirmado}
            onChange={(evento) => setConfirmado(evento.target.checked)}
          />
          <span>{DECLARACAO_EXECUTOR}</span>
        </label>

        <div className="linha">
          <button
            type="button"
            className="botao"
            disabled={concluindo}
            onClick={() => {
              setErro(null);
              setTela({ nome: 'ambientes' });
            }}
          >
            Voltar
          </button>
          <button
            type="button"
            className="botao botao-primario"
            disabled={concluindo || !podeConcluir}
            onClick={() => void concluir()}
          >
            {concluindo ? 'Enviando...' : 'Concluir vistoria'}
          </button>
        </div>
      </div>
    );
  }

  const ambienteAtual =
    tela.nome === 'itens'
      ? vistoria.ambientes.find((ambiente) => ambiente.id === tela.ambienteId)
      : undefined;

  return (
    <div className="vistoria">
      <div className="vistoria-topo">
        <div className="rotulo">
          <strong>{ambienteAtual ? ambienteAtual.nome : vistoria.imovel.apelido}</strong>
          <span className="texto-suave"> · {textoContagem(progresso)}</span>
        </div>
        <div className="trilha">
          <div
            className="preenchido"
            style={{
              width:
                progresso.obrigatorios === 0
                  ? '100%'
                  : `${(progresso.prontos / progresso.obrigatorios) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="vistoria-corpo">
        {erro ? (
          <p className="alerta-item" data-severidade="BLOQUEIO">
            {erro}
          </p>
        ) : null}

        {tela.nome === 'ambientes' ? (
          <>
            <div>
              <h1>Vistoria do imóvel</h1>
              <p className="texto-suave">{vistoria.imovel.endereco}</p>
              <p className="texto-suave">
                Percorra os ambientes e registre o estado de cada item. Tudo é salvo conforme você
                avança.
              </p>
              {vistoria.motivoRecusa ? (
                <div className="aviso-complemento">
                  <strong>O gestor do imóvel solicitou um complemento</strong>
                  {/* HTML sanitizado na API: whitelist de tags, sem atributo nenhum. */}
                  <div
                    className="texto-formatado"
                    dangerouslySetInnerHTML={{ __html: vistoria.motivoRecusa }}
                  />
                </div>
              ) : null}

              {progresso.obrigatorios > 0 ? (
                <p className="texto-suave">
                  <span className="marca-obrigatorio">*</span> possui item obrigatório. Só os
                  obrigatórios prendem a conclusão; os opcionais você preenche se fizer sentido.
                </p>
              ) : null}
            </div>

            {vistoria.ambientes.map((ambiente) => {
              const numeros = contar(ambiente.itens, extrasPorItem);

              return (
                <button
                  type="button"
                  key={ambiente.id}
                  className="ambiente-cartao"
                  data-completo={numeros.prontos === numeros.obrigatorios}
                  onClick={() => setTela({ nome: 'itens', ambienteId: ambiente.id })}
                >
                  <span className="rotulo">
                    <span className="nome">
                      {ambiente.nome}
                      {numeros.obrigatorios > 0 ? (
                        <span className="marca-obrigatorio" title="Possui item obrigatório">
                          *
                        </span>
                      ) : null}
                    </span>
                    <span className="contagem">{textoContagem(numeros)}</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              );
            })}
          </>
        ) : null}

        {ambienteAtual ? (
          <>
            {ambienteAtual.itens.map((item) => (
              <CartaoItem
                key={item.id}
                item={item}
                enviando={extrasPorItem.get(item.id) ?? 0}
                previas={fila.filter((envio) => envio.itemId === item.id).map((envio) => envio.previa)}
                onEstado={(estado) => void responder(item.id, { estado })}
                onObservacao={(observacao) => void responder(item.id, { observacao })}
                onCapturar={(arquivos) => void capturar(item.id, arquivos)}
                onApagarFoto={(fotoId) => void apagarFoto(fotoId)}
              />
            ))}

            <button
              type="button"
              className="botao"
              onClick={() => setTela({ nome: 'ambientes' })}
            >
              Voltar para os ambientes
            </button>
          </>
        ) : null}

        {tela.nome === 'ambientes' && pendencias.length > 0 ? (
          <div>
            <strong>Ainda falta (obrigatórios)</strong>
            <ul className="pendencias">
              {pendencias.slice(0, 8).map((pendencia) => (
                <li key={pendencia.texto}>
                  <button
                    type="button"
                    className="botao botao-texto"
                    onClick={() => setTela({ nome: 'itens', ambienteId: pendencia.ambienteId })}
                  >
                    {pendencia.texto}
                  </button>
                </li>
              ))}
              {pendencias.length > 8 ? (
                <li>e mais {pendencias.length - 8} obrigatórios</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="vistoria-rodape">
        {!online ? (
          <div className="fila-aviso">Sem conexão. O envio recomeça sozinho quando voltar.</div>
        ) : null}

        {enviando > 0 ? (
          <div className="fila-aviso">
            <strong>Não feche esta página até terminar de enviar</strong>
            <span>Enviando {enviando} foto(s)</span>
            <div className="barra">
              <span style={{ width: `${Math.max(8, 100 - enviando * 8)}%` }} />
            </div>
          </div>
        ) : null}

        {falhas.length > 0 ? (
          <div className="fila-aviso">
            <span>{falhas.length} foto(s) não subiram.</span>
            <button type="button" className="botao botao-texto" onClick={tentarNovamente}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        <div className="linha">
          <button
            type="button"
            className="botao botao-primario"
            onClick={() => {
              setErro(null);
              setTela({ nome: 'aceite' });
            }}
            disabled={concluindo || pendencias.length > 0 || enviando > 0}
          >
            {pendencias.length > 0
              ? `Faltam ${pendencias.length} obrigatórios`
              : 'Concluir vistoria'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartaoItem({
  item,
  enviando,
  previas,
  onEstado,
  onObservacao,
  onCapturar,
  onApagarFoto,
}: {
  item: VistoriaItemPublico;
  enviando: number;
  previas: string[];
  onEstado: (estado: EstadoItemVistoria) => void;
  onObservacao: (observacao: string) => void;
  onCapturar: (arquivos: FileList | null) => void;
  onApagarFoto: (fotoId: string) => void;
}) {
  // Apagar é definitivo: o X só arma a confirmação, quem apaga é o segundo toque.
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const total = item.fotos.length + enviando;
  const opcional = itemOpcional(item);
  const completo = opcional || total >= item.minimoFotos;

  return (
    <section className="item-cartao">
      <h3>
        {item.nome}
        {opcional ? <span className="etiqueta-opcional">opcional</span> : null}
      </h3>
      {item.dica ? <p className="dica">{item.dica}</p> : null}

      <div className="estados">
        {ESTADOS.map((estado) => (
          <button
            type="button"
            key={estado.valor}
            className="estado-botao"
            aria-pressed={item.estado === estado.valor}
            onClick={() => onEstado(estado.valor)}
          >
            {estado.rotulo}
          </button>
        ))}
      </div>

      {item.estado !== 'NAO_APLICAVEL' ? (
        <>
          <div className="miniaturas">
            {item.fotos.map((foto) => (
              <div className="miniatura" key={foto.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/vistoria-foto/${foto.id}`} alt="" loading="lazy" />

                {confirmando === foto.id ? (
                  <div className="confirmar-remocao">
                    <span>Apagar?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmando(null);
                        onApagarFoto(foto.id);
                      }}
                    >
                      Apagar
                    </button>
                    <button type="button" onClick={() => setConfirmando(null)}>
                      Manter
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="apagar-foto"
                    aria-label={`Apagar foto de ${item.nome}`}
                    onClick={() => setConfirmando(foto.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {previas.map((previa) => (
              <div className="miniatura" data-enviando="true" key={previa}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previa} alt="" />
              </div>
            ))}
          </div>

          <label className="botao-camera">
            Tirar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(evento) => {
                onCapturar(evento.target.files);
                evento.target.value = '';
              }}
            />
          </label>

          <span className="contador-fotos" data-completo={completo}>
            {opcional
              ? `${total} foto(s), envio opcional`
              : `${total} de ${item.minimoFotos} foto(s) necessária(s)`}
          </span>
        </>
      ) : null}

      <label>
        Observação (opcional)
        <textarea
          defaultValue={item.observacao ?? ''}
          rows={2}
          onBlur={(evento) => onObservacao(evento.target.value)}
          placeholder="Ex.: trinca no canto direito"
        />
      </label>
    </section>
  );
}
