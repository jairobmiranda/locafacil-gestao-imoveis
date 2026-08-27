import { SetMetadata } from '@nestjs/common';

export const PUBLICO_KEY = 'rota_publica';

/** Libera a rota do guard global de JWT. */
export const Publico = () => SetMetadata(PUBLICO_KEY, true);
