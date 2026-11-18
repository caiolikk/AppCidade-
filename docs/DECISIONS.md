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
**Data:** 2026-08-23 · **Status:** Subcategoria **substituída por D-022** (2026-11-14); IA continua adiada
A subcategoria está prevista no README, mas foi adiada. A IA é uma evolução.

## D-010 — JWT curto (~15 min) sem refresh token
**Data:** 2026-08 · **Status:** Vigente
A arquitetura fica compatível com um refresh token futuro.

## D-011 — Cloudinary com fallback em disco local
**Data:** 2026-08-24 · **Status:** Vigente
Sem as chaves `CLOUDINARY_*`, as imagens vão para `apps/api/uploads` e são servidas em `/media`. Os secrets ficam só no backend.
Origem: [[cidade-plus-foundation-etapa-13]].

## D-012 — Avaliação comunitária: só a estrutura, sem algoritmo
**Data:** 2026-08 · **Status:** Algoritmo **substituído por D-024** (2026-11-14); o campo `reputationScore` segue sem uso
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
**Data:** 2026-11-14 · **Status:** Vigente para o raio de 5 km; a **direção pela bússola foi removida** (substituída por D-030, 2026-11-17)
A Home mostra só ocorrências a até `NEARBY_RADIUS_KM = 5` (`apps/mobile/lib/geo.ts`), ordenadas por distância (haversine **no app**, sobre o mesmo `GET /occurrences`); o **mapa mostra todas**. Critério: distância geográfica, nunca bairro. Sem localização, a Home mostra todas por data, com aviso. A direção do usuário vem do **heading da bússola** (`watchHeadingAsync`); sem leitura confiável, usa o course do GPS só acima de 1 m/s; senão, não mostra direção. Só permissão de localização em primeiro plano. O modal de detalhes é único (Home, mapa e rota). Evolução prevista: filtro no servidor com PostGIS quando o volume crescer.
Origem: [[ocorrencias-criacao-e-mapa]].

## D-022 — Subcategorias em tabela própria, opcionais na ocorrência
**Data:** 2026-11-14 · **Status:** Vigente · **Substitui** a parte de subcategoria da D-009
- **Modelagem:** tabela `subcategories` (`categoryId`, `name`, `description`, `sortOrder`; única por `categoryId+name`) e coluna `occurrences.subcategoryId` **opcional** (FK `ON DELETE RESTRICT`). Uma tabela, e não enum ou texto livre, porque o vínculo com a categoria precisa ser validado e as opções devem mudar pelo seed, sem migration. Migration `20261115003036_subcategories`, só aditiva: as ocorrências antigas ficam com `null`.
- **Opções:** vêm dos prints do Figma enviados pelo usuário (menu "Nova Ocorrência" de Infraestrutura, Limpeza, Segurança e Trânsito), no texto e na ordem do Figma, com "Outros" fechando cada lista. Ficam no seed (`prisma/seed.ts → SUBCATEGORIES`), que remove só opções obsoletas sem uso. A categoria **"Outros" não tem subcategorias** porque não tem print. Única correção feita: o erro de digitação "aréa" virou "área".
- **Regras:** o `POST /occurrences` aceita `subcategoryId`. Ele é obrigatório quando a categoria tem opções, e uma subcategoria de outra categoria dá 400. A validação fica no service, não em FK composta, para manter o schema simples.
- **Contrato da API (aditivo):** o `GET /categories` passa a incluir `subcategories[]`, e os DTOs passam a incluir `subcategory: {id,name} | null`.
Origem: [[ocorrencias-criacao-e-mapa]].

