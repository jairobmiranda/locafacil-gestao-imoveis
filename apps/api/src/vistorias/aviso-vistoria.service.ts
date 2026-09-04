import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { escaparHtml } from '../comum/html';
import { ENVIADOR_EMAIL, type EnviadorEmail } from '../email/enviador-email';
import { TIPO_TEXTO } from './convite-vistoria.service';

export type MomentoAviso = 'INICIO' | 'CONCLUSAO';

/** Avisa quem acompanha a vistoria pelo painel. Nunca vai para quem executa. */
@Injectable()
export class AvisoVistoriaService {
  private readonly logger = new Logger(AvisoVistoriaService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(ENVIADOR_EMAIL) private readonly enviador: EnviadorEmail,
  ) {}

  /** O campo guarda tudo numa string; aqui vira lista limpa e sem repetido. */
  static separar(valor: string | null | undefined): string[] {
    return (valor ?? '')
      .split(/[;,]/)
      .map((email) => email.trim())
      .filter(
        (email, indice, lista) =>
          email !== '' &&
          lista.findIndex((outro) => outro.toLowerCase() === email.toLowerCase()) === indice,
      );
  }

  /** Aviso nao pode derrubar o que a pessoa acabou de fazer na vistoria. */
  async avisar(dados: {
    momento: MomentoAviso;
    vistoriaId: string;
    emails: string[];
    tipo: string;
    imovel: string;
  }): Promise<void> {
    const [destinatario, ...copia] = dados.emails;

    if (!destinatario) {
      return;
    }

    const base = (this.config.get<string>('APP_URL') ?? '').replace(/\/$/, '');
    const link = `${base}/vistorias/${dados.vistoriaId}`;
    const tipo = TIPO_TEXTO[dados.tipo] ?? 'vistoria';
    const imovel = escaparHtml(dados.imovel);

    const comeco = dados.momento === 'INICIO';
    const assunto = comeco
      ? `Vistoria iniciada: ${dados.imovel}`
      : `Vistoria concluída: ${dados.imovel}`;
    const chamada = comeco
      ? `A ${tipo} do imóvel <strong>${imovel}</strong> acabou de começar: a primeira foto chegou.`
      : `A ${tipo} do imóvel <strong>${imovel}</strong> foi concluída e está aguardando conferência.`;
    const acao = comeco ? 'Acompanhar o andamento' : 'Conferir e aprovar';

    try {
      await this.enviador.enviar({
        destinatario,
        ...(copia.length ? { copia } : {}),
        assunto,
        corpoHtml:
          `<p>${chamada}</p>` +
          `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#305CDE;color:#fff;` +
          `border-radius:8px;text-decoration:none;font-weight:600">${acao}</a></p>`,
        corpoTexto: `${assunto}. ${acao}: ${link}`,
      });

      this.logger.log(
        `Aviso de ${comeco ? 'início' : 'conclusão'} da vistoria ${dados.vistoriaId} enviado para ${dados.emails.join(', ')}`,
      );
    } catch (erro) {
      this.logger.error(`Falha ao avisar sobre a vistoria: ${(erro as Error).message}`);
    }
  }
}
