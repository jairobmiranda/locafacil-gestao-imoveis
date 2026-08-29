import { z } from 'zod';

/** Caminho fixo do webhook de build do CapRover. */
export const CAMINHO_WEBHOOK_CAPROVER = '/api/v2/user/apps/webhooks/triggerbuild';

const webhookCapRover = z
  .string()
  .url()
  .refine((valor) => {
    const url = new URL(valor);

    return url.protocol === 'https:' && url.pathname === CAMINHO_WEBHOOK_CAPROVER;
  }, `Use a URL de webhook do CapRover (https, terminando em ${CAMINHO_WEBHOOK_CAPROVER})`);

export const alvoImplantacaoSchema = z.enum(['api', 'web']);

export const salvarWebhooksSchema = z.object({
  api: webhookCapRover.nullish(),
  web: webhookCapRover.nullish(),
});

export type AlvoImplantacao = z.infer<typeof alvoImplantacaoSchema>;
export type SalvarWebhooksDto = z.infer<typeof salvarWebhooksSchema>;