## D-023 — Mapa como tela inicial (rota `/`); "perto de você" em `/nearby`
**Data:** 2026-11-14 · **Status:** Vigente · pedido do usuário
- **Rotas:** `app/(tabs)/map.tsx` virou `index.tsx`, e o antigo `index.tsx` (Home "perto de mim") virou `nearby.tsx`. O app abre no mapa pela própria rota `/`, sem redirect nem tela intermediária. O foco numa ocorrência é feito com `/?focus=<id>&focusKey=<nonce>`.
- **Navbar:** mantém a ordem e os ícones do Figma: a casa leva a "perto de você". Usa `backBehavior="history"`, e o botão ativo ganha um ponto verde, além da opacidade.
- **Alternativa descartada:** `initialRouteName` com `/map`. A URL `/` continuaria resolvendo para a lista, além de exigir redirect.
Origem: [[ocorrencias-criacao-e-mapa]].

## D-024 — Reputação provisória: 5 × positivas ÷ avaliações recebidas (calculada no backend)
**Data:** 2026-11-14 · **Status:** Vigente (provisória, para testes) · **Substitui** a parte de algoritmo da D-012
- **Por quê:** as avaliações **não têm nota** (`UTIL | PERSISTE | INCORRETA`), então a média de notas pedida não se aplica. A adaptação mantém a escala 0–5 do Figma ("4.8").
- **Regra:** `score = 5 × (UTIL + PERSISTE) ÷ total`, com uma casa decimal.
  - **Positivas:** UTIL (o relato ajudou) e PERSISTE (alguém confirmou o problema). **Negativa:** INCORRETA.
  - Só contam avaliações **recebidas** nas ocorrências do usuário e **sem o voto do próprio autor**. O unique `userId+occurrenceId` já impede duplicatas.
  - Sem avaliações recebidas → `null`, e o app mostra "Sem avaliações", nunca 0.
- **Onde fica:** num único lugar, `apps/api/src/modules/users/reputation.ts` (`computeReputation` + `getUserReputation`, com `groupBy` no banco). O app só exibe o valor.
- **O que não muda:** o campo `User.reputationScore` continua sem uso, porque guardar o valor exigiria recalcular a cada voto. Para mudar a regra, basta editar essa função (e o teste `profile.integration.test.ts`).
Origem: [[perfil-do-usuario]].

## D-025 — Perfil do próprio usuário: `/me/*`, foto em `users.avatarUrl`, CEP → bairro pelo backend
**Data:** 2026-11-14 · **Status:** Vigente
- **Endpoints**, todos autenticados e só com o id do token (não há rota com id de usuário, nem perfil público):
  - `GET /me/profile`: dados + indicadores + 10 últimas ocorrências, em uma chamada, com contagens no banco;
  - `GET /me/occurrences?skip&take` (`take` ≤ 50);
  - `PATCH /me` (`name`, `cep`; schema `strict`, então `id`, `email` ou `cpf` no corpo → 400);
  - `PUT /me/avatar` (multipart) e `DELETE /me/avatar`.
- **Indicadores:** "Avaliações" no perfil = avaliações **realizadas** pelo usuário, conforme o pedido. As recebidas aparecem em `evaluationsReceived` e servem de base para a reputação.
- **Foto:** reutiliza `storeOccurrenceImage` (mesma validação de tipo e tamanho, Cloudinary ou disco). Guarda a miniatura em `users.avatarUrl` e o id do arquivo em `avatarPublicId`, para apagar a foto anterior (best effort). Migration aditiva `20261115005535_user_avatar`.
- **Local onde mora:** muda só pelo CEP, com a mesma resolução do cadastro (ViaCEP → bairro → polígono; D-008). Não é o GPS, e o bairro/CEP só aparece para o próprio usuário.
- **Interface:** o Figma não tem tela de configurações. `app/settings.tsx` usa os componentes existentes, e a entrada é uma engrenagem no perfil. O "Sair" foi para lá.
Origem: [[perfil-do-usuario]].

## D-026 — Marcadores progressivos por zoom + agrupamento visual em espaço de tela (sem dependência)
**Data:** 2026-11-14 · **Status:** **Substituída por D-027** (2026-11-14): o agrupamento foi abandonado e os limites mudaram

**Níveis** (`apps/mobile/lib/map-markers.ts`, o único lugar dos valores):

