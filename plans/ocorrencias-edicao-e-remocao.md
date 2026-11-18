---
status: implementado
tema: ocorrências
atualizado: 2026-11-17
---

# Edição e remoção de ocorrências pelo autor

> Plano vivo: uma nova solicitação sobre o mesmo tema entra como nova seção datada no fim, sem apagar as anteriores.

## 2026-11-17 — Permitir que o autor edite e remova as próprias ocorrências enquanto estiverem "em análise"

### Pedido (prompt estruturado)
**Mensagens originais:**
- "percebi também que atualmente o usuario não consegue apagar as ocorrencias dele, não é bom ter a opçao de apagar?"
- Depois da recomendação: "pode planejar e implementar, só em análise e com edição. mas antes (o que faz um ocorrencias sair de analise?)"

**Papel e objetivo:** atue como engenheiro full-stack (Fastify + Prisma + Expo Router). Permita que o cidadão **edite** e **remova** as ocorrências que ele mesmo criou, **somente enquanto estiverem "em análise"**, sem perder o histórico nem abrir brechas de abuso.

**Contexto:**
- Hoje não há rota de edição nem de exclusão. As avaliações e o histórico de status são apagados em cascata se a ocorrência for apagada.
- O plano de gamificação ([[gamificacao-e-validacao-comunitaria]]) prevê pontos por ocorrência validada.
- Recomendação aceita pelo usuário:
  - remoção **suave** (some do app, fica no banco);
  - só "em análise";
  - confirmação antes de remover;
  - edição dos dados enquanto estiver em análise.

**Pergunta a responder antes:** o que tira uma ocorrência de "em análise"?

**Auditoria pedida:** status existentes e quem os muda, consultas que precisam ignorar removidas, como o app sabe que a ocorrência é do usuário, e o que reaproveitar do formulário de criação.

**Entregáveis:**
1. API: editar (`PATCH /occurrences/:id`) e remover (`DELETE /occurrences/:id`), só para o autor e só em análise.
2. App:
   - botões "Editar" e "Remover" nos detalhes (modal e rota), só para o autor e em análise;
   - aviso quando já não dá;
   - tela de edição;
   - confirmação de remoção.
3. Testes e documentação.

**Restrições:**
- migration só aditiva;
- não mudar o comportamento existente para quem não é autor;
- não expor dados pessoais no DTO público;
- regras do `AGENTS.md`.

**Modo:** planejar e implementar.

### Resposta: o que tira uma ocorrência de "em análise"
- No app, "Em análise" (bolinha amarela) agrupa **3 status oficiais**: `REPORTADA` (padrão de toda ocorrência criada), `RECEBIDA` e `EM_ANALISE` (`theme.ts → statusVisual`).
- Ela sai de "em análise" quando um **gestor ou admin** muda o status para `EM_ATENDIMENTO`, `RESOLVIDA`, `ARQUIVADA` ou `INVALIDA`.
  - O único caminho é `PATCH /admin/occurrences/:id/status`, que grava `OccurrenceStatusHistory`.
- **Nada muda o status automaticamente:**
  - os votos da comunidade são só contadores;
  - o estado comunitário de [[gamificacao-e-validacao-comunitaria]] ainda é proposta.
- **Na prática, hoje nenhuma ocorrência sai de "em análise",** porque não há painel do gestor; só uma chamada direta à API faria isso.
  - Com a regra deste plano, o autor pode editar e remover qualquer ocorrência dele até existir o painel.

### Auditoria
| Ponto | Situação | Onde |
|---|---|---|
| Status | 7 valores; o app mostra 4 cores. "Em análise" = `REPORTADA`, `RECEBIDA`, `EM_ANALISE` | `prisma/schema.prisma`, `apps/mobile/theme.ts` |
| Excluir | Não existe. Cascata em `Evaluation`, `OccurrenceStatusHistory` e `OccurrenceMedia` (exclusão real apagaria os votos dos outros e o histórico) | `schema.prisma` |
| Editar | Não existe | `occurrence.routes.ts` |
| Quem é o autor | O DTO público **não** expõe o autor (D-006). O app inteiro exige login (`Stack.Protected`) | `occurrence.dto.ts`, `app/_layout.tsx` |
| Detalhes | O modal lê do cache da lista (`["occurrences"]`); a rota `/occurrence/[id]` usa `GET /occurrences/:id` | `OccurrenceDetailsModal.tsx`, `use-feed.ts` |
| Consultas a filtrar | lista pública, detalhe, voto, status do gestor, perfil (`count`, recentes, paginação) | `occurrence.service.ts`, `profile.service.ts` |
| Fotos | `deleteStoredImage(publicId)` já existe (best effort, Cloudinary ou disco) | `services/upload.ts` |
| Formulário | Toda a lógica (categoria → subcategoria, título automático, local, foto) está dentro de `create.tsx` (665 linhas) | `app/(tabs)/create.tsx` |
| Reputação | Conta as avaliações recebidas nas ocorrências do autor | `users/reputation.ts` |

