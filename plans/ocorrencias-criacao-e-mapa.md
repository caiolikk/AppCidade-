---
status: implementado
tema: ocorrências / geolocalização / mapa
atualizado: 2026-11-14
---

# Criação de ocorrências, localização e exibição no mapa

## Objetivo

Garantir o fluxo de ponta a ponta (formulário → localização → API → banco → mapa), permitir criar ocorrências **em qualquer local** (desativação temporária da regra de bairro) e remover as ocorrências fictícias do seed, deixando só as criadas por usuários.

## Contexto e problema

- O usuário não consegue criar ocorrências porque a criação só é aceita dentro do polígono do bairro residencial.
- O mapa mostra 6 pins fictícios.
- Pedido: desativar a regra **temporariamente**, sem remover a estrutura de bairros. Ver [[DECISIONS]] D-008.

## Auditoria (2026-11-14, código + banco de dev)

### App (`apps/mobile`)
| Item | Situação |
|---|---|
| Tela | `app/(tabs)/create.tsx`: já existe e está completa |
| Campos | foto (câmera/galeria), título, descrição (≤500, contador), categoria (chips de `GET /categories`) |
| Localização | **Só GPS** (`expo-location`, `Balanced`, 6 casas). **Não há escolha manual no mapa** |
| Trava por bairro (app) | `locate()` chama `POST /occurrences/geofence-check` e mostra "Ponto dentro do seu bairro" ou o erro; subtítulo "só no seu polígono". O botão **não** bloqueia por isso: quem barra é o backend |
| Envio | `apiUploadImage` → `POST /uploads/image` → `POST /occurrences` com `{title, description, latitude, longitude, categoryId, media:[…]}`: os campos batem com o schema |
| Loading/erro | `PrimaryButton loading`, mensagem do `ApiError`. Duplo envio: depende de o `PrimaryButton` desabilitar durante o `loading` (verificar) |
| Pós-sucesso | `invalidateQueries(["occurrences"])` + `router.replace("/")` (feed) |
| Mapa | `(tabs)/map.tsx` + `components/MapCanvas.tsx`: `initialRegion` **fixa em Santos**; marcadores com `key=id` e coordenadas do DTO; filtro só por categoria (no cliente); **sem filtro por bairro**. Selecionar um card **não move o mapa** |
| Cache | React Query, `staleTime 30s`, chave `["occurrences"]` usada no feed e no mapa |

### API (`apps/api`)
| Item | Situação |
|---|---|
| Endpoint | `POST /occurrences` (`authenticate`) → `createOccurrenceBodySchema` (Zod) → `occurrence.service.createOccurrence` |
| Regras | `media.min(1)`, título 3–200, descrição 3–500, categoria existente |
| **Trava por bairro (API)** | `createOccurrence` chama `assertPointInUserNeighborhood` (`modules/geo/geofencing.ts`, `ST_Contains`) → 403 fora, 422 sem polígono |
| Coordenadas | Schema aceita qualquer `z.number()`. **A checagem de faixa (lat ±90, lng ±180) só existe dentro do geofence**: removê-lo sem cuidado tiraria a validação |
| Persistência | Transação: `occurrence` + `media` + `statusHistory (REPORTADA)`. Retorna `toAdminOccurrence` (inclui `author` com o CPF/e-mail do **próprio criador**; anotado como pendência de minimização) |
| Leitura | `GET /occurrences` (todas, `createdAt desc`, sem paginação) e `GET /occurrences/:id`; DTO público com `latitude/longitude` como `Number` |
| Banco | `occurrences.latitude/longitude Decimal(9,6)`; **não há relação ocorrência→bairro** (o bairro só existe no usuário); sem trigger/função SQL de bloqueio |

### Banco de dev (consulta direta)
- 6 ocorrências, **todas fictícias**: autor `admin@cidade.plus`, mídia `publicId = seed-<id>` com foto do picsum, criadas por `prisma/seed.ts → seedDemoOccurrences()` quando a tabela está vazia.
- Usuários: só admin e gestor (polígono Gonzaga). Polígonos: Gonzaga e Ponta da Praia (bboxes aproximados).
- Os testes de integração limpam o que criam (`afterAll` por `userId`).

