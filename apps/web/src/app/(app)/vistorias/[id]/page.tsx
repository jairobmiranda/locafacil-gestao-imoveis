import type {
  AceiteVistoria,
  DestinatarioConvite,
  EventoVistoria,
  UsuarioAutenticado,
} from '@locafacil/contracts';
import { apiGet } from '@/lib/api';
import { formatarData, formatarDataHora, rotular } from '@/lib/formato';
import { AcoesVistoria } from './acoes-vistoria';
import { AcompanhamentoVistoria, type ObservadorOpcao } from './acompanhamento-vistoria';
import { AceitesVistoria, LinhaDoTempoVistoria } from './historico-vistoria';
import { LaudoVistoria, type DestinoLaudo } from './laudo-vistoria';
import '../vistorias.css';

const VALIDADE_PADRAO = 15;
const MILISSEGUNDOS_POR_DIA = 86_400_000;

/** O prazo escolhido no ultimo convite nao e guardado: sai da distancia entre as duas datas. */
function validadeDoUltimoConvite(enviadoEm: string | null, expiraEm: string | null): number {
  if (!enviadoEm || !expiraEm) {
    return VALIDADE_PADRAO;
  }

  const dias = Math.round(
    (new Date(expiraEm).getTime() - new Date(enviadoEm).getTime()) / MILISSEGUNDOS_POR_DIA,
  );

  return dias >= 1 && dias <= 60 ? dias : VALIDADE_PADRAO;
}

type VistoriaDetalhe = {
  id: string;
  tipo: string;
  situacao: string;
  roteiroChave: string;
  roteiroVersao: number;
  conviteEmail: string | null;
  conviteCopias: string | null;
  conviteEnviadoEm: string | null;
  conviteExpiraEm: string | null;
  motivoRecusa: string | null;
  recusadaEm: string | null;
  enviadaEm: string | null;
  aprovadaEm: string | null;
  laudoAnexoId: string | null;
  link: string;
  linkLaudo: string;
  pendencias: { ambiente: string; item: string }[];
  destinatarios: DestinatarioConvite[];
  linhaDoTempo: EventoVistoria[];
  aceites: AceiteVistoria[];
  avisarEmails: string | null;
  avisarInicio: boolean;
  avisarConclusao: boolean;
  avisoInicioEm: string | null;
  avisoConclusaoEm: string | null;
  imovel: { id: string; apelido: string };
  ambientes: {
    id: string;
    nome: string;
    itens: {
      id: string;
      nome: string;
      estado: string | null;
      observacao: string | null;
      minimoFotos: number;
      fotos: { id: string; recebidaEm: string; capturadaEm: string | null }[];
    }[];
  }[];
};

/** Quem acompanha e interno: quem está logado e o proprietário, nunca quem executa. */
function observadores(
  usuario: UsuarioAutenticado,
  destinatarios: DestinatarioConvite[],
): ObservadorOpcao[] {
  const lista: ObservadorOpcao[] = [
    { email: usuario.email, nome: usuario.nome, papel: 'você' },
    ...destinatarios
      .filter((pessoa) => pessoa.papel === 'LOCADOR')
      .map((pessoa) => ({
        email: pessoa.email,
        nome: pessoa.nome ?? pessoa.email,
        papel: 'proprietário',
      })),
  ];

  return lista.filter(
    (pessoa, indice) =>
      lista.findIndex((outro) => outro.email.toLowerCase() === pessoa.email.toLowerCase()) ===
      indice,
  );
}

/** O laudo vai para as partes e para quem administra: a lista do convite mais o usuário logado. */
function destinosDoLaudo(
  usuario: UsuarioAutenticado,
  destinatarios: DestinatarioConvite[],
): DestinoLaudo[] {
  const lista: DestinoLaudo[] = [
    ...destinatarios.map((pessoa) => ({
      email: pessoa.email,
      nome: pessoa.nome,
      papel: pessoa.papel as string,
    })),
    { email: usuario.email, nome: usuario.nome, papel: 'você' },
  ];

  return lista.filter(
    (pessoa, indice) =>
      lista.findIndex((outro) => outro.email.toLowerCase() === pessoa.email.toLowerCase()) ===
      indice,
  );
}