| Nível | Zoom | Marcador | Tamanho (dp) |
|---|---|---|---|
| Regional | z < 13,5 | bolinha do status com contorno branco | 10–16 |
| Bairro | 13,5 ≤ z < 15 | selo redondo (contorno branco, anel do status, ilustração da categoria, sem cauda) | 24–32 |
| Rua | z ≥ 15 | pin completo | 44–52 |

- Histerese de 0,25 no zoom.
- O selecionado é sempre o pin de 58 dp.
- **Zoom:** vem da região, `log2(360·larguraDp / (256·longitudeDelta))`, o que funciona igual no Google e no Apple Maps. Referências reais do app: a abertura em Santos ≈ 13,5 e o foco de rua ≈ 15,8.
- **Tamanho:** acompanha o zoom (não é fixo na tela), em **faixas de bitmaps**. O P-013 impede escalar ou animar Views dentro do `Marker` no Android, então a transição é feita por degraus pequenos de tamanho, não por animação contínua de opacidade. O estado só muda quando a faixa muda; durante o gesto, no máximo 1 avaliação a cada 120 ms.
- **Agrupamento:** guloso, com grade, em pixels Web Mercator no zoom atual quantizado (0,25). O raio vem do tamanho do marcador, ou seja, depende da distância **na tela** e não de metros fixos.
  - O pan não recalcula nada.
  - O grupo é neutro (círculo escuro com contador), para que nenhuma categoria ou status esconda outra.
  - O selecionado nunca entra num grupo.
  - Toque no grupo: aproxima até separar (≤ z 19); se não separar, abre uma lista compacta (`ClusterListSheet`) que leva ao modal de detalhes.
  - É só visual: nada muda na API nem no banco.
- **Alternativas descartadas:**
  - `react-native-map-clustering` / supercluster: dependência nova, embrulha o MapView e o ganho é pequeno para o volume atual (1000 pontos levam <15 ms por zoom, medido no teste);
  - deslocar pins próximos: muda a posição real no mapa;
  - prioridade por gravidade: não existe no sistema.
- **Custo:** 384 PNGs (3,5 MB) gerados por `scripts/generate-pins.ps1`. O selecionado tem um só tamanho, o que economiza 1,6 MB.
- **iOS:** o `anchor` só vale no Google Maps. Agora os pins com cauda usam `centerOffset` no Apple Maps; antes ficavam centralizados na coordenada.

Origem: [[ocorrencias-criacao-e-mapa]].

## D-027 — Marcadores: ícone da categoria em quase todo zoom, bolinha só bem afastado, sem agrupamento
**Data:** 2026-11-14 · **Status:** Vigente · limites **a calibrar no aparelho** · substitui D-026 · **tamanhos, selecionado e sobreposição atualizados por D-031**

- **Motivo:** no D-026, o mapa abria em cima do limite bolinha/selo (z ≈ 13,3 a 13,5). As 2 ocorrências reais, a 7 m uma da outra, viravam um círculo preto de grupo. O usuário pediu para **abandonar o agrupamento** e manter os ícones visíveis por mais tempo.
- **Formatos** (`apps/mobile/lib/map-markers.ts`, o único lugar dos valores):

| Formato | Zoom | Marcador | Tamanho (dp) |
|---|---|---|---|
| Ícone | z ≥ 12 | pin com a ilustração da categoria e o anel do status | 28 → 52, em 7 degraus de z 12 a z 17 |
| Bolinha | z < 12 | contorno branco, cor do status | 10 → 14, de z 10 a z 12 |

  - z 12 ≈ 35 m por dp: Santos e São Vicente inteiros na tela.
  - Histerese de 0,3 entre os formatos e de até 0,24 entre os degraus.
  - O selecionado é sempre o pin de 58 dp.
  - O "selo" intermediário saiu. A cauda do pin é proporcional ao diâmetro: `pinHeight(d) = d + 3 + round(13d/44)` é a altura do bitmap e o `centerOffset` no iOS.
- **Cores:** a categoria não tem cor no projeto. A convenção existente é por **status**:
  - 7 status → 4 estados visuais do Figma (`theme.ts`);
  - o anel do pin e a bolinha usam a mesma cor;
  - nunca preto: um teste confere que o script usa as cores do tema.
