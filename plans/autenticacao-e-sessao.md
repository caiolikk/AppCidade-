---
status: implementado
tema: autenticação
atualizado: 2026-11-18
---

# Autenticação e sessão

> Plano vivo: uma nova solicitação sobre o mesmo tema entra como nova seção datada no fim, sem apagar as anteriores.

## 2026-11-18 — Sessão longa no app (o login expira em poucos minutos)

### Pedido (prompt estruturado)
**Mensagem original:** "uma coisa que achei estranha foi que o token de login expira muito rapido, o usuario fica uns minutos sem usar o app e ja tem que logar novamente, acho que isso não é bom visto que é um app mobile e nao uma aplicação web e pode atrapalhar o usuario tabem quando ele ver uma ocorrencia na rua e quiser registra rapido e vai precisar relogar"

**Papel e objetivo:** atue como engenheiro de backend e mobile com foco em segurança de autenticação. Faça o cidadão continuar logado no app por semanas, sem pedir login de novo enquanto ele usar o app com alguma frequência, sem enfraquecer a segurança: token roubado com validade curta, sessão revogável e logout que encerra a sessão.

**Contexto:**
- D-010: JWT de acesso de cerca de 15 minutos, **sem refresh token** ("arquitetura compatível com um refresh token futuro").
- O app guarda o token no SecureStore e, em qualquer 401, apaga o token e manda para o login.

**Auditoria pedida:**
- onde a validade é definida;
- o que o app faz no 401;
- onde o login, o cadastro e o logout gravam a sessão.

**Entregáveis:**
- refresh token na API (emitir, renovar, revogar);
- renovação automática e transparente no app;
- testes;
- documentação (D-033, que substitui D-010).

**Restrições:**
- migration só aditiva;
- o login e o cadastro continuam compatíveis (só ganham campos);
- nenhum segredo na documentação;
- regras do `AGENTS.md`.

**Modo:** implementar (o usuário relatou o problema e o impacto; a correção é o pedido implícito).

### Auditoria
| Ponto | Situação | Onde |
|---|---|---|
| Validade | `JWT_EXPIRES_IN` com padrão `15m` (também no `.env.example` e no plano de hospedagem) | `apps/api/src/config/env.ts`, `utils/jwt.ts` |
| Resposta do login | `expiresIn: "15m"` **fixo no código**, mesmo se a variável mudar | `auth.service.ts` |
| Renovação | Não existe | — |
| App no 401 | `api.ts` apaga o token e chama `onUnauthorized`, que faz o logout | `lib/api.ts`, `store/auth.ts` |
| Armazenamento | `expo-secure-store` (nativo) e `localStorage` (web), chave `cidade-plus.accessToken` | `lib/session.ts` |
| Logout | Só apaga o token local; o token continua válido até expirar | `store/auth.ts` |

**Causa:** o token de acesso vence em 15 minutos e o app não tem como renová-lo; o primeiro 401 desloga.

### Solução
**Alternativa descartada:** aumentar o JWT para 30 a 90 dias. É simples, mas um token vazado valeria por meses e o logout não o invalidaria (JWT não é revogável).

**Escolhida:** access token curto (continua com 15 minutos) mais **refresh token** opaco, longo e revogável, com **rotação**.
- **Tabela `refresh_tokens`** (migration aditiva): `id`, `userId`, `tokenHash` (SHA-256; o valor nunca é guardado), `expiresAt`, `revokedAt?`, `createdAt`.
- **Validade deslizante de 60 dias** (`REFRESH_TOKEN_TTL_DAYS`, padrão 60). Cada renovação emite um novo par e revoga o antigo: quem abre o app pelo menos uma vez a cada 60 dias nunca precisa logar de novo.
- **`POST /auth/refresh`** `{ refreshToken }` → `{ user, accessToken, refreshToken, expiresIn }`. Token inválido, vencido ou revogado → 401.
  - **Tolerância de 60 s** para um token que acabou de ser rotacionado: se a resposta da renovação se perder (rede ruim na rua), o app ainda consegue renovar com o anterior. Fora disso, um token revogado é recusado.
- **`POST /auth/logout`** `{ refreshToken }` → revoga (204; idempotente, sem exigir o access token, que pode ter vencido).
- Login e cadastro passam a devolver também `refreshToken`; o `expiresIn` vem da configuração, e não mais fixo.
- Usuário removido ou inexistente → 401 na renovação.