## Decisões

- **D-018 (temporária):** a regra de bairro passa a ser controlada por `OCCURRENCE_GEOFENCE_ENABLED` (padrão `false`). O código do geofence, o endpoint `geofence-check` e a estrutura de bairros ficam intactos; para reativar, basta `true` no `.env`. O app deixa de chamar o `geofence-check`, então a regra não fica ativa só de um lado.
- Validação de coordenadas vai para o **schema** (vale sempre, com ou sem geofence).
- Não criar relação ocorrência→bairro agora (exigiria migration; fora do escopo; não inventar associação).
- **Escolha manual do ponto:** um mapa pequeno na tela de criação (tocar ou arrastar o pin), reutilizando `react-native-maps`; o GPS continua como ponto inicial. Haverá uma versão `.web` sem mapa, no mesmo padrão do `MapCanvas`.
- **Pós-criação:** abrir o mapa focado na ocorrência criada (`/map?focus=<id>`); o mapa passa a animar até o marcador selecionado. Sem isso, uma ocorrência fora de Santos fica fora da tela.
- **Remoção das fictícias:** o seed deixa de criar demos e passa a **remover** as ocorrências com mídia `publicId LIKE 'seed-%'` (marca exclusiva do seed). Isso vale para qualquer máquina do time com `npm run db:seed`. Usuários reais nunca têm `publicId seed-*` (o upload gera `local-<uuid>` ou o id do Cloudinary).

## Etapas

- [x] API: flag `OCCURRENCE_GEOFENCE_ENABLED` em `config/env.ts` + `.env.example`; `createOccurrence` só aplica o geofence se a flag estiver ligada
- [x] API: faixa de lat/lng + finitude no `occurrence.schemas.ts` (create e geofence-check)
- [x] Testes de integração: criar fora do bairro, fora de qualquer bairro, coordenadas inválidas, campo faltando, sem token, leitura com as mesmas coordenadas e sem duplicata
- [x] App: remover a chamada ao `geofence-check` e os textos de bairro em `create.tsx`
- [x] App: `LocationPicker` (+ `.web`) para ver e ajustar o ponto
- [x] App: pós-sucesso → `/map?focus=<id>`; `MapCanvas` anima até o selecionado
- [x] Conferir o `PrimaryButton` contra duplo envio
- [x] **(achado no E2E)** O error handler global (`app.ts`) transforma erros 4xx do próprio Fastify (JSON malformado, `Content-Length` inválido, etc.) em **500 "Erro interno."**. Repassar o `statusCode` < 500 com a mensagem.
- [x] Seed: trocar `seedDemoOccurrences` por `removeDemoOccurrences`; rodar no banco de dev
- [x] Validar: typecheck, `npm test`, criação real via API + consulta no banco, bundle Android
- [x] Docs: PROJECT_CONTEXT, DECISIONS (D-018), este plano

## Critérios de aceitação

- Criar dentro do bairro, em outro bairro e fora de Santos → 200 e linha no banco com as coordenadas enviadas.
- Coordenadas inválidas → 400 com mensagem clara; sem token → 401; sem foto/título/categoria → 400.
- A ocorrência aparece em `GET /occurrences` (portanto no mapa e no feed) e continua lá depois de reiniciar o app.
- Depois de criar, o mapa abre centralizado nela, sem marcadores duplicados.
- O banco de dev fica sem as 6 fictícias.

## Testes (2026-11-14, executados de fato)