export default async function PaginaVistoria({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vistoria, usuario] = await Promise.all([
    apiGet<VistoriaDetalhe>(`/vistorias/${id}`),
    apiGet<UsuarioAutenticado>('/auth/eu'),
  ]);

  const totalItens = vistoria.ambientes.reduce((soma, ambiente) => soma + ambiente.itens.length, 0);
  const totalFotos = vistoria.ambientes.reduce(
    (soma, ambiente) =>
      soma + ambiente.itens.reduce((parcial, item) => parcial + item.fotos.length, 0),
    0,
  );

  const envios = vistoria.linhaDoTempo.filter((evento) => evento.tipo === 'LAUDO_ENVIADO');
  const ultimoEnvio = envios[envios.length - 1];
  const destinos = destinosDoLaudo(usuario, vistoria.destinatarios);

  // Quem executou recebe o laudo por padrão; o proprietário entra junto quando o contrato o tem.
  const marcadosLaudo = destinos
    .filter(
      (pessoa) =>
        pessoa.papel === 'LOCADOR' ||
        pessoa.email.toLowerCase() === (vistoria.conviteEmail ?? '').toLowerCase(),
    )
    .map((pessoa) => pessoa.email);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>{vistoria.imovel.apelido}</h1>
          <p className="texto-suave">
            {rotular(vistoria.tipo)} ·{' '}
            <span className="etiqueta">{rotular(vistoria.situacao)}</span> · roteiro{' '}
            {vistoria.roteiroChave} v{vistoria.roteiroVersao}
          </p>
        </div>
      </div>

      <div className="indicadores">
        <div className="cartao indicador">
          <span className="texto-suave">Itens</span>
          <strong>{totalItens}</strong>
          <span className="texto-suave">{vistoria.pendencias.length} pendentes</span>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Fotos recebidas</span>
          <strong>{totalFotos}</strong>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Convite</span>
          <strong>{vistoria.conviteEmail ?? 'não enviado'}</strong>
          <span className="texto-suave">
            {vistoria.conviteExpiraEm ? `vale até ${formatarData(vistoria.conviteExpiraEm)}` : ''}
          </span>
        </div>
        <div className="cartao indicador">
          <span className="texto-suave">Aceites</span>
          <strong>{vistoria.aceites.length} de 2</strong>
          <span className="texto-suave">
            {vistoria.aceites.length === 2
              ? 'quem vistoriou e a gestão'
              : vistoria.aceites.length === 1
                ? 'falta a gestão aprovar'
                : 'ninguém aceitou ainda'}
          </span>
        </div>
      </div>

      <AcoesVistoria
        id={vistoria.id}
        imovel={vistoria.imovel.apelido}
        situacao={vistoria.situacao}
        link={vistoria.link}
        destinatarios={vistoria.destinatarios}
        validadeSugerida={validadeDoUltimoConvite(
          vistoria.conviteEnviadoEm,
          vistoria.conviteExpiraEm,
        )}
      />

      <AceitesVistoria aceites={vistoria.aceites} />

      <LaudoVistoria
        id={vistoria.id}
        situacao={vistoria.situacao}
        pendencias={vistoria.pendencias.length}
        laudoAnexoId={vistoria.laudoAnexoId}
        destinos={destinos}
        marcadosIniciais={marcadosLaudo}
        ultimoEnvio={
          ultimoEnvio
            ? `Último envio em ${formatarDataHora(ultimoEnvio.ocorridoEm)}: ${ultimoEnvio.descricao}`
            : null
        }
      />

      <AcompanhamentoVistoria
        id={vistoria.id}
        observadores={observadores(usuario, vistoria.destinatarios)}
        avisarInicio={vistoria.avisarInicio}
        avisarConclusao={vistoria.avisarConclusao}
        emailsSalvos={(vistoria.avisarEmails ?? '').split(';').filter(Boolean)}
        avisoInicioEm={vistoria.avisoInicioEm}
        avisoConclusaoEm={vistoria.avisoConclusaoEm}
      />

      {vistoria.situacao === 'RECUSADA' && vistoria.motivoRecusa ? (
        <div className="cartao">
          <h2>Complemento pedido</h2>
          <p className="texto-suave">
            {formatarData(vistoria.recusadaEm)} ·{' '}
            {vistoria.conviteEmail
              ? `avisado por e-mail: ${[vistoria.conviteEmail, ...(vistoria.conviteCopias ?? '').split(';').filter(Boolean)].join(', ')}`
              : 'sem convite enviado ainda: o pedido sai junto com o primeiro convite'}
            . Quem executou também vê este texto ao reabrir o link.
          </p>
          {/* HTML sanitizado na API: whitelist de tags, sem atributo nenhum. */}
          <div
            className="texto-formatado"
            dangerouslySetInnerHTML={{ __html: vistoria.motivoRecusa }}
          />
        </div>
      ) : null}

      <LinhaDoTempoVistoria eventos={vistoria.linhaDoTempo} />

      {vistoria.ambientes.map((ambiente) => (
        <section key={ambiente.id}>
          <div className="cabecalho-secao">
            <h2>{ambiente.nome}</h2>
          </div>
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Estado</th>
                  <th>Fotos</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {ambiente.itens.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.nome}
                      {item.minimoFotos === 0 ? (
                        <span className="texto-suave"> (opcional)</span>
                      ) : null}
                    </td>
                    <td data-label="Estado">
                      {item.estado ? (
                        rotular(item.estado)
                      ) : (
                        <span className="texto-suave">sem resposta</span>
                      )}
                    </td>
                    <td data-label="Fotos">
                      {item.minimoFotos === 0
                        ? `${item.fotos.length} (opcional)`
                        : `${item.fotos.length} de ${item.minimoFotos}`}
                      <div className="miniaturas-admin">
                        {item.fotos.map((foto) => (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            key={foto.id}
                            src={`/api/vistoria-foto/${foto.id}`}
                            alt={item.nome}
                            loading="lazy"
                            width={72}
                            height={72}
                          />
                        ))}
                      </div>
                    </td>
                    <td data-label="Observação">
                      {item.observacao ?? <span className="texto-suave">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