- **Sem agrupamento:** um `Marker` por ocorrência, pelo id real.
  - Próximas se sobrepõem.
  - A ordem de desenho segue a data, com a mais recente por cima.
  - O selecionado é desenhado por último, com zIndex 40.
- **Tamanho:** muda em degraus de bitmap, porque animar o `Marker image` não é possível e Views cortam no Android (P-013). O estado só muda quando o degrau muda; durante o gesto, no máximo 1 avaliação a cada 120 ms.
- **Custo:** 344 PNGs (3,9 MB), de `scripts/generate-pins.ps1`.

Origem: [[ocorrencias-criacao-e-mapa]].

## D-028 — Hospedagem inicial: Railway (API em Docker) + Neon (Postgres/PostGIS) + Cloudinary, mesma região (US East)
**Data:** 2026-11-15 · **Status:** Vigente (código pronto; contas a configurar)
- **Por quê:** custo de ~US$ 5/mês, sem servidor para administrar, HTTPS automático e deploy pelo GitHub. Neon e Cloudinary no plano gratuito. **PostGIS confirmado** na documentação do Neon.
- **Descartados:**
  - Bem-vindo.net: hospedagem de sites, sem Node/PostGIS;
  - Render free: dorme e o Postgres expira em 30 dias;
  - Supabase free: pausa em 7 dias;
  - VPS: administração;
  - AWS: custo fixo e complexidade.
- **Mesma região:** o Railway não tem região no Brasil, então o Neon fica em `aws-us-east-1` junto com a API (Railway US East). Banco no Brasil + API nos EUA multiplicaria a latência por consulta.
- **Portabilidade:**
  - build num **Dockerfile** (`apps/api/Dockerfile`), não em config proprietária. O `railway.json` foi descontinuado para serviços novos e para de funcionar em 2026-12-01;
  - configuração só por variáveis;
  - Postgres padrão;
  - domínio próprio recomendado para a URL da API.
- **Regras de produção no código:**
  - `PORT` tem prioridade sobre `API_PORT`;
  - sem Cloudinary a API não sobe (salvo `UPLOADS_LOCAL_IN_PRODUCTION=true`);
  - o seed exige senhas fortes;
  - o health check do deploy é `/health/ready` (banco);
  - migrations só pelo pre-deploy (`prisma migrate deploy`).
- **Conexão Neon:** a direta (sem pooler), porque a API é um processo único; evita `directUrl` no schema.
- **CI/backup:** GitHub Actions (`ci.yml` com PostGIS de serviço; `backup-db.yml` com dump criptografado).
Origem: [[hospedagem-e-deploy]].

## D-029 — Todo prompt de tarefa é melhorado antes de ser executado (skill `melhorar-prompt`)
**Data:** 2026-11-17 · **Status:** Vigente
- **Por quê:** pedido do usuário. Mensagens curtas e informais deixavam dúvidas e restrições implícitas. O prompt estruturado (ex.: [[exemplo-hospedagem]]) garante auditoria antes de agir, modo explícito (planejar × implementar), entregável e relatório.
- **Regra** (`AGENTS.md`, "Formato dos prompts"):
  - **vale para tarefas**: código, plano, pesquisa, documentação, configuração, deploy, decisão;
  - **não vale para conversa**: pergunta rápida, confirmação, "e agora?", escolha entre opções dadas.
- **Fluxo:**
  1. reescrever no modelo (`docs/PROMPT_TEMPLATE.md`), sem perder nenhuma dúvida e sem acrescentar escopo;
  2. salvar o prompt completo no plano do tema ("Pedido (prompt estruturado)");
  3. mostrar no chat só um resumo de 4 a 8 linhas;
  4. executar no mesmo turno;
  5. perguntar só se a dúvida mudar o resultado.
- **Onde fica:**
  - skill versionada em `.claude/skills/melhorar-prompt/`;
  - ponteiro no cofre em `cidade+/.claude/skills/` (onde as sessões do Claude Code abrem);
  - o Cursor segue a mesma regra pelo `AGENTS.md`.