### Automatizados: `npm test` → **7/7** (novo teste "cria ocorrência em qualquer local…")
| Cenário | Esperado | Resultado |
|---|---|---|
| Criar no próprio bairro (Ponta da Praia) | 200 | OK |
| Criar em outro bairro (Gonzaga) | 200 | OK |
| Criar fora de Santos (São Paulo) | 200 | OK |
| Persistência | linha no banco, `userId` certo, lat/lng iguais às enviadas | OK (consulta via Prisma) |
| Latitude 95 / longitude -200 | 400 + mensagem "Latitude/Longitude deve estar entre…" | OK |
| Coordenadas como texto | 400 | OK |
| Sem título / sem categoria | 400 | OK |
| Sem token | 401 | OK |
| `GET /occurrences` (endpoint do mapa) | cada id **uma vez**, mesmas coordenadas | OK |
| `GET /occurrences/:id` | coordenadas certas, sem `author` | OK |
| Total persistido | só as 3 válidas | OK |
| Geofence-check (endpoint mantido) | 200 dentro / 403 fora | OK (teste antigo segue passando) |

### Manuais (API real na LAN + Postgres de dev)
| Cenário | Resultado |
|---|---|
| login admin → upload → criar em São Paulo | criada; no banco com `-23.561414, -46.655881`, mídia `local-*`, histórico `REPORTADA`; 1× em `GET /occurrences` |
| Latitude 95 | "Dados inválidos. Latitude deve estar entre -90 e 90." |
| JSON malformado | **antes 500** → agora 400 "Requisição inválida." (P-009) |
| API do usuário (3333, `tsx watch`) | já rodando o código novo (mensagens PT, 400) |
| Bundle JS Android pelo Metro | HTTP 200, compila com `LocationPicker` |
| `npm run typecheck` (api + mobile) | OK |
| `npm run db:seed` | "6 ocorrência(s) fictícia(s) removida(s)"; 2ª execução não muda nada |
| Banco final | **0 ocorrências**; 7 categorias e 2 bairros intactos. A ocorrência E2E e os arquivos de teste foram apagados |

### Não validado aqui (precisa do celular)
- Fluxo visual no app: seletor no mapa, envio, abertura do mapa focado, persistência depois de fechar e reabrir o app. Não exige novo build: só JS (o `react-native-maps` já está no dev build).

## Resultado da implementação

| Arquivo | Alteração |
|---|---|
| `apps/api/src/config/env.ts` | Flag `OCCURRENCE_GEOFENCE_ENABLED` (padrão `false`) |
| `apps/api/src/modules/occurrences/occurrence.service.ts` | Geofence só com a flag |
| `apps/api/src/modules/occurrences/occurrence.schemas.ts` | Faixa e finitude de lat/lng; mensagens em português |
| `apps/api/src/app.ts` | Erros 4xx do Fastify → 4xx (P-009) |
| `apps/api/test/foundation.integration.test.ts` | Novo teste de ponta a ponta de localização livre |
| `apps/mobile/app/(tabs)/create.tsx` | Sem `geofence-check`; `LocationPicker`; GPS com fallback; validação PT; trava de duplo envio; reset; vai para `/map?focus=id` |
| `apps/mobile/components/LocationPicker(.web).tsx` | Novo: tocar ou arrastar o pin (6 casas) |
| `apps/mobile/components/MapCanvas(.web).tsx` | `focusId` anima até a ocorrência |
| `apps/mobile/app/(tabs)/map.tsx` | Lê `focus`, limpa o filtro e põe o card em foco primeiro |
| `apps/mobile/lib/api.ts` | Mostra a 1ª mensagem de `issues` do Zod |
| `prisma/seed.ts` | `seedDemoOccurrences` → `removeDemoOccurrences` (`publicId seed-*`) |
| `.env.example` | Documenta a flag |

## Pendências e limitações

- **Validar no celular** (seção acima) e então mudar este plano para `validado`.
- **Outras máquinas do time** ainda têm as fictícias até rodarem `npm run db:seed`.
- `POST /occurrences` devolve `author` com o CPF/e-mail do **próprio criador** (`toAdminOccurrence`). Não vaza para terceiros, mas fere a minimização (LGPD); trocar pelo DTO público numa próxima tarefa.
- Não há relação ocorrência→bairro (só usuário→bairro). Associar o bairro pelas coordenadas exigiria migration e polígonos oficiais.
- `GET /occurrences` sem paginação nem filtro por região: ok para o MVP, revisar com volume.
- O mapa abre sempre em Santos; ocorrências em outras cidades só aparecem com `focus` ou movendo o mapa.
- O cadastro continua exigindo CEP de Santos (regra separada, não alterada).
- A regra de bairro é **temporária**: reativar com `OCCURRENCE_GEOFENCE_ENABLED=true` quando houver polígonos oficiais.

