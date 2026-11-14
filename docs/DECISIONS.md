---
tipo: registro-de-decisoes
atualizado: 2026-11-13
---

# Decisões técnicas

> Uma entrada por decisão, curta. **Não apague** decisões antigas: quando uma decisão for revertida, marque-a como `Substituída por D-0xx`. Consulte este arquivo antes de propor mudanças estruturais.
>
> Formato: `## D-0xx — Título` · **Data** · **Status** (Vigente / Substituída) · Decisão · Motivo · Origem.

## D-001 — Fastify em vez de Express
**Data:** 2026-08-23 · **Status:** Vigente
O README citava Express; o prompt mestre exigia Fastify. Adotado Fastify porque não havia código Express a preservar. O README foi alinhado depois.
Origem: [[cidade-plus-foundation-audit]] §2 e §12.

## D-002 — Expo SDK 54 (em vez de 52)
**Data:** 2026-08 · **Status:** Vigente
O Expo Go do time está no SDK 54, e o SDK 52 não abriria nele. Desvio documentado em relação ao prompt mestre.
Origem: audit §9 e §18.

## D-003 — Prisma na raiz do repositório
**Data:** 2026-08-23 · **Status:** Vigente
O schema fica em `prisma/` (não em `apps/api/prisma`) porque o `.env` e o Docker estão na raiz. Prisma mantido na versão 6.14 (a 7 é major e mudaria o fluxo).
Origem: audit §17.

## D-004 — PostgreSQL 16 + PostGIS para o geofencing
**Data:** 2026-08-23 · **Status:** Vigente
`geom` como `Unsupported("geometry(Polygon, 4326)")` + índice GIST. Queries espaciais via `$queryRaw` parametrizado.
Origem: audit §9 e §17.

## D-005 — Sem `packages/` compartilhados no MVP
**Data:** 2026-08-23 · **Status:** Vigente
Só criar quando houver código realmente compartilhado entre a API e o mobile.

## D-006 — Foto obrigatória
**Data:** 2026-08-23 · **Status:** Vigente
O README dizia "se necessário"; a regra de negócio exige evidência fotográfica. A validação é feita por Zod (`media.min(1)`).
Origem: audit §12.

## D-007 — 7 status de ocorrência
**Data:** 2026-08-23 · **Status:** Vigente
`REPORTADA, RECEBIDA, EM_ANALISE, EM_ATENDIMENTO, RESOLVIDA, ARQUIVADA, INVALIDA`, mapeáveis depois para os 5 estados do README no painel.

## D-008 — Bairro resolvido no backend; geofence no backend
**Data:** 2026-08-23 · **Status:** Vigente
O cliente nunca informa o bairro. CEP → ViaCEP → nome normalizado → `SantosNeighborhood`. A criação de ocorrência usa `ST_Contains(geom, ST_MakePoint(lng, lat))` com o bairro do usuário autenticado.
Origem: audit §11 e §21.

## D-009 — Sem subcategoria e sem IA na fundação
**Data:** 2026-08-23 · **Status:** Vigente
A subcategoria está prevista no README, mas foi adiada. A IA é uma evolução.

## D-010 — JWT curto (~15 min) sem refresh token
**Data:** 2026-08 · **Status:** Vigente
A arquitetura fica compatível com um refresh token futuro.

## D-011 — Cloudinary com fallback em disco local
**Data:** 2026-08-24 · **Status:** Vigente
Sem as chaves `CLOUDINARY_*`, as imagens vão para `apps/api/uploads` e são servidas em `/media`. Os secrets ficam só no backend.
Origem: [[cidade-plus-foundation-etapa-13]].

## D-012 — Avaliação comunitária: só a estrutura, sem algoritmo
**Data:** 2026-08 · **Status:** Vigente
Endpoint + unique `(userId, occurrenceId)`. O `reputationScore` existe, mas ainda não é calculado.

## D-013 — Segundo cérebro em Markdown puro, sem MCP/RAG
**Data:** 2026-11-13 · **Status:** Vigente
O conhecimento fica em `AppCidade-/docs` e `AppCidade-/plans`, lido diretamente pelo agente com grep/leitura de arquivo. MCP do Obsidian e banco vetorial foram descartados: o volume é de ~40 KB e eles exigiriam o Obsidian aberto ou um servidor extra, sem ganho real. Revisar se o volume passar de ~1 MB.
Origem: [[segundo-cerebro-obsidian]].

## D-014 — Development Build (expo-dev-client) compilado no EAS; Expo Go só como fallback
**Data:** 2026-11-13 · **Status:** Vigente
Cada versão do Expo Go na loja roda um único SDK, e as atualizações automáticas quebravam o projeto (sobretudo no iOS). O dev build fixa o runtime nativo no SDK 54 do projeto e mantém o Fast Refresh. O build roda no EAS porque não há Android Studio/JDK nem Mac nesta máquina. iPhone físico exige uma conta Apple Developer paga. Perfis em `apps/mobile/eas.json`; identificador `com.cidadeplus.app` (pode mudar até a 1ª publicação).
Origem: [[ambiente-e-builds]] · guia [[AMBIENTE_DEV]].

