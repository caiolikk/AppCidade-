---
status: implementado
tema: infra / ambiente de desenvolvimento / builds mobile
atualizado: 2026-11-13
---

# Ambiente de desenvolvimento e builds (Docker, Expo, EAS)

## Objetivo

Ter um ambiente reproduzível para clonar, instalar, subir os serviços, rodar a API e o app e gerar builds, sem depender da versão do Expo Go instalada no celular.

## Contexto e problema

- O projeto foi clonado em um computador novo, e a API e os builds não funcionam.
- O Expo Go se atualiza sozinho e deixa de suportar o SDK do projeto, o que força upgrades (problema recorrente no iOS; ver [[PROBLEMS]] P-002 e [[DECISIONS]] D-002).
- O usuário não entende o papel do Docker na arquitetura.

## Auditoria (2026-11-13, conferida no código e na máquina)

### Máquina (Windows 11)
| Item | Encontrado |
|---|---|
| Node / npm | v22.13.1 / 10.9.2 (`engines`: Node ≥20, npm ≥10): OK |
| Docker CLI / Compose | 29.9.3 / v5.7.0: instalados; **daemon desligado** (Docker Desktop fechado) |
| Java / Android SDK / adb | **Ausentes**: build Android local impossível sem instalá-los |
| Mac | Não há: build iOS local impossível |
| EAS CLI | Não instalado |
| `.env` | **Ausente** (só `.env.example`) |
| `node_modules` | Instalado (raiz + `apps/mobile/node_modules/react-native-maps`) |

### Repositório
| Item | Encontrado |
|---|---|
| Expo / RN / React | SDK 54.0.37 · RN 0.81.5 · React 19.1.0 · Router 6.0.24; `newArchEnabled: true` |
| Compatibilidade | `npx expo install --check` → "Dependencies are up to date". **Versões coerentes: manter, não atualizar o SDK.** |
| Typecheck mobile | OK |
| Typecheck API | **Falha**: `Cannot find module './modules/uploads/upload.routes.js'` (P-001) |
| `app.json` | Plugins: router, secure-store, image-picker, location. **Sem `ios.bundleIdentifier` / `android.package`** (exigidos pelo EAS). Sem chave do Google Maps |
| `eas.json` / `expo-dev-client` | Inexistentes |
| Pastas nativas | `android/` e `ios/` não existem: o projeto usa CNG (prebuild gerado) |
| Docker | `docker-compose.yml` sobe **só o PostgreSQL 16 + PostGIS** (`cidade-plus-postgres`, porta 5432, volume `cidade_plus_pgdata`, healthcheck). A API **não** roda em container |
| URL da API no app | `lib/config.ts`: `EXPO_PUBLIC_API_URL` → IP do Metro (`hostUri`) + `:3333` → `10.0.2.2` (emulador Android) → `127.0.0.1` |
| Mapa | `react-native-maps` 1.20.1 **sem config plugin**; provider padrão = Google no Android e Apple Maps no iOS |

### Fatos externos confirmados (docs.expo.dev e expo.dev/pricing, 2026-11-13)
- Fora do Expo Go, o Google Maps no Android precisa de uma API key própria (no Expo Go a chave da Expo é usada).
- Qualquer build instalado em **iPhone físico** exige **Apple Developer pago** (US$ 99/ano), inclusive via EAS. Sem Mac, a rota local gratuita não existe. Builds iOS pelo EAS não precisam de Mac.
- Plano Free do EAS: até 15 builds Android + 15 iOS, fila de baixa prioridade (pode passar de 90 min), timeout de 45 min. O Starter custa US$ 19/mês.

## Problemas e causas raiz

1. **A API não sobe:** P-001 (a regra `uploads/` do `.gitignore` escondeu `modules/uploads/`).
2. **O banco não sobe:** Docker Desktop fechado e `.env` ausente.
3. **Dependência do Expo Go:** o Expo Go só roda **um** SDK por versão da loja. Não há como fixar a versão no iOS.
4. **Builds impossíveis hoje:** sem `eas.json`, sem identificadores de pacote, sem dev client e sem a chave do Maps para Android.