---

## 2026-11-14 — Pins estilo Waze, localização com direção, "perto de mim" e modal de detalhes

### Pedido
Pins circulares com o ícone da categoria (referência: print do Waze enviado pelo usuário); posição do usuário com precisão e **direção (heading da bússola)**; botão de recentralizar; Home só com ocorrências **próximas**, com ícones em vez de fotos; **um único** modal de detalhes, aberto pela Home e pelo mapa.

### Auditoria (código atual)
| Item | Situação |
|---|---|
| Mapa | `react-native-maps` 1.20.1 (Google no Android, Apple Maps no iOS). `MapCanvas.tsx`: `<Marker pinColor={statusColors}>` padrão; toque só seleciona; `focusId` anima até a ocorrência |
| Localização do usuário no mapa | **Não existe** (sem `showsUserLocation`, sem marcador próprio) |
| Geolocalização | `expo-location` 19.0.8; só `getCurrentPositionAsync` pontual na criação. Permissão foreground (`locationWhenInUsePermission` no `app.json`). Sem watch nem heading |
| Heading | `watchHeadingAsync` disponível (`trueHeading`/`magHeading`; `accuracy` 0–3 no Android, graus no iOS); **não precisa de build novo** |
| Ícones de categoria | Ilustrações do Figma (`assets/figma/category-*.png`, ~600 KB cada) + `CategoryIcon` (só o formulário). Pesadas demais para dezenas de marcadores |
| Home | Grade de fotos (`thumbnailUrl`) de **todas** as ocorrências (`GET /occurrences`, sem filtro geográfico); toque abre a rota `/occurrence/[id]` |
| Dados da API (DTO público) | `id, title, description, status, category{id,name}, latitude, longitude, thumbnailUrl (só a 1ª foto), votes, createdAt`. **Não há** bairro da ocorrência nem lista de fotos públicas (original protegida, D-006/D-011) |
| Detalhe | Rota `occurrence/[id].tsx` (foto, título, status, descrição, votos) |

### Decisões de UX/técnicas
- **Pin:** círculo de 44px, fundo branco, **anel na cor do status** (mesma linguagem das bolinhas do Figma), ilustração da categoria recortada no centro e "cauda" apontando para o ponto (estilo Waze). Usa **versões reduzidas (128px)** das ilustrações. `tracksViewChanges` só até a imagem carregar (desempenho no Android). Categoria sem ilustração → círculo com a inicial (nenhuma fica sem marcador).
- **Usuário:** ponto azul (`#0D3A9F`) com borda branca + círculo de precisão (`Circle`, raio = `accuracy`) + **cone de direção**. Estilo diferente dos pins. Marcador `flat` com `rotation` = heading (geográfico, acompanha a rotação do mapa).
- **Direção:** prioriza o **heading da bússola** (`trueHeading`, ou `magHeading` se o true não existir). No Android, `accuracy 0` = não confiável. Sem heading confiável, usa o **course do GPS** só se a velocidade for > 1 m/s. Caso contrário, **não mostra direção** (só o ponto). Suavização exponencial (vetor seno/cosseno) e atualização só com variação ≥ 3°.
- **Atualização:** `watchPositionAsync` (High, 3 s / 5 m) **somente com a aba Mapa em foco**; a Home usa Balanced, 50 m. Nada em segundo plano; nenhuma permissão nova (só foreground).
- **Seguir/recentralizar:** o mapa começa seguindo o usuário (exceto ao abrir com `focus` de uma ocorrência criada). Ao arrastar o mapa (`onPanDrag`), para de seguir. O botão flutuante anima até o usuário e volta a seguir. Sem localização: o botão explica o motivo (permissão negada → pedir de novo / abrir ajustes; GPS desligado → aviso). Nunca simula posição.
- **Home "perto de mim":** raio de **5 km** (`NEARBY_RADIUS_KM`, em `lib/geo.ts`), distância haversine **no app** a partir do mesmo `GET /occurrences`, ordenada por distância e com a distância mostrada. O mapa continua mostrando **todas**. **Sem mudar a API.** Sem localização: mostra todas, por data, com aviso e botão para permitir.
- **Card da Home:** linha do Figma (Notificações/Minha Conta): ícone da categoria em fundo arredondado, título, "Categoria • há X • 1,2 km", bolinha de status. Sem foto.
- **Modal único** (`OccurrenceDetailsModal` + `OccurrenceDetails`): ícone e categoria, título, status, foto (a única pública: `thumbnailUrl`), descrição, data, distância/coordenadas, avaliação comunitária e "Ver no mapa". Usa os dados que já estão na lista (sem requisição extra). A rota `/occurrence/[id]` passa a reutilizar o mesmo `OccurrenceDetails`.

