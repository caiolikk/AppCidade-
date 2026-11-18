---
status: implementado
tema: ocorrências / geolocalização / mapa
atualizado: 2026-11-17
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

## 2026-11-14 — Mapa como tela inicial e subcategorias na criação

### Pedido
1. Abrir o app no **mapa**; a Home "perto de mim" continua existindo, acessível pela navbar, e a seção ativa precisa ficar evidente.
2. **Subcategorias** na criação de ocorrências, conforme 4 prints do Figma enviados pelo usuário, persistidas de verdade (API + banco), sem quebrar as ocorrências antigas.

### Auditoria (código, 2026-11-14)
- **Navegação:** `app/_layout.tsx` (Stack protegido por token) → `app/(tabs)/_layout.tsx` (Tabs com navbar custom `components/AppTabBar.tsx`). A URL `/` resolve para `(tabs)/index.tsx` (a Home "perto de mim"), por isso ela abre primeiro. O mapa é `(tabs)/map.tsx` (`/map`). Usos de `/map`: `index.tsx` (Explorar o mapa, Ver no mapa), `create.tsx` (após enviar). Usos de `/`: `map.tsx` (seta "Voltar ao início" da busca) e `BackButton` (fallback). A navbar marca a aba ativa só com opacidade (inativas a 55%).
- **Categorias:** tabela `categories` (id, name), `GET /categories` → `{id,name}` ordenado por nome; o app reordena pela ordem do Figma (`hooks/use-feed.ts`). Criação envia `categoryId` (Zod uuid), e o service confere se existe. **Não existe nada de subcategoria** no schema, na API ou no app (D-009 adiou). O README prevê "Seleciona categoria → Seleciona subcategoria".
- **Prints do Figma (fonte da verdade):** menu flutuante de vidro sobre a tela esmaecida, ancorado no ícone tocado (que fica com o anel verde), com o nome da categoria no topo e itens "título + descrição", terminando em "Outros…". Há prints de Infraestrutura, Limpeza, Segurança e Trânsito. **A categoria "Outros" não tem print** → fica sem subcategorias (não invento opções).
- **Ocorrências existentes:** não têm subcategoria → a coluna nova precisa ser **opcional**.
- **Telas que mostram ocorrências:** Home (grade), mapa (pins + modal), `OccurrenceDetails` (modal e `/occurrence/[id]`). Nenhuma depende de subcategoria.

### Estratégia
**Navegação (sem mudar a arquitetura de Tabs):**
- Renomear `(tabs)/map.tsx` → `(tabs)/index.tsx` (o mapa passa a ser `/`) e `(tabs)/index.tsx` → `(tabs)/nearby.tsx` (`/nearby`). Assim o app abre no mapa por rota, sem redirect nem tela intermediária. Referências a `/map` passam a `/`; a seta da busca do mapa leva a `/nearby`.
- A navbar mantém os ícones e a ordem do Figma (casa = "Perto de você", mapa, nova, notificações, conta). `backBehavior="history"` para o "voltar" do Android não pular para a lista.
- Seção ativa mais evidente: além da opacidade, um **ponto verde** sob o ícone ativo.

**Subcategorias (banco → API → app):**
- Banco: nova tabela `subcategories` (id, categoryId → categories, name, description?, sortOrder; único `categoryId+name`) e coluna **opcional** `occurrences.subcategoryId` (FK, `ON DELETE RESTRICT`). Migration só aditiva: nenhum dado existente muda.
- Seed: cria as subcategorias exatamente como nos prints (texto e ordem), "Outros" por último em cada uma. Remove só subcategorias obsoletas **sem ocorrências**. Correção de digitação do Figma: "aréa" → "área".
- API: `GET /categories` passa a devolver `subcategories: [{id,name,description}]` (aditivo). `POST /occurrences` aceita `subcategoryId` (uuid, opcional no schema). O service exige subcategoria quando a categoria tem subcategorias e recusa uma subcategoria de outra categoria (400). Os DTOs público e admin devolvem `subcategory: {id,name} | null`.
- App: ao tocar numa categoria, ela é selecionada, a subcategoria anterior é **limpa** e abre o menu `SubcategoryMenu` (modal transparente, vidro/blur, ancorado no ícone). Depois de escolher, aparece a linha "Categoria › Subcategoria" com "Alterar". Tocar de novo na mesma categoria reabre o menu. Se o título estiver vazio, é preenchido com o nome da subcategoria (exceto "Outros"). Detalhes mostram "Categoria · Subcategoria".

### Critérios de aceitação
- [x] O app abre no mapa; a lista "perto de mim" abre pela navbar; ida e volta sem erro; aba ativa evidente.
- [x] Pins, localização, recentralizar, foco por `focus/focusKey` e modal continuam funcionando.
- [x] Só as subcategorias da categoria tocada aparecem; trocar de categoria limpa a subcategoria.
- [x] Categoria e subcategoria são persistidas e voltam em `GET /occurrences` e `/occurrences/:id`.
- [x] Ocorrências antigas (sem subcategoria) continuam listadas, com `subcategory: null`.
- [x] Subcategoria ausente (quando exigida) ou de outra categoria → 400.

### Testes previstos
`prisma migrate`, seed, `tsc` (API e mobile), `npm test` com novos casos de subcategoria, bundle/web do app (navegação inicial, menu de subcategorias e envio).

### Etapas
- [x] Schema + migration + seed
- [x] API: categorias, schema, service, DTO + testes
- [x] App: rotas/navbar
- [x] App: tipos, menu de subcategorias, criação, detalhes
- [x] Validação e documentação (D-022, D-023, PROJECT_CONTEXT)

### Resultado (2026-11-14)

| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` | Modelo `Subcategory` e `Occurrence.subcategoryId?` (FK RESTRICT + índice) |
| `prisma/migrations/20261115003036_subcategories/` (nova) | Só aditiva: `ADD COLUMN` nulo + `CREATE TABLE`. Aplicada com `migrate deploy` |
| `prisma/seed.ts` | `SUBCATEGORIES` (texto e ordem dos prints) + `seedSubcategories()` (upsert; remove só as obsoletas sem uso) |
| `api/.../categories/category.routes.ts` | `subcategories[]` ordenadas por `sortOrder` |
| `api/.../occurrence.schemas.ts` · `.service.ts` · `.dto.ts` | `subcategoryId` opcional no Zod; service exige quando a categoria tem opções e recusa as de outra categoria (400); DTOs com `subcategory` |
| `api/test/foundation.integration.test.ts` | Testes antigos enviam subcategoria + **novo teste** de subcategorias |
| `mobile/app/(tabs)/map.tsx` → `index.tsx` · `index.tsx` → `nearby.tsx` | Mapa vira `/` (tela inicial); lista vira `/nearby`. Conteúdo das telas inalterado (só rotas e o rótulo da seta da busca) |
| `mobile/app/(tabs)/_layout.tsx` | Ordem do Figma, `backBehavior="history"` |
| `mobile/components/AppTabBar.tsx` | Chaves `nearby`/`index`; ponto verde no botão ativo |
| `mobile/components/SubcategoryMenu.tsx` (novo) | Menu de vidro ancorado no ícone (prints do Figma) |
| `mobile/app/(tabs)/create.tsx` | Categoria → menu; troca limpa a subcategoria; linha "Categoria › Subcategoria · Alterar"; título sugerido; envia `subcategoryId`; etapa 1 só completa com a subcategoria |
| `mobile/components/OccurrenceDetails.tsx` | "Categoria · Subcategoria" (só a categoria quando é `null`) |
| `mobile/lib/types.ts` | `Subcategory`, `Category.subcategories?`, `PublicOccurrence.subcategory?` |

### Testes executados
| Cenário | Resultado |
|---|---|
| `tsc` API e mobile | OK, sem erros |
| `npm test` (API + Postgres) | **8/8** (antes 7). Novo caso: opções/ordem do Figma, "Outros" sem opções, persistência de categoria+subcategoria no banco, retorno em lista e detalhe, sem subcategoria → 400, subcategoria de outra categoria → 400, uuid inválido → 400, ocorrência sem subcategoria (legado) lida com `subcategory: null` |
| Migration + seed no banco de dev | 6/5/6/6/0 subcategorias; a ocorrência real existente continua lá, com `subcategoryId` nulo e listada normalmente |
| Web (Edge headless, 402×874, GPS em Gonzaga) | Abre em `/` (mapa); navbar → `/nearby` (grade, "até 5 km", ordem por distância) → mapa → seta da busca → `/nearby`; ponto verde na aba ativa; sem erros no console |
| Web — criação | Infraestrutura abre só as 6 opções dela; "Poste quebrado" → linha "Infraestrutura › Poste quebrado" e título sugerido; trocar para Trânsito abre as opções do Trânsito, **limpa** subcategoria e título sugerido; fechar sem escolher → "escolha o tipo do problema"; "Outros" não abre menu |
| `expo export --platform android` | Bundle OK (1339 módulos) |
| Envio com foto **pela interface** | **Não automatizado**: o seletor de arquivos do `expo-image-picker` não abre no Edge headless. Coberto pelo teste de integração (mesmo corpo da requisição). Validar no aparelho |

### Pendências
- Validar no aparelho: menu de subcategorias (blur e posição ancorada no Android/iOS), envio real com foto, app abrindo no mapa e "voltar" do Android. **Não precisa de build novo** (só JS; `expo-blur` já está no build).
- "Outros…" grava a subcategoria "Outros". O Figma não mostra campo de texto livre para ela: **pendente de definição** com o time.
- A categoria "Outros" não tem menu no Figma; se o time desenhar opções, basta incluí-las no `SUBCATEGORIES` do seed.
- O painel/gestão ainda não filtra por subcategoria (não existe painel).

## 2026-11-14 — Marcadores progressivos por zoom e agrupamento de ocorrências próximas

### Pedido
Apresentação progressiva estilo Waze, adaptada ao Cidade+:
- **bolinhas** com contorno branco quando o mapa está afastado;
- marcador **intermediário** no bairro;
- **ícone completo** na rua;
- o tamanho acompanha o zoom, com mínimo e máximo;
- ocorrências próximas sem sobreposição bagunçada, sem esconder nenhuma e sem mexer nos registros.

### Auditoria (código, 2026-11-14)
- `components/MapCanvas.tsx`: `react-native-maps` **1.20.1** (Google no Android, Apple no iOS).
  - Um `<Marker image>` por ocorrência: bitmap **fixo** de 44 dp (54 no selecionado), âncora na ponta da cauda e `tracksViewChanges={false}`.
  - O toque usa `occurrence.id`. **Não existe** noção de zoom, `onRegionChange` nem agrupamento: pins próximos se sobrepõem.
- **Restrição do P-013:** Views filhas no `Marker` viram snapshot e cortavam no Android. Por isso o tamanho variável **também precisa ser bitmap**: uma imagem por faixa de tamanho, gerada por `scripts/generate-pins.ps1`. Não dá para escalar a imagem continuamente nem animar a opacidade do bitmap durante o gesto.
- **Biblioteca:**
  - não tem clustering nativo (as libs de terceiros embrulham o MapView e somam dependência);
  - zoom: `MapView.getCamera()` dá `zoom` no Google e `altitude` na Apple. O mais simples nas duas plataformas é derivar da `Region`: `zoom = log2(360 × larguraDoMapa(dp) ÷ (256 × longitudeDelta))`;
  - `onRegionChange` (contínuo) e `onRegionChangeComplete`;
  - `fitToCoordinates`, `animateCamera`;
  - `Marker.opacity`.
- **Dados:** `GET /occurrences` devolve tudo, com lat/lng numéricos. O mapa filtra por categoria (chips) e por coordenada válida. Não há nada no backend que ajude (D-021), e o agrupamento é só visual: **nenhuma mudança de API**.
- **Prioridade:** o sistema **não tem gravidade nem prioridade**, só status e categoria. Não será inventada uma hierarquia.
- **Referências de zoom reais do app:**
  - abertura em Santos (`longitudeDelta` 0,05) com ~400 dp de largura ≈ **z 13,5**;
  - foco de rua / seguir (`STREET_DELTA` 0,01) ≈ **z 15,8**;
  - em Santos (lat −24°), 1 dp ≈ 12 m em z 13,5, 4,4 m em z 15 e 1,1 m em z 17.

### Estratégia
**Níveis** (constantes num só lugar: `lib/map-markers.ts`):

| Nível | Zoom | Marcador | Tamanho (dp) |
|---|---|---|---|
| 1 — regional | z < 13,5 | **bolinha** na cor do status (Figma "Bullet - Status") com contorno branco, sem ícone | 10 → 16, em faixas |
| 2 — bairro | 13,5 ≤ z < 15 | **selo redondo** (anel do status + ilustração da categoria, sem cauda): a versão simplificada do pin | 24 → 32 |
| 3 — rua | z ≥ 15 | **pin completo** (anel + ilustração + cauda) | 44 → 52 (máximo); selecionado +10 |

- **Histerese** de 0,25 nos limites: a mudança de nível só acontece depois de passar 0,25 do limite, o que evita oscilação.
- **Selecionado/em foco:** é sempre o pin completo, e nunca entra num grupo.

**Tamanho:** muda **com o zoom** (não é fixo na tela), em **faixas discretas** de bitmaps, com tamanho mínimo e máximo. O estado só muda quando a faixa muda. Durante o gesto, o `onRegionChange` é limitado a 1 atualização a cada ~120 ms. A transição é feita por degraus pequenos de tamanho, porque o P-013 impede animar o bitmap. O selo intermediário é o elo visual entre a bolinha e o pin.

**Ocorrências próximas: agrupamento visual em espaço de tela (sem dependência nova):**
- Os pontos são projetados em pixels de mundo (Web Mercator) no zoom atual, **quantizado em 0,25**. Isso converte a distância geográfica em distância na tela, e o raio de colisão ≈ o tamanho do marcador do nível.
- Algoritmo guloso com grade espacial (O(n)) e ordem estável (data de criação + id): cada ponto entra no primeiro grupo cuja semente esteja dentro do raio; senão, abre um grupo. Grupos de 1 = marcador individual.
- **Pan não recalcula**, porque a distância em pixels independe do centro. Só a mudança de zoom quantizado ou da lista recalcula (`useMemo`).
- Vale para **qualquer categoria**: o grupo é neutro (círculo escuro com contorno branco e a contagem), então nenhuma categoria esconde outra. Cada ocorrência continua com seu id, e nada é descartado.
- **Toque no grupo:**
  - se aproximar consegue separar (zoom necessário ≤ 19), anima a câmera até esse zoom no centro do grupo;
  - senão (mesmo local ou zoom máximo), abre uma **lista compacta** com todas as ocorrências do grupo, cada uma abrindo o modal de detalhes existente.
- A linha da lista reaproveita a linha de "Minhas ocorrências" do perfil, extraída para um componente.

### Arquivos previstos
- `lib/map-markers.ts` (novo: níveis, tamanhos, zoom↔região, agrupamento) + `lib/map-markers.test.ts`;
- `scripts/generate-pins.ps1` (bolinhas, selos, pins em 3 tamanhos, grupos) → `assets/pins/*`, `lib/pin-images.ts`;
- `components/MapCanvas.tsx`;
- `components/OccurrenceListRow.tsx` (extraído do perfil) + `components/ClusterListSheet.tsx`;
- `app/(tabs)/account.tsx` (passa a usar o componente extraído).

### Critérios de aceitação
- [x] 3 níveis com limites documentados e histerese; tamanhos com mínimo e máximo.
- [x] Nenhuma ocorrência inacessível: individual, ou dentro de um grupo que separa ao aproximar ou abre a lista.
- [x] Toque → ocorrência correta (por id); modal, localização, recentralizar e "Ver no mapa" intactos.
- [x] Pan sem recálculo; zoom recalcula só na mudança de faixa ou quantização.

### Testes previstos
- Unitários da lógica (vitest já presente no monorepo): zoom↔delta, histerese, mesma posição, categorias diferentes, separação ao aproximar, estabilidade, 1000 pontos.
- `tsc`, bundle Android e prancha visual dos bitmaps.
- **O comportamento real do zoom só pode ser validado no aparelho** (no web o mapa é um placeholder).

### Resultado (2026-11-14)

**Decisões que mudaram durante a implementação**
- O pin **selecionado tem um só tamanho (58 dp)**, em vez de +10 em cada degrau. Só existe um selecionado por vez, e isso poupou 1,6 MB (5,1 → 3,5 MB).
- **Correção iOS incluída:** `centerOffset` nos pins com cauda. No Apple Maps o `anchor` é ignorado, então os pins já ficavam centralizados na coordenada antes desta tarefa.
- A linha de ocorrência do perfil virou `components/OccurrenceListRow.tsx`, usada também na lista do grupo, para não duplicar código.

| Arquivo | Alteração |
|---|---|
| `lib/map-markers.ts` (novo) | Limites, histerese, tamanhos, zoom↔região, projeção Web Mercator, `clusterPoints`, `zoomToSeparate`, rótulos dos grupos |
| `lib/map-markers.test.ts` (novo) | 12 testes (rodar na raiz: `npx vitest run apps/mobile/lib`) |
| `scripts/generate-pins.ps1` | Bolinhas (4 tamanhos), selos (3), pins (3 + selecionado) e grupos (12 rótulos × 3), @2x/@3x; limpa a pasta antes de gerar |
| `assets/pins/*` · `lib/pin-images.ts` (gerados) | 384 PNGs (3,5 MB); `MARKER_IMAGES` substitui `PIN_IMAGES` |
| `components/MapCanvas.tsx` | Zoom pela região + `onLayout`; escala com histerese; `onRegionChange` limitado a 120 ms + `onRegionChangeComplete`; agrupamento `useMemo` (zoom quantizado, raio do nível); marcadores `memo` com comparação por bitmap; selecionado fora dos grupos; toque no grupo → aproximar ou lista; `centerOffset` no iOS. Foco, seguir, recentralizar e localização **inalterados** |
| `components/ClusterListSheet.tsx` (novo) · `components/OccurrenceListRow.tsx` (novo) | Lista compacta do grupo; linha compartilhada com o perfil |
| `app/(tabs)/account.tsx` | Usa `OccurrenceListRow` (sem mudança visual) |

### Testes executados
| Cenário | Resultado |
|---|---|
| Zoom↔região | Abertura (0,05) = 13,47; foco de rua (0,01) = 15,79; ida e volta exata |
| Níveis, tamanhos, histerese | Bolinha / selo / pin nos zooms reais do app; tamanho **nunca diminui** ao aproximar, mínimo 10 e máximo 52; pinça oscilando em 13,4–13,7 não troca o nível; salto grande troca direto |
| Mesma categoria no mesmo local | 1 grupo; `zoomToSeparate` = null → lista |
| Categorias diferentes a 15 m | 1 grupo com as duas (nenhuma escondida) |
| 120 m: juntas em z 12, separadas ao aproximar | `zoomToSeparate` → separadas no zoom indicado e em z 18 |
| 30 ocorrências numa área pequena, em 7 zooms | Todas presentes, cada uma exatamente uma vez; afastado < 5 grupos; z 19 → 30 individuais |
| Estabilidade e pan | Ordem de entrada não muda os grupos nem as chaves; distância na tela só depende do zoom |
| Desempenho | 1000 ocorrências: < 15 ms por recálculo (29 zooms) |
| Prancha dos bitmaps | Progressão bolinha → selo → pin → selecionado coerente; grupos legíveis (2…99+) |
| `tsc`, `expo export android` | OK |
| **No aparelho** | **Pendente** (no web o mapa é um placeholder): calibrar os limites 13,5 / 15 olhando o mapa real; fluidez com muitos pontos; toque em grupo (aproximar / lista → modal, inclusive a troca de Modal no iOS); posição dos pins no iOS (`centerOffset`). Não precisa de build novo (JS + imagens) |

### Pendências
- Calibrar os limites e os tamanhos no aparelho; os valores ficam em `lib/map-markers.ts`. Se mudar tamanhos, rode `scripts/generate-pins.ps1`.
- Transição contínua (fade/escala animada) exigiria Views no `Marker`, que esbarram no P-013 no Android. Hoje são degraus pequenos de tamanho.
- O grupo não mostra a composição (quantas de cada categoria). É possível acrescentar no futuro, com bitmaps por composição ou um callout.
- Com milhares de ocorrências, mover o agrupamento para o servidor (PostGIS) junto com a paginação por região (D-021).

## 2026-11-14 — Ajuste dos marcadores: ícones até longe, bolinhas só bem afastado e fim do agrupamento

### Pedido
O resultado anterior (D-026) não agradou:
- os ícones das categorias viravam bolinhas cedo demais;
- apareciam bolinhas pretas;
- o agrupamento de próximos deve ser **abandonado por completo**.

Agora:
- cada ocorrência tem sempre o seu próprio marcador;
- o ícone da categoria fica visível no zoom próximo e no intermediário, diminuindo aos poucos;
- bolinhas coloridas (nunca pretas) só com o mapa bem afastado;
- sem oscilação no limite;
- sem mudar dados, API, banco, criação, localização ou navegação até a ocorrência.

### Auditoria (código + dados reais, 2026-11-14)
- **Biblioteca:** react-native-maps 1.20.1 (Google no Android, Apple Maps no iOS).
  - O zoom vem de `onRegionChange`/`onRegionChangeComplete` → `zoomFromRegion(longitudeDelta, larguraDp)` (Web Mercator), em `lib/map-markers.ts`.
  - Marcadores como **bitmap** (`Marker image`, P-013). No iOS, a âncora é feita com `centerOffset`.
  - A biblioteca não anima o tamanho de um `Marker image`.
- **Limites atuais (D-026):**
  - bolinha abaixo de z 13,5;
  - selo de 13,5 a 15;
  - pin a partir de 15.
- **Referências reais:**
  - abertura do mapa (`longitudeDelta 0,05`): z ≈ 13,3 em tela de 360 dp e 13,5 em 411 dp;
  - foco de rua (0,01): z ≈ 15,6 a 15,8.
- **Causa do "desaparecimento prematuro":** o mapa abre praticamente em cima do limite bolinha/selo. Qualquer pinça para afastar já trocava a ilustração por bolinha, e o pin completo só existia a partir de z 15.
- **Causa das "bolinhas pretas":** o **agrupamento**. O banco de dev tem 2 ocorrências reais (Trânsito e Segurança, ambas REPORTADA) a ~7 m uma da outra.
  - Com o raio de agrupamento, elas viravam um único círculo escuro (`#0D0D0D`, contador "2") em quase todos os zooms (separavam só perto de z 19).
  - As bolinhas de status em si já eram coloridas (`dot-<status>`).
- **Cores existentes:**
  - **Categoria não tem cor** no projeto. Ela é identificada pela ilustração (`assets/figma/category-*.png`, `lib/category-art.ts`).
  - A convenção de cor é por **status**: 7 status do backend → 4 estados visuais do Figma (`theme.ts` → `statusVisual`/`statusVisualColors.dot`):
    - análise `#F97216`;
    - andamento `#0D3A9F`;
    - resolvido `#0B701A`;
    - negado `#AC0C0C`.
  - Ela já é usada no anel dos pins, no `StatusDot` e nas pílulas. Todos os 7 status têm cor. Toda categoria tem ilustração; sem ilustração, o pin nativo aparece na cor do status.
- **Agrupamento a remover:**
  - em `lib/map-markers.ts`: `clusterPoints`, `zoomToSeparate`, `clusterLabel`, `CLUSTER_*`, `MAX_SEPARATE_ZOOM` e `ZOOM_QUANTUM`/`quantizeZoom`;
  - em `MapCanvas.tsx`: `ClusterMarker`, `openCluster`, a lista e o estado `clusterZoom`;
  - o componente `components/ClusterListSheet.tsx`;
  - os bitmaps `cluster-*`;
  - os testes de agrupamento.
  - `OccurrenceListRow` **fica**, porque o perfil usa.

### Estratégia
1. **Dois formatos só:**
   - **ícone**: o pin com a ilustração da categoria e o anel do status, o mesmo desenho já validado;
   - **bolinha**.
   - O "selo" intermediário sai: o pin diminui continuamente, o que é mais simples e previsível.
2. **Ícone para z ≥ 12, crescendo com o zoom:**
   - 7 degraus de tamanho: 28, 32, 36, 40, 44, 48 e 52 dp, distribuídos de z 12 até z 17;
   - acima de 17 fica em 52 (máximo), e 28 dp é o mínimo em que a ilustração ainda é reconhecível;
   - a abertura (z ≈ 13,3 a 13,5) fica com ~36 dp e o foco de rua (≈ 15,7) com 48 dp;
   - a cauda do pin passa a ser **proporcional** ao diâmetro, para não ficar desproporcional nos pins pequenos;
   - a âncora/`centerOffset` usa a mesma fórmula da altura (`pinHeight(d)`).
3. **Bolinha só abaixo de z 12**, com histerese de 0,3:
   - os ícones só viram bolinha abaixo de 11,7 e só voltam acima de 12,3;
   - z 12 ≈ 35 m por dp: Santos e São Vicente inteiros cabem na tela, ou seja, o mapa está "realmente afastado";
   - bolinha de 10, 12 e 14 dp (de z 10 a 12), contorno branco e **cor do status**, sem preto em nenhum caso.
4. **Sem agrupamento:** um `Marker` por ocorrência, pelo id real.
   - Ocorrências próximas se sobrepõem. Para a mais recente ficar por cima, o zIndex depende da data.
   - O selecionado continua sendo o pin de 58 dp, por cima de todos.
5. **Desempenho:**
   - o estado só muda quando muda o degrau (formato + tamanho);
   - os marcadores são memoizados com comparação pela imagem;
   - durante o gesto, no máximo 1 avaliação a cada 120 ms;
   - pan sem custo;
   - sem dependência nova.
6. **Validação:** a web não tem mapa (placeholder) e não há aparelho nesta sessão.
   - Testes unitários dos limites, da histerese, da monotonicidade, do mínimo/máximo e da presença de bitmap para toda combinação.
   - Prancha visual de todos os tamanhos.
   - `tsc` e bundle Android.
   - **Calibração fina no aparelho fica pendente**: os limites saem das referências medidas acima, não de um palpite.

### Arquivos previstos
- `lib/map-markers.ts`
- `lib/map-markers.test.ts`
- `components/MapCanvas.tsx`
- `scripts/generate-pins.ps1`
- `lib/pin-images.ts`, gerado
- `assets/pins/`, gerados
- remoção de `components/ClusterListSheet.tsx`
- docs: D-027, que substitui o D-026; PROJECT_CONTEXT; nota no P-013

### Critérios de aceitação
- Ícones em todo zoom ≥ 12, com tamanho monotônico entre 28 e 52.
- Bolinhas coloridas pelo status abaixo de 12, sem flicker no limite.
- Nenhum código, bitmap ou contador de agrupamento.
- N ocorrências → N marcadores.
- O toque abre o detalhe da ocorrência certa.
- "Ver no mapa", seguir e recentralizar continuam iguais.

### Resultado (2026-11-14)
- **Implementado conforme a estratégia acima.** Diferença em relação à previsão: a abertura fica com **32 dp** numa tela de 360 dp e **36 dp** numa de 411 dp; o foco de rua, com 48 dp.
- **`lib/map-markers.ts`:**
  - só dois formatos (`pin` e `dot`);
  - `ICON_MIN_ZOOM = 12`, `LEVEL_HYSTERESIS = 0.3`, `MARKER_SIZES`, `SELECTED_PIN_SIZE = 58` e `pinHeight()`;
  - todo o código de agrupamento foi removido.
- **`components/MapCanvas.tsx`:**
  - um `OccurrenceMarker` (memo) por ocorrência, ordenado pela data;
  - `ClusterMarker`, `openCluster`, a lista e o estado do zoom quantizado foram removidos;
  - foco, seguir, recentralizar e a localização não mudaram.
- **`components/ClusterListSheet.tsx`:** removido. `OccurrenceListRow` fica, porque o perfil usa.
- **`scripts/generate-pins.ps1`:**
  - sem selos nem grupos;
  - pins de 28 a 52 com cauda proporcional, mais o selecionado de 58;
  - bolinhas de 10 a 14.
  - Total: 344 PNGs, 3,9 MB. `lib/pin-images.ts` foi regenerado.
- **Dados, API, banco, criação e localização:** sem mudanças.

### Testes executados
- `npx vitest run apps/mobile/lib`: **12/12**. Os testes cobrem:
  - as referências de zoom;
  - o ícone na abertura, na rua e com a área visível 4x maior;
  - a bolinha só abaixo de 12;
  - a histerese, inclusive oscilação de ±0,1 sem nenhuma troca;
  - o tamanho que nunca diminui ao aproximar, com mínimo 28 e máximo 52;
  - as bolinhas menores que o menor ícone;
  - o selecionado maior que todos;
  - `pinHeight`;
  - bitmap para toda combinação de 5 categorias × 4 status × tamanhos;
  - as cores das bolinhas iguais às do tema, nunca preto;
  - nenhum vestígio de agrupamento.
- `tsc --noEmit` (mobile): sem erros.
- `expo export --platform android`: OK (1477 módulos).
- **Prancha visual** dos bitmaps @3x: as ilustrações estão reconhecíveis em 28 dp, a cauda está proporcional e as bolinhas nas 4 cores.
- **Não executado:** aparelho real, tanto Android quanto iOS. A web só tem placeholder do mapa.

### Pendências
- Calibrar no aparelho o limite (12) e a faixa de tamanhos olhando o mapa real. Os valores ficam todos em `lib/map-markers.ts`; depois de mudar os tamanhos, é preciso rodar o script de novo.
- Confirmar no iOS a ponta da cauda (`centerOffset`) nos tamanhos pequenos.
- Ocorrências no mesmo ponto se sobrepõem de propósito, porque não há agrupamento. Hoje a de cima é a mais recente. As 2 ocorrências reais estão a ~7 m uma da outra: os pins só se separam por completo perto de z 20 (≈ 0,13 m por dp). A de baixo continua tocável pela parte visível e aparece na lista "perto de você".
- Fluidez com centenas de ocorrências: cada troca de degrau re-renderiza todos os marcadores (um bitmap novo cada). Medir no aparelho.

## 2026-11-17 — Mapa como 1ª aba, busca de endereço funcional e remoção da direção do usuário

### Pedido (mensagem original)
> ok, quero fazer algumas alterações no app, primeiro: a alteração de tela inicial ainda não subiu, a tela inicial agora deve ser o mapa e a tela de ocorrencias proximas deve ser outra tela com outro icone, segundo: a barra de pesquisar local hoje no app não funciona, tem apenas um place holder com a cidade de santos e quando o usuario tenta pesquisar algum endereço real não acontece nada. terceiro: pedi para adicionar um seta mostrando a direção que o usuario esta apontando no app, mas acho que nesse momento não faz sentido ja que o objetivo do app não é navegação nem nada do tipo

### Pedido (prompt estruturado)

# Ajustes no mapa do Cidade+: tela inicial, busca de endereço e direção do usuário

## 1. Papel e objetivo
Atue como engenheiro sênior de React Native/Expo (Expo Router, react-native-maps, expo-location), com atenção à experiência de uso e ao Figma do Cidade+.

Quero três ajustes no app:
1. o mapa deve ser **de fato** a tela inicial, inclusive na barra de navegação;
2. a barra de busca do mapa deve encontrar endereços reais;
3. a seta ou cone de direção do usuário deve ser removida, porque o app não é de navegação.

**Modo: implementação**, seguindo o ciclo do `AGENTS.md`: plano antes do código, testes e documentação.

O objetivo é terminar sabendo / tendo:
- Por que a mudança de tela inicial "não subiu", e a correção.
- O mapa como 1ª aba, com o ícone de início, e "ocorrências perto de você" como outra aba, com outro ícone.
- Busca de endereço funcionando: digitar um endereço real e o mapa ir até ele.
- O indicador do usuário sem direção (só posição e precisão), sem gastar bateria com a bússola.
- Como levar isso ao celular: novo APK e/ou commit.

## 2. Contexto
- O mapa virou a rota inicial em 2026-11-14 (D-023), e o APK preview de 2026-11-15 aponta para a API no Railway.
- O usuário ainda percebe "perto de você" como a tela inicial.
- A busca mostra "Santos, SP" e não faz nada.
- A seta de direção (D-021, estilo Waze) foi pedida antes, mas agora o usuário considera que não faz sentido.
- Prazo: apresentação em 26/nov/2026.

## 3. Auditoria (antes de mexer)
- **Abas:** ordem, ícones e rótulos em `app/(tabs)/_layout.tsx` e `components/AppTabBar.tsx`; ícones do Figma em `assets/figma/nav-*.svg`.
- **Busca:** comportamento atual em `app/(tabs)/index.tsx`.
  - Existe placeholder ou é um valor fixo?
  - Existe ação ao confirmar?
  - Que serviço de geocodificação já está disponível (sem dependência nova nem chave paga)?
  - Quais são os limites por plataforma?
- **Direção:**
  - onde a bússola é lida (`hooks/use-device-heading.ts`) e quem a usa;
  - como o cone é desenhado (`MapCanvas`);
  - o que depende de `course`/`heading`.
- **Navegação existente:** links para `/nearby` e `/?focus=` ("Ver no mapa"), o botão voltar do Android (`backBehavior`).
- Não presuma APIs: confira as versões instaladas.

## 4. Tela inicial e abas
- Mapa na 1ª posição, com o ícone de casa do Figma, aberto ao iniciar o app.
- "Perto de você" em outra posição, com um ícone **diferente** da casa e do mapa, no mesmo estilo dos ícones do Figma (traço, tamanho, cor).
- Rótulos de acessibilidade coerentes.
- Preservar: o indicador da aba ativa, o "voltar" pelo histórico, o deep link `/?focus=` e o acesso a `/nearby` pela seta da busca.

## 5. Busca de endereço
- O campo começa **vazio**, com placeholder de verdade.
- Ao confirmar no teclado (tecla "buscar"):
  - geocodificar o endereço;
  - mover o mapa até ele, em zoom de rua;
  - marcar o ponto encontrado;
  - parar de seguir o usuário.
- Endereço sem cidade: priorizar Santos/SP. Endereço com cidade: respeitar o que foi digitado.
- Mostrar o endereço resolvido (rua, número, bairro) quando houver.
- Mensagens claras para:
  - nada encontrado;
  - erro ou sem internet;
  - plataforma sem suporte (web).
- Limpar a busca remove o marcador.
- Sem dependência nova nem chave de API paga, se o que já existe resolver.
- Não chamar o geocodificador a cada letra digitada (custo e limites).

## 6. Direção do usuário
- Remover a bússola e o cone/seta.
- Manter o ponto azul e o círculo de precisão, "seguir" e "recentralizar".
- Remover o código morto, sem afetar a localização usada na criação de ocorrências e em "perto de você".

## 7. Restrições
- Não mudar API, banco, schema, filtros, pins nem o modal de detalhes.
- Não adicionar dependências.
- Não quebrar o deep link `/?focus=`, o "voltar" do Android nem a criação de ocorrências.
- Nada de segredos na documentação.

## 8. Validação
- `tsc` do app;
- testes existentes do app;
- bundle Android (`expo export`);
- conferir na web: abas, campo vazio, mensagem de busca indisponível;
- busca real e ausência da seta: só no aparelho, com o APK novo.

## 9. Relatório final
- Uma resposta para cada um dos 3 pedidos (causa e correção).
- Arquivos alterados, testes e resultados, documentação atualizada, pendências.
- Como levar ao celular (novo APK preview; commit).

**Resultado esperado:** o app abre no mapa com a casa ativa na 1ª aba, "perto de você" tem um ícone próprio, buscar "Av. Ana Costa, 300" leva o mapa até lá, e o indicador do usuário mostra só a posição.

### Auditoria (código, 2026-11-17)
- **Abas:**
  - `_layout.tsx` declara a ordem `nearby` (1º), `index` (2º), `create`, `notifications`, `account`;
  - `AppTabBar` liga `nearby` → `nav-home.svg` (casa) e `index` → `nav-map.svg`;
  - a rota inicial já é o mapa (`index`, D-023), mas **a casa (1ª aba) leva a "perto de você"**. Isso faz parecer que a mudança "não subiu";
  - no Git, `origin/main` já tem o mapa em `index` (só 1 commit a mais, no README).
- **Busca** (`app/(tabs)/index.tsx`):
  - `useState("Santos, SP")` é um **valor inicial**, não um placeholder (o placeholder "Buscar endereço" nunca aparece);
  - **não há `onSubmitEditing`** nem busca nenhuma;
  - a seta à esquerda leva a `/nearby`.
- **Geocodificação disponível:** `expo-location` 19.0.8 tem `geocodeAsync(endereço)` e `reverseGeocodeAsync(coordenadas)`.
  - Geocodificador **nativo** do Android/iOS, sem chave e sem custo.
  - **Não existe na web.**
  - A documentação pede uso moderado: só ao confirmar, nunca por letra.
- **Direção:**
  - `useDeviceHeading` (só usado em `index.tsx`) assina `watchHeadingAsync`;
  - sem bússola, cai no `course` do GPS em movimento;
  - o `MapCanvas` desenha o cone (`userCone`) com `flat` e `rotation` no `UserLocationMarker`;
  - `position.course` é usado só para a direção (fica no hook de localização, sem custo extra).

### Estratégia
1. **Abas:**
   - ordem `index` (Mapa, ícone **casa**), `nearby` (Perto de você, ícone **novo** `nav-nearby.svg`), `create`, `notifications`, `account`;
   - o ícone novo é um pin com um arco de "raio", no mesmo traço dos ícones do Figma (viewBox 60, stroke 2 `#222`). Não há ícone para isso no Figma; registrado como pendência de design;
   - o `nav-map.svg` deixa de ser usado (fica no repositório; não apagar asset do Figma).
2. **Busca:**
   - campo vazio, com placeholder "Buscar endereço em Santos";
   - `returnKeyType="search"` + `onSubmitEditing`;
   - se a consulta não citar a cidade, acrescentar ", Santos - SP, Brasil";
   - `geocodeAsync` → 1º resultado → `reverseGeocodeAsync` para o rótulo;
   - `MapCanvas` recebe `searchTarget {latitude, longitude, key, label}`: anima até o zoom de rua e desenha um `Marker` nativo (sem View filha, P-013) com título;
   - parar de seguir; teclado fechado;
   - mensagens no aviso flutuante que já existe;
   - na web: "A busca de endereço funciona no app (Android/iOS)".
3. **Direção:**
   - remover `useDeviceHeading` (e apagar o hook, código morto), a lógica de `direction`, a prop `userDirection` e o cone do `MapCanvas`;
   - o indicador volta a ser o ponto azul + o círculo de precisão;
   - D-021 parcialmente substituída por **D-030**.
4. **Docs:**
   - D-030;
   - PROJECT_CONTEXT (rotas e abas, linha do mapa);
   - este plano.

### Resultado (2026-11-17)
**Implementado:**
- **Abas:**
  - `app/(tabs)/_layout.tsx`: `index` (Mapa) é o 1º botão;
  - `components/AppTabBar.tsx`: `index` → `nav-home.svg` (casa, "Início: mapa de ocorrências") e `nearby` → **`assets/figma/nav-nearby.svg`** (novo).
- **Busca:**
  - **`lib/address-search.ts`** (novo): `buildSearchQuery` e `formatAddressLabel`;
  - `app/(tabs)/index.tsx`:
    - campo vazio com placeholder "Buscar endereço em Santos";
    - `returnKeyType="search"` + `onSubmitEditing`;
    - `geocodeWithPermission` (pede permissão no Android e tenta de novo);
    - endereço reverso para o rótulo;
    - indicador de carregamento;
    - limpar remove o marcador;
    - mensagens: nada encontrado, sem internet, sem permissão, web;
  - `components/MapCanvas.tsx`: prop `searchTarget` (anima uma vez por busca, `Marker` nativo com título);
  - `MapCanvas.web.tsx`: prop aceita e ignorada.
- **Direção:**
  - removidos `useDeviceHeading`, a lógica de `direction`, a prop `userDirection`, o cone (`userCone`), `flat`/`rotation` do marcador do usuário;
  - **`hooks/use-device-heading.ts` apagado**.

**Testes executados:**

| Teste | Resultado |
|---|---|
| `npx vitest run apps/mobile/lib` | **20/20** (12 marcadores + **8 novos** da busca). Os novos cobrem: Santos por padrão, cidade/UF respeitadas, CEP, "Santista" ≠ Santos, "RUA XV" e "12 ap" sem virar UF, e o rótulo. Um caso real ("ap" virando Amapá) foi pego pelo teste e corrigido |
| `tsc --noEmit` (mobile) | OK |
| `expo export --platform android` | OK (1477 módulos) |
| Ícones lado a lado (Edge headless) | `nav-nearby` no mesmo traço e peso de `nav-home/report/notify/profile` |

**Não testado (exige aparelho com o APK novo):**
- a busca real com o geocodificador;
- o pedido de permissão;
- a animação e o marcador;
- a ausência do cone;
- a ordem das abas no celular.

**Pendências:**
- **Novo APK preview** para levar ao celular. O APK de 2026-11-15 não tem estas mudanças.
- **Commit e push.**
- **Ícone de "perto de você"** para o Figma (design).
- **Busca na web:** sem geocodificador; só aviso.
- **Melhorias possíveis:**
  - mais de um resultado (o Android devolve 1);
  - histórico de buscas.

## 2026-11-17 — Tamanho dos marcadores por zoom, ocorrências sobrepostas e bolinha que não aparece

### Pedido (mensagem original)
> quero melhorar o tamanho dos icones conforme o usuario da zoom e tira o zoom , quando tem duas ocorrencias proximas elas ficam disputando espaco e se sobrepondo , e esta com um bug que nem todas as ocorrencias se transformam em ponto quando esta longe

### Pedido (prompt estruturado)

# Marcadores do mapa: tamanho por zoom, ocorrências sobrepostas e bug da bolinha — Cidade+

## 1. Papel e objetivo
Atue como engenheiro sênior de React Native/Expo com experiência em `react-native-maps` (Google Maps no Android, Apple Maps no iOS), renderização de marcadores e desempenho.

Quero que os ícones das ocorrências acompanhem melhor o zoom, que ocorrências próximas não fiquem disputando o mesmo espaço e que **todas** virem bolinha quando o mapa estiver afastado.

**Modo: implementação**, seguindo o ciclo do `AGENTS.md`.

O objetivo é terminar tendo:
- Ícones que crescem e diminuem de forma mais suave e proporcional ao zoom, com mínimo e máximo.
- Ocorrências próximas legíveis e tocáveis individualmente, sem uma cobrir a outra e sem "piscar".
- Todas as ocorrências, inclusive a que foi tocada ou está em foco, virando bolinha no zoom afastado.
- A causa do bug explicada.

## 2. Contexto
- **Regras atuais (D-027):** ícone da categoria em z ≥ 12, de 28 a 52 dp em 7 degraus até z 17; bolinha de status abaixo de z 12; histerese.
- **O usuário abandonou o agrupamento (clustering) e isso continua valendo:**
  - não juntar marcadores;
  - não exibir contador;
  - não esconder ocorrências;
  - cada ocorrência mantém o próprio marcador.
- Bitmaps em vez de Views por causa do P-013 (cortes no Android).
- Os dados reais do banco de dev têm 2 ocorrências a cerca de 7 m uma da outra, o caso de sobreposição.
- O usuário testa pelo development build + Metro.

## 3. Auditoria
- **`components/MapCanvas.tsx`:** escolha da aparência (`markerLook`), selecionado, `zIndex`, `memo`/comparação, `key` dos `Marker`.
- **`lib/map-markers.ts`:** níveis, tamanhos, histerese.
- **`scripts/generate-pins.ps1`:** tamanhos gerados, peso dos PNGs.
- **`app/(tabs)/index.tsx`:** quando `selectedId` é definido e limpo.
- **Particularidades da biblioteca:**
  - `anchor` (Google) × `centerOffset` (Apple);
  - ordem de desenho com `zIndex` empatado;
  - atualização da prop `image`.
- Não presuma: confirme no código.

## 4. Tamanho por zoom
- Degraus menores (menos salto visual) numa faixa mais longa de zoom, com mínimo legível e máximo que não ocupe a tela.
- Manter o limite ícone/bolinha (z 12) e a histerese.
- Manter o peso dos bitmaps sob controle (informar o custo).

## 5. Ocorrências próximas
- Sem agrupar e sem esconder.
- Ordem de desenho **estável**: nada de alternar quem fica por cima.
- Quando dois ou mais ícones se sobrepõem **na tela** no zoom atual, afastá-los visualmente o mínimo necessário (leque), com uma linha fina até a posição real.
  - É só visual: as coordenadas e os dados não mudam.
  - Cada marcador continua tocável e abre a ocorrência certa.
- Ao aproximar o zoom, quando deixarem de se sobrepor, voltam ao lugar exato.

## 6. Bug da bolinha
- Achar por que algumas ocorrências não viram bolinha e corrigir.
- O selecionado também segue o zoom.
- A seleção não deve ficar "presa" depois de fechar os detalhes.

## 7. Restrições
- Sem agrupamento.
- Não mudar dados, API, banco, categorias, status nem coordenadas.
- Não quebrar:
  - foco ("Ver no mapa");
  - seguir e recentralizar;
  - busca de endereço;
  - modal de detalhes.
- Sem dependência nova.
- Desempenho: o pan não recalcula nada; o recálculo acontece só quando o zoom muda.

## 8. Validação
- Testes unitários:
  - tamanhos monotônicos com mínimo e máximo;
  - histerese;
  - leque: pares, grupos, nenhum perdido, determinístico, desempenho com 1000 pontos;
  - bitmaps para toda combinação.
- `tsc`, bundle Android e prancha visual dos tamanhos.
- No aparelho, pelo usuário, com o dev build: zoom contínuo, as 2 ocorrências próximas, bolinhas de longe.

## 9. Relatório final
- Causa do bug.
- Nova relação zoom × tamanho.
- Como ficou a sobreposição.
- Arquivos, testes, documentação e pendências.

**Resultado esperado:** ao pinçar, os ícones mudam de tamanho em passos pequenos; as 2 ocorrências vizinhas aparecem lado a lado, ligadas ao ponto real; e, de longe, todas viram bolinhas coloridas.

### Auditoria (código, 2026-11-17)
- **Bug da bolinha:**
  - `markerLook(selected=true)` devolve sempre o pin `sel` de 58 dp, ignorando o nível;
  - em `index.tsx`, tocar num pin faz `setSelectedId` + `setDetailsId`, mas o `onClose` do modal só limpa `detailsId`, então **`selectedId` fica preso**;
  - "Ver no mapa" também define `selectedId`;
  - **resultado:** a última ocorrência tocada ou focada continua como pin grande em qualquer zoom.
  - **Risco adicional no Android:** trocar a prop `image` do mesmo `Marker` entre formatos (pin com âncora na base ↔ bolinha centrada) depende de o mapa nativo aplicar o novo ícone e a nova âncora juntos. Remontar o marcador na troca de formato elimina essa dependência.
- **Sobreposição:**
  - todos os marcadores usam `zIndex={10}`; o Google Maps não garante a ordem entre empatados, e ela muda quando a imagem é trocada (troca de degrau). Daí a impressão de "disputa";
  - nada afasta ícones sobrepostos: 7 m equivalem a cerca de 2 dp no zoom 15.
- **Tamanho:**
  - `MARKER_SIZES.pin = [28…52]` em 7 degraus de 4 dp, distribuídos entre z 12 e z 17 (cerca de 0,7 de zoom por degrau);
  - acima de 17 fica fixo em 52.
  - 344 PNGs (3,9 MB, @2x e @3x).

### Estratégia
1. **Tamanhos** (`lib/map-markers.ts` + gerador):
   - pin de **24 a 54 dp em 11 degraus de 3 dp**, distribuídos entre **z 12 e z 18** (cerca de 0,55 de zoom por degrau);
   - mínimo de 24, ainda reconhecível na prancha; máximo de 54;
   - histerese mantida; bolinha de 10 a 14 sem mudança; selecionado de 58 → **60**, sempre maior que o maior normal;
   - **custo estimado:** cerca de 500 PNGs (~6 MB).
2. **Ordem estável:** `zIndex` por ordem de criação (a mais recente por cima), com o selecionado, o usuário e a busca acima de todos.
3. **Leque visual** (`spreadOffsets`, função pura):
   - no nível pin e no zoom quantizado (0,25), unir ícones cuja distância na tela seja menor que 0,8 × o tamanho;
   - grupo de 2 ou 3 → em linha horizontal; grupo de 4 ou mais → em círculo;
   - espaçamento de cerca de 0,95 × o tamanho, centrado no centroide;
   - deslocamento aplicado via `anchor` (Android) e `centerOffset` (iOS);
   - uma `Polyline` fina liga a ponta do pin à coordenada real;
   - no nível bolinha não há leque (bolinhas pequenas; sobreposição aceitável);
   - o pan não recalcula; o recálculo só acontece quando o zoom quantizado muda.
4. **Bug:**
   - o selecionado segue o nível (bolinha maior no nível bolinha, pin de 60 no nível pin);
   - `onClose` do modal limpa `selectedId`;
   - a `key` do `Marker` inclui o formato, o que força a remontagem ao trocar pin ↔ bolinha.
5. **Desempenho:**
   - aparências memoizadas por id;
   - comparação por valor (imagem e âncora);
   - recálculo só na troca de degrau ou de zoom quantizado.
6. **Docs:** D-031 (atualiza a D-027), este plano e o PROJECT_CONTEXT.

### Resultado (2026-11-17)
**Implementado:**
- **`lib/map-markers.ts`:**
  - `MARKER_SIZES.pin` de 24 a 54 (3 em 3) até z 18;
  - `SELECTED_PIN_SIZE` = 60;
  - novos: `quantizeZoom`, `project`/`unproject` e **`spreadOffsets`** (união-busca com grade espacial; linha ou círculo).
- **`scripts/generate-pins.ps1`:** novos tamanhos, regerados (**504 PNGs, 5,6 MB**); `lib/pin-images.ts` regenerado.
- **`components/MapCanvas.tsx`:**
  - zoom quantizado em estado; leque só no nível pin;
  - `Polyline` até o ponto real;
  - `zIndex` único por ordem de criação;
  - selecionado no mesmo laço, seguindo o nível;
  - `key` com o formato;
  - `sameMarker` compara por valor;
  - `UserLocationMarker` com `zIndex` acima das ocorrências.
- **`app/(tabs)/index.tsx`:** fechar o modal limpa `selectedId`.

**Testes:**

| Teste | Resultado |
|---|---|
| `npx vitest run apps/mobile/lib` | **26/26**, incluindo 6 novos do leque: |
| | • as 2 ocorrências reais (~7 m) lado a lado no zoom de rua |
| | • voltam ao lugar ao aproximar |
| | • grupo de 6 sem sobreposição e nenhum perdido |
| | • determinístico |
| | • encadeamento |
| | • 1000 pontos < 80 ms |
| | Também: degraus ≤ 3 dp, mínimo 24 e máximo 54, bitmaps de toda combinação |
| `tsc --noEmit` (mobile) | OK |
| `expo export --platform android` | OK |
| Prancha dos 11 tamanhos + selecionado | Progressão suave; 24 dp ainda legível |

**Não testado (aparelho):**
- sensação do zoom contínuo;
- leque com as 2 ocorrências reais;
- todas virando bolinha;
- toque correto em cada marcador do leque;
- iOS (`centerOffset`).

**Limitação conhecida:** a linha do leque é calculada no zoom quantizado. Entre dois quantum, o comprimento na tela varia até cerca de 9%; a ponta da linha pode ficar alguns dp fora da ponta do pin até o próximo recálculo.

**Pendências:**
- validar com o dev build (o usuário está testando local);
- calibrar `OVERLAP_FACTOR`/`SPREAD_SPACING` e os tamanhos;
- novo APK preview depois de validar.

