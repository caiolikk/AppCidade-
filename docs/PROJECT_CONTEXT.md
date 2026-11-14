---
tipo: contexto-essencial
atualizado: 2026-11-13
fonte: código em AppCidade- (commit 4f86468) + README + plans/
---

# Cidade+ — Contexto essencial

> Ponto de entrada do agente. Leia este arquivo **antes** de qualquer tarefa relevante. Ele é um resumo; o detalhe fica nos documentos do [[#8. Mapa de documentos|mapa]]. Quando este texto divergir do código, **o código vence** e este arquivo deve ser corrigido.

## 1. Produto

- **O quê:** app mobile (Android/iOS) para cidadãos de **Santos/SP** reportarem e acompanharem ocorrências urbanas (infraestrutura, iluminação, trânsito, limpeza etc.) com foto, localização e categoria.
- **Problema:** não existe um canal centralizado; as informações ficam dispersas; a gestão tem dificuldade de triar demandas; falta transparência para o cidadão.
- **Público:** cidadãos de Santos (perfil `CITIZEN`) e gestores públicos (`MANAGER`/`ADMIN`).
- **Diferenciais:** organização por bairro, mapa como tela central, validação comunitária, LGPD/minimização de dados.
- **Equipe:** Ana (mobile), Caio (backend), Carlos (infra), Pamella. **Entrega: 26/nov/2026.**
- Visão completa: `README.md`.

## 2. Regras de negócio fundamentais

1. O cidadão informa o **CEP residencial** no cadastro; o **backend** resolve o bairro. O cliente nunca envia o bairro.
2. Ocorrências só podem ser criadas **dentro do polígono do bairro residencial** do usuário (geofence no backend).
3. **Foto obrigatória** (pelo menos 1). A URL original é protegida; o público só vê `thumbnailUrl`.
4. Os endpoints públicos **nunca** retornam CPF, e-mail, `passwordHash`, autor nem imagem original.
5. Papéis: `CITIZEN`, `MANAGER`, `ADMIN`. O cadastro público cria apenas `CITIZEN`.
6. Descrição com no máximo 500 caracteres; título entre 3 e 200.
7. **7 status:** `REPORTADA → RECEBIDA → EM_ANALISE → EM_ATENDIMENTO → RESOLVIDA | ARQUIVADA | INVALIDA`. Toda troca gera `OccurrenceStatusHistory`.
8. Avaliação comunitária `UTIL | PERSISTE | INCORRETA`: **1 voto por usuário por ocorrência** (o segundo voto retorna 409).
9. Coordenadas `Decimal(9,6)`; no PostGIS a ordem é **longitude, latitude**.

## 3. Stack

| Camada | Tecnologia |
|---|---|
| Mobile | Expo SDK **54** + Expo Router 6 + React Native 0.81 + TypeScript; TanStack Query; Zustand; SecureStore; react-native-maps; expo-location; expo-image-picker |
| API | Node 20+ · **Fastify 5** · Zod · JWT (`jsonwebtoken`, ~15 min) · bcrypt · `@fastify/multipart` · `@fastify/static` |
| Banco | PostgreSQL 16 + **PostGIS 3.4** (Docker `postgis/postgis:16-3.4`) · **Prisma 6.14** (schema na raiz) |
| Imagens | Cloudinary se `CLOUDINARY_*` existir; caso contrário, disco local `apps/api/uploads` servido em `/media` |
| Testes | Vitest na API (`npm test`, exige o Postgres no ar) |
| Build mobile | **Development build** (`expo-dev-client`) via **EAS** (`apps/mobile/eas.json`); Expo Go só como fallback; id `com.cidadeplus.app`. Ver [[AMBIENTE_DEV]] |

As justificativas ficam em [[DECISIONS]].

## 4. Arquitetura e módulos

Monorepo com npm workspaces, **sem `packages/`**.

```text
AppCidade-/
├── apps/api/src/
│   ├── app.ts / server.ts          bootstrap, CORS, multipart, /media, error handler
│   ├── config/env.ts               env com Zod (lê o .env da raiz)
│   ├── middleware/                 authenticate (JWT), authorize (roles)
│   ├── modules/auth/               register, login, /me, health por role
│   ├── modules/categories/         GET /categories
│   ├── modules/cep/                resolve-address (CEP → bairro do banco)
│   ├── modules/geo/geofencing.ts   ST_Contains via $queryRaw
│   ├── modules/occurrences/        CRUD público/admin, avaliações, status
│   ├── modules/uploads/            POST /uploads/image (recriado em 2026-11-13, P-001)
│   ├── services/                   viacep, cloudinary, upload
│   └── utils/                      jwt, password, digits, normalize-neighborhood, http-error
├── apps/mobile/
│   ├── app/(auth)/                 login, register
│   ├── app/(tabs)/                 index (feed), map, create, notifications, account
│   ├── app/occurrence/[id].tsx     detalhe + voto
│   ├── components/ hooks/ lib/ store/   api.ts, session, auth store (Zustand)
├── prisma/                         schema.prisma, migrations/, seed.ts
└── docker-compose.yml
```

### Rotas da API

| Método | Rota | Acesso |
|---|---|---|
| GET | `/health` | público |
| POST | `/auth/register`, `/auth/login` | público |
| GET | `/me` | autenticado |
| GET | `/manager/health` · `/admin/health` | MANAGER+ · ADMIN |
| GET | `/categories` | público |
| GET | `/occurrences` · `/occurrences/:id` | público (DTO sem dados pessoais) |
| POST | `/occurrences/geofence-check` · `/occurrences` | autenticado |
| POST | `/occurrences/:id/evaluations` | autenticado |
| GET | `/admin/occurrences/:id` | MANAGER/ADMIN |
| PATCH | `/admin/occurrences/:id/status` | MANAGER/ADMIN |
| POST | `/uploads/image` | autenticado (multipart `file`, máx. 8 MB) |

### Modelo de dados (`prisma/schema.prisma`)

`User` (role, cpf, cep, neighborhood, santosNeighborhoodId, reputationScore) · `Category` · `Occurrence` (title, description, lat/lng, status) · `OccurrenceMedia` (url, thumbnailUrl, publicId) · `SantosNeighborhood` (geom `Polygon 4326` + índice GIST) · `Evaluation` (unique userId+occurrenceId) · `OccurrenceStatusHistory`. Uma única migration: `20260823224831_foundation`.

## 5. Estado das funcionalidades (conferido no código em 2026-11-13)

| Funcionalidade | Estado | Observação |
|---|---|---|
| Cadastro/login JWT + RBAC | Implementado | Sem refresh token |
| CEP → bairro (ViaCEP) | Implementado | Só SP/Santos |
| Geofencing PostGIS | Implementado | Seed tem só Gonzaga e Ponta da Praia, com bboxes **aproximados** |
| Criar ocorrência (foto + GPS) | Implementado | Mobile: `(tabs)/create.tsx` |
| Upload de imagem | Implementado | Local em `apps/api/uploads` ou Cloudinary |
| Feed + mapa públicos | Implementado | Lista sem paginação; filtro só por categoria, feito no cliente |
| Detalhe + avaliação comunitária | Implementado | |
| Mudança de status (API admin) | Implementado | Sem tela: não existe painel web nem tela de gestor |
| Notificações | Placeholder | `PlaceholderScreen` |
| Subcategoria, IA, push, Gov.br, reputação calculada | Não iniciado | Previstos no README |
| Polígonos oficiais da Prefeitura | Não iniciado | |

## 6. Fluxos-chave (onde olhar no código)

- **Cadastro:** `auth.service.ts` → `cep/resolve-address.ts` → `services/viacep.ts` (CEP de 8 dígitos, UF=SP, cidade=Santos, bairro normalizado) → busca `SantosNeighborhood.normalizedName`. Se não houver polígono, `santosNeighborhoodId = null`.
- **Criar ocorrência:** mobile pede o GPS → `POST /occurrences/geofence-check` → foto → `POST /uploads/image` → `POST /occurrences` (Zod: `media.min(1)`) → `geofencing.ts`: 403 fora do bairro, **422 se o usuário não tiver polígono**, 400 para coordenadas inválidas.
- **Mapa:** `(tabs)/map.tsx` + `components/MapCanvas(.web).tsx` + `hooks/use-feed.ts`.

## 7. Como rodar

Guia completo: [[AMBIENTE_DEV]]. Resumo: `npm install` → `npm run db:up` (Docker roda **só o Postgres**) → `npx prisma migrate deploy` → `npm run db:seed` → `npm run dev:api` (porta 3333) → `npm run dev:mobile` (Metro em modo dev build). Variáveis do app ficam em `apps/mobile/.env`, não na raiz. Nunca copie o `.env` para a documentação.

## 8. Mapa de documentos

| Assunto | Documento |
|---|---|
| Visão de produto, escopo, prazos | `README.md` |
| Decisões técnicas (por quê) | [[DECISIONS]] |
| Bugs, causas raiz, soluções tentadas | [[PROBLEMS]] |
| Fundação ETAPAS 0–12 (auditoria + relatórios por etapa) | [[cidade-plus-foundation-audit]] |
| Fechamento da fundação / testes da API | [[cidade-plus-foundation-etapa-13]] |
| Processo de segundo cérebro | [[segundo-cerebro-obsidian]] |
| Ambiente, Docker, Expo/EAS, builds | [[AMBIENTE_DEV]] (guia) · [[ambiente-e-builds]] (plano) |
| Modelos de plano e de prompt | [[_TEMPLATE]] · [[PROMPT_TEMPLATE]] |

Planos ficam em `plans/` com frontmatter `status:`. Para listar: `grep -rn "^status:" AppCidade-/plans`.
