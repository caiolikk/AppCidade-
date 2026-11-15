---
status: implementado
tema: perfil do usuário / reputação / configurações
atualizado: 2026-11-14
---

# Perfil do usuário ("Minha Conta"), reputação provisória e configurações

## Objetivo

A aba "Minha Conta" vira o perfil do Figma, com dados reais do usuário autenticado:
- foto, nome, bairro e "Membro desde";
- 3 indicadores: ocorrências criadas, avaliações realizadas e reputação;
- a lista "Minhas ocorrências" com status, abrindo os detalhes.

Uma área de **configurações** permite editar o nome, a foto e o local onde mora (CEP → bairro), com persistência no banco.

## Auditoria (código + Figma, 2026-11-14)

### Figma
- **`Frame - Minha Conta` (1:3343)** é a única tela de perfil.
  - Topo: slot de avatar 90×90 ("ICON - USER", **opacidade 0** no design, P-011) e o selo "Check" 30×30, também invisível.
  - Abaixo: nome (20, semibold), "Membro desde jan/2026" (14) e 3 colunas (número 18 bold e rótulo 12 semibold): **Ocorrências**, **Avaliações** e **Reputação**. A reputação aparece em **verde #0B701A**, na escala do exemplo "4.8".
  - "MINHAS OCORRÊNCIAS" (18, semibold) é uma lista com linhas de padding 15 e gap 15, divisória #D9D9D9:
    - bolinha de status (15);
    - título 16 semibold numa linha com "…";
    - "Categoria • há X" (12);
    - pílula de status (20 de altura).
  - O exemplo tem 10 itens, numa área rolável.
- **Não existe frame de configurações / editar perfil** (nem na página Final; os nomes das camadas foram pesquisados). A tela de configurações vai **reutilizar os componentes já usados no app** (cabeçalho de "Nova Ocorrência" com título grande e voltar, `AuthTextField`, `PrimaryButton`, seções e divisórias de "Nova Ocorrência"). Nada de elementos novos fora desse padrão.
- O Figma não tem botão de entrada para as configurações. Entra um ícone de engrenagem no canto superior direito do perfil, no mesmo lugar do botão voltar de "Nova Ocorrência".

### Autenticação e usuário
- JWT de ~15 min (D-010). O app guarda o token (`lib/session.ts`) e o `user` no Zustand (`store/auth.ts`); o `hydrate()` chama `GET /me`.
- `User` no banco: `name`, `email`, `cpf`, `cep`, `neighborhood`, `santosNeighborhoodId`, `reputationScore Int @default(0)` (**nunca calculado**, D-012), `createdAt`. **Não existe** campo de foto.
- API: `GET /me` → `toPrivateUser` (inclui o CPF, só para o próprio usuário). **Não existe** endpoint para atualizar o perfil.
- O CEP é resolvido por `cep/resolve-address.ts` (ViaCEP → bairro normalizado → `SantosNeighborhood`). O cadastro usa isso, e a mesma função serve para trocar o CEP.

### Ocorrências
- `Occurrence.userId` (com índice). Os DTOs públicos **não** expõem o autor. Não existe consulta "minhas ocorrências" nem paginação: o `GET /occurrences` devolve tudo.

### Avaliações
- `Evaluation(userId, occurrenceId, type)`, com `type` ∈ `UTIL | PERSISTE | INCORRETA`. **Não há nota numérica.** A restrição única `userId+occurrenceId` impede o voto duplicado (409).
- **O autor consegue avaliar a própria ocorrência** (o service não bloqueia).
- "Avaliações realizadas" = `Evaluation.userId = eu`. "Recebidas" = avaliações cujo `occurrence.userId = eu` e `userId ≠ eu`.

### Upload
- `services/upload.ts → storeOccurrenceImage`: valida o tipo (JPG/PNG/WEBP/HEIC) e o tamanho mínimo, com limite de 8 MB no multipart. Usa o Cloudinary (thumb 400×400) ou o disco local (`/media`). Pode ser reutilizado para o avatar.

