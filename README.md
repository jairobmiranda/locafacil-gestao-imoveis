# Loca Fácil — Gestão Imobiliária

Sistema de gestão de locação de imóveis: cadastro de imóveis e pessoas, contratos,
lançamentos financeiros, régua de cobrança por e-mail, cobrança via Pix e anexos.

## Stack

| Camada | Tecnologia |
| --- | --- |
| API | NestJS 11, Prisma 6, Zod, JWT (Passport) |
| Web | Next.js 15 (App Router), React 19 |
| Banco | MariaDB 11.4 |
| Arquivos | Garage (S3 compatível) |
| E-mail | SMTP (Nodemailer) |
| Monorepo | npm workspaces + Turborepo |

## Estrutura

```
apps/
  api/                 API NestJS
    src/anexos/        upload e download no armazenamento S3 (Garage)
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
docker/                Dockerfiles de build (API, Web e Garage) e garage.toml
```

## Pré-requisitos

- Node.js >= 22
- npm 11 (definido em `packageManager`)
- Docker (para o banco e o Garage locais)

## Como rodar

1. Suba a infraestrutura local (MariaDB e Garage, com a chave e o bucket já criados):

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
- Garage (S3): <http://localhost:3900>. Não tem console web; para conferir o bucket:
  `docker exec locafacil-garage /garage bucket info locafacil`

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
| Armazenamento | `S3_ENDPOINT`, `S3_PORT`, `S3_USE_SSL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION` |
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
- Arquivos nunca trafegam direto do navegador para o Garage: sobem e descem pela API.

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

Deploy no CapRover usando os arquivos `captain-definition-api`, `captain-definition-web` e
`captain-definition-garage`, que apontam para os Dockerfiles em `docker/`. Em produção, rode
`npm run db:deploy` para aplicar as migrations pendentes.

### Armazenamento (Garage)

O Garage roda com um nó só e, na primeira subida, cria sozinho o layout, a chave de acesso e o
bucket (`--single-node --default-bucket`). Não há passo manual de linha de comando.

1. Crie o app `garage` no CapRover com **Has Persistent Data** marcado (não dá para mudar
   depois) e, em HTTP Settings, marque **Do not expose as web app**.
2. Em App Configs, cadastre os diretórios persistentes `/var/lib/garage/meta` e
   `/var/lib/garage/data`.
3. Gere os segredos e cadastre-os nas variáveis de ambiente do app, junto com
   `GARAGE_DEFAULT_BUCKET=locafacil`:

   ```powershell
   node -e "const c=require('crypto');console.log('GARAGE_RPC_SECRET='+c.randomBytes(32).toString('hex'));console.log('GARAGE_DEFAULT_ACCESS_KEY=GK'+c.randomBytes(12).toString('hex'));console.log('GARAGE_DEFAULT_SECRET_KEY='+c.randomBytes(32).toString('hex'))"
   ```

4. Faça o deploy do app usando `./captain-definition-garage`.
5. Na API, configure `S3_ENDPOINT=srv-captain--garage`, `S3_PORT=3900`, `S3_USE_SSL=false`,
   `S3_BUCKET=locafacil`, `S3_REGION=garage` e, em `S3_ACCESS_KEY` e `S3_SECRET_KEY`, os mesmos
   valores de `GARAGE_DEFAULT_ACCESS_KEY` e `GARAGE_DEFAULT_SECRET_KEY`. O log de boot da API
   avisa se o bucket não for encontrado.

Para conferir pelo SSH da VPS (a imagem não tem shell, o binário é chamado direto):

```sh
docker exec $(docker ps -q -f name=srv-captain--garage) /garage bucket info locafacil
```

O Garage não tem versionamento nem lixeira, e com um nó só não há réplica: objeto apagado não
volta. Quem protege os arquivos é o backup externo. Não crie regra de lifecycle com expiração:
anexos e fotos de vistoria são permanentes e o banco aponta para eles.
