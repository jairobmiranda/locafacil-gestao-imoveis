'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  EstadoItemVistoria,
  VistoriaItemPublico,
  VistoriaPublica,
} from '@locafacil/contracts';
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

type Tela = { nome: 'ambientes' } | { nome: 'itens'; ambienteId: string } | { nome: 'fim' };

const itemCompleto = (item: VistoriaItemPublico, extras: number): boolean =>
  item.estado === 'NAO_APLICAVEL' ||
  (item.estado !== null && item.fotos.length + extras >= item.minimoFotos);

export function AppVistoria({ token, inicial }: { token: string; inicial: VistoriaPublica }) {
  const [vistoria, setVistoria] = useState(inicial);
  const [tela, setTela] = useState<Tela>({ nome: 'ambientes' });
  const [erro, setErro] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState(false);

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

  const progresso = useMemo(() => {
    const itens = vistoria.ambientes.flatMap((ambiente) => ambiente.itens);
    const prontos = itens.filter((item) =>
      itemCompleto(item, extrasPorItem.get(item.id) ?? 0),
    ).length;

    return { prontos, total: itens.length };
  }, [vistoria, extrasPorItem]);

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

  const concluir = async () => {
    setConcluindo(true);
    setErro(null);

    const resposta = await fetch(`/api/vistoria/${token}/concluir`, { method: 'POST' });

    setConcluindo(false);

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => null);
      setErro(corpo?.mensagem ?? 'Ainda faltam itens para concluir.');
      return;
    }

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
          <span className="texto-suave">
            {' '}
            · {progresso.prontos} de {progresso.total} itens
          </span>
        </div>
        <div className="trilha">
          <div
            className="preenchido"
            style={{ width: `${(progresso.prontos / Math.max(1, progresso.total)) * 100}%` }}
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
            </div>

            {vistoria.ambientes.map((ambiente) => {
              const prontos = ambiente.itens.filter((item) =>
                itemCompleto(item, extrasPorItem.get(item.id) ?? 0),
              ).length;

              return (
                <button
                  type="button"
                  key={ambiente.id}
                  className="ambiente-cartao"
                  data-completo={prontos === ambiente.itens.length}
                  onClick={() => setTela({ nome: 'itens', ambienteId: ambiente.id })}
                >
                  <span className="rotulo">
                    <span className="nome">{ambiente.nome}</span>
                    <span className="contagem">
                      {prontos} de {ambiente.itens.length} itens
                    </span>
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
            <strong>Ainda falta</strong>
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
              {pendencias.length > 8 ? <li>e mais {pendencias.length - 8} itens</li> : null}
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
            onClick={() => void concluir()}
            disabled={concluindo || pendencias.length > 0 || enviando > 0}
          >
            {concluindo
              ? 'Enviando...'
              : pendencias.length > 0
                ? `Faltam ${pendencias.length} itens`
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
}: {
  item: VistoriaItemPublico;
  enviando: number;
  previas: string[];
  onEstado: (estado: EstadoItemVistoria) => void;
  onObservacao: (observacao: string) => void;
  onCapturar: (arquivos: FileList | null) => void;
}) {
  const total = item.fotos.length + enviando;
  const completo = total >= item.minimoFotos;

  return (
    <section className="item-cartao">
      <h3>{item.nome}</h3>
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
            {total} de {item.minimoFotos} foto(s) necessária(s)
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