### Etapas
- [x] Ilustrações reduzidas (128px) para pins e lista
- [x] `lib/geo.ts` (haversine, raio, formatação de distância) + hooks `useUserLocation` e `useDeviceHeading`
- [x] `CategoryBadge` (ícone pequeno reutilizável) e `OccurrencePin`
- [x] `UserLocationMarker` + botão de recentralizar + seguir/parar de seguir no `MapCanvas`/`map.tsx`
- [x] `OccurrenceDetails` + `OccurrenceDetailsModal`; rota de detalhe reutilizando
- [x] Home: lista "perto de mim" com ícones, fallback sem localização
- [x] Validação: typecheck, bundle, comparação visual web, testes da API

### Restrições
Sem mudança de API/contrato; sem permissão de segundo plano; sem dados simulados de GPS/heading; sem build nativo novo.

### Resultado (2026-11-14)

| Arquivo | Alteração |
|---|---|
| `lib/category-art.ts` (novo) | Ilustrações + recorte do Figma num só lugar (original e versão 256px) |
| `assets/figma/category-*-sm.png` (novos) | Versões 256px (13–29 KB; originais ~600 KB) para pins e lista |
| `lib/geo.ts` (novo) | `NEARBY_RADIUS_KM = 5`, haversine, validação de coordenada, `formatDistance`, `angleDelta` |
| `hooks/use-user-location.ts` (novo) | Permissão foreground, estados (`ready/denied/blocked/services-off/unavailable`), watch só em foco, `retry` (pede de novo ou abre os ajustes) |
| `hooks/use-device-heading.ts` (novo) | Bússola com suavização e limiar de 3°; `null` quando não confiável |
| `hooks/use-screen-focused.ts` (novo) | Liga/desliga o GPS conforme a aba |
| `components/CategoryBadge.tsx` (novo) | Ícone pequeno de categoria (fallback: inicial) |
| `components/MapCanvas.tsx` | Pin estilo Waze, indicador do usuário (ponto + precisão + cone), seguir/recentralizar, `onPanDrag` |
| `components/MapCanvas.web.tsx` | Marcadores clicáveis ligados às ocorrências reais (web) |
| `components/OccurrenceDetails.tsx` / `OccurrenceDetailsModal.tsx` (novos) | Detalhes únicos (Home, mapa e rota) + modal que lê o cache da lista |
| `app/(tabs)/map.tsx` | Pins → modal; botão de localização; aviso quando não há posição; **sem** a faixa de cards |
| `app/(tabs)/index.tsx` | Lista "perto de mim" (5 km, por distância, sem foto) + fallback sem localização |
| `app/occurrence/[id].tsx` | Reutiliza `OccurrenceDetails` |
| `components/CategoryIcon.tsx` | Usa `lib/category-art.ts` |

