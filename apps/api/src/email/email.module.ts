import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DestinatariosInternosService } from './destinatarios-internos.service';
import { ENVIADOR_EMAIL } from './enviador-email';
import { LogEnviador } from './log.enviador';
import { SmtpEnviador } from './smtp.enviador';

@Global()
@Module({
  providers: [
    DestinatariosInternosService,
    {
      provide: ENVIADOR_EMAIL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('EMAIL_ENVIO_ATIVO') === 'true'
          ? new SmtpEnviador(config)
          : new LogEnviador(),
    },
  ],
  exports: [ENVIADOR_EMAIL, DestinatariosInternosService],
})
export class EmailModule {}
