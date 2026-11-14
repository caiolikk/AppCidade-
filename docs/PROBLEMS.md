---
tipo: registro-de-problemas
atualizado: 2026-11-13
---

# Problemas, causas raiz e soluções

> Procure aqui (`grep -n "<termo>" docs/PROBLEMS.md`) **antes** de investigar um bug. Registre só problemas que custaram investigação ou podem voltar.
>
> Formato: `## P-0xx — Título` · **Status** (Aberto / Resolvido / Contornado) · Sintoma · Causa raiz · Solução / tentativas · Como testar.

## P-001 — `modules/uploads/upload.routes.ts` ausente do repositório
**Status:** Resolvido em 2026-11-13 ([[ambiente-e-builds]]): `.gitignore` → `/uploads/`; rota recriada (`POST /uploads/image`, multipart no campo `file`, autenticada, 413 acima de 8 MB). `npm test` 6/6. **Lembrete:** commitar o arquivo, senão o próximo clone quebra de novo. · **Encontrado em:** 2026-11-13
- **Sintoma:** `apps/api/src/app.ts` importa `./modules/uploads/upload.routes.js`, mas a pasta não existe no clone. A API não sobe (`ERR_MODULE_NOT_FOUND`), e os testes de `/uploads/image` não rodam.
- **Causa raiz:** a linha 85 do `.gitignore` (`uploads/`, pensada para as fotos locais) também casa com `apps/api/src/modules/uploads/`. O arquivo nunca foi commitado (`git check-ignore -v` confirma).
- **Solução proposta (não aplicada):** trocar `uploads/` por `/uploads/` (a linha 86, `apps/api/uploads/`, já cobre as fotos) e recuperar o arquivo da máquina de quem o escreveu, ou recriá-lo a partir de `services/upload.ts` e dos testes em `test/foundation.integration.test.ts`.
- **Como testar:** `git check-ignore -v apps/api/src/modules/uploads/upload.routes.ts` não deve retornar nada; `npm run dev:api` sobe; `npm test` passa.

## P-002 — Expo Go não abre um projeto SDK 52
**Status:** Resolvido
- **Causa:** o Expo Go dos aparelhos do time está no SDK 54.
- **Solução:** projeto migrado para o SDK 54 (ver [[DECISIONS]] D-002).

## P-003 — Validação de CEP/geofence sem o Docker no ar
**Status:** Resolvido
- **Sintoma:** as ETAPAS 6–8 foram implementadas sem banco (Docker Desktop desligado).
- **Solução:** validadas depois. A ETAPA 13 cobre isso com testes automatizados (exigem `npm run db:up`).

## P-004 — Nome do bairro do ViaCEP diferente do polígono
**Status:** Contornado
- **Risco:** o ViaCEP pode devolver nomes que não batem com o cadastro de bairros.
- **Solução:** comparação por `normalizedName` (`utils/normalize-neighborhood.ts`). Se não houver correspondência, o usuário fica com `santosNeighborhoodId = null`, e criar ocorrência retorna **422**.
- **Pendente:** polígonos oficiais de todos os bairros de Santos (o seed tem só Gonzaga e Ponta da Praia, aproximados).

## P-005 — Workspace do Cursor ≠ repositório Git
**Status:** Contornado
- O Cursor abre `cidade+/` (cofre Obsidian); o Git fica em `cidade+/AppCidade-/`. Todo código e toda documentação versionada vão para `AppCidade-/`.

## P-006 — Módulo nativo duplicado: `expo-font` 57.x × 14.x
**Status:** Resolvido (2026-11-13)
- **Sintoma:** `npx expo-doctor` → "duplicate native module dependencies: expo-font". Isso pode quebrar o build nativo (dev build/EAS); no Expo Go não aparece.
- **Causa raiz:** o `@expo/vector-icons@15` tem o peer `expo-font >=14.0.4`; o npm hoistou a versão mais recente (57.0.1) na raiz do monorepo.
- **Solução:** `expo-font ~14.0.12` em `apps/mobile/package.json` + `overrides` na raiz + `npm update expo-font` (o lockfile travava a 57). Só o `npm install` **não** basta.
- **Como testar:** `cd apps/mobile && npx expo-doctor` → 18/18.

## P-007 — `EXPO_PUBLIC_API_URL` no `.env` da raiz não chega ao app
**Status:** Resolvido (documentação)
- **Causa:** o `@expo/env` carrega `.env*` só do `projectRoot` (`apps/mobile`). O README antigo mandava defini-la na raiz.
- **Solução:** usar `apps/mobile/.env` (modelo em `apps/mobile/.env.example`).

## P-008 — Expo Go incompatível após atualização da loja
**Status:** Contornado por [[DECISIONS]] D-014 (dev build). Substitui o contorno de P-002, que era migrar o SDK.