### Testes
| Cenário | Resultado |
|---|---|
| `tsc` (mobile), `expo-doctor` | OK, 18/18 |
| `npm test` (API) | 7/7 (API não mudou) |
| Lógica geográfica (script com coordenadas reais) | 11/12 OK; a "falha" era a expectativa do teste (55,7 km → "56 km" está correto) |
| Home com localização (navegador headless em Gonzaga) | Lista só ≤ 5 km, ordenada: 80 m → 3,7 km → 4,1 km; **São Paulo (56 km) excluída** |
| Home sem localização | Todas as ocorrências, por data, com aviso e "Usar minha localização" |
| Modal pela Home | Dados certos, foto, distância (80 m), "Ver no mapa", avaliação |
| Modal pelo mapa (web) | Mesmo componente, ocorrência de SP (56 km), sem "Ver no mapa" |
| Dados temporários | 3 ocorrências de teste criadas e **removidas**; a ocorrência real do usuário ("estranho na esquina") preservada |
| **No aparelho** (pins nativos, GPS real, bússola, seguir/recentralizar, permissão negada, GPS desligado) | **Pendente**: precisa do celular. **Não precisa de build novo** além do D-020 (tudo usa `expo-location`/`react-native-maps` já instalados) |

### Pendências e limitações
- A API pública expõe **uma** foto (`thumbnailUrl`); carrossel de várias fotos exigiria mudar o DTO (decisão de privacidade, D-006/D-011).
- Bairro da ocorrência: não existe no banco (só coordenadas e distância).
- O filtro "perto de mim" é no app sobre `GET /occurrences` (tudo). Com volume maior: endpoint `?near=lat,lng&radius=` com PostGIS (`ST_DWithin`) e paginação, sem afetar o mapa.
- iOS: a bússola pode pedir calibração (precisão ruim → cone some, de propósito). Android: aparelhos sem magnetômetro → sem cone parado; em movimento usa o course do GPS.
- Busca de endereço do mapa continua sem função (já era assim).

---

## 2026-11-14 — Correções: grade da Home, pins cortados e "Ver no mapa"

### Problemas relatados (com prints)
1. A Home virou lista (estilo Notificações); o usuário quer de volta a **grade de quadrados do Figma** (`Frame - Home`), com o **ícone da categoria** no lugar da foto.
2. Pins do mapa **cortados** no Android (só o quadrante superior esquerdo do círculo aparece).
3. **"Ver no mapa"** (modal da Home) não leva até a ocorrência.

### Causas (auditoria do código)
1. Não era bug: a etapa anterior trocou a grade (`OccurrenceTile`) pela lista (`OccurrenceRow`) em `app/(tabs)/index.tsx`. O filtro de proximidade (`rows`) não depende da apresentação.
2. `react-native-maps` no Android desenha marcadores customizados como **snapshot (bitmap)** da View. O pin tinha: imagem absoluta **maior que o container** (recorte de 151% da ilustração), `overflow: hidden` aninhado, `elevation`, tamanho dinâmico e `tracksViewChanges` desligado por timer (não por layout pronto). O bitmap saiu do tamanho errado (~1/densidade), e o resto foi cortado. O marcador do usuário (tamanho fixo, sem imagem) não sofre do problema.
3. Três falhas somadas:
   - `MapCanvas` chama `animateToRegion` no primeiro render, **antes do `onMapReady`**: no primeiro acesso ao mapa a animação é descartada e o id fica marcado como "já focado";
   - repetir "Ver no mapa" na mesma ocorrência não muda o parâmetro → nada acontece;
   - o "seguir usuário" só é desligado num `useEffect` do pai, que roda **depois** dos efeitos do `MapCanvas`: um fix de GPS nessa janela puxa a câmera de volta para o usuário.

