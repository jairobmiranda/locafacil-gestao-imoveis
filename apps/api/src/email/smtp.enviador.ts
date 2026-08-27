import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { EnviadorEmail, MensagemEmail, ResultadoEnvio } from './enviador-email';

@Injectable()
export class SmtpEnviador implements EnviadorEmail {
  private readonly logger = new Logger(SmtpEnviador.name);
  private readonly transporte: Transporter;
  private readonly remetente: string;
  private readonly responderPara?: string;

  constructor(config: ConfigService) {
    const porta = Number(config.get<string>('SMTP_PORT') ?? 587);

    this.remetente = config.getOrThrow<string>('SMTP_FROM');
    this.responderPara = config.get<string>('EMAIL_REPLY_TO');

    this.transporte = createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: porta,
      // 465 usa TLS implicito, 587 negocia STARTTLS.
      secure: porta === 465,
      requireTLS: porta !== 465,
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASS'),
      },
      // Outlook pessoal reclama de rajada. Uma conexao, uma mensagem por vez.
      pool: true,
      maxConnections: 1,
      maxMessages: 50,
      rateDelta: 60_000,
      rateLimit: 20,
    });
  }

  async enviar(mensagem: MensagemEmail): Promise<ResultadoEnvio> {
    const resultado = await this.transporte.sendMail({
      from: this.remetente,
      to: mensagem.destinatario,
      cc: mensagem.copia,
      replyTo: this.responderPara,
      subject: mensagem.assunto,
      html: mensagem.corpoHtml,
      text: mensagem.corpoTexto,
      attachments: mensagem.anexos?.map((anexo) => ({
        filename: anexo.nome,
        content: anexo.conteudo,
        contentType: anexo.tipoConteudo,
        cid: anexo.cid,
      })),
    });

    this.logger.log(`E-mail enviado para ${mensagem.destinatario} (${resultado.messageId})`);

    return { idProvedor: resultado.messageId };
  }
}