- **Alternativa descartada:** mostrar o prompt completo no chat a cada pedido. Polui a conversa; o plano já guarda a íntegra.
Origem: [[segundo-cerebro-obsidian]].

## D-030 — Mapa na 1ª aba (casa), busca de endereço pelo geocodificador nativo e sem direção do usuário
**Data:** 2026-11-17 · **Status:** Vigente (falta validar no aparelho)
- **Abas:**
  - ordem `index` (Mapa, ícone **casa**, 1º) → `nearby` (Perto de você, ícone novo `nav-nearby.svg`, um pin com arco de raio) → criar → notificações → conta;
  - antes, a casa ficava na lista "perto de você" e o mapa era o 2º botão: o app já abria no mapa (D-023), mas parecia que não;
  - o ícone `nav-nearby` não existe no Figma; foi desenhado no mesmo traço (pendência de design);
  - `nav-map.svg` deixou de ser usado.
- **Busca de endereço:** `expo-location` `geocodeAsync` + `reverseGeocodeAsync`. É o geocodificador **nativo** do Android/iOS: **sem dependência nova, sem chave e sem custo**.
  - Busca só ao confirmar no teclado, nunca a cada letra.
  - Consulta sem cidade ganha ", Santos - SP, Brasil"; cidade da Baixada/SP, UF em maiúsculas ou CEP são respeitados (`lib/address-search.ts`).
  - No Android o geocodificador **exige a permissão de localização** e devolve **1 resultado** (código do `expo-location` 19.0.8). Sem permissão, pede uma vez e tenta de novo.
  - **Na web não existe**: mostra aviso.
  - O resultado é um `Marker` nativo (sem View filha, P-013) com o endereço; o mapa anima até o zoom de rua e para de seguir o usuário.
  - **Alternativas descartadas:**
    - Google Geocoding/Places API: chave e cobrança;
    - Nominatim/OSM: política de uso proíbe autocompletar e exige identificação;
    - autocompletar a cada letra: custo e limites.
- **Direção do usuário removida:** sem bússola (`watchHeadingAsync`), sem o `course` como direção e sem o cone.
  - **Motivo:** o app não é de navegação; economiza bateria e sensor.
  - O indicador é o ponto azul + o círculo de precisão; seguir e recentralizar continuam.
  - `hooks/use-device-heading.ts` foi apagado.
Origem: [[ocorrencias-criacao-e-mapa]].

## D-031 — Marcadores: degraus de 3 dp até z 18, ordem de desenho estável, leque visual para sobrepostos e selecionado que segue o zoom
**Data:** 2026-11-17 · **Status:** Vigente (falta validar no aparelho) · atualiza D-027 (continua **sem agrupamento**)
- **Tamanho:**
  - pin de **24 a 54 dp em 11 degraus de 3 dp**, distribuídos entre z 12 e z 18 (o máximo chega perto de z 17,5). Antes: 28 a 52 dp em 7 degraus de 4 dp até z 17;
  - histerese e limite ícone/bolinha (z 12) iguais; bolinha de 10 a 14;
  - **custo:** 504 PNGs (5,6 MB, antes 3,9 MB).
- **Ordem estável:**
  - `zIndex` único por ordem de criação (a mais recente por cima); selecionado > busca > usuário acima de todas;
  - **motivo:** com `zIndex` empatado (10), o Google Maps não garante a ordem, e ela mudava a cada troca de imagem ("disputando espaço").
- **Leque visual** (`spreadOffsets` em `lib/map-markers.ts`): no nível pin, ícones cujos centros ficam a menos de 0,8 × o tamanho **na tela** (zoom quantizado em 0,25) formam um grupo por encadeamento.
  - Grupo de 2 ou 3: em linha. Grupo de 4 ou mais: em círculo.
  - Espaçamento de 0,95 × o tamanho, a partir do centroide.
  - O deslocamento vai na âncora (`anchor` no Android, `centerOffset` no iOS); uma `Polyline` fina liga a ponta à coordenada real.
  - **Não é agrupamento:** nenhum marcador é escondido nem juntado, os dados não mudam e cada um abre a sua ocorrência. Ao aproximar até não se sobreporem, voltam ao lugar exato.
  - Sem leque no nível bolinha.
  - **Alternativa descartada:** clustering (rejeitado pelo usuário em D-027).