**App:**
- `lib/session.ts`: guarda também o refresh token (SecureStore, chave `cidade-plus.refreshToken`).
- `lib/api.ts`: no 401 de uma rota autenticada (fora de `/auth/*`), **renova uma vez**, com uma única renovação em voo para requisições paralelas, e **repete** a requisição. Só desloga se a renovação falhar com 401. Uma falha de rede na renovação **não desloga**: mostra o erro de conexão.
- `store/auth.ts`: `applySession` grava os dois tokens; `logout` chama `/auth/logout` (best effort) e apaga os dois.
- `hydrate` passa a funcionar mesmo com o access token vencido: o `/me` recebe 401, renova e repete.

### Etapas
- [x] Migration `refresh_tokens` + schema
- [x] API: `env` (`REFRESH_TOKEN_TTL_DAYS`), serviço de sessão, rotas `refresh` e `logout`, login e cadastro com `refreshToken`
- [x] Testes de integração (login → refresh → rotação, tolerância, reuso fora da tolerância, vencido, logout, `/me` com o novo access token)
- [x] App: sessão, renovação no `api.ts`, store
- [x] Validação: `tsc` (api e mobile), vitest, bundle Android
- [x] Documentação: D-033 (substitui D-010), PROJECT_CONTEXT, `.env.example` (nome da variável), resultado aqui

### Critérios de aceitação
- Depois de 15 minutos sem uso (access token vencido), o app continua logado e a próxima ação funciona sem pedir login.
- O logout revoga a sessão no servidor.
- Um refresh token roubado e já rotacionado não funciona depois da tolerância.

### Resultado (2026-11-18)
**Banco:** modelo `RefreshToken` (`users` 1:N, cascata ao apagar o usuário); migration `20261118231823_refresh_tokens` (só `CREATE TABLE` e índices), aplicada no banco local.

**API:**
- `config/env.ts`: `REFRESH_TOKEN_TTL_DAYS` (padrão 60).
- Novo `modules/auth/session.ts`:
  - `createSession`, `refreshSession` (rotação, tolerância de 60 s, limpeza das antigas), `revokeSession`.
- `auth.service.ts`: login e cadastro usam `createSession`. O `expiresIn` agora vem da configuração (antes era `"15m"` fixo).
- `auth.schemas.ts`: `refreshBodySchema`.
- `auth.routes.ts`: `POST /auth/refresh` e `POST /auth/logout`.
- Novo `test/auth-session.integration.test.ts`.

**App:**
- `lib/session.ts`: refresh token no SecureStore; `setSessionTokens`; `clearToken` apaga os dois.
- `lib/api.ts`: renovação única em voo e repetição; sem rede não desloga; `/auth/*` não renova.
- `store/auth.ts`: `applySession` grava o par; `logout` revoga no servidor (best effort); `hydrate` aceita o access token vencido.
- `lib/types.ts`: `AuthResponse.refreshToken`.
- Novo `lib/api.test.ts`.
- `.env.example`: `REFRESH_TOKEN_TTL_DAYS=60` (só o nome e o padrão).

**Testes:**

| Teste | Resultado |
|---|---|
| `npx vitest run` (API, banco local) | **22/22**; 5 novos: |
| | • só o hash no banco e validade de cerca de 60 dias |
| | • rotação e `/me` com o novo access token |
| | • tolerância: reuso imediato OK, reuso depois de 2 min → 401 |
| | • vencido ou desconhecido → 401, corpo inválido → 400 |
| | • logout revoga e é idempotente |
| `npx vitest run apps/mobile/lib` | **31/31**; 5 novos do cliente: |
| | • renova uma vez, grava o par e repete |
| | • 3 requisições paralelas → 1 renovação |
| | • refresh recusado → desloga |
| | • sem rede → não desloga |
| | • senha errada não renova |
| `tsc --noEmit` | API e mobile OK |
| `expo export --platform android` | OK |
| API local (`:3333`) | `POST /auth/refresh` com token falso → 401 "Sessão expirada" |

**Não testado (aparelho):** esperar mais de 15 minutos com o app em segundo plano e voltar a usá-lo sem pedir login.

**Pendências:**
- **Produção:** deploy no Railway (o pre-deploy roda `prisma migrate deploy`). `REFRESH_TOKEN_TTL_DAYS` é opcional (padrão 60). Depois, um novo APK.
- Quem já está logado na versão antiga entra uma última vez.
- Futuro: ver e encerrar sessões por aparelho no perfil; revogar tudo ao trocar a senha (ainda não existe troca de senha).

