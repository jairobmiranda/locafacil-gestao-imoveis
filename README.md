# Loca Fácil — Gestão Imobiliária

Sistema de gestão de locação de imóveis: cadastro de imóveis e pessoas, contratos,
lançamentos financeiros, régua de cobrança por e-mail, cobrança via Pix e anexos.

## Stack

| Camada | Tecnologia |
| --- | --- |
| API | NestJS 11, Prisma 6, Zod, JWT (Passport) |
| Web | Next.js 15 (App Router), React 19 |
| Banco | MariaDB 11.4 |
| Arquivos | MinIO (S3 compatível) |
| E-mail | SMTP (Nodemailer) |
| Monorepo | npm workspaces + Turborepo |

## Estrutura

```
apps/
  api/                 API NestJS
    src/anexos/        upload e download via MinIO
    src/auth/          login, JWT, guard global
    src/cobranca/      régua de cobrança, notificações, agendadores
    src/contratos/     contratos e geração automática de cobranças
    src/dashboard/     métricas
    src/imoveis/       imóveis
    src/lancamentos/   lançamentos, categorias e encargos
    src/pessoas/       pessoas e validação de documento
    src/pix/           chaves Pix e geração de BR Code
  web/                 front-end Next.js
packages/
  contracts/           schemas Zod e tipos compartilhados
prisma/                schema, migrations e seed
docker/                Dockerfiles de build (API e Web)
```

## Pré-requisitos

- Node.js >= 22
- npm 11 (definido em `packageManager`)
- Docker (para o banco e o MinIO locais)

## Como rodar

1. Suba a infraestrutura local (MariaDB e MinIO, com o bucket já criado):

   ```powershell
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Copie o arquivo de variáveis e ajuste o que for necessário:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Instale as dependências:

   ```powershell
   npm install
   ```

4. Aplique as migrations e popule os dados iniciais:

   ```powershell
   npm run db:migrate
   npm run db:seed
   ```

   O seed cria o usuário administrador a partir de `ADMIN_EMAIL`, `ADMIN_SENHA`
   e `ADMIN_NOME` (se não estiverem definidas, o usuário não é criado).

5. Suba API e Web em paralelo:

   ```powershell
   npm run dev
   ```

- API: <http://127.0.0.1:3000/api>
- Swagger (fora de produção): <http://127.0.0.1:3000/api/docs>
- Web: <http://localhost:3001>
- Console do MinIO: <http://localhost:9001>

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | sobe API e Web via Turborepo |
| `npm run build` | build de todos os pacotes |
| `npm run lint` | lint de todos os pacotes |
| `npm run typecheck` | checagem de tipos sem emitir |
| `npm run db:generate` | gera o Prisma Client |
| `npm run db:migrate` | cria e aplica migration em desenvolvimento |
| `npm run db:deploy` | aplica migrations pendentes (produção) |
| `npm run db:seed` | popula dados iniciais |
| `npm run db:studio` | abre o Prisma Studio |
| `npm run laudo:testar` | gera `laudo-exemplo.pdf` com dados falsos, para conferir o layout |

## Variáveis de ambiente

Todas estão documentadas em `.env.example`. Resumo dos grupos:

| Grupo | Variáveis |
| --- | --- |
| Banco | `DATABASE_URL`, `SHADOW_DATABASE_URL` |
| API | `API_PORT`, `API_PREFIX`, `CORS_ORIGINS`, `TZ` |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| MinIO | `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` |
| E-mail | `EMAIL_ENVIO_ATIVO`, `EMAIL_LOTE`, `SMTP_*`, `EMAIL_REPLY_TO` |
| Agendadores | `CRONS_ATIVOS`, `CRON_GERAR_COBRANCAS`, `CRON_MARCAR_ATRASO`, `CRON_REGUA_COBRANCA`, `CRON_ENVIO_EMAIL` |
| Web | `API_URL` |

Observações:

- Senhas com caracteres especiais precisam ser percent-encoded na URL do banco
  (`@` vira `%40`, `#` vira `%23`).
- Mantenha `CRONS_ATIVOS=false` na máquina de desenvolvimento para não gerar
  cobranças em banco compartilhado.
- Com `EMAIL_ENVIO_ATIVO=false` os e-mails são apenas registrados no log.

## Convenções

- Validação de entrada com Zod, aplicada por rota através do `ZodValidationPipe`.
  O projeto não usa `class-validator`.
- `JwtAuthGuard` é global; rotas públicas são marcadas com `@Publico()`.
- `DecimalInterceptor` global converte `Prisma.Decimal` em número nas respostas.
- Entidades e campos do domínio são nomeados em português sem acento.
- Arquivos nunca trafegam direto do navegador para o MinIO: sobem e descem pela API.

## Agendadores

| Job | Padrão | Função |
| --- | --- | --- |
| `gerar-cobrancas` | `0 3 * * *` | gera as cobranças dos contratos ativos |
| `marcar-atrasos` | `0 4 * * *` | marca lançamentos vencidos como em atraso |
| `regua-cobranca` | `0 5 * * *` | enfileira notificações conforme a régua |
| `envio-email` | `*/10 * * * *` | envia as notificações pendentes em lotes |

Os horários seguem o fuso de `TZ`, e a hora de envio configurada em cada etapa da régua
também. Ativar um contrato gera as cobranças dele e roda a régua na hora, sem esperar a
madrugada seguinte.

Etapa que passou sem a régua rodar não se perde: ela é recuperada no ciclo seguinte,
respeitando a janela em **Configurações > Notificações > Parâmetros da régua** (padrão 3
dias, zero desliga a recuperação).

## Deploy

Deploy no CapRover usando os arquivos `captain-definition-api` e
`captain-definition-web`, que apontam para `docker/Dockerfile.api` e
`docker/Dockerfile.web`. Em produção, rode `npm run db:deploy` para aplicar as
migrations pendentes.