**Riscos de regressão:**
- esquecer algum filtro de removidas (ela reapareceria);
- quebrar a tela de criação ao extrair o formulário;
- o cache do detalhe mostrar o "pode editar" de outro usuário.

### Solução
**Banco:** coluna `occurrences.deletedAt DateTime?` (migration aditiva). `null` significa ativa.

**Regra única** em `occurrence.service.ts`: `AUTHOR_EDITABLE_STATUSES = [REPORTADA, RECEBIDA, EM_ANALISE]`.
- Pode editar ou remover = é o autor, não removida e status nessa lista.
- Fora do autor → 403. Status fora da lista → 409 ("já está em atendimento…"). Removida ou inexistente → 404.

**API:**
- **`PATCH /occurrences/:id`** (autenticado), corpo parcial:
  - campos: `title`, `description`, `categoryId` + `subcategoryId`, `latitude` + `longitude` e `media` (troca da foto, 1 item);
  - mesmas validações da criação (subcategoria da categoria, obrigatória quando a categoria tem opções; geofence só com a flag D-018);
  - trocar a foto apaga as mídias antigas (linhas e arquivos, best effort depois do commit);
  - o update é condicional (`updateMany` com autor, status e `deletedAt: null`), para não editar se o gestor mudar o status no meio.
- **`DELETE /occurrences/:id`** (autenticado), remoção suave:
  - grava `deletedAt` com update condicional e apaga as **fotos** (linhas e arquivos), porque quem remove espera que a foto suma;
  - avaliações e histórico de status ficam no banco.
- **`GET /occurrences/:id` com login opcional:** se vier um token válido, a resposta inclui `viewer: { isAuthor, canEdit }`.
  - O autor continua fora do DTO público. Token inválido é ignorado (a rota segue pública).
- **Removidas ficam de fora** de: lista pública, detalhe, voto, perfil (contagem e listas) e mudança de status do gestor (404).
  - O `GET /admin/occurrences/:id` continua mostrando, com `deletedAt`, para auditoria.
- **Reputação não muda:** as avaliações recebidas em ocorrências removidas continuam contando. Assim, remover uma ocorrência com votos "incorreta" não limpa a reputação.

**App:**
- **`components/OccurrenceForm.tsx`:** o formulário sai de `create.tsx`, com o mesmo visual e comportamento.
  - Recebe valores iniciais, o rótulo do botão e `onSubmit`.
  - `create.tsx` vira um invólucro: GPS automático, upload, `POST` e popup de sucesso.
- **`app/occurrence/edit/[id].tsx`:**
  - carrega a ocorrência, preenche o formulário e envia só o que mudou (`PATCH`);
  - a foto só é enviada se for trocada;
  - ao salvar, invalida `["occurrences"]` e `["profile"]` e volta.
- **`OccurrenceDetails`** (modal e rota):
  - busca `viewer` com `useOccurrence(id)`, que agora manda o token e tem o id do usuário na chave do cache;
  - para o autor com `canEdit`: botões "Editar ocorrência" e "Remover ocorrência" (confirmação com `Alert` e `window.confirm` na web);
  - para o autor sem `canEdit`: aviso "já está sendo atendida pela prefeitura…".
  - Novos props: `onEdit`, para o modal fechar antes de navegar, e `onRemoved`, para fechar o modal ou voltar.

### Etapas
- [x] Migration `deletedAt` + schema
- [x] API: regra, `PATCH`, `DELETE`, `viewer`, filtros de removidas (ocorrências e perfil)
- [x] Testes de integração da API (autor, outro usuário, status bloqueado, removida some, voto em removida, perfil, foto trocada)
- [x] App: extrair `OccurrenceForm`; `create.tsx` usando o formulário (sem mudança visual)
- [x] App: tela de edição + rota no `Stack`
- [x] App: botões e aviso nos detalhes; remoção com confirmação
- [x] Validação: `tsc` (api e mobile), vitest, testes da API, bundle Android
- [x] Documentação: D-032, PROJECT_CONTEXT (rotas, modelo, estado), resultado aqui

