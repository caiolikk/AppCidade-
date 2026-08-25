# Cidade+ — Auditoria da fundação (ETAPA 0)

**Data:** 2026-08-23  
**Repositório:** [caiolikk/AppCidade-](https://github.com/caiolikk/AppCidade-)  
**Workspace local:** `c:\Cidade+\AppCidade-`  
**Branch:** `main` (sincronizada com `origin/main`)  
**Status:** ETAPA 0–2 validadas · ETAPA 3 implementada (aguardando validação)

Este documento registra o estado atual do projeto **antes de qualquer alteração estrutural**.  
Nenhuma implementação das etapas 1–13 deve começar sem validação explícita deste relatório.

---

## 1. Arquitetura encontrada

O repositório **não possui aplicação implementada**.

| Item | Situação |
|---|---|
| Monorepo (`apps/`, `packages/`) | Ausente |
| Backend | Ausente |
| Frontend mobile | Ausente |
| Banco de dados | Ausente |
| Docker / Compose | Ausente |
| Prisma | Ausente |
| CI/CD | Ausente |
| `packages/` compartilhados | Ausente — **não criar agora** |

A única estrutura existente é um repositório Git com um README de produto.

```text
Cidade+/                         ← workspace Cursor
└── AppCidade-/                  ← repositório Git real
    ├── .git/
    ├── README.md
    └── plans/
        └── cidade-plus-foundation-audit.md   ← este arquivo
```

**Decisão a preservar:** o código deve nascer **dentro de `AppCidade-`**, que já possui remote e histórico. Não criar um segundo repositório paralelo em `c:\Cidade+`.

---

## 2. Tecnologias encontradas

Nenhuma dependência instalada. Não existem `package.json`, `node_modules`, `tsconfig.json`, `app.json`/`app.config.*`, `prisma/schema.prisma` nem lockfile.

### Stack declarada no README atual

| Camada | README.md | Prompt mestre (alvo) |
|---|---|---|
| Mobile | React Native + TypeScript | React Native + Expo SDK 52 + Expo Router + NativeWind v4 |
| Backend | **Node.js + Express** | **Node.js + Fastify** |
| Banco | PostgreSQL | PostgreSQL 16 + PostGIS + Prisma |
| Auth | não definido | JWT + bcrypt + RBAC |
| Imagens | a definir | Cloudinary |
| Mapas | a definir | react-native-maps + PostGIS |
| Estado mobile | não definido | TanStack Query + Zustand |

### Inconsistência crítica #1 — Express vs Fastify

O README (fonte versionada do time) declara Express.  
O prompt mestre declara Fastify e **proíbe substituir Fastify sem justificativa**.

Como **não há código Express**, a adoção de Fastify **não sobrescreve implementação existente**.  
Ainda assim, o README ficará desatualizado até ser alinhado (recomendado na ETAPA 13, não agora).

**Recomendação:** adotar Fastify na fundação, conforme o prompt mestre. Registrar o desvio no README quando a documentação for atualizada.

---

## 3. Arquivos relevantes

| Arquivo | Papel | Ação |
|---|---|---|
| `README.md` | Visão de produto, escopo, prazos, stack inicial | **Preservar.** Não reescrever nesta etapa. |
| `.git/config` | Remote `origin` → `https://github.com/caiolikk/AppCidade-.git` | **Preservar.** |
| `.gitignore` | Inexistente | Criar na ETAPA 1 |
| `package.json` | Inexistente | Criar na ETAPA 1 |
| `docker-compose.yml` | Inexistente | Criar na ETAPA 2 |
| `.env` / `.env.example` | Inexistentes | Criar `.env.example` na ETAPA 2 |

### Histórico Git (a preservar)

| Commit | Mensagem |
|---|---|
| `f6549c6` | Initial commit |
| `ebcc52a` | Upload Readme |
| `ffd84ab` | Add Pamella Sotomayor to the team list |

---

## 4. Checklist da auditoria

| # | Verificação | Resultado |
|---|---|---|
| 1 | Repositório analisado | Sim — somente `README.md` |
| 2 | Arquivos existentes | `README.md` + metadados Git |
| 3 | Estrutura de monorepo | Não existe |
| 4 | Tecnologias instaladas | Nenhuma |
| 5 | TypeScript | Não configurado |
| 6 | Expo | Não configurado |
| 7 | Fastify | Não configurado |
| 8 | Prisma | Não configurado |
| 9 | Variáveis de ambiente | Nenhuma |
| 10 | Scripts `package.json` | Inexistentes |
| 11 | Docker | Não configurado |
| 12 | Banco de dados | Não configurado |
| 13 | Decisões arquiteturais no código | Nenhuma. Decisões existem só no README. |

---

## 5. Problemas encontrados

1. **Projeto ainda não foi inicializado** — sem monorepo, sem apps, sem banco.
2. **Sem `.gitignore`** — risco imediato de versionar `.env`, `node_modules`, builds Expo/Android/iOS.
3. **Stack do README diverge do prompt mestre** — Express vs Fastify; PostgreSQL sem PostGIS; Expo e Prisma não mencionados.
4. **Foto opcional no README vs obrigatória no prompt mestre** — o MVP do README diz “adiciona imagem, se necessário”; a regra de negócio do Cidade+ exige evidência fotográfica.
5. **Fluxo de status diverge** — README: `Pendente → Em análise → Em andamento → Resolvida/Não resolvida`. Prompt: `REPORTADA, RECEBIDA, EM_ANALISE, EM_ATENDIMENTO, RESOLVIDA, ARQUIVADA, INVALIDA`.
6. **Subcategoria no README** — o prompt mestre não pede `Subcategory` na fundação. Evitar criar essa entidade agora.
7. **Equipe** — README lista 4 pessoas (Ana, Carlos, Caio, Pamella). Prompt mestre cita 3 papéis técnicos (Ana Mobile, Caio Backend, Carlos Infra). Pamella não tem papel técnico definido no prompt.
8. **Hiperlocalidade ainda não está no README** — CEP → bairro → polígono → `ST_Contains` é a regra central do prompt e ainda não está formalizada no documento de produto.
9. **Avaliação comunitária / reputação** — README coloca como evolução; prompt mestre pede a **estrutura** (não o algoritmo) na fundação.
10. **Workspace vs repositório** — o Cursor abre `c:\Cidade+`, mas o Git está em `AppCidade-\`. Toda implementação deve ocorrer no subdiretório do repositório.

---

## 6. Decisões existentes que devem ser preservadas

Estas decisões vêm do README e do contexto de produto. Não devem ser descartadas:

1. **Município-alvo:** Santos/SP.
2. **Produto:** app mobile de reporte e acompanhamento de ocorrências urbanas.
3. **Plataformas:** Android e iOS.
4. **Domínio:** gestão pública / participação cidadã.
5. **Mapa como elemento central** da experiência.
6. **LGPD e minimização de dados** — dados do autor não aparecem no mapa público.
7. **Integração futura com a Prefeitura** — a arquitetura não deve impedir isso.
8. **IA como evolução**, não como entrega desta fundação.
9. **Prazo de entrega:** 26/nov/2026.
10. **Remote Git e histórico atuais** — continuar neste repositório.
11. **README de produto** — manter como documento de visão; atualizar stack só depois, com alinhamento do time.
12. **Não criar `packages/` compartilhados** enquanto não houver código realmente compartilhado.

---

## 7. Estrutura proposta (ainda não criada)

Alvo mínimo do MVP, sem `packages/` nesta fase:

```text
AppCidade-/
├── apps/
│   ├── api/                 ← Fastify + TypeScript + Prisma
│   └── mobile/              ← Expo SDK 52 + Expo Router
├── prisma/                  ← ou apps/api/prisma (decidir na ETAPA 3)
├── plans/
│   └── cidade-plus-foundation-audit.md
├── docker-compose.yml
├── package.json             ← workspaces: apps/api, apps/mobile
├── .gitignore
├── .env.example
└── README.md                ← preservar
```

### Scripts-alvo da raiz (ETAPA 1)

```text
npm run dev          → sobe API (e, se fizer sentido, orquestra o mobile)
npm run dev:api
npm run dev:mobile
npm run db:up
```

---

## 8. Dependências necessárias (por etapa)

Nenhuma deve ser instalada nesta ETAPA 0.

### ETAPA 1 — monorepo

- `npm workspaces` na raiz
- TypeScript apenas onde for necessário para o workspace
- sem frameworks ainda, se possível; ou scaffolding mínimo

### ETAPA 2 — Docker

- imagem `postgis/postgis:16-3.4`
- sem dependências Node extras

### ETAPA 3 — Prisma

- `prisma`
- `@prisma/client`

### ETAPA 4 — API

- `fastify`
- `zod`
- `dotenv`
- `@fastify/cors`

### ETAPA 5 — auth

- `bcrypt`
- `jsonwebtoken`

### ETAPA 8 — imagens

- SDK Cloudinary apenas no backend

### ETAPA 9 — mobile

- Expo SDK 52
- Expo Router
- TanStack Query, Zustand, NativeWind v4 e libs nativas **somente quando a etapa correspondente começar**

---

## 9. Riscos técnicos

| Risco | Impacto | Mitigação |
|---|---|---|
| Prisma + `Unsupported("geometry(Polygon, 4326)")` | Migração ou queries podem falhar | Validar na ETAPA 3 com `$queryRaw` parametrizado |
| Polígonos oficiais dos bairros de Santos | Sem GeoJSON, geofencing não pode ser testado de ponta a ponta | Na ETAPA 7, usar seed mínimo de 1–2 bairros para prova; polígonos oficiais depois |
| ViaCEP + nomes de bairro | Nomes do ViaCEP podem não bater com o polígono oficial | Normalizar só para comparação; associar a `SantosNeighborhood` |
| Expo SDK 52 vs Expo Go | Expo Go do time está no SDK 54 | **Desvio documentado:** o mobile foi atualizado para SDK 54 para abrir no Expo Go |
| Workspace `Cidade+` vs repo `AppCidade-` | Arquivos criados no lugar errado | Sempre trabalhar dentro de `AppCidade-` |
| README vs prompt (Express, foto, status) | Time pode implementar regras diferentes | Validar as regras abaixo **antes** da ETAPA 1 |
| Secrets | Cloudinary/JWT/DB no mobile ou no Git | Secrets só no backend / `.env` ignorado |
| Escopo das 13 etapas | Risco de arquitetura paralela se tudo for feito de uma vez | Implementar só após validação de cada etapa |

---

## 10. Pontos que precisam ser implementados

Ordem acordada. Cada etapa só começa após validação da anterior.

| Etapa | Objetivo | Entrega mínima |
|---|---|---|
| **0** | Auditoria | Este arquivo + relatório para validação |
| **1** | Monorepo + config base | `package.json` workspaces, `.gitignore`, `apps/api`, `apps/mobile` vazios/mínimos |
| **2** | Docker + PostgreSQL + PostGIS | `docker-compose.yml`, `.env.example`, Postgres 16 + PostGIS na 5432 |
| **3** | Prisma + models + migration | Schema das entidades, PostGIS, índice GIST, migration inicial |
| **4** | Fastify + arquitetura | `GET /health`, CORS, bootstrap da API |
| **5** | Auth + RBAC | Cadastro/login, JWT curto, guards CITIZEN/MANAGER/ADMIN |
| **6** | CEP + ViaCEP + bairro | Validação Santos/SP e associação ao bairro |
| **7** | Geofencing PostGIS | `ST_Contains` no backend, mensagem de erro amigável |
| **8** | Ocorrências + fotos + Cloudinary | Foto obrigatória, original protegida, thumbnail pública |
| **9** | Mobile Expo + Router | Rotas `(auth)` e `(tabs)` funcionando |
| **10** | Integração Mobile ↔ API | Login, cadastro, token em SecureStore |
| **11** | Mapa + ocorrências | Mapa com dados públicos |
| **12** | Avaliações + reputação | 1 voto por usuário/ocorrência; score inicial; sem algoritmo complexo |
| **13** | Testes + segurança + docs | Casos obrigatórios + relatório final |

---

## 11. Regras de negócio que a fundação deve respeitar

Confirmadas pelo prompt mestre. Precisam do seu OK antes da implementação:

1. Cidadão informa **CEP residencial** no cadastro.
2. Sistema identifica o **bairro** e associa a um polígono em `SantosNeighborhood`.
3. Ocorrência **somente dentro do polígono do bairro residencial** — validação no **backend**.
4. **Foto obrigatória** (mínimo 1). Original protegida; thumbnail no fluxo público.
5. Endpoints públicos **não** retornam CPF, email, `passwordHash` nem imagem original.
6. Roles: `CITIZEN`, `MANAGER`, `ADMIN`.
7. Avaliação comunitária: `UTIL` | `PERSISTE` | `INCORRETA`, unique `(userId, occurrenceId)`.
8. Descrição da ocorrência: máximo **500** caracteres.
9. Coordenadas: `Decimal(9,6)`; ordem PostGIS `longitude, latitude`.
10. Sem IA nesta fundação.
11. Sem `packages/` compartilhados no MVP.
12. Sem refresh token completo agora, mas JWT de ~15 min e arquitetura compatível.

---

## 12. Divergências README × prompt — precisam de validação sua

| Tema | README | Prompt mestre | Proposta da fundação |
|---|---|---|---|
| Backend | Express | Fastify | **Fastify** (não há código Express para preservar) |
| Foto | Opcional no MVP | Obrigatória | **Obrigatória** |
| Status | 4–5 estados simples | 7 estados | **7 estados do prompt** (mapeáveis depois para o painel) |
| Subcategoria | Prevista no MVP | Não pedida agora | **Não criar** na fundação |
| Avaliação / reputação | Evolução | Estrutura na fundação | **Só schema + endpoint mínimo**, sem algoritmo |
| Equipe | 4 pessoas | 3 papéis técnicos | Preservar as 4 no README; papéis técnicos Ana/Caio/Carlos |

---

## 13. O que a ETAPA 0 NÃO fez

- Não criou monorepo, apps, Docker, Prisma nem dependências.
- Não alterou o `README.md`.
- Não executou containers nem migrations.
- Não implementou autenticação, CEP, geofencing, ocorrências nem mobile.

---

## 15. Relatório da ETAPA 1 — Monorepo + configuração base

**Status:** implementada e testada localmente. Aguardando validação para a ETAPA 2.

### Estrutura atual

```text
AppCidade-/
├── apps/
│   ├── api/package.json
│   └── mobile/package.json
├── plans/
│   └── cidade-plus-foundation-audit.md
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

### Arquivos criados

| Arquivo | Motivo |
|---|---|
| `package.json` | Workspaces `apps/api` e `apps/mobile`; scripts da raiz |
| `package-lock.json` | Lockfile gerado pelo `npm install` |
| `.gitignore` | Node, TS, Prisma, Expo, RN, Android, iOS, Docker, `.env`, logs, builds, cache |
| `apps/api/package.json` | Workspace `@cidade-plus/api` |
| `apps/mobile/package.json` | Workspace `@cidade-plus/mobile` |

### Arquivos modificados

Nenhum arquivo pré-existente foi alterado. `README.md` permanece intacto.

### Dependências adicionadas

Nenhuma dependência de runtime ou framework.  
`npm install` apenas vinculou os workspaces (`2 packages`).

### Scripts da raiz

| Script | Destino |
|---|---|
| `npm run dev` | delega para `dev:api` |
| `npm run dev:api` | `@cidade-plus/api` |
| `npm run dev:mobile` | `@cidade-plus/mobile` |
| `npm run lint` | workspaces, `--if-present` |
| `npm run typecheck` | workspaces, `--if-present` |

Os scripts dos apps ainda são placeholders. Fastify entra na ETAPA 4; Expo na ETAPA 9.

### Testes realizados

| Teste | Resultado |
|---|---|
| Node `v22.22.3` / npm `10.9.8` | OK (engines `>=20` / `>=10`) |
| `npm install` | OK — 2 packages, 0 vulnerabilities |
| Resolução dos workspaces | OK — `@cidade-plus/api` → `apps/api`; `@cidade-plus/mobile` → `apps/mobile` |
| `npm run dev:api` | OK — placeholder da ETAPA 4 |
| `npm run dev:mobile` | OK — placeholder da ETAPA 9 |
| `npm run lint` | OK — percorre os dois workspaces |
| `npm run typecheck` | OK — percorre os dois workspaces |

### O que a ETAPA 1 NÃO fez

- Não instalou Fastify, Prisma, Expo, Zod, JWT nem Cloudinary.
- Não criou `packages/`.
- Não criou Docker, `.env`, schema Prisma nem telas.
- Não alterou o README.

### Próximo passo da ETAPA 1

Validado. Seguiu para a ETAPA 2.

---

## 16. Relatório da ETAPA 2 — Docker + PostgreSQL + PostGIS

**Status:** arquivos criados e **validados pelo usuário** (container `healthy`, PostGIS 3.4).

### Arquivos criados

| Arquivo | Motivo |
|---|---|
| `docker-compose.yml` | PostgreSQL 16 + PostGIS (`postgis/postgis:16-3.4`), porta 5432, volume, healthcheck |
| `.env.example` | Template de `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL` |
| `.env` | Cópia local para desenvolvimento (já coberta pelo `.gitignore`) |

### Arquivos modificados

| Arquivo | Alteração | Motivo |
|---|---|---|
| `package.json` | Scripts `db:up`, `db:down`, `db:logs` | Subir/parar/logs do Compose sem dependência extra |

`README.md` permanece intacto.

### Configuração do Compose

| Item | Valor |
|---|---|
| Imagem | `postgis/postgis:16-3.4` |
| Serviço | `postgres` |
| Container | `cidade-plus-postgres` |
| Porta | `${POSTGRES_PORT:-5432}:5432` |
| Volume | `cidade_plus_pgdata` → `/var/lib/postgresql/data` |
| Healthcheck | `pg_isready` no usuário/banco do container |
| Credenciais | somente via variáveis de ambiente |

`DATABASE_URL` no `.env.example` já está no formato esperado pelo Prisma. O Prisma em si fica para a ETAPA 3.

### Testes realizados

| Teste | Resultado |
|---|---|
| Arquivos Compose / env criados | OK |
| Credenciais fora do código | OK — apenas `.env` / `.env.example` |
| `.env` ignorado pelo Git | OK (`.gitignore`) |
| `docker` / Docker Desktop | OK — instalado pelo usuário após a ETAPA 2 |
| PostgreSQL inicia | OK — `cidade-plus-postgres` healthy na 5432 |
| PostGIS habilitado | OK — `3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1` |
| `npm run db:up` | OK |

### Problema pendente da ETAPA 2

Resolvido: Docker Desktop passou a estar disponível e o container foi validado.

### O que a ETAPA 2 NÃO fez

- Não instalou Docker Desktop.
- Não configurou Prisma, Fastify nem Expo.
- Não criou models nem migrations.
- Não alterou o README.

### Próximo passo da ETAPA 2

Validado. Seguiu para a ETAPA 3.

---

## 17. Relatório da ETAPA 3 — Prisma + banco + migrations

**Status:** schema, migration e verificações PostGIS concluídos. Aguardando validação para a ETAPA 4.

### Decisão: Prisma na raiz

O schema ficou em `prisma/` (raiz do repositório), não em `apps/api/prisma`.

Motivo: o `.env` e o Docker já estão na raiz; o Prisma CLI carrega `DATABASE_URL` daí. O client (`@prisma/client`) também foi declarado em `apps/api` para a ETAPA 4.

### Arquivos criados

| Arquivo | Motivo |
|---|---|
| `prisma/schema.prisma` | Models, enums, geometria Unsupported, índice GIST |
| `prisma/migrations/migration_lock.toml` | Provider PostgreSQL |
| `prisma/migrations/20260823224831_foundation/migration.sql` | Migration inicial + `CREATE EXTENSION postgis` |

### Arquivos modificados

| Arquivo | Alteração | Motivo |
|---|---|---|
| `package.json` | Scripts `db:migrate`, `db:migrate:deploy`, `db:generate`, `db:studio`; `prisma` e `@prisma/client` | Operar o banco pela raiz |
| `apps/api/package.json` | Dependência `@prisma/client` | API consumirá o client na ETAPA 4 |

`README.md` permanece intacto.

### Dependências adicionadas

| Pacote | Onde | Uso |
|---|---|---|
| `prisma@6.14.0` | raiz (dev) | CLI, migrate, generate |
| `@prisma/client@6.14.0` | raiz e `apps/api` | Client gerado |

Não atualizei para Prisma 7: é major e mudaria o fluxo desta fundação.

### Modelos

`User`, `Category`, `Occurrence`, `OccurrenceMedia`, `SantosNeighborhood`, `Evaluation`, `OccurrenceStatusHistory`

### Relacionamentos

- User → 0..1 SantosNeighborhood (`santosNeighborhoodId`)
- User 1:N Occurrence, Evaluation, OccurrenceStatusHistory
- Occurrence N:1 Category e User
- Occurrence 1:N OccurrenceMedia, Evaluation, OccurrenceStatusHistory
- Evaluation `@@unique([userId, occurrenceId])`

### Índices

- Unique: `users.email`, `users.cpf`, `categories.name`, `occurrence_media.publicId`, `santos_neighborhoods.name`, `santos_neighborhoods.normalizedName`, `evaluations(userId, occurrenceId)`
- BTree: FKs e `occurrences.status`
- **GIST:** `santos_neighborhoods_geom_gist` em `geom`

### Migration executada

`20260823224831_foundation` aplicada com `prisma migrate deploy`.

### Testes realizados

| Teste | Resultado |
|---|---|
| `prisma validate` | OK |
| Container healthy | OK |
| `prisma migrate deploy` | OK |
| `prisma generate` | OK — client 6.14.0 |
| Extensão PostGIS | OK — `postgis 3.4.3` |
| Coluna `geom` | OK — `geometry(Polygon, 4326)` |
| `Find_SRID(...)` | OK — **4326** |
| Índice GIST | OK |
| `ST_Contains` (ponto de prova, registro apagado em seguida) | OK — `inside = t` |

### O que a ETAPA 3 NÃO fez

- Não implementou Fastify, auth, CEP nem geofencing de produto.
- Não populou categorias nem polígonos oficiais de Santos.
- Não alterou o README.

### Como validar a ETAPA 3

Não há tela de banco. Basta conferir se os models fazem sentido e, se quiser ver as tabelas:

```text
npm run db:studio
```

Abre o Prisma Studio em `http://localhost:5555`.

---

## 18. Preview visual (fatia mínima da ETAPA 9)

Pedido do time: conseguir abrir o app e ver alguma tela, sem avançar login, mapa ou API.

- Expo SDK **54** + Expo Router 6 + TypeScript (desvio do prompt original SDK 52: o Expo Go do time está no 54)
- Tela inicial em `apps/mobile/app/index.tsx`
- `npm run dev:mobile` ou `npm run web -w @cidade-plus/mobile`
- Metro/web em `http://localhost:8081` — bundle web OK

Isso **não** substitui a ETAPA 9 completa (tabs, auth, mapa, foto, Query/Zustand).

### Próximo passo oficial da preview

Seguiu para a ETAPA 4 após validação.

---

## 19. Relatório da ETAPA 4 — Backend Fastify + arquitetura

**Status:** API sobe, Prisma conecta e `/health` responde. Aguardando validação para a ETAPA 5.

### Arquivos criados

| Arquivo | Motivo |
|---|---|
| `apps/api/src/server.ts` | Bootstrap, listen, shutdown |
| `apps/api/src/app.ts` | Fastify + CORS + `GET /health` |
| `apps/api/src/config/env.ts` | Zod + dotenv (`.env` da raiz) |
| `apps/api/src/lib/prisma.ts` | PrismaClient singleton |
| `apps/api/tsconfig.json` | TypeScript NodeNext |

### Arquivos modificados

| Arquivo | Alteração | Motivo |
|---|---|---|
| `apps/api/package.json` | Fastify, CORS, Zod, dotenv, tsx | Fundação da API |
| `.env` / `.env.example` | `API_HOST`, `API_PORT`, `NODE_ENV` | Porta 3333 sem hardcode |
| `package.json` | `postinstall: prisma generate` | Client Prisma após `npm install` |

### Testes realizados

| Teste | Resultado |
|---|---|
| `npm run typecheck -w @cidade-plus/api` | OK |
| PostgreSQL healthy | OK |
| Prisma `$connect` | OK |
| `GET /health` | **200** `{"status":"ok"}` |
| CORS (Origin `http://localhost:8081`) | OK — `access-control-allow-origin` |

A API está em `http://127.0.0.1:3333`.

### O que a ETAPA 4 NÃO fez

- Não implementou cadastro, login, JWT nem RBAC.
- Não implementou ViaCEP, geofencing nem ocorrências.
- Não ligou o app mobile à API.

### Próximo passo da ETAPA 4

Validado. Seguiu para a ETAPA 5.

---

## 20. Relatório da ETAPA 5 — Autenticação + RBAC

**Status:** cadastro, login, JWT e guards testados. Aguardando validação para a ETAPA 6.

### Rotas

| Método | Rota | Acesso |
|---|---|---|
| `POST` | `/auth/register` | público — cria só `CITIZEN` |
| `POST` | `/auth/login` | público |
| `GET` | `/me` | autenticado |
| `GET` | `/manager/health` | `MANAGER`, `ADMIN` |
| `GET` | `/admin/health` | `ADMIN` |

O cliente **não** escolhe a role no cadastro. JWT ~15 min. Senha só como `passwordHash` (bcrypt).

O cadastro **não** aceita bairro enviado pelo cliente. CEP é resolvido no backend (ETAPA 6).

### Seed local

`npm run db:seed`

- `admin@cidade.plus` / `admin1234`
- `gestor@cidade.plus` / `gestor1234`
- bairros de desenvolvimento: Gonzaga e Ponta da Praia (polígonos aproximados)
- categorias iniciais

### Testes da ETAPA 5 (já feitos)

Cadastro, login, `/me`, 401/403 por role, duplicidade e payload inválido.

---

## 21. ETAPAS 6–8 e 12 — CEP, geofencing, ocorrências e avaliações

Implementadas no backend. **Não validadas com o banco nesta sessão** (Docker Desktop estava desligado).

### ViaCEP (ETAPA 6)

Fluxo no `POST /auth/register`:

CEP → ViaCEP → UF=SP → cidade=Santos → bairro oficial → `normalizedName` → `santosNeighborhoodId` se o polígono existir.

O frontend **não** informa o bairro usado no cadastro.

### Geofencing (ETAPA 7)

`POST /occurrences/geofence-check` e `POST /occurrences` usam `ST_Contains` + `ST_MakePoint(longitude, latitude)` no bairro **do usuário autenticado**.

Fora do polígono: `403` — `Você só pode registrar ocorrências dentro do seu bairro residencial.`

### Ocorrências e fotos (ETAPA 8)

- Foto obrigatória (`media` com pelo menos 1 item)
- Thumbnail no DTO público; `url` original só no DTO admin
- Cloudinary preparado (`CLOUDINARY_*`); upload real fica para quando as credenciais existirem

### Avaliações (ETAPA 12)

`POST /occurrences/:id/evaluations` — um voto por usuário (`409` na segunda tentativa).

### Rotas novas

| Método | Rota | Acesso |
|---|---|---|
| `GET` | `/categories` | público |
| `GET` | `/occurrences` | público (sem CPF, e-mail, senha, imagem original) |
| `GET` | `/occurrences/:id` | público |
| `POST` | `/occurrences/geofence-check` | autenticado |
| `POST` | `/occurrences` | autenticado + geofence + foto |
| `POST` | `/occurrences/:id/evaluations` | autenticado |
| `GET` | `/admin/occurrences/:id` | MANAGER/ADMIN |
| `PATCH` | `/admin/occurrences/:id/status` | MANAGER/ADMIN |

### Como validar quando o Docker estiver aberto

```text
npm run db:up
npx prisma migrate deploy
npm run db:seed
npm run dev:api
```

Testes sugeridos:

- CEP Santos (ex.: `11030000`)
- CEP de outra cidade / outro estado / inexistente / malformado
- ponto dentro de Gonzaga ≈ `-23.967, -46.335` (lat, lng)
- ponto fora do bairro
- ocorrência sem foto
- segundo voto na mesma ocorrência

### Ainda pendente no plano

- ETAPA 9/10: ligar o Expo (login, cadastro, token no SecureStore) à API
- ETAPA 11: mapa real (`react-native-maps`) no lugar do placeholder
- ETAPA 13: suíte de testes automatizados + documentação no README
- Upload Cloudinary de fato (precisa das chaves)

Aguardar Docker ligado para validar CEP/geofencing ao vivo, depois a integração mobile.