### Interface
- `(tabs)/account.tsx` hoje mostra o nome, "Membro desde", as linhas Bairro/CEP/E-mail/Perfil e "Sair". Reutilizáveis:
  - `StatusPill`/`StatusDot` (as 4 cores do Figma, com o rótulo do status real, como nas outras telas);
  - `formatReportedAgo`, `formatMemberSince`;
  - `OccurrenceDetailsModal` (lê o cache `["occurrences"]`, que já contém as ocorrências do usuário);
  - `BackButton`, `AuthTextField`, `PrimaryButton`, `SuccessPopup`, `useTabBarSpace`.

## Regra provisória de reputação (limitação + adaptação)

O sistema **não tem notas**, então a média 1–5 do pedido não se aplica diretamente. Adaptação simples, que mantém a escala que o Figma exibe ("4.8"):

> **reputação = 5 × (avaliações positivas recebidas ÷ avaliações recebidas)**, com uma casa decimal.
> Positivas = `UTIL` (o relato foi útil) e `PERSISTE` (alguém confirmou que o problema existe). Negativa = `INCORRETA`.

- Só contam avaliações **recebidas** nas ocorrências do usuário, **sem os votos do próprio autor**. A restrição única já impede duplicatas.
- Nenhuma avaliação recebida → `null` → o app mostra **"Sem avaliações"**. Ocorrência sem voto não vira zero.
- A regra fica numa única função no backend (`modules/users/reputation.ts`), e o app só exibe o valor.
- O campo `User.reputationScore` continua sem uso, para não guardar um valor que fica desatualizado. Registrado em D-024.

## Estratégia

### Banco
Migration aditiva: `users.avatarUrl TEXT NULL` e `users.avatarPublicId TEXT NULL`. Os usuários existentes ficam sem foto. Nenhuma relação muda.

### API (novo módulo `modules/users/`, padrão Fastify + Zod + service)

| Rota | O quê |
|---|---|
| `GET /me/profile` | Perfil próprio + `stats {occurrences, evaluationsGiven, evaluationsReceived, reputation}` + as 10 ocorrências mais recentes. Contagens e agregação no banco (`count` / `groupBy`), em paralelo |
| `GET /me/occurrences?skip&take` | Paginação das minhas ocorrências (`take` ≤ 50) → `{ items, total }` |
| `PATCH /me` | `{ name?, cep? }` (schema `strict`: id e campos estranhos → 400). O CEP passa pelo mesmo `resolveResidentialAddress` do cadastro (só Santos) e atualiza `cep`, `neighborhood` e `santosNeighborhoodId` |
| `PUT /me/avatar` (multipart `file`) · `DELETE /me/avatar` | Reutiliza `storeOccurrenceImage`. Salva `thumbnailUrl` (400×400 no Cloudinary) e remove a foto anterior (best effort) |

- Todas as rotas exigem `authenticate`, e o id vem **só do token**.
- `toPrivateUser` passa a incluir `avatarUrl`.
- Não há perfil público: ninguém consulta o perfil de outra pessoa, e o bairro/CEP só aparece para o próprio usuário.

### App
- **`(tabs)/account.tsx` → perfil do Figma:**
  - avatar no slot 90×90 (foto ou ícone de usuário);
  - nome, "Membro desde" e bairro;
  - os 3 indicadores;
  - "MINHAS OCORRÊNCIAS" com 10 itens e "Ver mais" paginado;
  - toque → `OccurrenceDetailsModal`;
  - engrenagem → `/settings`.
  - Estados: carregando, erro com "Tentar de novo" e aviso de dados antigos, e vazio.
