import { config } from 'dotenv';

// Os decorators @Cron leem process.env quando a classe e definida, o que acontece antes
// do ConfigModule.forRoot() rodar. Importar este modulo primeiro garante o .env carregado.
config({ path: ['../../.env', '.env'] });

export const FUSO_HORARIO = process.env.TZ || 'America/Sao_Paulo';