## Estratégia (D-014)

**Development Build (`expo-dev-client`) compilado na nuvem pelo EAS**, com o Expo Go apenas como fallback.
- O app instalado traz o próprio runtime nativo do SDK 54 e não quebra quando a loja atualiza o Expo Go.
- O JS/TS continua vindo do Metro, com Fast Refresh. Só alterações nativas exigem um novo build.
- Android: build no EAS (gratuito), APK instalado por link/QR. iOS: o mesmo fluxo, **condicionado à conta Apple paga**.
- Build nativo local foi descartado: exige Android Studio/JDK (ausentes) e Mac para iOS.

## Etapas

- [x] 1. Corrigir P-001: `.gitignore` `uploads/` → `/uploads/` e recriar `modules/uploads/upload.routes.ts` a partir de `services/upload.ts` e dos testes
- [x] 2. Ignorar `apps/mobile/android/` e `apps/mobile/ios/` inteiros (CNG; evita divergência com o `app.json`)
- [x] 3. `npx expo install expo-dev-client` (versão do SDK 54: ~6.0.x)
- [x] 4. `app.json`: `ios.bundleIdentifier` e `android.package` = `com.cidadeplus.app` (ajustável antes da 1ª publicação)
- [x] 5. `app.config.js`: injeta `GOOGLE_MAPS_ANDROID_API_KEY` do ambiente (sem segredo versionado)
- [x] 6. `eas.json` com os perfis `development` (dev client, APK, internal), `preview` (APK internal) e `production`
- [x] 7. Scripts: `dev:mobile` (dev build), `dev:mobile:go` (fallback Expo Go), `build:*`
- [x] 8. Criar `.env` local a partir do `.env.example`
- [x] 8b. **(descoberto pelo expo-doctor)** Duplicata nativa `expo-font@57.0.1` (raiz) × `14.0.12` (dentro de `expo`). Causa: `@expo/vector-icons` tem peer `expo-font >=14.0.4`, e o npm instalou a mais recente. Correção: declarar `expo-font ~14.0.12` em `apps/mobile` via `expo install`. Sem isso, o build nativo pode linkar a versão errada.
- [x] 9. Validar: Docker → migrate → seed → API → `npm test` → typecheck → `expo config` → Metro
- [x] 10. Guia `docs/AMBIENTE_DEV.md` + README + PROJECT_CONTEXT/DECISIONS/PROBLEMS

## Regras e restrições

- Não atualizar o SDK nem as dependências existentes (estão coerentes).
- Não apagar volumes do Docker. Não versionar segredos.
- Não alterar funcionalidades do app fora do upload.

## Critérios de aceitação

- `npm run typecheck` sem erros nos dois workspaces; `npm test` passando com o Postgres no ar.
- `npx expo config` resolve `package`, `bundleIdentifier` e o plugin `expo-dev-client`.
- O Metro inicia no modo dev client.
- O guia permite repetir o setup do zero.

## Testes (2026-11-13, executados de fato)

| Teste | Resultado |
|---|---|
| `npm install` (com dev client + override) | OK |
| `npm run typecheck` (api + mobile) | OK (antes: a API falhava por P-001) |
| `npx expo install --check` | OK, "Dependencies are up to date" |
| `npx expo-doctor` | **18/18** (antes: 17/18, duplicata `expo-font`) |
| `npx expo config` | `package`/`bundleIdentifier` = `com.cidadeplus.app`; chave do Maps injetada só quando a variável existe |
| Docker Desktop → `npm run db:up` | Container `healthy`; sem containers/volumes antigos; portas 5432/3333 livres |
| `prisma migrate deploy` + `db:seed` | OK |
| `npm test` | **6/6** (inclui upload 200 e upload sem token 401) |
| API via IP da LAN `http://192.168.18.51:3333/health` | `{"status":"ok"}` |
| Metro `expo start --dev-client` (porta 8090) | `packager-status:running`; manifest SDK 54 |
| Bundle JS Android (`entry.bundle?platform=android`) | HTTP 200, ~7,5 MB, sem erro |
| **Development build no EAS** | **Não executado**: exige login Expo/`eas init` do usuário |
| **App no celular / Fast Refresh** | **Não executado**: depende do build acima |
| iOS | **Não executado**: exige conta Apple Developer paga |