- **`app/settings.tsx` (novo, no Stack protegido):**
  - foto (galeria → prévia → salvar; remover);
  - nome;
  - CEP residencial, com o bairro atual e um aviso de que não é o GPS nem é público;
  - "Salvar alterações", com validação e feedback;
  - aviso ao sair com alterações não salvas;
  - "Sair" (logout) passa a ficar aqui.
- `store/auth.ts` ganha `setUser`. Ao salvar, o app atualiza o store e invalida `["profile"]`.
- `hooks/use-profile.ts` (React Query) concentra as consultas do perfil.

## Critérios de aceitação
- [x] Indicadores vindos do banco, por usuário, sem números fixos. Reputação conforme a regra, com "Sem avaliações" quando não houver.
- [x] Últimas ocorrências: só as do usuário, da mais nova para a mais antiga, com status real e detalhes abrindo pelo modal existente; estado vazio.
- [x] Editar nome, CEP/bairro e foto persiste no banco e continua valendo depois de reabrir o app (`/me`).
- [x] Não é possível editar outro usuário; dados inválidos → 400; sem token → 401.
- [x] Nada mudou nas outras telas e contratos (os campos novos são aditivos).

## Testes previstos
- **Integração na API** (`test/profile.integration.test.ts`):
  - 3 usuários, ocorrências e votos cruzados, incluindo o voto do próprio autor;
  - contagens e reputação calculada à mão;
  - "Sem avaliações";
  - ordem, paginação e isolamento entre usuários;
  - `PATCH` (nome, CEP de Santos → bairro, CEP de fora → 400, campo `id` → 400);
  - avatar (upload, `/me`, remoção);
  - 401.
- `tsc` da API e do app, bundle Android e validação na web (Edge headless): perfil, estados, modal, configurações e salvamento.

## Etapas
- [x] Schema + migration
- [x] API: módulo users (reputação, perfil, paginação, PATCH, avatar) + testes
- [x] App: hook, store, perfil, configurações
- [x] Validação + documentação (D-024, D-025, PROJECT_CONTEXT)

## Resultado (2026-11-14)

### Arquivos
| Arquivo | Alteração |
|---|---|
| `prisma/schema.prisma` + `migrations/20261115005535_user_avatar/` | `users.avatarUrl?` e `avatarPublicId?` (só `ADD COLUMN` nulo) |
| `api/src/modules/users/reputation.ts` (novo) | Regra D-024 (`computeReputation` + `getUserReputation` com `groupBy`) |
| `api/src/modules/users/profile.{schemas,service,routes}.ts` (novos) | `GET /me/profile`, `GET /me/occurrences`, `PATCH /me`, `PUT`/`DELETE /me/avatar` |
| `api/src/modules/uploads/read-image-upload.ts` (novo) · `upload.routes.ts` | Leitura do multipart extraída para ser compartilhada (sem mudar o comportamento de `/uploads/image`) |
| `api/src/services/upload.ts` | `deleteStoredImage` (best effort; caminho local restrito a UUID) |
| `api/src/modules/auth/auth.dto.ts` | `avatarUrl` no usuário privado |
| `api/src/modules/occurrences/occurrence.service.ts` | `occurrencePublicInclude` exportado (mesmo DTO no perfil) |
| `api/src/app.ts` | Registro de `profileRoutes` + **CORS com PATCH/PUT/DELETE** (P-014) |
| `api/test/profile.integration.test.ts` (novo) | 3 testes (regra; indicadores/lista/paginação/isolamento; edição/foto/segurança) |
| `mobile/app/(tabs)/account.tsx` | Perfil do Figma (avatar, nome, "Membro desde", bairro, 3 indicadores, "MINHAS OCORRÊNCIAS" com "Ver mais", modal de detalhes, estados de carregamento, vazio e erro, puxar para atualizar) |
| `mobile/app/settings.tsx` (novo) · `app/_layout.tsx` | Configurações (foto com prévia/remover, nome, CEP → bairro, validação, aviso de alterações não salvas, popup de sucesso, sair) |
| `mobile/hooks/use-profile.ts` (novo) | `useMyProfile`, `useMoreMyOccurrences` (infinite), `useSaveProfile` |
| `mobile/components/UserAvatar.tsx` (novo) · `assets/figma/icon-user.svg` (novo) | Avatar 90 do Figma; sem foto, usa o vetor "ICON - USER" corrigido (P-011) |
| `mobile/lib/api.ts` | `imageFormData` assíncrono (Blob na web) |
| `mobile/store/auth.ts` · `lib/types.ts` | `setUser`; `avatarUrl`, `MyProfile`, `Reputation` |