### Estratégia
1. Restaurar a grade 3×N do Figma (margem 26, espaço 10, cantos 5/5/25/5, borda e sombra, bolinha de status no canto) com **ilustração da categoria + título + distância** no lugar da foto. Mesmo filtro e ordenação; o toque abre o modal.
2. Trocar a View do pin por **bitmap pré-renderizado** (`Marker image`): 5 categorias × 4 estados de status × normal/selecionado, em @2x e @3x, gerados das ilustrações do Figma com o mesmo recorte. Sem snapshot de View → sem corte, mais leve com muitos pins, densidade correta. Categoria sem ilustração → pin nativo na cor do status. O marcador do usuário continua como está.
3. Navegação com `focus` + `focusKey` (nonce, refaz o foco mesmo para a mesma ocorrência); "seguir" desligado **no próprio render** quando chega um pedido novo; animações só depois do `onMapReady`; pin em foco destacado (versão selecionada). "Minha localização" continua sendo o botão: só ele volta a seguir.

### Etapas
- [x] Gerar os bitmaps dos pins (script PowerShell/System.Drawing, reprodutível)
- [x] `MapCanvas`: `Marker image`, `onMapReady`, `focusKey`
- [x] `map.tsx`: pedido de foco com prioridade sobre o "seguir"
- [x] Home e criação: enviar `focusKey`
- [x] Home: grade de quadrados com ícone
- [x] Validação (typecheck, bundle, web) e docs

### Resultado das correções (2026-11-14)

| Arquivo | Alteração |
|---|---|
| `app/(tabs)/index.tsx` | Volta da grade 3×N do Figma (`OccurrenceTile`): quadrado com cantos 5/5/25/5, borda, sombra e bolinha de status; **ilustração da categoria + título + distância** (sem foto); fundo pastel do status. Filtro de 5 km e ordenação **inalterados**. "Ver no mapa" envia `focus` + `focusKey` |
| `scripts/generate-pins.ps1` (novo) | Gera os 80 bitmaps dos pins (5 categorias × 4 estados × normal/selecionado × @2x/@3x) e `lib/pin-images.ts` |
| `assets/pins/*` (novos), `lib/pin-images.ts` (gerado) | Pins pré-renderizados (~15 KB cada; 1,2 MB no total) |
| `components/MapCanvas.tsx` | `Marker image` (bitmap) em vez de View filha; fallback de pin nativo; `onMapReady` antes de qualquer animação; foco por pedido (`focusId` + `focusKey`) |
| `app/(tabs)/map.tsx` | Pedido de foco tratado **no render**: desliga "seguir", limpa o filtro e destaca o pin antes de os efeitos rodarem; só o botão de localização volta a seguir |
| `app/(tabs)/create.tsx` | Também envia `focusKey` |
| `hooks/use-user-location.ts`, `use-device-heading.ts` | `safeRemove` (P-012) |

**Para mudar o visual dos pins:** edite `scripts/generate-pins.ps1` e rode `powershell -ExecutionPolicy Bypass -File scripts/generate-pins.ps1` em `apps/mobile` (é JS + assets: não precisa de build nativo).

### Testes
| Cenário | Resultado |
|---|---|
| Bitmaps dos pins (prancha 3x) | Círculo completo, ilustração centralizada, cauda com a ponta na base, nas 4 cores de status; o selecionado é maior |
| Home (web, localização em Gonzaga) | Grade 3×N do Figma; 80 m / 3,7 km / 4,1 km em ordem; sem fotos |
| Home → quadrado → modal → "Ver no mapa" | Modal fecha; abre `/map?focus=<id>&focusKey=<nonce>`; filtro "Todos"; botão de localização em "não seguindo" (foco com prioridade) |
| Erro encontrado no teste | Ao sair da Home na web: `removeSubscription is not a function` (bug do expo-location 19 **só na web**), corrigido com `safeRemove`; reteste OK |
| `tsc`, `npm test` | OK, 7/7 |
| Dados temporários | 2 ocorrências criadas e removidas; a ocorrência real do usuário preservada |
| **No aparelho** | Pendente: pins nativos (Android/iOS), animação da câmera até a ocorrência, destaque do pin. **Não precisa de build novo** (JS + imagens) |