### Critérios de aceitação
- O autor edita título, descrição, categoria/subcategoria, local e foto de uma ocorrência em análise; o mapa e o perfil refletem a mudança.
- O autor remove (com confirmação); ela some do mapa, da lista "Perto de você", do perfil e da contagem.
- Os botões não aparecem para outros usuários. A API recusa (403) mesmo se chamada direto.
- Fora de "em análise", a API recusa (409) e o app mostra o aviso no lugar dos botões.
- A criação continua igual.

### Resultado (2026-11-17)
**Banco:** `prisma/schema.prisma` ganhou `Occurrence.deletedAt DateTime?`; migration `20261118020421_occurrence_soft_delete` (só `ADD COLUMN`), aplicada no banco local.

**API:**
- `middleware/authenticate.ts`: `optionalAuthUserId`.
- `occurrences/occurrence.schemas.ts`: `updateOccurrenceBodySchema` (parcial; local em par; subcategoria só com a categoria; não aceita corpo vazio).
- `occurrences/occurrence.service.ts`:
  - `activeOccurrence`, `AUTHOR_EDITABLE_STATUSES`;
  - `assertCategoryChoice` (extraída da criação);
  - `getPublicOccurrence(id, viewerId)` com `viewer`;
  - `updateOwnOccurrence`, `removeOwnOccurrence`;
  - filtro de removidas na lista, no voto e no status do gestor.
- `occurrences/occurrence.dto.ts`: `deletedAt` na visão admin.
- `occurrences/occurrence.routes.ts`: `PATCH` e `DELETE /occurrences/:id`; login opcional no detalhe.
- `users/profile.service.ts`: contagem e listas sem removidas.
- Novo `test/occurrence-author.integration.test.ts`.

**App:**
- Novo `components/OccurrenceForm.tsx`: o formulário saiu de `create.tsx` sem mudança visual.
  - Na edição, o local mostra "local registrado".
  - A mensagem genérica de erro passou a ser "Não foi possível salvar a ocorrência."
- `app/(tabs)/create.tsx` virou um invólucro: upload, `POST`, popup e remontagem do formulário; agora também invalida o perfil.
- Nova `app/occurrence/edit/[id].tsx`: envia só o que mudou; trata quem não é autor ou fora de análise. Registrada no `Stack` (`app/_layout.tsx`).
- `components/OccurrenceDetails.tsx`: seção "Sua ocorrência" com "Editar ocorrência", "Remover ocorrência" (confirmação) e o aviso fora de análise.
  - `OccurrenceDetailsModal` fecha antes de editar e depois de remover; a rota `occurrence/[id]` volta depois de remover.
- `hooks/use-feed.ts`: `useOccurrence` manda o token, com o id do usuário na chave.
- `lib/types.ts`: `viewer?`.

**Testes:**

| Teste | Resultado |
|---|---|
| `npx vitest run` (API, banco local) | **17/17**; 5 novos: |
| | • `viewer` para autor, outro usuário, anônimo e token inválido; sem o id do autor no corpo |
| | • edição completa, parcial e volta para "Outros"; a foto antiga é trocada |
| | • validações (vazio, local sem par, título curto, subcategoria faltando ou de outra categoria) |
| | • 403 para outra pessoa e 401 sem login; `EM_ANALISE` ainda edita; `EM_ATENDIMENTO` → 409 e `canEdit: false` |
| | • remoção: some da lista, detalhe, voto e perfil; reputação mantém o voto negativo; banco com `deletedAt`, votos e histórico, sem mídia |
| `tsc --noEmit` | API e mobile OK |
| `npx vitest run apps/mobile/lib` | 26/26 |
| `expo export --platform android` | OK (1559 módulos) |
| API local rodando (`:3333`) | lista 200; `PATCH`/`DELETE` respondem 401 sem token (rotas no ar) |

**Não testado (aparelho):**
- formulário de edição preenchido (categoria, subcategoria, mapa, foto);
- criação depois da extração do formulário;
- confirmação nativa;
- modal fechando ao editar e remover.

**Pendências:**
- **Produção:** a migration e a API nova **não foram publicadas**. Exige `prisma migrate deploy` no Neon e um novo deploy no Railway. O app instalado (preview) não tem os botões até um novo build.
- Painel do gestor: mostrar e restaurar removidas (`deletedAt`) quando existir.
- Fotos de ocorrências removidas são apagadas na hora; não há "desfazer".