## D-015 — Pastas nativas geradas (CNG); `android/` e `ios/` fora do Git
**Data:** 2026-11-13 · **Status:** Vigente
A fonte da verdade nativa é `app.json` + `app.config.js`. Se essas pastas forem versionadas, o EAS passa a usá-las e ignora o `app.json`, e as duas configurações divergem.

## D-016 — `expo-font` fixado em `~14.0.12` (overrides na raiz + dependência do mobile)
**Data:** 2026-11-13 · **Status:** Vigente
O `@expo/vector-icons` declara o peer `expo-font >=14.0.4`, e o npm instalou a 57.x (de outro SDK), criando um módulo nativo duplicado. Ao atualizar o SDK, atualize também esse override. Ver [[PROBLEMS]] P-006.

## D-017 — Manter o Google Maps (`react-native-maps`); não migrar para o Mapbox
**Data:** 2026-11-14 · **Status:** Vigente
Não exige mudança de código (o `MapCanvas.tsx` tem ~30 linhas), o Maps SDK mobile tem uso gratuito ilimitado e o iOS usa Apple Maps sem chave. O Mapbox exigiria reescrever o componente, adicionar uma dependência nativa e usar token também no iOS, além de ter limite gratuito de 25 mil MAU, o que não vale a pena perto da entrega (26/nov). Reavaliar só se surgir a necessidade de estilo próprio ou de mapa offline. A chave fica em `GOOGLE_MAPS_ANDROID_API_KEY` (EAS env + `apps/mobile/.env`), injetada pelo `app.config.js`; projeto Google Cloud `cidadeplus-514703`.
Origem: [[ambiente-e-builds]].

## D-018 — Regra de bairro na criação de ocorrências desativada temporariamente (flag)
**Data:** 2026-11-14 · **Status:** Vigente (temporária) · **Suspende** D-008 apenas na criação de ocorrências
A pedido do usuário, qualquer pessoa autenticada pode criar ocorrências em qualquer local. A regra fica atrás de `OCCURRENCE_GEOFENCE_ENABLED` (padrão `false`, em `apps/api/src/config/env.ts`); para reativar, basta `true` no `.env`. A estrutura de bairros, o `geofencing.ts` e o endpoint `geofence-check` foram mantidos. O app deixou de chamar o `geofence-check` (a regra não fica ativa só de um lado). A validação de faixa das coordenadas, que antes só existia dentro do geofence, foi para o schema Zod e vale sempre. Não foi criada relação ocorrência→bairro (exigiria migration). Junto com isso, o seed deixou de criar ocorrências fictícias e passou a removê-las.
Origem: [[ocorrencias-criacao-e-mapa]].

## D-019 — 5 categorias do Figma (Infraestrutura, Limpeza, Segurança, Trânsito, Outros)
**Data:** 2026-11-14 · **Status:** Vigente · aprovada pelo usuário
Substituem as 7 do seed antigo (Buraco, Calçada, Iluminação, Sinalização, Lixo, Árvore, Outros), porque o Figma usa essas 5 com ilustrações 3D (`apps/mobile/assets/figma/category-*.png`). O seed cria as 5 e apaga as antigas **somente se não tiverem ocorrências**. A API continua ordenando por nome; a ordem do Figma é aplicada no app (`hooks/use-feed.ts`). Nenhuma mudança de schema.
Origem: [[interface-figma]].

## D-020 — Módulos nativos de UI: react-native-svg, expo-linear-gradient, expo-blur
**Data:** 2026-11-14 · **Status:** Vigente · aprovada pelo usuário
Necessários para reproduzir o Figma (ícones SVG, degradê de fundo, navbar de vidro). Versões do SDK 54 via `expo install`. SVGs importados como componentes com `react-native-svg-transformer` (`metro.config.js`, `svg.d.ts`). **Exigem um development build novo**: um build antigo quebra ao carregar o JS atual.
Origem: [[interface-figma]].

## D-021 — Home "perto de mim" (5 km, no app) e direção pela bússola
**Data:** 2026-11-14 · **Status:** Vigente
A Home mostra só ocorrências a até `NEARBY_RADIUS_KM = 5` (`apps/mobile/lib/geo.ts`), ordenadas por distância (haversine **no app**, sobre o mesmo `GET /occurrences`); o **mapa mostra todas**. Critério: distância geográfica, nunca bairro. Sem localização, a Home mostra todas por data, com aviso. A direção do usuário vem do **heading da bússola** (`watchHeadingAsync`); sem leitura confiável, usa o course do GPS só acima de 1 m/s; senão, não mostra direção. Só permissão de localização em primeiro plano. O modal de detalhes é único (Home, mapa e rota). Evolução prevista: filtro no servidor com PostGIS quando o volume crescer.
Origem: [[ocorrencias-criacao-e-mapa]].
