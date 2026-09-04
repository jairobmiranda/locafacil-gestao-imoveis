import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { escaparHtml, textoDeHtml } from '../comum/html';
import { gerarTokenPublico } from '../comum/link-assinado';
import { ENVIADOR_EMAIL, type EnviadorEmail } from '../email/enviador-email';

export const PROPOSITO_VISTORIA = 'vistoria';

export const TIPO_TEXTO: Record<string, string> = {
  ENTRADA: 'vistoria de entrada',
  SAIDA: 'vistoria de saída',
  PERIODICA: 'vistoria periódica',
};

@Injectable()
export class ConviteVistoriaService {
  private readonly logger = new Logger(ConviteVistoriaService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(ENVIADOR_EMAIL) private readonly enviador: EnviadorEmail,
  ) {}

  linkPara(vistoriaId: string): string {
    const base = (this.config.get<string>('APP_URL') ?? '').replace(/\/$/, '');

    return `${base}/vistoria/${gerarTokenPublico(PROPOSITO_VISTORIA, vistoriaId)}`;
  }

  /**
   * Um e-mail so serve os dois casos: o convite inicial e a devolucao com pedido de complemento.
   * Com `motivoComplemento` preenchido a mensagem troca de tom, mas o link e o mesmo, entao quem
   * recebe nao precisa caçar qual dos dois e-mails abrir.
   */
  async enviar(dados: {
    vistoriaId: string;
    email: string;
    /** Recebem o mesmo link em copia, ex.: fiador e conjuge do locatario. */
    copias?: string[];
    tipo: string;
    imovel: string;
    expiraEm: Date;
    /** HTML ja sanitizado do que o gestor do imóvel solicitou para refazer. */
    motivoComplemento?: string | null;
  }): Promise<void> {
    const link = this.linkPara(dados.vistoriaId);
    const tipo = TIPO_TEXTO[dados.tipo] ?? 'vistoria';
    const prazo = dados.expiraEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const complemento = dados.motivoComplemento?.trim() || null;

    // O destinatario principal nunca se repete no Cc: alguns provedores tratam isso como spam.
    const copia = (dados.copias ?? [])
      .map((endereco) => endereco.trim())
      .filter(
        (endereco, indice, lista) =>
          endereco !== '' &&
          endereco.toLowerCase() !== dados.email.trim().toLowerCase() &&
          lista.findIndex((outro) => outro.toLowerCase() === endereco.toLowerCase()) === indice,
      );

    const imovel = escaparHtml(dados.imovel);
    const botao =
      `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#305CDE;color:#fff;` +
      `border-radius:8px;text-decoration:none;font-weight:600">` +
      `${complemento ? 'Retomar a vistoria' : 'Iniciar a vistoria'}</a></p>`;
    const validade = `<p style="color:#6b7280;font-size:13px">O link é pessoal e vale até ${prazo}.</p>`;

    const corpoHtml = complemento
      ? `<p>Olá.</p>` +
        `<p>A ${tipo} do imóvel <strong>${imovel}</strong> foi conferida e precisa de um complemento ` +
        `antes de ser aprovada.</p>` +
        `<p><strong>O que o gestor do imóvel solicitou:</strong></p>` +
        `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #d3d7e0;` +
        `background:#f2f4f7;border-radius:0 8px 8px 0">${complemento}</blockquote>` +
        `<p>Abra o mesmo link de antes: o que você já enviou continua lá, é só completar o que falta.</p>` +
        botao +
        validade
      : `<p>Olá.</p>` +
        `<p>Chegou a hora da ${tipo} do imóvel <strong>${imovel}</strong>.</p>` +
        `<p>É rápido: você abre o link pelo celular, percorre os ambientes na ordem que aparecer e ` +
        `tira as fotos que forem pedidas. Não precisa criar senha nem instalar nada.</p>` +
        `<p><strong>Antes de começar:</strong> esteja dentro do imóvel, com as luzes acesas e as chaves em mãos. ` +
        `Reserve uns 20 minutos e evite fechar a página no meio do envio das fotos.</p>` +
        botao +
        validade;

    await this.enviador.enviar({
      destinatario: dados.email,
      ...(copia.length ? { copia } : {}),
      assunto: complemento
        ? `Complemento da vistoria do imóvel ${dados.imovel}`
        : `Vistoria do imóvel ${dados.imovel}`,
      corpoHtml,
      corpoTexto: complemento
        ? `A vistoria do imóvel ${dados.imovel} precisa de um complemento: ${textoDeHtml(complemento)} ` +
          `Retome pelo mesmo link: ${link} (vale até ${prazo}).`
        : `Vistoria do imóvel ${dados.imovel}. Abra pelo celular, dentro do imóvel: ${link} ` +
          `(o link vale até ${prazo}).`,
    });

    this.logger.log(
      `${complemento ? 'Pedido de complemento' : 'Convite'} da vistoria ${dados.vistoriaId} ` +
        `enviado para ${dados.email}` +
        (copia.length ? ` (cópia: ${copia.join(', ')})` : ''),
    );
  }
}
