import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { EnviadorEmail, MensagemEmail, ResultadoEnvio } from './enviador-email';

/** Usado quando EMAIL_ENVIO_ATIVO e false. Registra no log em vez de enviar. */
@Injectable()
export class LogEnviador implements EnviadorEmail {
  private readonly logger = new Logger(LogEnviador.name);

  enviar(mensagem: MensagemEmail): Promise<ResultadoEnvio> {
    this.logger.warn(
      `[ENVIO DESLIGADO] Para: ${mensagem.destinatario} | Assunto: ${mensagem.assunto}`,
    );

    return Promise.resolve({ idProvedor: `log:${randomUUID()}` });
  }
}
