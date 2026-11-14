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
2. ~~Ocorrências só dentro do polígono do bairro residencial~~ → **desativada temporariamente** ([[DECISIONS]] D-018): ocorrências podem ser criadas em **qualquer local**. A regra continua no código, atrás da flag `OCCURRENCE_GEOFENCE_ENABLED` (padrão `false`). Lat/lng sempre validadas no schema (±90/±180).
3. **Foto obrigatória** (pelo menos 1). A URL original é protegida; o público só vê `thumbnailUrl`.
4. Os endpoints públicos **nunca** retornam CPF, e-mail, `passwordHash`, autor nem imagem original.
5. Papéis: `CITIZEN`, `MANAGER`, `ADMIN`. O cadastro público cria apenas `CITIZEN`.
6. Descrição com no máximo 500 caracteres; título entre 3 e 200.
7. **7 status:** `REPORTADA → RECEBIDA → EM_ANALISE → EM_ATENDIMENTO → RESOLVIDA | ARQUIVADA | INVALIDA`. Toda troca gera `OccurrenceStatusHistory`. No app, as cores seguem os 4 estados do Figma (Em análise, Em andamento, Resolvido, Negado; `theme.ts → statusVisual`); o rótulo mostrado é o status real.
8. Avaliação comunitária `UTIL | PERSISTE | INCORRETA`: **1 voto por usuário por ocorrência** (o segundo voto retorna 409).
9. Coordenadas `Decimal(9,6)`; no PostGIS a ordem é **longitude, latitude**.
10. **Categorias (D-019):** Infraestrutura, Limpeza, Segurança, Trânsito, Outros.

## 3. Stack

| Camada | Tecnologia |
|---|---|
| Mobile | Expo SDK **54** + Expo Router 6 + React Native 0.81 + TypeScript; TanStack Query; Zustand; SecureStore; react-native-maps; expo-location; expo-image-picker; **react-native-svg + expo-linear-gradient + expo-blur** (UI do Figma, D-020) |
| Design | Figma "APP CIDADE+" (página FInal). Tokens em `apps/mobile/theme.ts` (verde `#0B701A`, texto `#0D0D0D`, fundo `#FAFAFA`→`#E3FCE4`); assets em `apps/mobile/assets/figma/`. Ver [[interface-figma]] |
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
| POST | `/occurrences` | autenticado (geofence só com a flag D-018) |
| POST | `/occurrences/geofence-check` | autenticado (mantido; o app não usa mais) |
| POST | `/occurrences/:id/evaluations` | autenticado |
| GET | `/admin/occurrences/:id` | MANAGER/ADMIN |
| PATCH | `/admin/occurrences/:id/status` | MANAGER/ADMIN |
| POST | `/uploads/image` | autenticado (multipart `file`, máx. 8 MB) |

### Modelo de dados (`prisma/schema.prisma`)

`User` (role, cpf, cep, neighborhood, santosNeighborhoodId, reputationScore) · `Category` · `Occurrence` (title, description, lat/lng, status) · `OccurrenceMedia` (url, thumbnailUrl, publicId) · `SantosNeighborhood` (geom `Polygon 4326` + índice GIST) · `Evaluation` (unique userId+occurrenceId) · `OccurrenceStatusHistory`. Uma única migration: `20260823224831_foundation`.

## 5. Estado das funcionalidades (conferido no código em 2026-11-14)

| Funcionalidade | Estado | Observação |
|---|---|---|
| Cadastro/login JWT + RBAC | Implementado | Sem refresh token |
| CEP → bairro (ViaCEP) | Implementado | Só SP/Santos |
| Geofencing PostGIS | Implementado, **desligado** | Flag `OCCURRENCE_GEOFENCE_ENABLED` (D-018). Seed tem só Gonzaga e Ponta da Praia (bboxes **aproximados**) |
| Criar ocorrência (foto + local) | Implementado e testado (API + banco) | `(tabs)/create.tsx`: GPS **ou** ponto escolhido no mapa (`LocationPicker`); qualquer local. Ver [[ocorrencias-criacao-e-mapa]] |
| Upload de imagem | Implementado | Local em `apps/api/uploads` ou Cloudinary |
| Home "perto de mim" | Implementado (validado na web) | **Grade 3×N do Figma** com ilustração da categoria + título + distância (sem foto). Raio de 5 km (`lib/geo.ts`), por distância. Sem localização: todas, com aviso. D-021 |
| Mapa | Implementado (validado na web; falta o aparelho) | **Todas** as ocorrências; pins estilo Waze **pré-renderizados** (`assets/pins`, `scripts/generate-pins.ps1`; P-013); usuário com precisão e direção (bússola); seguir/recentralizar. "Ver no mapa"/criação abrem `/map?focus=<id>&focusKey=<nonce>` (foco tem prioridade sobre seguir) |
| Relação ocorrência → bairro | Não existe | O bairro só existe no usuário |
| Detalhe + avaliação comunitária | Implementado | **Modal único** `OccurrenceDetailsModal`/`OccurrenceDetails` (Home e mapa) e rota `/occurrence/[id]`. Só 1 foto pública (`thumbnailUrl`) |
| Mudança de status (API admin) | Implementado | Sem tela: não existe painel web nem tela de gestor |
| Notificações | Placeholder | `PlaceholderScreen` |
| Subcategoria, IA, push, Gov.br, reputação calculada | Não iniciado | Previstos no README |
| Polígonos oficiais da Prefeitura | Não iniciado | |

## 6. Fluxos-chave (onde olhar no código)

- **Cadastro:** `auth.service.ts` → `cep/resolve-address.ts` → `services/viacep.ts` (CEP de 8 dígitos, UF=SP, cidade=Santos, bairro normalizado) → busca `SantosNeighborhood.normalizedName`. Se não houver polígono, `santosNeighborhoodId = null`.
- **Criar ocorrência:** GPS (`expo-location`) ou toque/arraste no `components/LocationPicker(.web).tsx` (6 casas) → foto → `POST /uploads/image` → `POST /occurrences` (Zod: título/descrição ≥3, lat ±90, lng ±180, categoria uuid, `media.min(1)`) → transação `occurrence + media + statusHistory(REPORTADA)` → app invalida `["occurrences"]` e abre `/map?focus=<id>`. Com a flag D-018 ligada, `geofencing.ts` volta a dar 403 fora / 422 sem polígono.
- **Mapa:** `(tabs)/map.tsx` + `components/MapCanvas(.web).tsx` (pins, `focusId`, seguir/recentralizar) + `hooks/use-feed.ts` (React Query `["occurrences"]`, `GET /occurrences`). Localização: `hooks/use-user-location.ts` (só foreground, só com a aba em foco) e `hooks/use-device-heading.ts` (bússola suavizada).
- **Detalhes:** Home e mapa → `components/OccurrenceDetailsModal.tsx` (lê o cache da lista, sem requisição extra) → `OccurrenceDetails.tsx` (também usado pela rota `/occurrence/[id]`).
- **Seed:** cria categorias, bairros e staff; **remove** ocorrências fictícias (mídia `publicId seed-*`). Não cria mais ocorrências.

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
| Interface / Figma / tokens visuais | [[interface-figma]] |
| Ambiente, Docker, Expo/EAS, builds | [[AMBIENTE_DEV]] (guia) · [[ambiente-e-builds]] (plano) |
| Modelos de plano e de prompt | [[_TEMPLATE]] · [[PROMPT_TEMPLATE]] |

Planos ficam em `plans/` com frontmatter `status:`. Para listar: `grep -rn "^status:" AppCidade-/plans`.
