import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { escaparHtml } from '../comum/html';
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

  async enviar(dados: {
    vistoriaId: string;
    email: string;
    /** Recebem o mesmo link em copia, ex.: fiador e conjuge do locatario. */
    copias?: string[];
    tipo: string;
    imovel: string;
    expiraEm: Date;
  }): Promise<void> {
    const link = this.linkPara(dados.vistoriaId);
    const tipo = TIPO_TEXTO[dados.tipo] ?? 'vistoria';
    const prazo = dados.expiraEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // O destinatario principal nunca se repete no Cc: alguns provedores tratam isso como spam.
    const copia = (dados.copias ?? [])
      .map((endereco) => endereco.trim())
      .filter(
        (endereco, indice, lista) =>
          endereco !== '' &&
          endereco.toLowerCase() !== dados.email.trim().toLowerCase() &&
          lista.findIndex((outro) => outro.toLowerCase() === endereco.toLowerCase()) === indice,
      );

    await this.enviador.enviar({
      destinatario: dados.email,
      ...(copia.length ? { copia } : {}),
      assunto: `Vistoria do imóvel ${dados.imovel}`,
      corpoHtml:
        `<p>Olá.</p>` +
        `<p>Chegou a hora da ${tipo} do imóvel <strong>${escaparHtml(dados.imovel)}</strong>.</p>` +
        `<p>É rápido: você abre o link pelo celular, percorre os ambientes na ordem que aparecer e ` +
        `tira as fotos que forem pedidas. Não precisa criar senha nem instalar nada.</p>` +
        `<p><strong>Antes de começar:</strong> esteja dentro do imóvel, com as luzes acesas e as chaves em mãos. ` +
        `Reserve uns 20 minutos e evite fechar a página no meio do envio das fotos.</p>` +
        `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#305CDE;color:#fff;` +
        `border-radius:8px;text-decoration:none;font-weight:600">Iniciar a vistoria</a></p>` +
        `<p style="color:#6b7280;font-size:13px">O link é pessoal e vale até ${prazo}.</p>`,
      corpoTexto:
        `Vistoria do imóvel ${dados.imovel}. Abra pelo celular, dentro do imóvel: ${link} ` +
        `(o link vale até ${prazo}).`,
    });

    this.logger.log(
      `Convite de vistoria ${dados.vistoriaId} enviado para ${dados.email}` +
        (copia.length ? ` (cópia: ${copia.join(', ')})` : ''),
    );
  }
}