- **Bug "nem todas viram bolinha":**
  - **causa:** o selecionado era sempre o pin grande, em qualquer zoom, e `selectedId` ficava preso depois de fechar o modal;
  - **correção:**
    - o selecionado segue o nível (bolinha maior no nível bolinha, pin de 60 no nível pin);
    - fechar os detalhes limpa a seleção;
    - a `key` do `Marker` inclui o formato (remonta na troca pin ↔ bolinha, imagem e âncora juntas no Android).
- **Desempenho:** o pan não recalcula; o leque é recalculado só na troca de degrau ou de zoom quantizado; marcadores memoizados com comparação por valor; 1000 pontos em menos de 80 ms no teste.
Origem: [[ocorrencias-criacao-e-mapa]].

## D-032 — O autor edita e remove a própria ocorrência só enquanto ela está "em análise"; remoção suave
**Data:** 2026-11-17 · **Status:** Vigente (API testada; app sem teste no aparelho)
- **Regra:** só o **autor**, e só nos 3 status que o app mostra como "em análise" (`REPORTADA`, `RECEBIDA`, `EM_ANALISE`; constante `AUTHOR_EDITABLE_STATUSES` em `occurrence.service.ts`).
  - Depois que o gestor move para `EM_ATENDIMENTO`, `RESOLVIDA`, `ARQUIVADA` ou `INVALIDA`, não dá mais.
  - Respostas: outra pessoa → 403; fora de análise → 409; removida → 404.
  - O update é condicional (`updateMany` com autor, status e `deletedAt: null`), contra a corrida com o gestor.
  - **Hoje nada tira uma ocorrência de "em análise"** além de `PATCH /admin/occurrences/:id/status` (não há painel e os votos não mudam o status).
- **Edição** (`PATCH /occurrences/:id`, parcial):
  - campos: título, descrição, categoria + subcategoria (mesmas validações da criação, D-022), local em par e foto (`media`, 1 item);
  - trocar a foto apaga a anterior (linha e arquivo, best effort).
- **Remoção suave** (`DELETE /occurrences/:id`):
  - grava `occurrences.deletedAt` (migration aditiva `20261118020421_occurrence_soft_delete`);
  - avaliações e histórico de status **ficam no banco**;
  - as **fotos são apagadas** na hora (linhas e arquivos), porque quem remove espera que a foto suma.
  - Removidas saem de lista, detalhe, voto, mudança de status do gestor e perfil (contagem e listas). O `GET /admin/occurrences/:id` ainda mostra, com `deletedAt`.
- **Reputação:** os votos recebidos em ocorrências removidas **continuam contando**. Remover não limpa avaliações negativas (brecha apontada em [[gamificacao-e-validacao-comunitaria]]).
- **Quem é o autor, sem expor o autor:** `GET /occurrences/:id` aceita login opcional e devolve `viewer: { isAuthor, canEdit }` (`optionalAuthUserId`; token inválido é ignorado). O DTO público continua sem dados do autor (D-006).
- **App:**
  - o formulário da criação virou `components/OccurrenceForm`, usado por `(tabs)/create.tsx` e pela nova rota `occurrence/edit/[id]`;
  - "Editar" e "Remover" (com confirmação) aparecem nos detalhes só para o autor;
  - fora de análise, aparece um aviso no lugar;
  - o cache do detalhe tem o id do usuário na chave.
- **Alternativas descartadas:**
  - exclusão real (a cascata apagaria os votos de outras pessoas e o histórico);
  - remoção livre em qualquer status (apagaria o registro de um atendimento em curso);
  - expor `authorId` no DTO público.
Origem: [[ocorrencias-edicao-e-remocao]].