### Testes executados
| Cenário | Resultado |
|---|---|
| `npm test` (API + Postgres) | **11/11** (8 anteriores + 3 novos) |
| Regra de reputação | {}→null; 3 UTIL+1 INCORRETA→3,8; só positivas→5; só INCORRETA→0 |
| Indicadores com votos cruzados | Autora: 3 ocorrências / 2 realizadas / 4 recebidas / 3,8, **excluindo o voto dela na própria ocorrência**. Vizinho: 1/3/1/5. Usuário sem nada: 0/1/0/null. Lista em ordem decrescente, só do dono, sem autor no DTO |
| Paginação / 401 | `skip`/`take` corretos; `take=500` → 400; sem token → 401 em todas as rotas |
| Edição e segurança | Nome (com trim); CEP 11060-001 → Gonzaga no banco; CEP de SP, nome curto, corpo vazio, `id`/`email` no corpo → 400, **outro usuário intacto**; foto: upload → `/me` → troca → tipo inválido 400 → remoção |
| Web (Edge headless 402×874, dados temporários reais) | Perfil 12 / 1 / **4.2** (confere com a conta à mão); 10 linhas com status real nas cores do Figma → "Ver mais (2)" → 12; modal de detalhes com "Ver no mapa"; API bloqueada → aviso "Mostrando os dados carregados às HH:MM" mantendo os números; configurações: aviso ao sair sem salvar, CEP fora de Santos → mensagem da API, CEP de Santos + nome → salvo, popup e volta; **recarregar a página** → "Maria Editada / Gonzaga, Santos"; usuário vazio → 0 / 0 / "Sem avaliações" + estado vazio. Sem erros no console |
| Telas pequenas (360×640) | Perfil e configurações sem corte, com rolagem |
| `tsc` API e mobile · `expo export android` | OK (1343 módulos) |
| Erro encontrado e corrigido | P-014 (CORS bloqueava o PATCH no navegador) |
| Dados temporários | 3 usuários `perfil-web-*`, 12 ocorrências, votos e arquivos **apagados**; a ocorrência real do usuário foi preservada |

### Pendências e limitações
- **No aparelho:**
  - seleção da foto pela galeria (com recorte 1:1) e upload nativo (na web o seletor de arquivos não abre no navegador automatizado; o upload foi testado pela API);
  - aviso ao sair pelo botão voltar do Android;
  - safe areas reais.
  
  Não precisa de build novo: usa `expo-image-picker`, que já está no build.
- **Autoavaliação:** o autor ainda **pode** votar na própria ocorrência. O voto conta como "realizada", mas não entra na reputação. Vale decidir se a API deve bloquear.
- **URL local da foto:** sem Cloudinary, a URL guarda o host usado no upload (ex.: IP do Wi-Fi). Se o IP do PC mudar, a foto antiga deixa de carregar, o mesmo que acontece com as fotos de ocorrência.
- **"Sair":** saiu da aba de perfil e foi para Configurações, porque o Figma não tem esse botão na "Minha Conta".
- **Figma:** o Figma não tem configurações, nem o selo "Check" (exportado vazio), nem botão de engrenagem. A tela de configurações e o botão de engrenagem foram feitos com os componentes do app.
- **Reputação:** a regra é provisória (D-024). Níveis, medalhas e pesos ficam fora do escopo.