Observação: já havia um `expo start` do usuário rodando na porta 8081 (PID 16204, desde 22:57), e ele não foi encerrado. Os processos de teste (API e Metro na 8090) foram encerrados. O container do Postgres ficou rodando.

## Resultado da implementação

Arquivos:
- **Código:** `apps/api/src/modules/uploads/upload.routes.ts` (novo).
- **Config:** `.gitignore`, `package.json` (scripts + override `expo-font`), `package-lock.json`, `apps/mobile/package.json` (dev client, `expo-font`, scripts), `apps/mobile/app.json` (ids), `apps/mobile/app.config.js` (novo), `apps/mobile/eas.json` (novo), `apps/mobile/.env.example` (novo).
- **Locais e não versionados:** `.env` (cópia do example).
- **Docs:** [[AMBIENTE_DEV]] (novo), README (seção de execução), [[PROJECT_CONTEXT]], [[DECISIONS]] D-014..D-016, [[PROBLEMS]] P-001 resolvido e P-006..P-008.

## Pendências e limitações

- **Ação do usuário:** `eas login` + `eas init`, chave do Google Maps (Android) e o primeiro `npm run build:dev:android`. Depois, validar no celular e mudar este plano para `validado`.
- **iPhone:** requer Apple Developer (US$ 99/ano). Sem ela, só o Expo Go, e somente enquanto a loja suportar o SDK 54.
- **Builds preview/produção** ainda não são úteis: a API é local e em HTTP. Exigem API hospedada com HTTPS (plano futuro).
- O identificador `com.cidadeplus.app` foi escolhido sem consultar o time; pode mudar até a 1ª publicação.
- **Commitar** `upload.routes.ts` e o `.gitignore`, senão o P-001 volta para os outros clones.
- `npm audit` aponta vulnerabilidades em dependências transitivas; não foram tratadas (fora do escopo, e `audit fix --force` poderia quebrar o SDK).

---

## 2026-11-14 — Configurar a chave do Google Maps (Android)

- **Decisão:** manter o Google Maps (`react-native-maps`) em vez de migrar para o Mapbox. Não exige mudança de código, o SDK mobile é gratuito e ilimitado, e o prazo é curto. Ver [[DECISIONS]] D-017.
- **Por que o mapa funcionava antes:** o Expo Go embute a chave da própria Expo; o dev build (`com.cidadeplus.app`) precisa de uma chave própria.
- **Etapas:**
  - [x] Projeto Google Cloud `cidadeplus-514703` com faturamento + Maps SDK for Android (feito pelo usuário; o onboarding do Maps entrava em loop, então foi usado o caminho por Billing, Library e Credentials)
  - [x] Variável `GOOGLE_MAPS_ANDROID_API_KEY` no EAS (development, preview, production; visibilidade sensitive)
  - [x] A mesma variável em `apps/mobile/.env` (build local; arquivo ignorado pelo Git)
  - [x] Conferir a injeção via `expo config --type prebuild` (OK: `googleMaps.apiKey` presente)
  - [ ] Restringir a chave: pacote `com.cidadeplus.app` + SHA-1 (`eas credentials -p android`)
  - [ ] Novo `npm run build:dev:android` e teste da aba Mapa
- SHA-1 do keystore EAS (perfil development, alias `105cee13…`): `FF:D1:9D:56:70:85:CE:0D:31:01:0E:1A:C9:63:51:AA:C9:21:3E:90`. É público, não é segredo.
- **Segurança:** a chave nunca vai para a documentação nem para o Git. Ela fica visível dentro do APK por natureza; a proteção é a restrição por pacote + SHA-1.
