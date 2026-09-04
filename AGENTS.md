# AGENTS.md

Monorepo do Loca Fácil (gestão de locação de imóveis). Stack, scripts, variáveis de
ambiente e agendadores estão no [README.md](README.md). Modelo de dados e entidades em
[.github/modelagem-dados.md](.github/modelagem-dados.md). Este arquivo cobre só o que não
dá para descobrir lendo o código.

## Ambiente

- Shell do projeto é **PowerShell**: encadear com `;` (nunca `&&`), env var com `$env:VAR="valor"`.
- Use `npm.cmd` e `npx.cmd` (nvm4w). `npm` puro pode não resolver.
- Nunca editar arquivos de código por PowerShell (`Get-Content ... -replace | Set-Content`):
  re-encoda e corrompe acentos. Use as ferramentas de edição.
- Ao gravar arquivos pelo PowerShell, `Out-File -Encoding utf8` grava **BOM** e quebra parsers
  (migration `.sql` do Prisma vira erro MySQL 1064). Use
  `[System.IO.File]::WriteAllText($path, $texto, (New-Object System.Text.UTF8Encoding $false))`.
- Caminhos com colchetes (rotas dinâmicas do Next, `app/[id]`) exigem `-LiteralPath`.
- Teste a API sempre por `http://127.0.0.1:3000`: `localhost:3000` cai em outro processo local.
- Validação rápida de tipos: `npx.cmd tsc --noEmit -p apps/api/tsconfig.json`. Evite rodar dois
  `next build` simultâneos (corrompe `.next`; o fix é apagar `apps/web/.next`).

## Arquitetura

Fluxo de uma feature: schema Zod em `packages/contracts/src/<dominio>.ts` -> controller/service
em `apps/api/src/<dominio>/` -> server action e page em `apps/web/src/app/(app)/<dominio>/`.
O contrato é a fonte única de tipos e validação nas duas pontas.

- Web nunca fala com o banco nem com o MinIO. O navegador nunca fala com a API direto:
  chamadas saem do servidor Next (`apps/web/src/lib/api.ts`) ou de route handlers de proxy.
- Domínio nomeado em **português sem acento** (entidades, campos, enums, pastas).

## API (NestJS)

- Validação **só com Zod**, por rota, via `ZodValidationPipe`. `class-validator` não está
  instalado e um `ValidationPipe` global quebra o boot.
- `JwtAuthGuard` é global; rota aberta usa `@Publico()`. `DecimalInterceptor` global converte
  `Prisma.Decimal` em number.
- Padrão de controller: veja [apps/api/src/imoveis/imoveis.controller.ts](apps/api/src/imoveis/imoveis.controller.ts)
  (`@ApiTags`, `@ApiBearerAuth`, `ParseUUIDPipe`, arquivar/restaurar como exclusão lógica).
- Env var usada em decorator (`@Cron`) precisa passar por
  [apps/api/src/comum/ambiente.ts](apps/api/src/comum/ambiente.ts): decorators são avaliados
  antes de o `ConfigModule` carregar o `.env`.
- Banco e containers em UTC. Datas de negócio são `@db.Date` e toda manipulação usa
  [apps/api/src/comum/datas.ts](apps/api/src/comum/datas.ts) (`Date.UTC`, `timeZone: 'UTC'`).
  Só dois pontos conhecem `America/Sao_Paulo`: o `timeZone` dos `@Cron` e o `instanteLocal`
  de `datas.ts`, usado na `horaEnvio` da régua. Instante (`agendadoPara`) não é data de
  negócio: gravar a hora configurada direto em UTC atrasava o envio em 3 horas.
- `apps/api/tsconfig.json` precisa de `"incremental": false`: com `.tsbuildinfo` o build passa
  sem gerar `dist`.

## Web (Next.js App Router)

Regras de sessão que **não podem regredir** (já causaram loop de redirecionamento):

1. Em 401, `lib/api.ts` redireciona para **`/sair`** (apaga o cookie), nunca para `/login`.
2. O middleware confere o `exp` do JWT e apaga cookie vencido na própria resposta de redirect.
3. Toda rota que redireciona por causa de sessão encerra a sessão antes.

Nenhuma solução pode depender de o usuário limpar cookies ou abrir aba anônima.

- Rotas públicas do middleware: `/login`, `/pagamento`, `/sair`, `/vistoria`, `/api/vistoria`,
  `/api/vistoria-foto`, `/laudo` (lista em [apps/web/src/middleware.ts](apps/web/src/middleware.ts)).
- Service worker: **nunca** `skipWaiting()` + `clients.claim()` (quebrou chunks em voo).
  Registrar apenas após `load`.
- Componente com `useSearchParams` fica dentro de `<Suspense>`, senão a rota faz bailout para CSR.
- Mutações são server actions (`acoes.ts` com `'use server'`) reusando o schema do contrato,
  retornando `EstadoFormulario` e chamando `revalidatePath`.
- Filtros e campos **nunca** empilhados um por linha, com um combobox ocupando a largura inteira:
  fica clean, mas não premium. Filtros vão em `div.filtros` (flex wrap) e campos de formulário em
  `div.grade` (`auto-fit, minmax(190px, 1fr)`), com os botões em `div.acoes-formulario`.

## Prisma

- Config em `prisma.config.ts` (o `import 'dotenv/config'` no topo é obrigatório, o Prisma não
  carrega `.env` sozinho nesse modo). Shadow DB já existe, `migrate dev` funciona.
- Senha do banco tem `@`: percent-encode na URL (`%40`).
- Se aparecer "migration was modified after it was applied", **não resetar**:
  `DELETE FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL`.
- Enxurrada de erros de tipo do Prisma (`Prisma.Decimal`, `Prisma.XWhereInput`, `EstadoCivil`,
  `tx` implicitamente `any`) quase sempre é o client gerado virar stub: confira
  `node_modules/.prisma/client/index.d.ts`, que deve ter megabytes, não 4 KB. O conserto é
  `npx.cmd prisma generate`, com a API parada: no Windows o processo em execução segura o
  `query_engine-windows.dll.node` e a geração cai no stub em vez de falhar com erro.

## Domínios sensíveis

- **Minutas** (`apps/api/src/minutas`): cláusulas são TypeScript versionado em `clausulas/`,
  `condicao` e `texto` são funções (proibido `eval`). Minuta fora de RASCUNHO nunca é regerada:
  alteração cria nova versão. Regras jurídicas duras em `clausulas/index.ts#avaliarRiscos`
  (Súmula 332 STJ, caução máx. 3 aluguéis, reajuste mín. 12 meses) não podem ser afrouxadas.
  Concordância sempre por `verbo()`, `plural()`, `capitalizar()` de `contexto.ts`.
  Smoke test: `npx.cmd tsx scripts/testar-minuta.mts`.
- **Vistorias**: roteiros em `roteiros.ts`, link público com HMAC, upload via proxy do Next,
  EXIF lido antes da compressão no cliente (canvas apaga data e GPS).
  Concluir pelo link público **é** o aceite de quem vistoriou, e aprovar no painel é o aceite da
  gestão: um registro por papel em `vistoria_aceites`, com IP, navegador e o SHA-256 do conteúdo
  aceito (`resumoConteudo`). Conteúdo alterado depois muda o hash e o laudo mostra o aceite como
  desatualizado. Por isso `lib/api.ts` e o proxy de `/api/vistoria` repassam `x-forwarded-for` e
  `user-agent`: sem isso o aceite gravaria o endereço do próprio servidor web.
  Cada passo vira linha em `vistoria_eventos` (a linha do tempo do laudo); as fotos não viram
  evento, saem agrupadas de `vistoria_fotos`. A exceção é a remoção: quem executa pode apagar
  foto pelo próprio link, e como a imagem some do manifesto o `FOTO_REMOVIDA` guarda ambiente,
  item e o resumo do que existiu. Enviar o laudo **sempre regera o PDF** e substitui o
  anexo anterior; acima de 8 MB o e-mail leva só o link assinado (`/laudo/<token>`, propósito
  `laudo`, diferente do token do convite).
  Layout do PDF em `laudo-desenho.ts` (paleta e primitivas) e `laudo.service.ts` (páginas).
  Conferir sem banco nem MinIO: `npm.cmd run laudo:testar` gera `laudo-exemplo.pdf`. Texto abaixo
  da margem inferior faz o PDFKit abrir página nova: o rodapé zera `page.margins.bottom` antes de
  escrever.
- **Cobrança**: para testar sem esperar o cron, com `CRONS_ATIVOS=false` e
  `EMAIL_ENVIO_ATIVO=false`, chamar em ordem `POST /api/contratos/gerar-cobrancas`,
  `POST /api/cobranca/agendar`, `POST /api/cobranca/processar-fila` e conferir em
  `GET /api/cobranca/notificacoes`. O calendário da régua roda sem banco:
  `npm.cmd run regua:testar`.
  A régua **não** compara a data exata da etapa com hoje. `ocorrenciaDevida` devolve a
  última ocorrência já vencida dentro da janela de recuperação (`cobranca.janela_recuperacao_dias`,
  padrão 3), senão a etapa do dia do vencimento se perdia para sempre quando a cobrança
  nascia depois do cron (contrato cadastrado no próprio dia, API parada, lançamento
  retroativo). Quem impede a repetição é o índice único `(lancamento, regra, ocorrencia)`,
  conferido antes por `etapasJaAgendadas`. Ampliar a janela sem necessidade faz um contrato
  antigo recém cadastrado disparar etapas de meses atrás.
  Ativar contrato chama `cobrarDesdeJa`: gera e agenda na hora, só daquele contrato,
  e nunca derruba a ativação se falhar.

## Deploy (CapRover)

- `captain-definition-api` e `captain-definition-web` apontam para os Dockerfiles em `docker/`.
  Portas: API 3000, web 3001.
- No stage builder, copiar `--from=deps /app ./` (não só `node_modules`), senão os binários
  hoistados somem e o build falha com `sh: nest: not found`.
- O runner da API não pode usar `--ignore-scripts` (o postinstall do `prisma` baixa os engines).
- A URL da API no web é **`API_URL`**, lida em runtime; não usar `NEXT_PUBLIC_*`.

## Escrita

Textos, comentários e mensagens em português. Evitar travessão (—) no corpo do texto: usar
vírgula, dois-pontos, parênteses ou ponto final.
